"""
ScheduleIt -> Ralto migration importer (scaffold)
==================================================

Purpose
-------
One-time (and re-runnable, incremental) extraction of data from the ScheduleIt
REST API, transformed into Ralto's schema shape (Persons, Skills, Roles,
PersonRoles, Bookings, BookingShifts).

This is a SCAFFOLD, not a finished importer. Two things are marked TODO
because they can't be resolved from the API docs alone and need a look at a
real ScheduleIt account before this can run correctly:

  1. Staff vs Freelancer flag: unknown which `data1`-`data10` custom field
     (if any) on `resources` encodes employment type. This is Ralto's core
     business-logic fork (auto-suggested bookings vs manual-only), so this
     MUST be confirmed before any resource import is trusted.
  2. Day-varying call times: ScheduleIt `events` appear to be single
     date_start/date_end blocks. Ralto's BookingShift model supports
     different call times per day within one booking. There's no evidence
     ScheduleIt models this natively, so multi-day events will need a
     splitting rule decided by Ric (e.g. one BookingShift per calendar day,
     inheriting the same start/end time unless told otherwise).

Design notes
------------
- Auth: HTTP Basic (accountnum_loginname / password), per ScheduleIt's docs.
- Rate-limit handling follows ScheduleIt's mandatory error-checking rules:
    200               -> proceed
    429               -> wait 60s, retry
    400 / 403         -> stop, surface for investigation
    3 non-200 in a row -> stop entirely (circuit breaker)
- Incremental sync uses `search_date_modified=>{last_sync_iso}` per dataset,
  with the sync watermark persisted to a local JSON file so re-runs only
  pull deltas (ScheduleIt explicitly bans full polling loops).
- Field selection is explicit (`fields=...`) to avoid the default
  "summary only" response and to keep payloads small.

Usage
-----
    python scheduleit_to_ralto_import.py --mode full
    python scheduleit_to_ralto_import.py --mode incremental

Environment variables required:
    SCHEDULEIT_ACCOUNT_LOGIN   e.g. "12345_jsmith"
    SCHEDULEIT_PASSWORD
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import requests

API_ROOT = "https://www.scheduleit.com/api/"
SYNC_STATE_PATH = Path("scheduleit_sync_state.json")

# ---------------------------------------------------------------------------
# Low-level API client
# ---------------------------------------------------------------------------


class ScheduleItError(Exception):
    pass


class ScheduleItClient:
    """Thin wrapper around the ScheduleIt REST API with the rate-limit /
    error-handling behaviour their docs mandate."""

    def __init__(self, account_login: str, password: str):
        self.session = requests.Session()
        self.session.auth = (account_login, password)
        self._consecutive_errors = 0

    def _request(self, method: str, path: str, params: dict | None = None,
                 data: dict | None = None) -> Any:
        url = f"{API_ROOT}{path.lstrip('/')}"
        while True:
            resp = self.session.request(method, url, params=params, data=data, timeout=30)

            if resp.status_code == 200:
                self._consecutive_errors = 0
                return resp.json() if resp.content else None

            if resp.status_code == 429:
                # ScheduleIt sends 429 deliberately to test client backoff.
                time.sleep(60)
                continue

            if resp.status_code in (400, 403):
                raise ScheduleItError(
                    f"{resp.status_code} on {method} {url} — login/security issue. "
                    "Stopping per ScheduleIt's API terms."
                )

            # Any other non-200: count toward the 3-in-a-row circuit breaker.
            self._consecutive_errors += 1
            if self._consecutive_errors >= 3:
                raise ScheduleItError(
                    f"3 consecutive non-200 responses (last: {resp.status_code}). "
                    "Stopping per ScheduleIt's API terms; wait before retrying."
                )
            time.sleep(5)

    def get(self, dataset: str, fields: Iterable[str] | None = None,
             search: dict | None = None, limit: int | None = None) -> list[dict]:
        params: dict[str, Any] = {}
        if fields:
            params["fields"] = ",".join(fields)
        if limit:
            params["limit"] = limit
        if search:
            params.update(search)
        result = self._request("GET", dataset, params=params)
        # ScheduleIt wraps list results; adjust key name if their actual
        # response envelope differs once tested against a live account.
        return result if isinstance(result, list) else result.get("data", [])

    def get_full_record(self, dataset: str, record_id: str | int) -> dict:
        return self._request("GET", f"{dataset}/{record_id}")


# ---------------------------------------------------------------------------
# Sync watermark (for incremental runs)
# ---------------------------------------------------------------------------


def load_sync_state() -> dict:
    if SYNC_STATE_PATH.exists():
        return json.loads(SYNC_STATE_PATH.read_text())
    return {}


def save_sync_state(state: dict) -> None:
    SYNC_STATE_PATH.write_text(json.dumps(state, indent=2))


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------


RESOURCE_FIELDS = [
    "id", "name", "email", "data1", "data2", "data3", "data4", "data5",
    "data6", "data7", "data8", "data9", "data10", "skills", "price",
    "date_modified",
]

GROUP_FIELDS = ["id", "name", "min_resources", "max_resources", "date_modified"]

EVENT_FIELDS = [
    "id", "title", "owner", "date_start", "date_end", "notes",
    "custom1", "custom2", "custom3", "custom4", "custom7", "custom8",
    "custom9", "completed", "date_modified",
]


def extract_dataset(client: ScheduleItClient, dataset: str, fields: list[str],
                     since: str | None) -> list[dict]:
    search = {"search_date_modified": f">{since}"} if since else None
    records = client.get(dataset, fields=fields, search=search, limit=1000)
    # NOTE: pagination beyond `limit` isn't documented explicitly here —
    # confirm whether ScheduleIt returns a next-page token/link, or whether
    # `limit` is a hard ceiling requiring search_id range-slicing instead.
    return records


# ---------------------------------------------------------------------------
# Transformation: ScheduleIt shape -> Ralto shape
# ---------------------------------------------------------------------------


@dataclass
class RaltoPerson:
    source_id: str
    name: str
    email: str | None
    employment_type: str  # "staff" | "freelancer" | "unknown"
    standard_rate: float | None
    skill_ids: list[str] = field(default_factory=list)
    raw: dict = field(default_factory=dict)


@dataclass
class RaltoRole:
    source_id: str
    name: str
    min_required: int
    max_required: int


@dataclass
class RaltoBookingShift:
    date: str
    call_time: str
    end_time: str


@dataclass
class RaltoBooking:
    source_id: str
    person_source_id: str | None
    title: str
    notes: str | None
    shifts: list[RaltoBookingShift] = field(default_factory=list)


# CONFIRMED against a live ScheduleIt account (Sept 2026): employment type is
# NOT a data{N} field — it's encoded as GROUP MEMBERSHIP. A resource's
# `owner` field is a comma-separated list of group ids it belongs to.
# These group ids will differ per ScheduleIt account, so they must be
# resolved dynamically from /api/groups by name at the start of each run
# rather than hardcoded — the constants below are only a fallback/example
# from the account we inspected.
STAFF_GROUP_NAMES = {"staff"}
FREELANCER_GROUP_NAMES = {"freelancers", "freelance"}
INACTIVE_GROUP_NAMES = {"ex-employees", "freelance archive", "archive"}
# Non-person groups seen in the wild: "Customers", "Type/Status", "Fleet" —
# resources tagged only with these (and none of the above) are NOT crew and
# should be excluded from the Person import entirely.
NON_PERSON_GROUP_NAMES = {"customers", "type/status", "fleet"}


def build_group_lookup(groups: list[dict]) -> dict[str, set[str]]:
    """Resolve group ids into role buckets by name, once per run.

    Returns a dict of bucket -> set of group id strings, e.g.
    {"staff": {"10"}, "freelancer": {"862"}, "inactive": {"1684", "2194"},
     "non_person": {"282", "200", "230"}}
    """
    buckets: dict[str, set[str]] = {
        "staff": set(), "freelancer": set(), "inactive": set(), "non_person": set(),
    }
    for g in groups:
        name = (g.get("name") or "").strip().lower()
        gid = str(g["id"])
        if name in STAFF_GROUP_NAMES:
            buckets["staff"].add(gid)
        elif name in FREELANCER_GROUP_NAMES:
            buckets["freelancer"].add(gid)
        elif name in INACTIVE_GROUP_NAMES:
            buckets["inactive"].add(gid)
        elif name in NON_PERSON_GROUP_NAMES:
            buckets["non_person"].add(gid)
    return buckets


def owner_ids(owner_field: str | None) -> set[str]:
    if not owner_field:
        return set()
    return {part.strip() for part in str(owner_field).split(",") if part.strip()}


def map_resource_to_person(resource: dict, group_buckets: dict[str, set[str]]) -> RaltoPerson | None:
    """Returns None if this resource isn't a person at all (e.g. it's a
    client, status tag, or fleet asset misfiled under /resources)."""
    ids = owner_ids(resource.get("owner"))

    is_only_non_person = bool(ids) and ids.issubset(group_buckets["non_person"])
    if is_only_non_person:
        return None

    if ids & group_buckets["staff"]:
        employment_type = "staff"
    elif ids & group_buckets["freelancer"]:
        employment_type = "freelancer"
    else:
        employment_type = "unknown"  # flag for manual review, never assume

    is_inactive = bool(ids & group_buckets["inactive"])

    skill_ids = []
    if resource.get("skills"):
        skill_ids = [s.strip() for s in str(resource["skills"]).split(",") if s.strip()]

    return RaltoPerson(
        source_id=str(resource["id"]),
        name=resource.get("name", ""),
        email=resource.get("email") or None,
        employment_type=employment_type,
        standard_rate=resource.get("price"),
        skill_ids=skill_ids,
        raw={**resource, "_is_inactive": is_inactive},
    )


def map_group_to_role(group: dict) -> RaltoRole:
    return RaltoRole(
        source_id=str(group["id"]),
        name=group.get("name", ""),
        min_required=int(group.get("min_resources") or 0),
        max_required=int(group.get("max_resources") or 0),
    )


def split_event_into_shifts(event: dict) -> list[RaltoBookingShift]:
    """Split a single ScheduleIt event into per-day BookingShifts.

    TODO(decide with Ric): ScheduleIt events carry one date_start/date_end
    pair. If an event spans multiple calendar days, this currently repeats
    the SAME start/end clock time on each day — it does NOT invent
    day-varying call times, because ScheduleIt has no field for that.
    If real call-time-per-day data lives somewhere else (a custom field,
    a naming convention in `notes`, or simply doesn't exist in ScheduleIt
    and must be re-entered manually post-migration), that decision belongs
    here.
    """
    start = datetime.fromisoformat(event["date_start"])
    end = datetime.fromisoformat(event["date_end"])

    shifts: list[RaltoBookingShift] = []
    current_day = start.date()
    while current_day <= end.date():
        shifts.append(
            RaltoBookingShift(
                date=current_day.isoformat(),
                call_time=start.strftime("%H:%M:%S"),
                end_time=end.strftime("%H:%M:%S"),
            )
        )
        current_day = current_day.fromordinal(current_day.toordinal() + 1)
    return shifts


def map_event_to_booking(event: dict, known_person_ids: set[str]) -> RaltoBooking:
    """CONFIRMED against a live account: an event's `owner` field is a mixed
    tag list — it can contain client ids, status-tag ids, AND crew person
    ids all together (e.g. one real event had owner=",815,253,401," which
    resolved to a client "Gravity Media" plus two status tags "Cancelled"
    and "Planning" — no crew person at all). We only treat an id as the
    booked person if it's already known to be a person from the resources
    pull (i.e. present in `known_person_ids`); everything else in `owner`
    is a tag, not an assignment, and is currently discarded here.

    NOTE: an event can plausibly reference MORE THAN ONE crew person via
    `owner` (a whole-team callsheet style event) — this scaffold currently
    only takes the first matching person id and will need to be extended
    to emit one Booking per matched person if that turns out to be how the
    account actually uses events.
    """
    ids = owner_ids(event.get("owner"))
    matched_person_ids = [i for i in ids if i in known_person_ids]

    return RaltoBooking(
        source_id=str(event["id"]),
        person_source_id=matched_person_ids[0] if matched_person_ids else None,
        title=event.get("title", ""),
        notes=event.get("notes") or None,
        shifts=split_event_into_shifts(event),
    )


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


def run_import(mode: str) -> None:
    account_login = os.environ.get("SCHEDULEIT_ACCOUNT_LOGIN")
    password = os.environ.get("SCHEDULEIT_PASSWORD")
    if not account_login or not password:
        sys.exit("Set SCHEDULEIT_ACCOUNT_LOGIN and SCHEDULEIT_PASSWORD env vars.")

    client = ScheduleItClient(account_login, password)
    sync_state = load_sync_state() if mode == "incremental" else {}
    run_started_at = datetime.now(timezone.utc).isoformat()

    # Groups must be pulled first (unfiltered by date_modified) since we need
    # the FULL group list every run to correctly resolve employment type —
    # a stale/partial group lookup would silently misclassify people.
    print(f"[{mode}] Extracting groups (-> roles + employment-type lookup)...")
    groups_full = client.get("groups", fields=["id", "name"], limit=1000)
    group_buckets = build_group_lookup(groups_full)

    groups = extract_dataset(client, "groups", GROUP_FIELDS,
                              sync_state.get("groups"))
    # Roles = groups that aren't employment/status/non-person buckets.
    excluded_group_ids = (group_buckets["staff"] | group_buckets["freelancer"]
                           | group_buckets["inactive"] | group_buckets["non_person"])
    roles = [map_group_to_role(g) for g in groups if str(g["id"]) not in excluded_group_ids]

    print(f"[{mode}] Extracting resources...")
    resources = extract_dataset(client, "resources", RESOURCE_FIELDS,
                                 sync_state.get("resources"))
    people = [map_resource_to_person(r, group_buckets) for r in resources]
    people = [p for p in people if p is not None]  # drop non-person resources
    unknown_employment = [p for p in people if p.employment_type == "unknown"]
    if unknown_employment:
        print(f"  WARNING: {len(unknown_employment)} resource(s) have unresolved "
              f"employment type — these must NOT be trusted for the "
              f"Staff-vs-Freelancer automation fork until reviewed.")
    inactive_count = sum(1 for p in people if p.raw.get("_is_inactive"))
    if inactive_count:
        print(f"  NOTE: {inactive_count} resource(s) are tagged Ex-employee/"
              f"Freelance Archive — confirm whether these should import at all.")

    print(f"[{mode}] Extracting events (-> bookings/shifts)...")
    known_person_ids = {p.source_id for p in people}
    events = extract_dataset(client, "events", EVENT_FIELDS,
                              sync_state.get("events"))
    bookings = [map_event_to_booking(e, known_person_ids) for e in events]
    unassigned = [b for b in bookings if b.person_source_id is None]
    if unassigned:
        print(f"  NOTE: {len(unassigned)} event(s) had no crew person id in "
              f"`owner` (likely client/status-only placeholder events) — "
              f"these won't map to a Ralto Booking as-is.")

    print(f"Extracted: {len(people)} people, {len(roles)} roles, "
          f"{len(bookings)} bookings "
          f"({sum(len(b.shifts) for b in bookings)} shifts total).")

    # TODO: replace with real Ralto API/DB writes. For now, dump to JSON so
    # the mapping can be eyeballed against a real ScheduleIt export before
    # any writes happen against Ralto.
    output = {
        "people": [p.__dict__ for p in people],
        "roles": [r.__dict__ for r in roles],
        "bookings": [
            {**b.__dict__, "shifts": [s.__dict__ for s in b.shifts]}
            for b in bookings
        ],
    }
    out_path = Path("scheduleit_export_preview.json")
    out_path.write_text(json.dumps(output, indent=2, default=str))
    print(f"Preview written to {out_path.resolve()}")

    sync_state.update({
        "resources": run_started_at,
        "groups": run_started_at,
        "events": run_started_at,
    })
    save_sync_state(sync_state)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["full", "incremental"], default="full")
    args = parser.parse_args()
    run_import(args.mode)
