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
  procedure_id uuid,
  duration_minutes integer,
  appointment_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists clinic_working_hours (
  clinic_id uuid primary key references dental_clinics(id) on delete cascade,
  workday_start time not null,
  workday_end time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinic_workday_valid check (workday_end > workday_start)
);

create table if not exists clinic_procedures (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references dental_clinics(id) on delete cascade,
  name text not null,
  slot_count integer,
  slot_minutes integer not null,
  created_at timestamptz not null default now(),
  constraint clinic_procedures_slot_count_positive check (slot_count is null or slot_count > 0),
  constraint clinic_procedures_slot_minutes_positive check (slot_minutes > 0)
);

create table if not exists clinic_work_breaks (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references dental_clinics(id) on delete cascade,
  break_start time not null,
  break_end time not null,
  created_at timestamptz not null default now(),
  constraint clinic_work_break_valid check (break_end > break_start)
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

-- Backfill/upgrade path for older databases.
alter table patient_appointments
  add column if not exists procedure_id uuid,
  add column if not exists duration_minutes integer;

alter table patient_appointments
  drop constraint if exists patient_appointments_procedure_id_fkey,
  add constraint patient_appointments_procedure_id_fkey
  foreign key (procedure_id)
  references clinic_procedures(id)
  on delete set null;

create index if not exists idx_clinic_procedures_clinic_id on clinic_procedures(clinic_id);
create index if not exists idx_clinic_work_breaks_clinic_id on clinic_work_breaks(clinic_id);

alter table clinic_procedures
  add column if not exists slot_count integer;

update clinic_procedures
set slot_count = greatest(1, ceil(slot_minutes::numeric / 30.0)::integer)
where slot_count is null;
