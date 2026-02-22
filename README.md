# Booking App

<<<<<<< ours
Minimal Next.js service to send dental appointment SMS reminders with Twilio, using Supabase as the data source.
=======
Minimal Next.js service to create clinics/patients/reminders and send dental appointment SMS reminders with Twilio using Supabase.
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

## Supabase schema

<<<<<<< ours
Run the SQL in `supabase/schema.sql` inside your Supabase SQL editor.

The schema is multi-tenant by clinic:

- `dental_clinics`: each clinic has its own row.
- `patients`: linked to a clinic and stores `first_name`, `last_name`, and `phone` or `email`.
- `appointment_reminders`: reminders per patient and clinic.

## Send SMS reminders

Start the app:

```bash
npm run dev
```

Trigger reminders for a specific clinic:

```bash
curl -X POST http://localhost:3000/api/reminders/send \
  -H "Content-Type: application/json" \
  -d '{"clinicId":"<clinic-uuid>"}'
```

Endpoint behavior:

1. Finds due reminders (`reminder_at <= now`) for the given clinic where `sms_sent_at` is null.
2. Fetches patient contact info (name, last name, phone/email).
3. Sends SMS through Twilio when phone exists.
4. Marks sent reminders with `sms_sent_at`.

Patients without phone are skipped (their email stays available for future Google Calendar invite workflows).
=======
Run `supabase/schema.sql` in Supabase SQL editor.

Tables:
- `dental_clinics`
- `patients` (`first_name`, `last_name`, `phone` or `email`)
- `appointment_reminders`

## Frontend flow (immediate testing)

Start app:

```bash
npm run dev
```

Open `http://localhost:3000` and use the 4 steps:
1. Create clinic.
2. Create patient.
3. Create reminder (`datetime-local`; if time is in the past or now it is immediately due).
4. Send due reminders.

## API endpoints

- `POST /api/clinics` → `{ name }`
- `POST /api/patients` → `{ clinicId, firstName, lastName, phone?, email? }`
- `POST /api/reminders` → `{ clinicId, patientId, reminderAt, message? }`
- `POST /api/reminders/send` → `{ clinicId }`
>>>>>>> theirs
