package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"ralto/internal/middleware"
	"ralto/internal/models"
)

// BridgeCoreSession is Ralto's half of Stage 2's SSO handoff
// (simplified_suite_screens_v0_3.md §5). It runs ahead of every route,
// including RequireStaffAuth's own chain, and is a pure no-op unless BOTH
// hold: the request has no ralto_staff_session cookie yet, and it does
// carry a suite_session cookie (Core's shared .simplifiedsuite.io cookie).
// When both hold, it resolves the Core session to a local `users` row
// (lazy-creating one on first sight — step 4 of §5) and mints a completely
// ordinary ralto_staff_session for it, so RequireStaffAuth — left entirely
// unmodified — sees exactly the request shape it already knows how to
// handle. A request carrying a valid ralto_staff_session, or carrying
// neither cookie, passes through untouched: the old login path is
// unaffected by this file existing at all.
func (a *API) BridgeCoreSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := r.Cookie(middleware.StaffCookieName); err == nil {
			next.ServeHTTP(w, r)
			return
		}
		suiteCookie, err := r.Cookie(middleware.CoreSessionCookieName)
		if err != nil || suiteCookie.Value == "" {
			next.ServeHTTP(w, r)
			return
		}

		person, err := middleware.FetchCorePerson(r.Context(), suiteCookie.Value)
		if err != nil || person == nil {
			// Core unreachable, or told us the token doesn't resolve — fall
			// through to the classic path, which 401s as it always has.
			next.ServeHTTP(w, r)
			return
		}

		role, hasRalto := raltoRoleFor(person)
		if !hasRalto {
			next.ServeHTTP(w, r)
			return
		}

		userID, err := a.resolveOrCreateBridgedUser(r, person, role)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		token, err := middleware.IssueStaffToken(userID, role, false)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}
		middleware.SetStaffSessionCookie(w, token)
		// So this same request — not just the next one — sees a normal
		// staff session: RequireStaffAuth reads this cookie right after.
		r.AddCookie(&http.Cookie{Name: middleware.StaffCookieName, Value: token})
		next.ServeHTTP(w, r)
	})
}

func raltoRoleFor(person *middleware.CorePerson) (models.UserRole, bool) {
	for _, pa := range person.ProductAccess {
		if pa.Product != "ralto" {
			continue
		}
		switch models.UserRole(pa.Role) {
		case models.UserRoleAdmin, models.UserRoleScheduler:
			return models.UserRole(pa.Role), true
		}
	}
	return "", false
}

// resolveOrCreateBridgedUser looks up a local users row "for that
// core_person_id" per simplified_suite_screens_v0_3.md §5 step 4 — a real
// link column (see migrations/0008_core_person_id.sql), not implicit email
// matching on every request. The email lookup below only ever fires once
// per person: it's how an existing local account (like Ralto's three
// original admins, who predate Core and have core_person_id = null) gets
// linked to its Core identity the first time that person authenticates via
// the bridge. Every login after that hits the indexed core_person_id column
// directly. The synthetic password_hash on a freshly lazy-created row is a
// random value nobody is ever told — satisfies the NOT NULL column, but
// that account can only ever be reached through the Core bridge, never
// through Ralto's own local /api/auth/login, unless an admin later
// explicitly resets it via the existing AdminResetPassword flow.
func (a *API) resolveOrCreateBridgedUser(r *http.Request, person *middleware.CorePerson, role models.UserRole) (string, error) {
	var id string

	err := a.DB.QueryRow(r.Context(), `SELECT id FROM users WHERE core_person_id = $1`, person.ID).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}

	err = a.DB.QueryRow(r.Context(),
		`UPDATE users SET core_person_id = $1 WHERE lower(email) = $2 RETURNING id`,
		person.ID, normalizeEmail(person.Email),
	).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}

	unusable := make([]byte, 32)
	if _, err := rand.Read(unusable); err != nil {
		return "", err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(hex.EncodeToString(unusable)), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	err = a.DB.QueryRow(r.Context(),
		`INSERT INTO users (name, email, role, password_hash, must_change_password, organisation_id, core_person_id)
		 VALUES ($1, $2, $3, $4, false, $5, $6)
		 RETURNING id`,
		person.Name, normalizeEmail(person.Email), role, string(hash), currentOrgID, person.ID,
	).Scan(&id)
	return id, err
}
