-- Multi-clinic schema for appointments + reminders.
create table if not exists dental_clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references dental_clinics(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  constraint patients_contact_required check (phone is not null or email is not null)
);

create table if not exists patient_appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references dental_clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  appointment_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists appointment_reminders (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references dental_clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  appointment_id uuid references patient_appointments(id) on delete cascade,
  reminder_at timestamptz not null,
  message text,
  sms_sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Backfill/upgrade path for older databases that already had appointment_reminders.
alter table appointment_reminders
  add column if not exists appointment_id uuid;

create index if not exists idx_patients_clinic_id on patients(clinic_id);
create index if not exists idx_appointments_clinic_date on patient_appointments(clinic_id, appointment_at);
create index if not exists idx_reminders_due on appointment_reminders(clinic_id, reminder_at, sms_sent_at);
create index if not exists idx_reminders_appointment_id on appointment_reminders(appointment_id);

-- Helpful for PostgREST relation embedding in Supabase API.
alter table appointment_reminders
  drop constraint if exists appointment_reminders_patient_id_fkey,
  add constraint appointment_reminders_patient_id_fkey
  foreign key (patient_id)
  references patients(id)
  on delete cascade;

alter table appointment_reminders
  drop constraint if exists appointment_reminders_appointment_id_fkey,
  add constraint appointment_reminders_appointment_id_fkey
  foreign key (appointment_id)
  references patient_appointments(id)
  on delete cascade;
