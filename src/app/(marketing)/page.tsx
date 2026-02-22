"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type ErrorResponse = { error?: string };
type Clinic = { id: string; name: string };
type Patient = {
  id: string;
  clinic_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
};
type SendResponse = {
  clinicId: string;
  totalDue: number;
  sentCount: number;
  skipped: string[];
};

async function getError(response: Response) {
  const data = (await response.json()) as ErrorResponse;
  return data.error ?? "Request failed";
}

export default function Home() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinicName, setClinicName] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [patientId, setPatientId] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [sendResult, setSendResult] = useState<SendResponse | null>(null);

  const loadClinics = useCallback(async () => {
    try {
      const response = await fetch("/api/clinics");
      if (!response.ok) throw new Error(await getError(response));

      const rows = (await response.json()) as Clinic[];
      setClinics(rows);
      if (!clinicId && rows.length > 0) setClinicId(rows[0].id);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Failed to load clinics"
      );
    }
  }, [clinicId]);

  const loadPatients = useCallback(async (selectedClinicId: string) => {
    try {
      const response = await fetch(
        `/api/patients?clinicId=${selectedClinicId}`
      );
      if (!response.ok) throw new Error(await getError(response));

      const rows = (await response.json()) as Patient[];
      setPatients(rows);
      setPatientId(rows.length > 0 ? rows[0].id : "");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Failed to load patients"
      );
    }
  }, []);

  useEffect(() => {
    void loadClinics();
  }, [loadClinics]);

  useEffect(() => {
    if (!clinicId) {
      setPatients([]);
      setPatientId("");
      return;
    }

    void loadPatients(clinicId);
  }, [clinicId, loadPatients]);

  async function onCreateClinic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("clinic");
    setFeedback("");

    try {
      const response = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clinicName }),
      });
      if (!response.ok) throw new Error(await getError(response));

      const createdClinic = (await response.json()) as Clinic;
      setClinicName("");
      await loadClinics();
      setClinicId(createdClinic.id);
      setFeedback(`Clinic created: ${createdClinic.name}`);
      setSendResult(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  async function onCreatePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("patient");
    setFeedback("");

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, firstName, lastName, phone, email }),
      });
      if (!response.ok) throw new Error(await getError(response));

      const patient = (await response.json()) as Patient;
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      await loadPatients(clinicId);
      setPatientId(patient.id);
      setFeedback(
        `Patient created: ${patient.first_name} ${patient.last_name} (${patient.id})`
      );
      setSendResult(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  async function onCreateReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("reminder");
    setFeedback("");

    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, patientId, reminderAt, message }),
      });
      if (!response.ok) throw new Error(await getError(response));

      setFeedback("Reminder created successfully.");
      setSendResult(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  async function onSendReminders(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("send");
    setFeedback("");

    try {
      const response = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId }),
      });
      if (!response.ok) throw new Error(await getError(response));

      const data = (await response.json()) as SendResponse;
      setSendResult(data);
      setFeedback("Reminders processed successfully.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 className="text-2xl font-semibold">Dental Reminder Console</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create clinics, patients, reminders and send due reminders. Cron
          endpoint is also available for automatic sending.
        </p>

        <section className="rounded-lg border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 font-medium">Active clinic</h2>
          <div className="flex gap-2">
            <select
              value={clinicId}
              onChange={(e) => setClinicId(e.target.value)}
              className="flex-1 rounded border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="">Select clinic</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name} ({clinic.id})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void loadClinics()}
              className="rounded border px-3 py-2 text-sm"
            >
              Refresh
            </button>
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 font-medium">1) Create clinic</h2>
          <form onSubmit={onCreateClinic} className="flex gap-2">
            <input
              required
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="Clinic name"
              className="flex-1 rounded border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button
              type="submit"
              disabled={loading === "clinic"}
              className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {loading === "clinic" ? "Creating..." : "Create"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 font-medium">2) Create patient</h2>
          <form
            onSubmit={onCreatePatient}
            className="grid gap-2 sm:grid-cols-2"
          >
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="rounded border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="rounded border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (+1555...)"
              className="rounded border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              className="rounded border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button
              type="submit"
              disabled={loading === "patient" || !clinicId}
              className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60 sm:col-span-2"
            >
              {loading === "patient" ? "Creating..." : "Create patient"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 font-medium">Patient list</h2>
          <div className="flex gap-2">
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="flex-1 rounded border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name} (
                  {patient.phone ?? patient.email ?? "no contact"})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!clinicId}
              onClick={() => void loadPatients(clinicId)}
              className="rounded border px-3 py-2 text-sm disabled:opacity-60"
            >
              Refresh
            </button>
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 font-medium">3) Create reminder</h2>
          <form onSubmit={onCreateReminder} className="grid gap-2">
            <input
              required
              type="datetime-local"
              value={reminderAt}
              onChange={(e) => setReminderAt(e.target.value)}
              className="rounded border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Custom SMS text (optional)"
              className="rounded border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button
              type="submit"
              disabled={loading === "reminder" || !clinicId || !patientId}
              className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {loading === "reminder" ? "Creating..." : "Create reminder"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 font-medium">4) Send due reminders now</h2>
          <form onSubmit={onSendReminders}>
            <button
              type="submit"
              disabled={loading === "send" || !clinicId}
              className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {loading === "send" ? "Sending..." : "Send reminders"}
            </button>
          </form>
        </section>

        {feedback ? (
          <div className="rounded-md border border-zinc-200 bg-zinc-100 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800">
            {feedback}
          </div>
        ) : null}

        {sendResult ? (
          <div className="rounded-md border border-zinc-200 bg-zinc-100 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800">
            <p>
              <strong>Total due:</strong> {sendResult.totalDue}
            </p>
            <p>
              <strong>Sent:</strong> {sendResult.sentCount}
            </p>
            <p>
              <strong>Skipped:</strong>{" "}
              {sendResult.skipped.length
                ? sendResult.skipped.join(", ")
                : "None"}
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
