package handlers

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"ralto/internal/models"
)

func (a *API) ListClients(w http.ResponseWriter, r *http.Request) {
	rows, err := a.DB.Query(r.Context(),
		`SELECT id, name, contact_name, contact_email, contact_phone, notes, brand_color_hex, website, created_at, updated_at
		 FROM clients WHERE organisation_id = $1 ORDER BY name`, currentOrgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list clients")
		return
	}
	defer rows.Close()

	clients := []models.Client{}
	for rows.Next() {
		var c models.Client
		if err := rows.Scan(&c.ID, &c.Name, &c.ContactName, &c.ContactEmail, &c.ContactPhone, &c.Notes, &c.BrandColorHex, &c.Website, &c.CreatedAt, &c.UpdatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list clients")
			return
		}
		clients = append(clients, c)
	}
	writeJSON(w, http.StatusOK, clients)
}

func (a *API) GetClient(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var c models.Client
	err := a.DB.QueryRow(r.Context(),
		`SELECT id, name, contact_name, contact_email, contact_phone, notes, brand_color_hex, website, created_at, updated_at
		 FROM clients WHERE id = $1 AND organisation_id = $2`, id, currentOrgID,
	).Scan(&c.ID, &c.Name, &c.ContactName, &c.ContactEmail, &c.ContactPhone, &c.Notes, &c.BrandColorHex, &c.Website, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "client not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get client")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

type clientWriteRequest struct {
	Name          string  `json:"name"`
	ContactName   *string `json:"contact_name"`
	ContactEmail  *string `json:"contact_email"`
	ContactPhone  *string `json:"contact_phone"`
	Notes         *string `json:"notes"`
	BrandColorHex *string `json:"brand_color_hex"`
	Website       *string `json:"website"`
}

func (a *API) CreateClient(w http.ResponseWriter, r *http.Request) {
	var req clientWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var c models.Client
	err := a.DB.QueryRow(r.Context(),
		`INSERT INTO clients (name, contact_name, contact_email, contact_phone, notes, brand_color_hex, website, organisation_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, name, contact_name, contact_email, contact_phone, notes, brand_color_hex, website, created_at, updated_at`,
		req.Name, req.ContactName, req.ContactEmail, req.ContactPhone, req.Notes, req.BrandColorHex, req.Website, currentOrgID,
	).Scan(&c.ID, &c.Name, &c.ContactName, &c.ContactEmail, &c.ContactPhone, &c.Notes, &c.BrandColorHex, &c.Website, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to create client")
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (a *API) UpdateClient(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req clientWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var c models.Client
	err := a.DB.QueryRow(r.Context(),
		`UPDATE clients SET name = $1, contact_name = $2, contact_email = $3, contact_phone = $4,
		        notes = $5, brand_color_hex = $6, website = $7, updated_at = now()
		 WHERE id = $8 AND organisation_id = $9
		 RETURNING id, name, contact_name, contact_email, contact_phone, notes, brand_color_hex, website, created_at, updated_at`,
		req.Name, req.ContactName, req.ContactEmail, req.ContactPhone, req.Notes, req.BrandColorHex, req.Website, id, currentOrgID,
	).Scan(&c.ID, &c.Name, &c.ContactName, &c.ContactEmail, &c.ContactPhone, &c.Notes, &c.BrandColorHex, &c.Website, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "client not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to update client")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (a *API) DeleteClient(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tag, err := a.DB.Exec(r.Context(), `DELETE FROM clients WHERE id = $1 AND organisation_id = $2`, id, currentOrgID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to delete client (it may still have jobs or projects)")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "client not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
