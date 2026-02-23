# Booking App

<<<<<<< ours
Production-oriented Next.js service to onboard clinics, manage patients/reminders, and send dental appointment SMS reminders with Twilio using Supabase.
=======
Production-oriented Next.js service to onboard clinics, manage patients/appointments/reminders, and send dental appointment SMS reminders with Twilio using Supabase.
>>>>>>> theirs

## Environment variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Required keys:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `CRON_SECRET` (required for `/api/cron/reminders`)

## Supabase schema

Run `supabase/schema.sql` in the Supabase SQL editor.

Tables:

- `dental_clinics`
- `patients` (`first_name`, `last_name`, `phone` or `email`)
- `patient_appointments`
- `appointment_reminders`

<<<<<<< ours
=======
## Authentication and access control

- Public pages: `/`, `/login`, `/register`
- Protected pages: all other app routes are guarded by `middleware.ts` and require a session cookie.
- Login options on `/login`:
  - Email/password mock sign-in (`POST /api/auth/login`)
  - Google option (`GET /api/auth/google`) for OAuth-style entry.
- Logout endpoint: `POST /api/auth/logout`

>>>>>>> theirs
## Product pages

Start app:

```bash
npm run dev
```

Open `http://localhost:3000`:

- `/` landing page with plans and mock pricing
<<<<<<< ours
- `/login` clinic login form
- `/register` clinic registration form
- `/dashboard` clinic operations (create clinic/patient/reminder and send due reminders)
=======
- `/login` clinic login form (with Google login option)
- `/register` clinic registration form
- `/dashboard` clinic operations (create clinic/patient, create appointment with 1–2 pre-reminders, optional post-visit control check-up reminder, send due reminders, and view date-based appointment statuses)
>>>>>>> theirs

## API endpoints

- `POST /api/auth/login` → `{ email, password }`
- `GET /api/auth/google?next=/dashboard`
- `POST /api/auth/logout`
- `GET /api/appointments?clinicId=...&date=YYYY-MM-DD`
- `POST /api/appointments` →
  ```json
  {
    "clinicId": "...",
    "patientId": "...",
    "appointmentAt": "2026-02-23T12:00:00Z",
    "notes": "optional",
    "reminderOffsetsHours": [24, 2],
    "followUp": {
      "enabled": true,
      "value": 180,
      "unit": "days",
      "message": "optional"
    }
  }
  ```
- `POST /api/clinics` → `{ name }`
- `GET /api/clinics`
- `POST /api/patients` → `{ clinicId, firstName, lastName, phone?, email? }`
- `GET /api/patients?clinicId=...`
<<<<<<< ours
- `POST /api/reminders` → `{ clinicId, patientId, reminderAt, message? }`
=======
>>>>>>> theirs
- `POST /api/reminders/send` → `{ clinicId? }` (omit for all clinics)
- `GET /api/cron/reminders?clinicId=...` with `Authorization: Bearer <CRON_SECRET>`
