package handlers

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"ralto/internal/middleware"
	"ralto/internal/models"
)

// --- Staff auth ---

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (a *API) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var u models.User
	var passwordHash string
	// Case-insensitive on purpose: existing rows may still be mixed-case
	// from before writes were normalized (see normalizeEmail), and a phone
	// auto-capitalising the first letter of what someone types here
	// shouldn't be able to fail a login that would otherwise succeed.
	err := a.DB.QueryRow(r.Context(),
		`SELECT id, name, email, role, active, must_change_password, created_at, updated_at, password_hash
		 FROM users WHERE lower(email) = $1`,
		normalizeEmail(req.Email),
	).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Active, &u.MustChangePassword, &u.CreatedAt, &u.UpdatedAt, &passwordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "login failed")
		return
	}
	if !u.Active {
		writeError(w, http.StatusUnauthorized, "account is deactivated")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, err := middleware.IssueStaffToken(u.ID, u.Role, u.MustChangePassword)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "login failed")
		return
	}
	middleware.SetStaffSessionCookie(w, token)
	writeJSON(w, http.StatusOK, u)
}

func (a *API) Logout(w http.ResponseWriter, r *http.Request) {
	middleware.ClearStaffSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *API) Me(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.StaffFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	var u models.User
	err := a.DB.QueryRow(r.Context(),
		`SELECT id, name, email, role, active, must_change_password, created_at, updated_at
		 FROM users WHERE id = $1`,
		claims.UserID,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Active, &u.MustChangePassword, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// ChangeOwnPassword lets any authenticated staff user (including a
// must_change_password-restricted session) set a new password — the one
// endpoint RequireStaffPasswordSet always exempts.
func (a *API) ChangeOwnPassword(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.StaffFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	var req changePasswordRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.NewPassword) < 8 {
		writeError(w, http.StatusBadRequest, "new password must be at least 8 characters")
		return
	}

	var currentHash string
	if err := a.DB.QueryRow(r.Context(), `SELECT password_hash FROM users WHERE id = $1`, claims.UserID).Scan(&currentHash); err != nil {
		writeError(w, http.StatusInternalServerError, "password change failed")
		return
	}
	// Checked even for a forced-reset session: the "current" password there
	// is the admin-set temporary one, and requiring it here confirms the
	// caller actually knows it rather than just holding a still-valid cookie.
	if bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.CurrentPassword)) != nil {
		writeError(w, http.StatusUnauthorized, "current password is incorrect")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "password change failed")
		return
	}
	var u models.User
	err = a.DB.QueryRow(r.Context(),
		`UPDATE users SET password_hash = $1, must_change_password = false, updated_at = now()
		 WHERE id = $2
		 RETURNING id, name, email, role, active, must_change_password, created_at, updated_at`,
		string(newHash), claims.UserID,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Active, &u.MustChangePassword, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "password change failed")
		return
	}

	// Land straight in the app rather than forcing a fresh login: the old
	// token (if this came from a forced reset) still carries
	// must_change_password=true, so a new one is issued and swapped in.
	token, err := middleware.IssueStaffToken(u.ID, u.Role, false)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue session")
		return
	}
	middleware.SetStaffSessionCookie(w, token)
	writeJSON(w, http.StatusOK, u)
}

// --- Crew auth ---

func (a *API) CrewLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var p models.Person
	var passwordHash *string
	err := scanPerson(a.DB.QueryRow(r.Context(),
		`SELECT `+personSelectColumns+`, password_hash FROM people WHERE lower(email) = $1`,
		normalizeEmail(req.Email),
	), &p, &passwordHash)
	if errors.Is(err, pgx.ErrNoRows) || passwordHash == nil {
		// No account, or a Person row that exists in the crewing data but
		// has never had crew-app login enabled (e.g. bulk-imported crew who
		// haven't been invited yet) — same response either way so a login
		// attempt can't be used to enumerate which emails exist.
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "login failed")
		return
	}
	if !p.Active {
		writeError(w, http.StatusUnauthorized, "account is deactivated")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(*passwordHash), []byte(req.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, err := middleware.IssueCrewToken(p.ID, p.MustChangePassword)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "login failed")
		return
	}
	middleware.SetCrewSessionCookie(w, token)
	writeJSON(w, http.StatusOK, p)
}

func (a *API) CrewLogout(w http.ResponseWriter, r *http.Request) {
	middleware.ClearCrewSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *API) CrewMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.CrewFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	var p models.Person
	err := scanPerson(a.DB.QueryRow(r.Context(), `SELECT `+personSelectColumns+` FROM people WHERE id = $1`, claims.PersonID), &p)
	if err != nil {
		writeError(w, http.StatusNotFound, "person not found")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// ChangeOwnCrewPassword mirrors ChangeOwnPassword for the crew persona.
func (a *API) ChangeOwnCrewPassword(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.CrewFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	var req changePasswordRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.NewPassword) < 8 {
		writeError(w, http.StatusBadRequest, "new password must be at least 8 characters")
		return
	}

	// Reaching this handler at all requires a valid crew session, which only
	// exists once password_hash has been set (see CrewLogin) — so unlike
	// CreatePerson's nullable password_hash, it's never nil here.
	var currentHash string
	if err := a.DB.QueryRow(r.Context(), `SELECT password_hash FROM people WHERE id = $1`, claims.PersonID).Scan(&currentHash); err != nil {
		writeError(w, http.StatusInternalServerError, "password change failed")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.CurrentPassword)) != nil {
		writeError(w, http.StatusUnauthorized, "current password is incorrect")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "password change failed")
		return
	}
	var p models.Person
	err = scanPerson(a.DB.QueryRow(r.Context(),
		`UPDATE people SET password_hash = $1, must_change_password = false, updated_at = now()
		 WHERE id = $2
		 RETURNING `+personSelectColumns,
		string(newHash), claims.PersonID,
	), &p)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "password change failed")
		return
	}

	token, err := middleware.IssueCrewToken(p.ID, false)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue session")
		return
	}
	middleware.SetCrewSessionCookie(w, token)
	writeJSON(w, http.StatusOK, p)
}
