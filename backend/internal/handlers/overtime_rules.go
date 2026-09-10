package handlers

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"ralto/internal/models"
)

// OvertimeRules are a master list a Person can be pinned to via
// people.overtime_rule_id — small enough a list that no pagination/search
// is needed for v1, same reasoning as Roles.

func (a *API) ListOvertimeRules(w http.ResponseWriter, r *http.Request) {
	rows, err := a.DB.Query(r.Context(), `SELECT id, name, threshold_hours, multiplier FROM overtime_rules WHERE organisation_id = $1 ORDER BY name`, currentOrgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list overtime rules")
		return
	}
	defer rows.Close()

	rules := []models.OvertimeRule{}
	for rows.Next() {
		var rule models.OvertimeRule
		if err := rows.Scan(&rule.ID, &rule.Name, &rule.ThresholdHours, &rule.Multiplier); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list overtime rules")
			return
		}
		rules = append(rules, rule)
	}
	writeJSON(w, http.StatusOK, rules)
}

type overtimeRuleWriteRequest struct {
	Name           string  `json:"name"`
	ThresholdHours float64 `json:"threshold_hours"`
	Multiplier     float64 `json:"multiplier"`
}

func (a *API) CreateOvertimeRule(w http.ResponseWriter, r *http.Request) {
	var req overtimeRuleWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var rule models.OvertimeRule
	err := a.DB.QueryRow(r.Context(),
		`INSERT INTO overtime_rules (name, threshold_hours, multiplier, organisation_id) VALUES ($1, $2, $3, $4) RETURNING id, name, threshold_hours, multiplier`,
		req.Name, req.ThresholdHours, req.Multiplier, currentOrgID,
	).Scan(&rule.ID, &rule.Name, &rule.ThresholdHours, &rule.Multiplier)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to create overtime rule")
		return
	}
	writeJSON(w, http.StatusCreated, rule)
}

func (a *API) UpdateOvertimeRule(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req overtimeRuleWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var rule models.OvertimeRule
	err := a.DB.QueryRow(r.Context(),
		`UPDATE overtime_rules SET name = $1, threshold_hours = $2, multiplier = $3 WHERE id = $4 AND organisation_id = $5 RETURNING id, name, threshold_hours, multiplier`,
		req.Name, req.ThresholdHours, req.Multiplier, id, currentOrgID,
	).Scan(&rule.ID, &rule.Name, &rule.ThresholdHours, &rule.Multiplier)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "overtime rule not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to update overtime rule")
		return
	}
	writeJSON(w, http.StatusOK, rule)
}

// DeleteOvertimeRule is blocked if any person is currently pinned to this
// rule via people.overtime_rule_id — same guard shape as DeletePerson and
// DeleteRole.
func (a *API) DeleteOvertimeRule(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var inUse bool
	if err := a.DB.QueryRow(r.Context(), `SELECT EXISTS (SELECT 1 FROM people WHERE overtime_rule_id = $1)`, id).Scan(&inUse); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete overtime rule")
		return
	}
	if inUse {
		writeError(w, http.StatusConflict, "overtime rule is still assigned to one or more people — remove those first")
		return
	}
	tag, err := a.DB.Exec(r.Context(), `DELETE FROM overtime_rules WHERE id = $1 AND organisation_id = $2`, id, currentOrgID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to delete overtime rule")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "overtime rule not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
