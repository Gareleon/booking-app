"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

type AppointmentReminder = {
  id: string;
  reminder_at: string;
  sms_sent_at: string | null;
  message: string | null;
};

type Appointment = {
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
  reminders: AppointmentReminder[];
};

type SendResponse = {
  clinicId: string;
  totalDue: number;
  sentCount: number;
  skipped: string[];
};

function formatDateForInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function appointmentStatus(appointment: Appointment) {
  const now = new Date();
  const appointmentTime = new Date(appointment.appointment_at);
  const reminders = appointment.reminders ?? [];

  if (reminders.length > 0 && reminders.every((item) => item.sms_sent_at)) {
    return "Reminders sent";
  }

  if (
    reminders.some(
      (item) =>
        !item.sms_sent_at &&
        new Date(item.reminder_at).getTime() <= now.getTime()
    )
  ) {
    return "Reminder due";
  }

  if (appointmentTime.getTime() < now.getTime()) {
    return "Past appointment";
  }

  return "Scheduled";
}

async function getError(response: Response) {
  const data = (await response.json()) as ErrorResponse;
  return data.error ?? "Request failed";
}

export default function ClinicDashboard() {
  const router = useRouter();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [clinicName, setClinicName] = useState("");
  const [clinicId, setClinicId] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [patientId, setPatientId] = useState("");
  const [appointmentAt, setAppointmentAt] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [reminderCount, setReminderCount] = useState<1 | 2>(1);
  const [firstReminderHours, setFirstReminderHours] = useState("24");
  const [secondReminderHours, setSecondReminderHours] = useState("2");
  const [enableFollowUp, setEnableFollowUp] = useState(false);
  const [followUpValue, setFollowUpValue] = useState("180");
  const [followUpUnit, setFollowUpUnit] = useState<"days" | "months">("days");
  const [followUpMessage, setFollowUpMessage] = useState("");

  const [appointmentsDate, setAppointmentsDate] = useState(
    formatDateForInput(new Date())
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
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

  const loadAppointments = useCallback(
    async (selectedClinicId: string, date: string) => {
      try {
        const response = await fetch(
          `/api/appointments?clinicId=${selectedClinicId}&date=${date}`
        );
        if (!response.ok) throw new Error(await getError(response));

        const rows = (await response.json()) as Appointment[];
        setAppointments(rows);
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : "Failed to load appointments"
        );
      }
    },
    []
  );

  useEffect(() => {
    void loadClinics();
  }, [loadClinics]);

  useEffect(() => {
    if (!clinicId) {
      setPatients([]);
      setAppointments([]);
      return;
    }

    void loadPatients(clinicId);
    void loadAppointments(clinicId, appointmentsDate);
  }, [clinicId, appointmentsDate, loadAppointments, loadPatients]);

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
        `Patient created: ${patient.first_name} ${patient.last_name}`
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  async function onCreateAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("appointment");
    setFeedback("");

    const reminderOffsetsHours = [Number(firstReminderHours)];
    if (reminderCount === 2)
      reminderOffsetsHours.push(Number(secondReminderHours));

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          patientId,
          appointmentAt,
          notes: appointmentNotes,
          reminderOffsetsHours,
          followUp: {
            enabled: enableFollowUp,
            value: Number(followUpValue),
            unit: followUpUnit,
            message: followUpMessage,
          },
        }),
      });
      if (!response.ok) throw new Error(await getError(response));

      setFeedback("Appointment and reminders created successfully.");
      setAppointmentAt("");
      setAppointmentNotes("");
      setFollowUpMessage("");
      await loadAppointments(clinicId, appointmentsDate);
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
      await loadAppointments(clinicId, appointmentsDate);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            Clinic operations dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Create appointments with one or two reminders and optional control
            check-up reminders.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void onLogout()}
            className="rounded-md border px-4 py-2 text-sm font-medium"
          >
            Logout
          </button>
          <Link
            href="/"
            className="rounded-md border px-4 py-2 text-sm font-medium"
          >
            Back to landing
          </Link>
        </div>
      </div>

      <section className="mb-5 rounded-xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">
              Appointments for selected day
            </h2>
            <p className="text-sm text-zinc-500">
              See appointment time, reminder readiness and patient contact.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="appointments-date" className="text-sm font-medium">
              Date
            </label>
            <input
              id="appointments-date"
              type="date"
              value={appointmentsDate}
              onChange={(event) => setAppointmentsDate(event.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!clinicId}
              onClick={() => void loadAppointments(clinicId, appointmentsDate)}
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">Appointment time</th>
                <th className="px-3 py-2">Reminders</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-zinc-500">
                    No appointments found for this date.
                  </td>
                </tr>
              ) : (
                appointments.map((appointment) => (
                  <tr key={appointment.id} className="border-t">
                    <td className="px-3 py-2">
                      {(appointment.patient?.first_name ?? "Unknown").concat(
                        " ",
                        appointment.patient?.last_name ?? ""
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {new Date(appointment.appointment_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      {appointment.reminders?.length ?? 0} configured
                    </td>
                    <td className="px-3 py-2">
                      {appointmentStatus(appointment)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-lg font-medium">Clinic</h2>
          <form onSubmit={onCreateClinic} className="flex gap-2">
            <input
              required
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="Clinic name"
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading === "clinic"}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {loading === "clinic" ? "Creating..." : "Create"}
            </button>
          </form>
          <div className="mt-3 flex gap-2">
            <select
              aria-label="Clinic"
              value={clinicId}
              onChange={(e) => setClinicId(e.target.value)}
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Select clinic</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void loadClinics()}
              className="rounded-md border px-3 py-2 text-sm"
            >
              Refresh
            </button>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-lg font-medium">Patient</h2>
          <form
            onSubmit={onCreatePatient}
            className="grid gap-2 sm:grid-cols-2"
          >
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (+1...)"
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              className="rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading === "patient" || !clinicId}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60 sm:col-span-2"
            >
              {loading === "patient" ? "Creating..." : "Create patient"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border bg-card p-5 md:col-span-2">
          <h2 className="mb-3 text-lg font-medium">
            Create appointment + reminders
          </h2>
          <form
            onSubmit={onCreateAppointment}
            className="grid gap-3 sm:grid-cols-2"
          >
            <select
              aria-label="Patient"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
            >
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name}
                </option>
              ))}
            </select>

            <input
              aria-label="Appointment date and time"
              required
              type="datetime-local"
              value={appointmentAt}
              onChange={(e) => setAppointmentAt(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              value={appointmentNotes}
              onChange={(e) => setAppointmentNotes(e.target.value)}
              placeholder="Appointment notes (optional)"
              className="rounded-md border px-3 py-2 text-sm"
            />

            <div className="rounded-md border p-3 sm:col-span-2">
              <p className="mb-2 text-sm font-medium">
                Pre-appointment reminders (1h to 24h before)
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  title="Number of reminders"
                  value={reminderCount}
                  onChange={(e) =>
                    setReminderCount(Number(e.target.value) as 1 | 2)
                  }
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <option value={1}>1 reminder</option>
                  <option value={2}>2 reminders</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={firstReminderHours}
                  onChange={(e) => setFirstReminderHours(e.target.value)}
                  className="rounded-md border px-3 py-2 text-sm"
                  placeholder="First reminder (hours)"
                />
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={secondReminderHours}
                  onChange={(e) => setSecondReminderHours(e.target.value)}
                  className="rounded-md border px-3 py-2 text-sm"
                  placeholder="Second reminder (hours)"
                  disabled={reminderCount === 1}
                />
              </div>
            </div>

            <div className="rounded-md border p-3 sm:col-span-2">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={enableFollowUp}
                  onChange={(e) => setEnableFollowUp(e.target.checked)}
                />
                Add control check-up reminder after last visit
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="number"
                  min={1}
                  value={followUpValue}
                  onChange={(e) => setFollowUpValue(e.target.value)}
                  disabled={!enableFollowUp}
                  className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                  placeholder="Value"
                />
                <select
                  title="Unit of time"
                  value={followUpUnit}
                  onChange={(e) =>
                    setFollowUpUnit(e.target.value as "days" | "months")
                  }
                  disabled={!enableFollowUp}
                  className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                >
                  <option value="days">days</option>
                  <option value="months">months</option>
                </select>
                <input
                  value={followUpMessage}
                  onChange={(e) => setFollowUpMessage(e.target.value)}
                  disabled={!enableFollowUp}
                  className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                  placeholder="Custom follow-up message (optional)"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading === "appointment" || !clinicId || !patientId}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60 sm:col-span-2"
            >
              {loading === "appointment" ? "Creating..." : "Create appointment"}
            </button>
          </form>

          <form onSubmit={onSendReminders} className="mt-4">
            <button
              type="submit"
              disabled={loading === "send" || !clinicId}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {loading === "send" ? "Sending..." : "Send due reminders now"}
            </button>
          </form>
        </section>
      </div>

      {feedback ? (
        <p className="mt-5 rounded-md border bg-muted p-3 text-sm">
          {feedback}
        </p>
      ) : null}

      {sendResult ? (
        <div className="mt-4 rounded-md border bg-muted p-3 text-sm">
          <p>
            <strong>Total due:</strong> {sendResult.totalDue}
          </p>
          <p>
            <strong>Sent:</strong> {sendResult.sentCount}
          </p>
          <p>
            <strong>Skipped IDs:</strong>{" "}
            {sendResult.skipped.length ? sendResult.skipped.join(", ") : "None"}
          </p>
        </div>
      ) : null}
    </main>
  );
}
