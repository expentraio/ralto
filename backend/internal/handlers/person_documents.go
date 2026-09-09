package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"ralto/internal/models"
)

// Scoped deliberately narrow per the data model's non-goals section —
// crewing-relevant documents only (certs, visas, credentials), not a
// general HR file store. file_ref is a storage pointer; actual file upload
// (to Supabase Storage, matching Equiptra's own approach) is a Phase 2
// concern once a storage bucket exists for Ralto — these endpoints assume
// the frontend already has an uploaded file's reference to attach.

func (a *API) ListPersonDocuments(w http.ResponseWriter, r *http.Request) {
	personID := chi.URLParam(r, "id")
	rows, err := a.DB.Query(r.Context(),
		`SELECT id, person_id, type, file_ref, expiry_date, uploaded_at FROM person_documents WHERE person_id = $1 AND organisation_id = $2 ORDER BY uploaded_at DESC`,
		personID, currentOrgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list documents")
		return
	}
	defer rows.Close()

	docs := []models.PersonDocument{}
	for rows.Next() {
		var d models.PersonDocument
		if err := rows.Scan(&d.ID, &d.PersonID, &d.Type, &d.FileRef, &d.ExpiryDate, &d.UploadedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list documents")
			return
		}
		docs = append(docs, d)
	}
	writeJSON(w, http.StatusOK, docs)
}

type personDocumentWriteRequest struct {
	Type       models.PersonDocumentType `json:"type"`
	FileRef    string                    `json:"file_ref"`
	ExpiryDate *string                   `json:"expiry_date"`
}

func (a *API) AddPersonDocument(w http.ResponseWriter, r *http.Request) {
	personID := chi.URLParam(r, "id")
	var req personDocumentWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var d models.PersonDocument
	err := a.DB.QueryRow(r.Context(),
		`INSERT INTO person_documents (person_id, type, file_ref, expiry_date, organisation_id) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, person_id, type, file_ref, expiry_date, uploaded_at`,
		personID, req.Type, req.FileRef, req.ExpiryDate, currentOrgID,
	).Scan(&d.ID, &d.PersonID, &d.Type, &d.FileRef, &d.ExpiryDate, &d.UploadedAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to add document")
		return
	}
	writeJSON(w, http.StatusCreated, d)
}

func (a *API) RemovePersonDocument(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "documentId")
	tag, err := a.DB.Exec(r.Context(), `DELETE FROM person_documents WHERE id = $1 AND organisation_id = $2`, id, currentOrgID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to remove document")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "document not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
