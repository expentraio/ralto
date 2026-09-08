// cmd/seed creates the first staff user (admin by default, --role
// scheduler for anything else) and seeds the roles table. Neither exists
// any other way: CreateUser (internal/handlers/users.go) requires an
// authenticated admin session already, and there is no signup endpoint —
// without this, a freshly-migrated database can never be logged into.
//
// Safe to run repeatedly: an email that already exists is left alone
// (name, password, everything) and reported as such; roles are inserted
// with ON CONFLICT (name) DO NOTHING.
package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/term"

	"ralto/internal/db"
)

var validRoles = map[string]bool{"admin": true, "scheduler": true}

func main() {
	adminEmail := flag.String("admin-email", "", "Email for the admin user to create")
	adminName := flag.String("admin-name", "", "Name for the admin user to create")
	role := flag.String("role", "admin", "Role for the user to create: admin or scheduler")
	rolesFile := flag.String("roles-file", "seed/roles.txt", "Path to a plain-text file of role names, one per line")
	rolesOnly := flag.Bool("roles-only", false, "Skip admin user creation")
	adminOnly := flag.Bool("admin-only", false, "Skip role seeding")
	flag.Parse()

	if *rolesOnly && *adminOnly {
		fmt.Fprintln(os.Stderr, "cannot combine --roles-only and --admin-only")
		os.Exit(1)
	}
	if !*rolesOnly && (*adminEmail == "" || *adminName == "") {
		fmt.Fprintln(os.Stderr, "--admin-email and --admin-name are required unless --roles-only is set")
		os.Exit(1)
	}
	if !validRoles[*role] {
		fmt.Fprintf(os.Stderr, "--role must be admin or scheduler, got %q\n", *role)
		os.Exit(1)
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "connecting to database: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	if !*rolesOnly {
		if err := seedAdmin(ctx, pool, *adminEmail, *adminName, *role); err != nil {
			fmt.Fprintf(os.Stderr, "seeding admin user: %v\n", err)
			os.Exit(1)
		}
	}

	if !*adminOnly {
		if err := seedRoles(ctx, pool, *rolesFile); err != nil {
			fmt.Fprintf(os.Stderr, "seeding roles: %v\n", err)
			os.Exit(1)
		}
	}
}

// normalizeEmail mirrors internal/handlers/helpers.go's function of the
// same name — duplicated rather than imported since this is a separate
// main package, but it must stay behaviourally identical: this is one of
// the write paths email normalization has to cover for the DB-level
// lower(email) uniqueness index (migrations/0005) to hold.
func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func seedAdmin(ctx context.Context, pool *pgxpool.Pool, email, name, role string) error {
	email = normalizeEmail(email)

	var existingID string
	// Case-insensitive for the same reason Login is: a rerun with different
	// casing of an email that already exists should be recognised as the
	// same account, not attempted as a new row that then fails the unique
	// index.
	err := pool.QueryRow(ctx, `SELECT id FROM users WHERE lower(email) = $1`, email).Scan(&existingID)
	if err == nil {
		fmt.Printf("user %s already exists — password left unchanged\n", email)
		return nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("checking for existing user: %w", err)
	}

	if !term.IsTerminal(int(os.Stdin.Fd())) {
		return fmt.Errorf("stdin is not a terminal — the password must be typed interactively, not piped")
	}
	fmt.Printf("Password for %s: ", email)
	pwBytes, err := term.ReadPassword(int(os.Stdin.Fd()))
	fmt.Println()
	if err != nil {
		return fmt.Errorf("reading password: %w", err)
	}
	if len(strings.TrimSpace(string(pwBytes))) == 0 {
		return fmt.Errorf("password must not be empty")
	}

	hash, err := bcrypt.GenerateFromPassword(pwBytes, bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hashing password: %w", err)
	}

	var id string
	err = pool.QueryRow(ctx,
		`INSERT INTO users (name, email, role, password_hash, active, must_change_password)
		 VALUES ($1, $2, $3, $4, true, true) RETURNING id`,
		name, email, role, string(hash),
	).Scan(&id)
	if err != nil {
		return fmt.Errorf("creating user: %w", err)
	}
	fmt.Printf("created %s user %s (%s), must_change_password=true\n", role, email, id)
	return nil
}

func seedRoles(ctx context.Context, pool *pgxpool.Pool, path string) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("opening roles file %s: %w", path, err)
	}
	defer f.Close()

	added, existing := 0, 0
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		tag, err := pool.Exec(ctx, `INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, line)
		if err != nil {
			return fmt.Errorf("inserting role %q: %w", line, err)
		}
		if tag.RowsAffected() > 0 {
			added++
		} else {
			existing++
		}
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("reading roles file: %w", err)
	}
	fmt.Printf("roles: added %d, already existed %d\n", added, existing)
	return nil
}
