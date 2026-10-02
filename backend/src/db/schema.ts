// Idempotent schema: safe to run on every start.
export const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  auth_provider TEXT NOT NULL DEFAULT 'LOCAL' CHECK (auth_provider IN ('LOCAL', 'GOOGLE')),
  reset_token_hash TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  faculty TEXT,
  department TEXT,
  semester TEXT,
  gender TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  profile_photo TEXT,
  role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'ADMIN', 'STAFF', 'SUPER_ADMIN')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seminars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_image TEXT,
  category TEXT NOT NULL,
  speaker TEXT,
  speaker_position TEXT,
  organizer TEXT NOT NULL DEFAULT 'JUTSA',
  venue TEXT NOT NULL,
  start_date_time TIMESTAMPTZ NOT NULL,
  end_date_time TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity >= 1),
  registration_open_at TIMESTAMPTZ,
  registration_close_at TIMESTAMPTZ NOT NULL,
  cancellation_close_at TIMESTAMPTZ NOT NULL,
  waitlist_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED', 'ARCHIVED')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS seminars_status_start_idx ON seminars (status, start_date_time);
ALTER TABLE seminars ADD COLUMN IF NOT EXISTS speaker_photo TEXT;

CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('REGISTERED', 'WAITLISTED', 'CANCELLED')),
  reference TEXT UNIQUE,
  qr_token_hash TEXT,
  qr_token TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  promoted_from_waitlist_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (seminar_id, user_id)
);
CREATE INDEX IF NOT EXISTS registrations_seminar_status_idx ON registrations (seminar_id, status, registered_at);
CREATE INDEX IF NOT EXISTS registrations_qr_idx ON registrations (qr_token_hash);
CREATE INDEX IF NOT EXISTS registrations_user_idx ON registrations (user_id);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL UNIQUE REFERENCES registrations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'NOT_CHECKED_IN' CHECK (status IN ('NOT_CHECKED_IN', 'CHECKED_IN')),
  checked_in_at TIMESTAMPTZ,
  check_in_method TEXT CHECK (check_in_method IN ('QR', 'MANUAL')),
  checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attendance_seminar_idx ON attendance (seminar_id, status);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  seminar_id UUID REFERENCES seminars(id) ON DELETE SET NULL,
  type TEXT,
  channel TEXT NOT NULL DEFAULT 'EMAIL',
  recipient TEXT,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vote_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Choose the next seminar',
  description TEXT NOT NULL DEFAULT 'Vote for the seminar you want to attend. You can vote only once.',
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vote_polls_status_idx ON vote_polls (status, created_at DESC);

CREATE TABLE IF NOT EXISTS vote_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES vote_polls(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  speaker TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vote_options_poll_idx ON vote_options (poll_id, sort_order);

CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES vote_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES vote_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
CREATE INDEX IF NOT EXISTS votes_option_idx ON votes (option_id);
`;
