package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"ralto/internal/models"
)

// BookingShift handles a single Booking having a different call time on
// different days. Per the data model: every date in a Booking's range
// should have exactly one BookingShift row if shifts are used at all — the
// frontend/planner is responsible for that all-or-nothing invariant; the
// API itself just stores whatever rows it's given.

func (a *API) ListBookingShifts(w http.ResponseWriter, r *http.Request) {
	bookingID := chi.URLParam(r, "id")
	rows, err := a.DB.Query(r.Context(),
		`SELECT id, booking_id, date, call_time, end_time, notes FROM booking_shifts WHERE booking_id = $1 AND organisation_id = $2 ORDER BY date`, bookingID, currentOrgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list booking shifts")
		return
	}
	defer rows.Close()

	shifts := []models.BookingShift{}
	for rows.Next() {
		var s models.BookingShift
		if err := rows.Scan(&s.ID, &s.BookingID, &s.Date, &s.CallTime, &s.EndTime, &s.Notes); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list booking shifts")
			return
		}
		shifts = append(shifts, s)
	}
	writeJSON(w, http.StatusOK, shifts)
}

type bookingShiftWriteRequest struct {
	Date     string  `json:"date"`
	CallTime string  `json:"call_time"`
	EndTime  string  `json:"end_time"`
	Notes    *string `json:"notes"`
}

func (a *API) AddBookingShift(w http.ResponseWriter, r *http.Request) {
	bookingID := chi.URLParam(r, "id")
	var req bookingShiftWriteRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var s models.BookingShift
	err := a.DB.QueryRow(r.Context(),
		`INSERT INTO booking_shifts (booking_id, date, call_time, end_time, notes, organisation_id) VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, booking_id, date, call_time, end_time, notes`,
		bookingID, req.Date, req.CallTime, req.EndTime, req.Notes, currentOrgID,
	).Scan(&s.ID, &s.BookingID, &s.Date, &s.CallTime, &s.EndTime, &s.Notes)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to add booking shift")
		return
	}
	writeJSON(w, http.StatusCreated, s)
}

func (a *API) RemoveBookingShift(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "shiftId")
	tag, err := a.DB.Exec(r.Context(), `DELETE FROM booking_shifts WHERE id = $1 AND organisation_id = $2`, id, currentOrgID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to remove booking shift")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "booking shift not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
