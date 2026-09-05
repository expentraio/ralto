package handlers

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"ralto/internal/models"
)

// Ralto's own Project groups multiple Jobs (a multi-day tournament, a
// season of fixtures) — distinct from the future suite-core Project that
// `shared_project_id` will eventually point at. See ralto_schema_addendum_v1.md §1.

func (a *API) ListProjects(w http.ResponseWriter, r *http.Request) {
	rows, err := a.DB.Query(r.Context(),
		`SELECT id, name, client_id, date_start, date_end, shared_project_id, color_hex, created_at, updated_at
		 FROM projects ORDER BY date_start DESC NULLS LAST`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list projects")
		return
	}
	defer rows.Close()

	projects := []models.Project{}
	for rows.Next() {
		var p models.Project
		if err := rows.Scan(&p.ID, &p.Name, &p.ClientID, &p.DateStart, &p.DateEnd, &p.SharedProjectID, &p.ColorHex, &p.CreatedAt, &p.UpdatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list projects")
			return
		}
		projects = append(projects, p)
	}
	writeJSON(w, http.StatusOK, projects)
}

func (a *API) GetProject(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p models.Project
	err := a.DB.QueryRow(r.Context(),
		`SELECT id, name, client_id, date_start, date_end, shared_project_id, color_hex, created_at, updated_at
		 FROM projects WHERE id = $1`, id,
	).Scan(&p.ID, &p.Name, &p.ClientID, &p.DateStart, &p.DateEnd, &p.SharedProjectID, &p.ColorHex, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get project")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

type projectWriteRequest struct {
	Name      string  `json:"name"`
	ClientID  *string `json:"client_id"`
	DateStart *string `json:"date_start"`
	DateEnd   *string `json:"date_end"`
	ColorHex  *string `json:"color_hex"`
}

func (a *API) CreateProject(w http.ResponseWriter, r *http.Request) {
	var req projectWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var p models.Project
	err := a.DB.QueryRow(r.Context(),
		`INSERT INTO projects (name, client_id, date_start, date_end, color_hex)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, name, client_id, date_start, date_end, shared_project_id, color_hex, created_at, updated_at`,
		req.Name, req.ClientID, req.DateStart, req.DateEnd, req.ColorHex,
	).Scan(&p.ID, &p.Name, &p.ClientID, &p.DateStart, &p.DateEnd, &p.SharedProjectID, &p.ColorHex, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to create project")
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (a *API) UpdateProject(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req projectWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var p models.Project
	err := a.DB.QueryRow(r.Context(),
		`UPDATE projects SET name = $1, client_id = $2, date_start = $3, date_end = $4, color_hex = $5, updated_at = now()
		 WHERE id = $6
		 RETURNING id, name, client_id, date_start, date_end, shared_project_id, color_hex, created_at, updated_at`,
		req.Name, req.ClientID, req.DateStart, req.DateEnd, req.ColorHex, id,
	).Scan(&p.ID, &p.Name, &p.ClientID, &p.DateStart, &p.DateEnd, &p.SharedProjectID, &p.ColorHex, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to update project")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (a *API) DeleteProject(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	// Unlike Job, a Project has no allocation-history guard of its own — its
	// Jobs carry that history. ON DELETE SET NULL on jobs.project_id (see
	// migrations/0001_init.sql) means deleting a Project un-groups its Jobs
	// rather than cascading destructively into real crewing data.
	tag, err := a.DB.Exec(r.Context(), `DELETE FROM projects WHERE id = $1`, id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to delete project")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
