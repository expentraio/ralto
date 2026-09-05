package notify

import "fmt"

// The six crew-facing notification triggers, as fixed skeletons with named
// variables — per ralto_notification_templates_v1.md. Written once here so
// email today and WhatsApp later are two renderings of the same definition,
// not two separate things to maintain (the doc's own stated goal).
//
// Each Render* function returns (subject, htmlBody) for SendGrid. The plain
// {role}/{job_name}/etc. placeholders in the doc's email copy are filled in
// directly — no separate templating engine needed for a handful of fixed
// strings.

func RenderBookingOffered(role, jobName, dates, ctaURL string) (subject, body string) {
	subject = fmt.Sprintf("New offer: %s on %s", role, jobName)
	body = fmt.Sprintf(
		`You've been offered %s on %s, %s. <a href="%s">Open Ralto to accept or decline</a>.`,
		role, jobName, dates, ctaURL,
	)
	return subject, body
}

func RenderBookingConfirmed(role, jobName, dates, ctaURL string) (subject, body string) {
	subject = fmt.Sprintf("Confirmed: %s on %s", role, jobName)
	body = fmt.Sprintf(
		`You're confirmed for %s on %s, %s. <a href="%s">Open Ralto for full shift details and call times</a>.`,
		role, jobName, dates, ctaURL,
	)
	return subject, body
}

func RenderBookingUpdated(jobName, changeDescription, ctaURL string) (subject, body string) {
	subject = fmt.Sprintf("Update: %s", jobName)
	body = fmt.Sprintf(`%s. <a href="%s">Open Ralto to review and acknowledge</a>.`, changeDescription, ctaURL)
	return subject, body
}

func RenderBookingCancelled(role, jobName, dates string) (subject, body string) {
	subject = fmt.Sprintf("Cancelled: %s on %s", role, jobName)
	body = fmt.Sprintf("%s on %s (%s) has been cancelled.", role, jobName, dates)
	return subject, body
}

func RenderShiftReminder(jobName, callTime, venue, ctaURL string) (subject, body string) {
	subject = fmt.Sprintf("Reminder: %s today", jobName)
	body = fmt.Sprintf(
		`Call time %s at %s. <a href="%s">Open Ralto for full details</a>.`,
		callTime, venue, ctaURL,
	)
	return subject, body
}

func RenderAvailabilityRequest(dates, location, ctaURL string) (subject, body string) {
	subject = fmt.Sprintf("Availability check: %s", dates)
	body = fmt.Sprintf(
		`Are you available %s for %s? <a href="%s">Respond via Ralto</a>.`,
		dates, location, ctaURL,
	)
	return subject, body
}
