package handlers

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"ralto/internal/models"
)

// --- Skill (master list — a qualification/credential, distinct from Role) ---

func (a *API) ListSkills(w http.ResponseWriter, r *http.Request) {
	rows, err := a.DB.Query(r.Context(), `SELECT id, name, type, expiry_tracked FROM skills WHERE organisation_id = $1 ORDER BY name`, currentOrgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list skills")
		return
	}
	defer rows.Close()

	skills := []models.Skill{}
	for rows.Next() {
		var s models.Skill
		if err := rows.Scan(&s.ID, &s.Name, &s.Type, &s.ExpiryTracked); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list skills")
			return
		}
		skills = append(skills, s)
	}
	writeJSON(w, http.StatusOK, skills)
}

type skillWriteRequest struct {
	Name          string          `json:"name"`
	Type          models.SkillType `json:"type"`
	ExpiryTracked bool            `json:"expiry_tracked"`
}

func (a *API) CreateSkill(w http.ResponseWriter, r *http.Request) {
	var req skillWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var s models.Skill
	err := a.DB.QueryRow(r.Context(),
		`INSERT INTO skills (name, type, expiry_tracked, organisation_id) VALUES ($1, $2, $3, $4) RETURNING id, name, type, expiry_tracked`,
		req.Name, req.Type, req.ExpiryTracked, currentOrgID,
	).Scan(&s.ID, &s.Name, &s.Type, &s.ExpiryTracked)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to create skill")
		return
	}
	writeJSON(w, http.StatusCreated, s)
}

func (a *API) UpdateSkill(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req skillWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var s models.Skill
	err := a.DB.QueryRow(r.Context(),
		`UPDATE skills SET name = $1, type = $2, expiry_tracked = $3 WHERE id = $4 AND organisation_id = $5 RETURNING id, name, type, expiry_tracked`,
		req.Name, req.Type, req.ExpiryTracked, id, currentOrgID,
	).Scan(&s.ID, &s.Name, &s.Type, &s.ExpiryTracked)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "skill not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to update skill")
		return
	}
	writeJSON(w, http.StatusOK, s)
}

// DeleteSkill is blocked if any person currently holds an instance of this
// skill — same guard shape as DeletePerson and DeleteRole.
func (a *API) DeleteSkill(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var inUse bool
	if err := a.DB.QueryRow(r.Context(), `SELECT EXISTS (SELECT 1 FROM person_skills WHERE skill_id = $1)`, id).Scan(&inUse); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete skill")
		return
	}
	if inUse {
		writeError(w, http.StatusConflict, "skill is still held by one or more people — remove those first")
		return
	}
	tag, err := a.DB.Exec(r.Context(), `DELETE FROM skills WHERE id = $1 AND organisation_id = $2`, id, currentOrgID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to delete skill")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "skill not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// --- PersonSkill (a specific person's specific instance of a Skill) ---

type personSkillResponse struct {
	models.PersonSkill
	SkillName string `json:"skill_name"`
}

func (a *API) ListPersonSkills(w http.ResponseWriter, r *http.Request) {
	personID := chi.URLParam(r, "id")
	rows, err := a.DB.Query(r.Context(), `
		SELECT ps.id, ps.person_id, ps.skill_id, ps.issued_date, ps.expiry_date, ps.document_id,
		       CASE
		         WHEN ps.expiry_date IS NULL THEN 'valid'
		         WHEN ps.expiry_date < CURRENT_DATE THEN 'expired'
		         WHEN ps.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
		         ELSE 'valid'
		       END AS status,
		       sk.name
		FROM person_skills ps JOIN skills sk ON sk.id = ps.skill_id
		WHERE ps.person_id = $1 AND ps.organisation_id = $2 ORDER BY ps.expiry_date NULLS LAST`, personID, currentOrgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list person skills")
		return
	}
	defer rows.Close()

	out := []personSkillResponse{}
	for rows.Next() {
		var ps personSkillResponse
		if err := rows.Scan(&ps.ID, &ps.PersonID, &ps.SkillID, &ps.IssuedDate, &ps.ExpiryDate, &ps.DocumentID, &ps.Status, &ps.SkillName); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list person skills")
			return
		}
		out = append(out, ps)
	}
	writeJSON(w, http.StatusOK, out)
}

type personSkillWriteRequest struct {
	SkillID    string  `json:"skill_id"`
	IssuedDate *string `json:"issued_date"`
	ExpiryDate *string `json:"expiry_date"`
	DocumentID *string `json:"document_id"`
}

func (a *API) AddPersonSkill(w http.ResponseWriter, r *http.Request) {
	personID := chi.URLParam(r, "id")
	var req personSkillWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var ps models.PersonSkill
	err := a.DB.QueryRow(r.Context(),
		`INSERT INTO person_skills (person_id, skill_id, issued_date, expiry_date, document_id, organisation_id)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, person_id, skill_id, issued_date, expiry_date, document_id`,
		personID, req.SkillID, req.IssuedDate, req.ExpiryDate, req.DocumentID, currentOrgID,
	).Scan(&ps.ID, &ps.PersonID, &ps.SkillID, &ps.IssuedDate, &ps.ExpiryDate, &ps.DocumentID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to add person skill")
		return
	}
	writeJSON(w, http.StatusCreated, ps)
}

func (a *API) RemovePersonSkill(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "personSkillId")
	tag, err := a.DB.Exec(r.Context(), `DELETE FROM person_skills WHERE id = $1 AND organisation_id = $2`, id, currentOrgID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to remove person skill")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "person skill not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
