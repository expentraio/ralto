package middleware

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"ralto/internal/models"
)

// Two personas, two disjoint sessions — a crew member's token can never
// satisfy a staff-only route (and vice versa) because each middleware chain
// only knows how to parse its own claims type. See ralto_backend_scaffold_plan.md
// §4: this needed real design, not a copy of Equiptra's single-role shape.

const (
	StaffCookieName = "ralto_staff_session"
	CrewCookieName  = "ralto_crew_session"
)

type contextKey string

const (
	staffContextKey contextKey = "staff_user"
	crewContextKey  contextKey = "crew_person"
)

// StaffClaims identifies a scheduler/admin session (the `users` table).
type StaffClaims struct {
	UserID             string          `json:"uid"`
	Role               models.UserRole `json:"role"`
	MustChangePassword bool            `json:"must_change_password"`
	jwt.RegisteredClaims
}

// CrewClaims identifies a crew-member session (the `people` table). No role
// field — crew is a single flat persona with no admin/standard split.
type CrewClaims struct {
	PersonID           string `json:"pid"`
	MustChangePassword bool   `json:"must_change_password"`
	jwt.RegisteredClaims
}

func jwtSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev-only-insecure-secret-change-me"
	}
	return []byte(secret)
}

// --- Staff session issuance ---

func IssueStaffToken(userID string, role models.UserRole, mustChangePassword bool) (string, error) {
	claims := StaffClaims{
		UserID:             userID,
		Role:               role,
		MustChangePassword: mustChangePassword,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret())
}

func SetStaffSessionCookie(w http.ResponseWriter, token string) {
	setSessionCookie(w, StaffCookieName, token)
}

func ClearStaffSessionCookie(w http.ResponseWriter) {
	clearSessionCookie(w, StaffCookieName)
}

// --- Crew session issuance ---

func IssueCrewToken(personID string, mustChangePassword bool) (string, error) {
	claims := CrewClaims{
		PersonID:           personID,
		MustChangePassword: mustChangePassword,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret())
}

func SetCrewSessionCookie(w http.ResponseWriter, token string) {
	setSessionCookie(w, CrewCookieName, token)
}

func ClearCrewSessionCookie(w http.ResponseWriter) {
	clearSessionCookie(w, CrewCookieName)
}

// --- Shared cookie plumbing ---

func setSessionCookie(w http.ResponseWriter, name, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   os.Getenv("COOKIE_SECURE") == "true",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
	})
}

func clearSessionCookie(w http.ResponseWriter, name string) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   os.Getenv("COOKIE_SECURE") == "true",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	})
}

func parseStaffToken(tokenStr string) (*StaffClaims, error) {
	claims := &StaffClaims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		return jwtSecret(), nil
	})
	if err != nil || !token.Valid {
		return nil, err
	}
	return claims, nil
}

func parseCrewToken(tokenStr string) (*CrewClaims, error) {
	claims := &CrewClaims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		return jwtSecret(), nil
	})
	if err != nil || !token.Valid {
		return nil, err
	}
	return claims, nil
}

// --- Staff middleware ---

func RequireStaffAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(StaffCookieName)
		if err != nil {
			http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
			return
		}
		claims, err := parseStaffToken(cookie.Value)
		if err != nil {
			http.Error(w, `{"error":"invalid session"}`, http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), staffContextKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireStaffPasswordSet mirrors Equiptra's RequirePasswordSet: a staff
// session issued with must_change_password=true can only reach /api/me and
// the self-service password-change endpoint until a new password is set.
func RequireStaffPasswordSet(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := StaffFromContext(r.Context())
		exempt := r.URL.Path == "/api/me" || r.URL.Path == "/api/users/me/password"
		if ok && claims.MustChangePassword && !exempt {
			http.Error(w, `{"error":"password change required","must_change_password":true}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireAdmin must be chained after RequireStaffAuth.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := StaffFromContext(r.Context())
		if !ok || claims.Role != models.UserRoleAdmin {
			http.Error(w, `{"error":"admin role required"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func StaffFromContext(ctx context.Context) (*StaffClaims, bool) {
	claims, ok := ctx.Value(staffContextKey).(*StaffClaims)
	return claims, ok
}

// --- Crew middleware ---

func RequireCrewAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(CrewCookieName)
		if err != nil {
			http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
			return
		}
		claims, err := parseCrewToken(cookie.Value)
		if err != nil {
			http.Error(w, `{"error":"invalid session"}`, http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), crewContextKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireCrewPasswordSet mirrors RequireStaffPasswordSet for the crew persona.
func RequireCrewPasswordSet(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := CrewFromContext(r.Context())
		exempt := r.URL.Path == "/api/crew/me" || r.URL.Path == "/api/crew/password"
		if ok && claims.MustChangePassword && !exempt {
			http.Error(w, `{"error":"password change required","must_change_password":true}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func CrewFromContext(ctx context.Context) (*CrewClaims, bool) {
	claims, ok := ctx.Value(crewContextKey).(*CrewClaims)
	return claims, ok
}
