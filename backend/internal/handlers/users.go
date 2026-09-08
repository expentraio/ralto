package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"ralto/internal/models"
)

// ListUsers, CreateUser, UpdateUser, AdminResetPassword, DeleteUser manage
// the `users` (staff) table — admin-gated, same access tier as Equiptra's
// /users resource (account/login management is more sensitive than
// day-to-day crewing data).

func (a *API) ListUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := a.DB.Query(r.Context(),
		`SELECT id, name, email, role, active, must_change_password, created_at, updated_at
		 FROM users ORDER BY name`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list users")
		return
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Active, &u.MustChangePassword, &u.CreatedAt, &u.UpdatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list users")
			return
		}
		users = append(users, u)
	}
	writeJSON(w, http.StatusOK, users)
}

type createUserRequest struct {
	Name string          `json:"name"`
	Email string         `json:"email"`
	Role models.UserRole `json:"role"`
}

// CreateUser issues a random temporary password and forces a change on
// first login (must_change_password = true) rather than accepting a
// caller-supplied password — an admin creating an account for someone else
// should never learn what that person's real password will be.
func (a *API) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Role != models.UserRoleAdmin && req.Role != models.UserRoleScheduler {
		writeError(w, http.StatusBadRequest, "role must be admin or scheduler")
		return
	}
	req.Email = normalizeEmail(req.Email)

	tempPassword, err := randomToken(12)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create user")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	var u models.User
	err = a.DB.QueryRow(r.Context(),
		`INSERT INTO users (name, email, role, password_hash, must_change_password)
		 VALUES ($1, $2, $3, $4, true)
		 RETURNING id, name, email, role, active, must_change_password, created_at, updated_at`,
		req.Name, req.Email, req.Role, string(hash),
	).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Active, &u.MustChangePassword, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to create user (email may already be in use)")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]interface{}{"user": u, "temporary_password": tempPassword})
}

type updateUserRequest struct {
	Name   string          `json:"name"`
	Email  string          `json:"email"`
	Role   models.UserRole `json:"role"`
	Active bool            `json:"active"`
}

func (a *API) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req updateUserRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = normalizeEmail(req.Email)

	var u models.User
	err := a.DB.QueryRow(r.Context(),
		`UPDATE users SET name = $1, email = $2, role = $3, active = $4, updated_at = now()
		 WHERE id = $5
		 RETURNING id, name, email, role, active, must_change_password, created_at, updated_at`,
		req.Name, req.Email, req.Role, req.Active, id,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Active, &u.MustChangePassword, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to update user")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

// AdminResetPassword mirrors CreateUser's temporary-password approach.
func (a *API) AdminResetPassword(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tempPassword, err := randomToken(12)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to reset password")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to reset password")
		return
	}
	tag, err := a.DB.Exec(r.Context(),
		`UPDATE users SET password_hash = $1, must_change_password = true, updated_at = now() WHERE id = $2`,
		string(hash), id,
	)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"temporary_password": tempPassword})
}

func (a *API) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tag, err := a.DB.Exec(r.Context(), `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to delete user")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func randomToken(nBytes int) (string, error) {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
