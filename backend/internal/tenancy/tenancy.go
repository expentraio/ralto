// Package tenancy holds the one shared value every organisation_id column
// and query in this backend references, until Core (the shared Simplified
// Suite identity/tenancy layer) exists and issues real Organisation rows.
package tenancy

// PlaceholderOrganisationID stands in for "the one organisation that
// currently exists" (Simplified Suite / Expentra itself). Every domain
// table's organisation_id column is backfilled with this exact value (see
// migrations/0006_organisation_id.sql), and every handler that sets or
// filters on organisation_id references this constant directly rather
// than a hardcoded literal, so that swapping it for Core's real
// Organisation.id — once Core exists — is a one-line change here.
//
// See docs/organisation_id_placeholder.md for the fuller reconciliation
// note this value needs once Core is real.
const PlaceholderOrganisationID = "fa065f2f-25d2-4d9a-9383-3fb1ca506a0a"
