// cmd/migrate applies backend/migrations/*.sql files in filename order,
// tracking what's already been run in a schema_migrations table. Chosen
// over a library (golang-migrate, goose) because: down-migrations aren't
// cleanly expressible for this schema anyway (0004's ALTER TYPE ... ADD
// VALUE has no reverse in Postgres), the existing files already match this
// tool's plain-numbered-file model with no renaming needed, and the rest
// of the backend is deliberately dependency-light hand-rolled SQL with no
// ORM or migration framework already in play.
//
// Safe to run repeatedly: a version already recorded in schema_migrations
// is skipped, never re-executed.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"ralto/internal/db"
)

// dbExecutor/txBeginner are satisfied by both *pgxpool.Pool and pgx.Tx,
// narrowed to just what this file needs.
type dbExecutor interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

type txBeginner interface {
	Begin(ctx context.Context) (pgx.Tx, error)
}

func main() {
	dir := flag.String("dir", "migrations", "Directory containing .sql migration files")
	markApplied := flag.String(
		"mark-applied",
		"",
		"Comma-separated migration versions (filenames without .sql) to record as already applied, without executing them — for bootstrapping a database where they were already run by hand",
	)
	flag.Parse()

	ctx := context.Background()
	pool, err := db.Connect(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "connecting to database: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	if _, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);
		ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY`); err != nil {
		fmt.Fprintf(os.Stderr, "creating schema_migrations table: %v\n", err)
		os.Exit(1)
	}

	files, err := migrationFiles(*dir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "reading migrations directory %s: %v\n", *dir, err)
		os.Exit(1)
	}

	if *markApplied != "" {
		if err := bootstrapApplied(ctx, pool, *markApplied, files); err != nil {
			fmt.Fprintf(os.Stderr, "marking versions as applied: %v\n", err)
			os.Exit(1)
		}
	}

	applied, err := appliedVersions(ctx, pool)
	if err != nil {
		fmt.Fprintf(os.Stderr, "reading schema_migrations: %v\n", err)
		os.Exit(1)
	}

	appliedNow := 0
	for _, name := range files {
		version := strings.TrimSuffix(name, ".sql")
		if applied[version] {
			fmt.Printf("skip  %s (already applied)\n", version)
			continue
		}

		content, err := os.ReadFile(filepath.Join(*dir, name))
		if err != nil {
			fmt.Fprintf(os.Stderr, "reading %s: %v\n", name, err)
			os.Exit(1)
		}

		if err := applyMigration(ctx, pool, version, string(content)); err != nil {
			fmt.Fprintf(os.Stderr, "applying %s: %v\n", version, err)
			os.Exit(1)
		}
		fmt.Printf("apply %s\n", version)
		appliedNow++
	}

	fmt.Printf("done — %d applied, %d already up to date\n", appliedNow, len(files)-appliedNow)
}

func migrationFiles(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var files []string
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		files = append(files, e.Name())
	}
	sort.Strings(files)
	return files, nil
}

func appliedVersions(ctx context.Context, pool dbExecutor) (map[string]bool, error) {
	rows, err := pool.Query(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applied := map[string]bool{}
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		applied[v] = true
	}
	return applied, rows.Err()
}

// bootstrapApplied records versions as already applied without executing
// their SQL — for a database (Supabase, today) where 0001-0004 were run by
// hand before this tool existed. Every listed version is validated against
// the actual migration files *before* anything is written, and all writes
// happen in one transaction — a typo anywhere in the list must fail with
// zero side effects, not partially mark the versions that came before it.
func bootstrapApplied(ctx context.Context, pool txBeginner, raw string, files []string) error {
	known := map[string]bool{}
	for _, name := range files {
		known[strings.TrimSuffix(name, ".sql")] = true
	}

	var versions []string
	for _, version := range strings.Split(raw, ",") {
		version = strings.TrimSpace(version)
		if version == "" {
			continue
		}
		if !known[version] {
			return fmt.Errorf("%q does not match any file in the migrations directory", version)
		}
		versions = append(versions, version)
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("starting transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op once committed

	marked, alreadyMarked := 0, 0
	for _, version := range versions {
		tag, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING`, version)
		if err != nil {
			return fmt.Errorf("recording %s: %w", version, err)
		}
		if tag.RowsAffected() > 0 {
			marked++
		} else {
			alreadyMarked++
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("committing: %w", err)
	}
	fmt.Printf("bootstrap: marked %d, already marked %d\n", marked, alreadyMarked)
	return nil
}

// applyMigration runs a migration file's full contents and records it as
// applied in one transaction, so a crash between the two can never leave a
// migration half-applied-but-unrecorded (which would re-run it next time
// and fail on already-existing objects) or applied-and-recorded-as-failed.
func applyMigration(ctx context.Context, pool txBeginner, version, sql string) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("starting transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op once committed

	if _, err := tx.Exec(ctx, sql); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
		return fmt.Errorf("recording as applied: %w", err)
	}
	return tx.Commit(ctx)
}
