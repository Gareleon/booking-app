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

type ReminderInsert = {
  clinic_id: string;
  patient_id: string;
  reminder_at: string;
  message: string | null;
};

type ReminderCreatedRow = {
  id: string;
  clinic_id: string;
  patient_id: string;
  reminder_at: string;
  message: string | null;
};

export async function createReminder(input: ReminderInsert) {
  const rows = await supabaseRequest<ReminderCreatedRow[]>(
    `/rest/v1/appointment_reminders`,
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
