// Mirrors the Go API's JSON response shapes 1:1 (bare JSON, no envelope —
// see backend/internal/handlers/helpers.go's writeJSON).

export type StaffRole = 'admin' | 'scheduler'

export interface StaffUser {
  id: string
  name: string
  email: string
  role: StaffRole
  active: boolean
  must_change_password: boolean
  created_at: string
  updated_at: string
}

export type EmploymentType = 'staff' | 'freelancer'
export type PersonStatus = 'active' | 'inactive'
export type PreferredStatus = 'preferred' | 'approved' | 'standard' | 'restricted'

export interface Person {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  base_location?: string
  employment_type: EmploymentType
  status: PersonStatus
  preferred_status: PreferredStatus
  standard_rate?: number
  rate_currency?: string
  notes?: string
  phone_number?: string
  notification_channels?: string
  active: boolean
  must_change_password: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  notes?: string
  brand_color_hex?: string
  website?: string
  created_at: string
  updated_at: string
}

export interface Venue {
  id: string
  name: string
  address?: string
  city?: string
  country?: string
  timezone: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: string
  category?: string
}

export type JobStatus = 'draft' | 'defining' | 'crewing' | 'confirmed' | 'briefed' | 'live' | 'complete' | 'cancelled'

export interface Job {
  id: string
  name: string
  client_id: string
  project_reference?: string
  venue_id?: string
  project_id?: string
  start_date: string
  end_date: string
  status: JobStatus
  color_hex?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface JobContact {
  id: string
  job_id: string
  name: string
  role_title?: string
  email?: string
  phone?: string
}

export interface JobRequirementWithCounts {
  id: string
  job_id: string
  role_id: string
  role_name: string
  quantity_required: number
  quantity_confirmed: number
  quantity_offered: number
  start_date: string
  end_date: string
  call_time?: string
  notes?: string
}

export type BookingStatus = 'offered' | 'confirmed' | 'declined' | 'cancelled' | 'unavailable' | 'conflict' | 'complete'

export interface Booking {
  id: string
  job_requirement_id: string
  person_id: string
  status: BookingStatus
  start_date: string
  end_date: string
  call_time?: string
  rate_override?: number
  offered_at: string
  responded_at?: string
  confirmed_at?: string
  notes?: string
}

export interface CrewBooking extends Booking {
  role_name: string
  job_name: string
  client_name: string
  venue_name?: string
  job_start_date: string
  job_end_date: string
}

export interface Candidate {
  person_id: string
  name: string
  base_location?: string
  preferred_status: PreferredStatus
  standard_rate?: number
  rate_currency?: string
  reason?: string
}

export interface CandidateGroups {
  suitable: Candidate[]
  possible: Candidate[]
  unavailable: Candidate[]
}

export type AlertType =
  | 'missing_crew'
  | 'late_confirmation'
  | 'call_time_change'
  | 'conflict'
  | 'unacknowledged_update'
  | 'no_show'
  | 'auto_suggested_booking'

export interface OperationalAlert {
  id: string
  job_id: string
  job_name: string
  type: AlertType
  related_entity_id?: string
  status: 'open' | 'resolved'
  created_at: string
  resolved_at?: string
}

export type AvailabilityRequestStatus = 'pending' | 'responded'
export type AvailabilityResponseValue = 'yes' | 'partially' | 'no'

export interface AvailabilityRequest {
  id: string
  person_id: string
  job_id?: string
  start_date: string
  end_date: string
  message?: string
  status: AvailabilityRequestStatus
  response?: AvailabilityResponseValue
  responded_at?: string
  suggested_booking_id?: string
  created_at: string
}

export interface PersonDocument {
  id: string
  person_id: string
  type: 'certification' | 'visa' | 'production_credential'
  file_ref: string
  expiry_date?: string
  uploaded_at: string
}
