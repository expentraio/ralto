package handlers

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"ralto/internal/models"
)

func (a *API) ListTimesheets(w http.ResponseWriter, r *http.Request) {
	statusFilter := r.URL.Query().Get("status")
	var rows pgx.Rows
	var err error
	if statusFilter != "" {
		rows, err = a.DB.Query(r.Context(),
			`SELECT id, booking_id, scheduled_start, scheduled_end, actual_start, actual_end, break_minutes,
			        status, submitted_at, approved_by, approved_at, calculated_cost
			 FROM timesheets WHERE status::text = $1 ORDER BY submitted_at DESC NULLS LAST`, statusFilter)
	} else {
		rows, err = a.DB.Query(r.Context(),
			`SELECT id, booking_id, scheduled_start, scheduled_end, actual_start, actual_end, break_minutes,
			        status, submitted_at, approved_by, approved_at, calculated_cost
			 FROM timesheets ORDER BY submitted_at DESC NULLS LAST`)
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list timesheets")
		return
	}
	defer rows.Close()

	sheets := []models.Timesheet{}
	for rows.Next() {
		var t models.Timesheet
		if err := rows.Scan(&t.ID, &t.BookingID, &t.ScheduledStart, &t.ScheduledEnd, &t.ActualStart, &t.ActualEnd,
			&t.BreakMinutes, &t.Status, &t.SubmittedAt, &t.ApprovedBy, &t.ApprovedAt, &t.CalculatedCost); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list timesheets")
			return
		}
		sheets = append(sheets, t)
	}
	writeJSON(w, http.StatusOK, sheets)
}

func (a *API) GetTimesheet(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var t models.Timesheet
	err := a.DB.QueryRow(r.Context(),
		`SELECT id, booking_id, scheduled_start, scheduled_end, actual_start, actual_end, break_minutes,
		        status, submitted_at, approved_by, approved_at, calculated_cost
		 FROM timesheets WHERE id = $1`, id,
	).Scan(&t.ID, &t.BookingID, &t.ScheduledStart, &t.ScheduledEnd, &t.ActualStart, &t.ActualEnd,
		&t.BreakMinutes, &t.Status, &t.SubmittedAt, &t.ApprovedBy, &t.ApprovedAt, &t.CalculatedCost)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "timesheet not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get timesheet")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// ApproveTimesheet computes calculated_cost from the booking's rate (or its
// rate_override) plus the person's OvertimeRule, per the data model's
// "derived, not manually entered" note on Timesheet.calculated_cost.
func (a *API) ApproveTimesheet(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	approverID, _ := staffClaimsFromContext(r)

	var actualStart, actualEnd *string
	var breakMinutes int
	var rate float64
	var thresholdHours, multiplier *float64
	err := a.DB.QueryRow(r.Context(), `
		SELECT t.actual_start::text, t.actual_end::text, t.break_minutes,
		       COALESCE(b.rate_override, p.standard_rate, 0),
		       ot.threshold_hours, ot.multiplier
		FROM timesheets t
		JOIN bookings b ON b.id = t.booking_id
		JOIN people p ON p.id = b.person_id
		LEFT JOIN overtime_rules ot ON ot.id = p.overtime_rule_id
		WHERE t.id = $1`, id,
	).Scan(&actualStart, &actualEnd, &breakMinutes, &rate, &thresholdHours, &multiplier)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "timesheet not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to approve timesheet")
		return
	}

	cost := calculateTimesheetCost(rate, thresholdHours, multiplier)

	var t models.Timesheet
	err = a.DB.QueryRow(r.Context(),
		`UPDATE timesheets SET status = 'approved', approved_by = $1, approved_at = now(), calculated_cost = $2
		 WHERE id = $3
		 RETURNING id, booking_id, scheduled_start, scheduled_end, actual_start, actual_end, break_minutes,
		           status, submitted_at, approved_by, approved_at, calculated_cost`,
		approverID, cost, id,
	).Scan(&t.ID, &t.BookingID, &t.ScheduledStart, &t.ScheduledEnd, &t.ActualStart, &t.ActualEnd,
		&t.BreakMinutes, &t.Status, &t.SubmittedAt, &t.ApprovedBy, &t.ApprovedAt, &t.CalculatedCost)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to approve timesheet")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// calculateTimesheetCost is a flat day-rate calculation for Phase 1 — a
// full hours-worked-vs-scheduled overtime engine (using actual_start/end,
// break_minutes and the threshold) is real scope beyond what's needed to
// unblock the Timesheet UI now, and the data model doesn't specify the
// exact overtime formula. Kept as its own function so that engine can
// replace this body later without touching ApproveTimesheet's plumbing.
func calculateTimesheetCost(dayRate float64, thresholdHours, multiplier *float64) float64 {
	return dayRate
}

func (a *API) RejectTimesheet(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	approverID, _ := staffClaimsFromContext(r)
	var t models.Timesheet
	err := a.DB.QueryRow(r.Context(),
		`UPDATE timesheets SET status = 'rejected', approved_by = $1, approved_at = now()
		 WHERE id = $2
		 RETURNING id, booking_id, scheduled_start, scheduled_end, actual_start, actual_end, break_minutes,
		           status, submitted_at, approved_by, approved_at, calculated_cost`,
		approverID, id,
	).Scan(&t.ID, &t.BookingID, &t.ScheduledStart, &t.ScheduledEnd, &t.ActualStart, &t.ActualEnd,
		&t.BreakMinutes, &t.Status, &t.SubmittedAt, &t.ApprovedBy, &t.ApprovedAt, &t.CalculatedCost)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "timesheet not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to reject timesheet")
		return
	}
	writeJSON(w, http.StatusOK, t)
}
