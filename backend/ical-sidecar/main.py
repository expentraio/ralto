"""
Ralto iCal sidecar
==================

A thin FastAPI wrapper around ical_feed.py (copied unmodified from the
Ralto prototype files — it's already written, tested, and had a real bug
fixed, so it's treated as correct and not touched here). This file's only
job is: look up a Person by their calendar_feed_token, pull their
confirmed + offered bookings/shifts from Postgres, and hand them to
generate_ics_feed.

Deployed as its own Render service (see ../render.yaml) rather than folded
into the Go API — see ralto_backend_scaffold_plan.md §4 for why iCal stays
a Python sidecar rather than being ported to Go.
"""

import os

import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException
from fastapi.responses import PlainTextResponse

from ical_feed import Booking, BookingShift, Person, generate_ics_feed

app = FastAPI()


def get_connection():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg2.connect(database_url)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/feed/{token}.ics")
def feed(token: str):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, first_name || ' ' || last_name AS name FROM people WHERE calendar_feed_token = %s",
                (token,),
            )
            person_row = cur.fetchone()
            if not person_row:
                raise HTTPException(status_code=404, detail="Unknown or revoked calendar feed token")
            person = Person(id=person_row["id"], name=person_row["name"], calendar_feed_token=token)

            # Confirmed and offered (tentative) bookings only — declined and
            # cancelled are never useful on a personal calendar. Per the
            # schema addendum's open question, this feed shows tentative
            # bookings too (STATUS:TENTATIVE), not confirmed-only.
            cur.execute(
                """
                SELECT b.id, b.status, b.notes,
                       j.name AS job_name, c.name AS client_name, ro.name AS role
                FROM bookings b
                JOIN job_requirements jr ON jr.id = b.job_requirement_id
                JOIN jobs j ON j.id = jr.job_id
                JOIN clients c ON c.id = j.client_id
                JOIN roles ro ON ro.id = jr.role_id
                WHERE b.person_id = %s AND b.status IN ('confirmed', 'offered')
                """,
                (person_row["id"],),
            )
            booking_rows = cur.fetchall()

            bookings = []
            for row in booking_rows:
                cur.execute(
                    """
                    SELECT bs.id, bs.date, bs.call_time, bs.end_time,
                           COALESCE(v.name, 'Venue TBC') AS venue, COALESCE(v.timezone, 'UTC') AS timezone
                    FROM booking_shifts bs
                    JOIN bookings b ON b.id = bs.booking_id
                    JOIN job_requirements jr ON jr.id = b.job_requirement_id
                    JOIN jobs j ON j.id = jr.job_id
                    LEFT JOIN venues v ON v.id = j.venue_id
                    WHERE bs.booking_id = %s
                    ORDER BY bs.date
                    """,
                    (row["id"],),
                )
                shift_rows = cur.fetchall()
                shifts = [
                    BookingShift(
                        id=str(s["id"]),
                        date=str(s["date"]),
                        call_time=str(s["call_time"])[:5],
                        end_time=str(s["end_time"])[:5],
                        venue=s["venue"],
                        timezone=s["timezone"],
                    )
                    for s in shift_rows
                ]
                if not shifts:
                    continue  # no shifts recorded yet — nothing to put on a calendar
                bookings.append(
                    Booking(
                        id=str(row["id"]),
                        job_name=row["job_name"],
                        client_name=row["client_name"],
                        role=row["role"],
                        status=row["status"],
                        notes=row["notes"],
                        shifts=shifts,
                    )
                )
    finally:
        conn.close()

    ics = generate_ics_feed(person, bookings)
    return PlainTextResponse(
        content=ics,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'inline; filename="ralto-{token}.ics"'},
    )
