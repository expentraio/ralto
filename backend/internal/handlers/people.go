package handlers

import (
	"errors"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"ralto/internal/models"
)

const personSelectColumns = `id, first_name, last_name, email, phone, base_location, employment_type, status,
	preferred_status, standard_rate, rate_currency, overtime_rule_id, notes, phone_number,
	notification_channels, active, must_change_password, created_at, updated_at`

// scanPerson scans the fixed personSelectColumns list into p. extra lets a
// caller select additional trailing columns (e.g. password_hash for login)
// without duplicating the whole column list.
func scanPerson(row pgx.Row, p *models.Person, extra ...interface{}) error {
	dest := []interface{}{&p.ID, &p.FirstName, &p.LastName, &p.Email, &p.Phone, &p.BaseLocation, &p.EmploymentType, &p.Status,
		&p.PreferredStatus, &p.StandardRate, &p.RateCurrency, &p.OvertimeRuleID, &p.Notes, &p.PhoneNumber,
		&p.NotificationChannels, &p.Active, &p.MustChangePassword, &p.CreatedAt, &p.UpdatedAt}
	dest = append(dest, extra...)
	return row.Scan(dest...)
}

func (a *API) ListPeople(w http.ResponseWriter, r *http.Request) {
	rows, err := a.DB.Query(r.Context(), `SELECT `+personSelectColumns+` FROM people ORDER BY first_name, last_name`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list people")
		return
	}
	defer rows.Close()

	people := []models.Person{}
	for rows.Next() {
		var p models.Person
		if err := scanPerson(rows, &p); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list people")
			return
		}
		people = append(people, p)
	}
	writeJSON(w, http.StatusOK, people)
}

func (a *API) GetPerson(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p models.Person
	err := scanPerson(a.DB.QueryRow(r.Context(), `SELECT `+personSelectColumns+` FROM people WHERE id = $1`, id), &p)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "person not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get person")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

type personWriteRequest struct {
	FirstName            string                 `json:"first_name"`
	LastName             string                 `json:"last_name"`
	Email                string                 `json:"email"`
	Phone                *string                `json:"phone"`
	BaseLocation         *string                `json:"base_location"`
	EmploymentType       models.EmploymentType  `json:"employment_type"`
	Status               models.PersonStatus    `json:"status"`
	PreferredStatus      models.PreferredStatus `json:"preferred_status"`
	StandardRate         *float64               `json:"standard_rate"`
	RateCurrency         *string                `json:"rate_currency"`
	OvertimeRuleID       *string                `json:"overtime_rule_id"`
	Notes                *string                `json:"notes"`
	PhoneNumber          *string                `json:"phone_number"`
	NotificationChannels *string                `json:"notification_channels"`
}

