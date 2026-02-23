const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Reminder API will fail until these are configured."
  );
}

function getHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY ?? "",
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
    "Content-Type": "application/json",
  };
}

async function supabaseRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type ReminderRow = {
  id: string;
  clinic_id: string;
  message: string | null;
  patient: {
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
  } | null;
};

export type AppointmentReminderRow = {
  id: string;
  reminder_at: string;
  sms_sent_at: string | null;
  message: string | null;
};

export type AppointmentRow = {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_at: string;
  notes: string | null;
  patient: {
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
  } | null;
  reminders: AppointmentReminderRow[];
};

export type ClinicRow = { id: string; name: string; created_at?: string };

export type PatientRow = {
  id: string;
  clinic_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
};

export async function listClinics() {
  const params = new URLSearchParams({
    select: "id,name,created_at",
    order: "created_at.desc",
  });

  return supabaseRequest<ClinicRow[]>(
    `/rest/v1/dental_clinics?${params.toString()}`,
    {
      method: "GET",
    }
  );
}

export async function listPatientsByClinic(clinicId: string) {
  const params = new URLSearchParams({
    select: "id,clinic_id,first_name,last_name,phone,email",
    clinic_id: `eq.${clinicId}`,
    order: "created_at.desc",
  });

  return supabaseRequest<PatientRow[]>(
    `/rest/v1/patients?${params.toString()}`,
    {
      method: "GET",
    }
  );
}

export async function listAppointmentsByClinicAndDate(
  clinicId: string,
  date: string
) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("date must be a valid YYYY-MM-DD string");
  }

  const params = new URLSearchParams({
    select:
      "id,clinic_id,patient_id,appointment_at,notes,patient:patients(first_name,last_name,phone,email),reminders:appointment_reminders(id,reminder_at,sms_sent_at,message)",
    clinic_id: `eq.${clinicId}`,
    and: `(appointment_at.gte.${start.toISOString()},appointment_at.lte.${end.toISOString()})`,
    order: "appointment_at.asc",
  });

  return supabaseRequest<AppointmentRow[]>(
    `/rest/v1/patient_appointments?${params.toString()}`,
    {
      method: "GET",
    }
  );
}

export async function fetchDueReminders(clinicId: string) {
  const nowIso = new Date().toISOString();
  const params = new URLSearchParams({
    select:
      "id,clinic_id,message,patient:patients(first_name,last_name,phone,email)",
    clinic_id: `eq.${clinicId}`,
    sms_sent_at: "is.null",
    reminder_at: `lte.${nowIso}`,
  });

  return supabaseRequest<ReminderRow[]>(
    `/rest/v1/appointment_reminders?${params.toString()}`,
    {
      method: "GET",
    }
  );
}

export async function fetchDueRemindersAllClinics() {
  const nowIso = new Date().toISOString();
  const params = new URLSearchParams({
    select:
      "id,clinic_id,message,patient:patients(first_name,last_name,phone,email)",
    sms_sent_at: "is.null",
    reminder_at: `lte.${nowIso}`,
  });

  return supabaseRequest<ReminderRow[]>(
    `/rest/v1/appointment_reminders?${params.toString()}`,
    {
      method: "GET",
    }
  );
}

export async function markReminderAsSent(reminderId: string) {
  await supabaseRequest<void>(
    `/rest/v1/appointment_reminders?id=eq.${reminderId}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        sms_sent_at: new Date().toISOString(),
      }),
    }
  );
}

type ClinicInsert = { name: string };

export async function createClinic(input: ClinicInsert) {
  const rows = await supabaseRequest<ClinicRow[]>(`/rest/v1/dental_clinics`, {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(input),
  });

  return rows[0];
}

type PatientInsert = {
  clinic_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
};

export async function createPatient(input: PatientInsert) {
  const rows = await supabaseRequest<PatientRow[]>(`/rest/v1/patients`, {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(input),
  });

  return rows[0];
}

type AppointmentInsert = {
  clinic_id: string;
  patient_id: string;
  appointment_at: string;
  notes: string | null;
};

type AppointmentCreatedRow = {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_at: string;
  notes: string | null;
};

export async function createAppointment(input: AppointmentInsert) {
  const rows = await supabaseRequest<AppointmentCreatedRow[]>(
    `/rest/v1/patient_appointments`,
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(input),
    }
  );

  return rows[0];
}

type ReminderInsert = {
  clinic_id: string;
  patient_id: string;
  appointment_id?: string | null;
  reminder_at: string;
  message: string | null;
};

type ReminderCreatedRow = {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id: string | null;
  reminder_at: string;
  message: string | null;
};

export async function createReminders(input: ReminderInsert[]) {
  if (input.length === 0) return [] as ReminderCreatedRow[];

  return supabaseRequest<ReminderCreatedRow[]>(
    `/rest/v1/appointment_reminders`,
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(input),
    }
  );
}

export async function createReminder(input: ReminderInsert) {
  const rows = await createReminders([input]);
  return rows[0];
}
