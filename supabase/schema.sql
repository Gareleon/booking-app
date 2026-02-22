-- Multi-clinic schema for reminders + future invite workflows.
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

create table if not exists appointment_reminders (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references dental_clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  reminder_at timestamptz not null,
  message text,
  sms_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_patients_clinic_id on patients(clinic_id);
create index if not exists idx_reminders_due on appointment_reminders(clinic_id, reminder_at, sms_sent_at);

-- Helpful for PostgREST relation embedding in Supabase API.
alter table appointment_reminders
  drop constraint if exists appointment_reminders_patient_id_fkey,
  add constraint appointment_reminders_patient_id_fkey
  foreign key (patient_id)
  references patients(id)
  on delete cascade;