func (a *API) CreatePerson(w http.ResponseWriter, r *http.Request) {
	var req personWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Status == "" {
		req.Status = models.PersonStatusActive
	}
	if req.PreferredStatus == "" {
		req.PreferredStatus = models.PreferredStatusStandard
	}
	req.Email = normalizeEmail(req.Email)
	var p models.Person
	err := scanPerson(a.DB.QueryRow(r.Context(),
		`INSERT INTO people (first_name, last_name, email, phone, base_location, employment_type, status,
		                      preferred_status, standard_rate, rate_currency, overtime_rule_id, notes,
		                      phone_number, notification_channels)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		 RETURNING `+personSelectColumns,
		req.FirstName, req.LastName, req.Email, req.Phone, req.BaseLocation, req.EmploymentType, req.Status,
		req.PreferredStatus, req.StandardRate, req.RateCurrency, req.OvertimeRuleID, req.Notes,
		req.PhoneNumber, req.NotificationChannels,
	), &p)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to create person")
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (a *API) UpdatePerson(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req personWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = normalizeEmail(req.Email)
	var p models.Person
	err := scanPerson(a.DB.QueryRow(r.Context(),
		`UPDATE people SET first_name = $1, last_name = $2, email = $3, phone = $4, base_location = $5,
		        employment_type = $6, status = $7, preferred_status = $8, standard_rate = $9, rate_currency = $10,
		        overtime_rule_id = $11, notes = $12, phone_number = $13, notification_channels = $14, updated_at = now()
		 WHERE id = $15
		 RETURNING `+personSelectColumns,
		req.FirstName, req.LastName, req.Email, req.Phone, req.BaseLocation, req.EmploymentType, req.Status,
		req.PreferredStatus, req.StandardRate, req.RateCurrency, req.OvertimeRuleID, req.Notes,
		req.PhoneNumber, req.NotificationChannels, id,
	), &p)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "person not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to update person")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// DeletePerson is blocked if the person appears on any booking history —
// deactivate (Status) instead. Mirrors Equiptra's DeleteUser guard, which
// checks real allocation history rather than mere row existence.
func (a *API) DeletePerson(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var hasBookings bool
	if err := a.DB.QueryRow(r.Context(),
		`SELECT EXISTS (SELECT 1 FROM bookings WHERE person_id = $1)`, id,
	).Scan(&hasBookings); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete person")
		return
	}
	if hasBookings {
		writeError(w, http.StatusConflict, "person has booking history — deactivate instead of deleting")
		return
	}
	tag, err := a.DB.Exec(r.Context(), `DELETE FROM people WHERE id = $1`, id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to delete person")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "person not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// --- Person roles (capabilities) ---

type personRoleResponse struct {
	models.PersonRole
	RoleName string `json:"role_name"`
}

func (a *API) ListPersonRoles(w http.ResponseWriter, r *http.Request) {
	personID := chi.URLParam(r, "id")
	rows, err := a.DB.Query(r.Context(),
		`SELECT pr.id, pr.person_id, pr.role_id, pr.is_primary, ro.name
		 FROM person_roles pr JOIN roles ro ON ro.id = pr.role_id
		 WHERE pr.person_id = $1 ORDER BY pr.is_primary DESC, ro.name`, personID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list person roles")
		return
	}
	defer rows.Close()

	out := []personRoleResponse{}
	for rows.Next() {
		var pr personRoleResponse
		if err := rows.Scan(&pr.ID, &pr.PersonID, &pr.RoleID, &pr.IsPrimary, &pr.RoleName); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list person roles")
			return
		}
		out = append(out, pr)
	}
	writeJSON(w, http.StatusOK, out)
}

type personRoleWriteRequest struct {
	RoleID    string `json:"role_id"`
	IsPrimary bool   `json:"is_primary"`
}

func (a *API) AddPersonRole(w http.ResponseWriter, r *http.Request) {
	personID := chi.URLParam(r, "id")
	var req personRoleWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var pr models.PersonRole
	err := a.DB.QueryRow(r.Context(),
		`INSERT INTO person_roles (person_id, role_id, is_primary) VALUES ($1, $2, $3)
		 RETURNING id, person_id, role_id, is_primary`,
		personID, req.RoleID, req.IsPrimary,
	).Scan(&pr.ID, &pr.PersonID, &pr.RoleID, &pr.IsPrimary)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to add person role")
		return
	}
	writeJSON(w, http.StatusCreated, pr)
}

func (a *API) RemovePersonRole(w http.ResponseWriter, r *http.Request) {
	personRoleID := chi.URLParam(r, "personRoleId")
	tag, err := a.DB.Exec(r.Context(), `DELETE FROM person_roles WHERE id = $1`, personRoleID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to remove person role")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "person role not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// --- Calendar feed token ---

// GenerateCalendarFeedToken issues (or regenerates) a Person's iCal feed
// token. Regenerating simply overwrites the column — the old URL stops
// resolving immediately, no separate revocation table, per
// ralto_schema_addendum_v1.md §2.
func (a *API) GenerateCalendarFeedToken(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	token, err := randomToken(24)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate calendar feed token")
		return
	}
	tag, err := a.DB.Exec(r.Context(), `UPDATE people SET calendar_feed_token = $1, updated_at = now() WHERE id = $2`, token, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate calendar feed token")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "person not found")
		return
	}
	base := os.Getenv("ICAL_FEED_BASE_URL") // e.g. https://ralto-ical.onrender.com/feed
	writeJSON(w, http.StatusOK, map[string]string{"token": token, "feed_url": base + "/" + token + ".ics"})
}

// --- Crew-app invitation (enables login for an existing Person) ---

func (a *API) InviteToCrewApp(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tempPassword, err := randomToken(12)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to invite person")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to invite person")
		return
	}
	tag, err := a.DB.Exec(r.Context(),
		`UPDATE people SET password_hash = $1, must_change_password = true, updated_at = now() WHERE id = $2`,
		string(hash), id,
	)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "person not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"temporary_password": tempPassword})
}
