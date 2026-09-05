package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"ralto/internal/db"
	"ralto/internal/handlers"
	"ralto/internal/middleware"
	"ralto/internal/notify"
)

func main() {
	ctx := context.Background()

	pool, err := db.Connect(ctx)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	notifyClient := notify.NewClient()
	if notifyClient == nil {
		log.Printf("SENDGRID_API_KEY not set — email notifications are disabled")
	}

	api := &handlers.API{DB: pool, Notify: notifyClient}

	r := chi.NewRouter()
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.Timeout(30 * time.Second))

	// Env-configurable comma-separated list rather than Equiptra's single
	// FRONTEND_ORIGIN string — scheduler and crew personas may end up on
	// separate subdomains later (app.ralto.io / crew.ralto.io), so CORS is
	// built to allow more than one origin from the start.
	frontendOrigins := splitOrigins(os.Getenv("FRONTEND_ORIGINS"))
	if len(frontendOrigins) == 0 {
		frontendOrigins = []string{"http://localhost:5173"}
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   frontendOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
	}))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// Basic brute-force protection on both login endpoints, reusing the
	// rate limiter copied from Equiptra (there it only guarded the public
	// fault-report form; login is the analogous unauthenticated write
	// surface here).
	r.With(middleware.RateLimit(20, time.Minute)).Post("/api/auth/login", api.Login)
	r.With(middleware.RateLimit(20, time.Minute)).Post("/api/crew/auth/login", api.CrewLogin)
	r.Post("/api/auth/logout", api.Logout)
	r.Post("/api/crew/auth/logout", api.CrewLogout)

	registerStaffRoutes(r, api)
	registerCrewRoutes(r, api)

	addr := os.Getenv("LISTEN_ADDR")
	if addr == "" {
		if port := os.Getenv("PORT"); port != "" {
			addr = ":" + port
		} else {
			addr = ":8080"
		}
	}
	log.Printf("ralto api listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}

func splitOrigins(raw string) []string {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}
