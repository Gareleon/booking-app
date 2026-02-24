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
  procedure_id: string | null;
  duration_minutes: number | null;
  appointment_at: string;
  notes: string | null;
  procedure: {
    name: string;
    slot_count: number | null;
    slot_minutes: number;
  } | null;
  patient: {
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
  } | null;
  reminders: AppointmentReminder[];
};

type WorkingHours = {
  clinic_id: string;
  workday_start: string;
  workday_end: string;
} | null;

type Procedure = {
  id: string;
  clinic_id: string;
  name: string;
  slot_count: number | null;
  slot_minutes: number;
};

type WorkBreak = {
  id: string;
  clinic_id: string;
  break_start: string;
  break_end: string;
};

type SlotCell = {
  start: Date;
  end: Date;
  status: "free" | "booked" | "break";
  appointment: Appointment | null;
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

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildThirtyMinuteSlots(
  appointments: Appointment[],
  date: string,
  workingHours: WorkingHours,
  workBreaks: WorkBreak[]
): SlotCell[] {
  if (!workingHours) return [];

  const [startHour, startMinute] = workingHours.workday_start.split(":").map(Number);
  const [endHour, endMinute] = workingHours.workday_end.split(":").map(Number);

  const dayStart = new Date(`${date}T00:00:00`);
  dayStart.setHours(startHour, startMinute, 0, 0);

  const dayEnd = new Date(`${date}T00:00:00`);
  dayEnd.setHours(endHour, endMinute, 0, 0);

  const slots: SlotCell[] = [];

  for (let cursor = new Date(dayStart); cursor < dayEnd; ) {
    const next = new Date(cursor.getTime() + 30 * 60 * 1000);
    slots.push({ start: new Date(cursor), end: next, status: "free", appointment: null });
    cursor = next;
  }

  for (const workBreak of workBreaks) {
    const [breakStartHour, breakStartMinute] = workBreak.break_start.split(":").map(Number);
    const [breakEndHour, breakEndMinute] = workBreak.break_end.split(":").map(Number);

    const breakStart = new Date(`${date}T00:00:00`);
    breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);

    const breakEnd = new Date(`${date}T00:00:00`);
    breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);

    for (const slot of slots) {
      if (slot.start < breakEnd && slot.end > breakStart) {
        slot.status = "break";
      }
    }
  }

  for (const appointment of appointments) {
    const appointmentStart = new Date(appointment.appointment_at);
    const durationMinutes = appointment.duration_minutes ?? (appointment.procedure?.slot_count ?? 1) * 30;
    const appointmentEnd = new Date(appointmentStart.getTime() + durationMinutes * 60 * 1000);

    for (const slot of slots) {
      if (slot.start < appointmentEnd && slot.end > appointmentStart) {
        slot.status = "booked";
        slot.appointment = appointment;
      }
    }
  }

  return slots;
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
  const [workingHours, setWorkingHours] = useState<WorkingHours>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [workBreaks, setWorkBreaks] = useState<WorkBreak[]>([]);

  const [clinicName, setClinicName] = useState("");
  const [clinicId, setClinicId] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [patientId, setPatientId] = useState("");
  const [appointmentAt, setAppointmentAt] = useState("");
  const [procedureId, setProcedureId] = useState("");
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
  const [workdayStart, setWorkdayStart] = useState("08:00");
  const [workdayEnd, setWorkdayEnd] = useState("17:00");
  const [procedureName, setProcedureName] = useState("");
  const [procedureSlotCount, setProcedureSlotCount] = useState("1");
  const [breakStart, setBreakStart] = useState("12:00");
  const [breakEnd, setBreakEnd] = useState("12:30");
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

  const loadWorkingHours = useCallback(async (selectedClinicId: string) => {
    try {
      const response = await fetch(`/api/working-hours?clinicId=${selectedClinicId}`);
      if (!response.ok) throw new Error(await getError(response));

      const row = (await response.json()) as WorkingHours;
      setWorkingHours(row);
      if (row) {
        setWorkdayStart(row.workday_start.slice(0, 5));
        setWorkdayEnd(row.workday_end.slice(0, 5));
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to load working hours");
    }
  }, []);

  const loadProcedures = useCallback(async (selectedClinicId: string) => {
    try {
      const response = await fetch(`/api/procedures?clinicId=${selectedClinicId}`);
      if (!response.ok) throw new Error(await getError(response));

      const rows = (await response.json()) as Procedure[];
      setProcedures(rows);
      setProcedureId((prev) => prev || rows[0]?.id || "");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to load procedures");
    }
  }, []);

  const loadWorkBreaks = useCallback(async (selectedClinicId: string) => {
    try {
      const response = await fetch(`/api/work-breaks?clinicId=${selectedClinicId}`);
      if (!response.ok) throw new Error(await getError(response));

      const rows = (await response.json()) as WorkBreak[];
      setWorkBreaks(rows);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to load work breaks");
    }
  }, []);

  useEffect(() => {
    void loadClinics();
  }, [loadClinics]);

  useEffect(() => {
    if (!clinicId) {
      setPatients([]);
      setAppointments([]);
      setProcedures([]);
      setWorkBreaks([]);
      setWorkingHours(null);
      return;
    }

    void loadPatients(clinicId);
    void loadAppointments(clinicId, appointmentsDate);
    void loadWorkingHours(clinicId);
    void loadProcedures(clinicId);
    void loadWorkBreaks(clinicId);
  }, [clinicId, appointmentsDate, loadAppointments, loadPatients, loadProcedures, loadWorkBreaks, loadWorkingHours]);

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
          procedureId,
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

  async function onSaveWorkingHours(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("working-hours");
    setFeedback("");

    try {
      const response = await fetch("/api/working-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, workdayStart, workdayEnd }),
      });
      if (!response.ok) throw new Error(await getError(response));

      const row = (await response.json()) as Exclude<WorkingHours, null>;
      setWorkingHours(row);
      setFeedback("Working hours updated.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  async function onCreateProcedure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("procedure");
    setFeedback("");

    try {
      const response = await fetch("/api/procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          name: procedureName,
          slotCount: Number(procedureSlotCount),
        }),
      });
      if (!response.ok) throw new Error(await getError(response));

      const created = (await response.json()) as Procedure;
      setProcedureName("");
      setProcedureSlotCount("1");
      await loadProcedures(clinicId);
      setProcedureId(created.id);
      setFeedback(`Procedure created: ${created.name}`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  async function onCreateWorkBreak(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("work-break");
    setFeedback("");

    try {
      const response = await fetch("/api/work-breaks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, breakStart, breakEnd }),
      });
      if (!response.ok) throw new Error(await getError(response));

      await loadWorkBreaks(clinicId);
      setFeedback("Work break added.");
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

  const slotCells = buildThirtyMinuteSlots(appointments, appointmentsDate, workingHours, workBreaks);
  const freeSlots = slotCells.filter((item) => item.status === "free");
  const usedSlots = slotCells.filter((item) => item.status === "booked");

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

        <div className="rounded-md border p-3">
          {!workingHours ? (
            <p className="text-sm text-zinc-500">Set clinic working hours to preview daily free slots.</p>
          ) : slotCells.length === 0 ? (
            <p className="text-sm text-zinc-500">No appointments in working hours for this date.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Used 30-min slots ({usedSlots.length})</p>
                <div className="space-y-1">
                  {usedSlots.length === 0 ? (
                    <p className="text-sm text-zinc-500">No booked slots.</p>
                  ) : (
                    usedSlots.map((slot, index) => (
                      <div key={`used-${index}-${slot.start.toISOString()}`} className="rounded border bg-blue-50 px-2 py-1 text-sm">
                        {formatTimeLabel(slot.start)} - {formatTimeLabel(slot.end)} · {(slot.appointment?.patient?.first_name ?? "Unknown")} {(slot.appointment?.patient?.last_name ?? "")} · {slot.appointment?.procedure?.name ?? "Procedure"}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Free 30-min slots ({freeSlots.length})</p>
                <div className="space-y-1">
                  {freeSlots.length === 0 ? (
                    <p className="text-sm text-zinc-500">No free slots.</p>
                  ) : (
                    freeSlots.map((slot, index) => (
                      <div key={`free-${index}-${slot.start.toISOString()}`} className="rounded border border-dashed bg-emerald-50 px-2 py-1 text-sm">
                        {formatTimeLabel(slot.start)} - {formatTimeLabel(slot.end)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
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
          <h2 className="mb-3 text-lg font-medium">Working hours</h2>
          <form onSubmit={onSaveWorkingHours} className="grid gap-2 sm:grid-cols-2">
            <input type="time" value={workdayStart} onChange={(e) => setWorkdayStart(e.target.value)} className="rounded-md border px-3 py-2 text-sm" />
            <input type="time" value={workdayEnd} onChange={(e) => setWorkdayEnd(e.target.value)} className="rounded-md border px-3 py-2 text-sm" />
            <button type="submit" disabled={loading === "working-hours" || !clinicId} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60 sm:col-span-2">
              {loading === "working-hours" ? "Saving..." : "Save working hours"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-lg font-medium">Work breaks</h2>
          <form onSubmit={onCreateWorkBreak} className="grid gap-2 sm:grid-cols-2">
            <input type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} className="rounded-md border px-3 py-2 text-sm" />
            <input type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} className="rounded-md border px-3 py-2 text-sm" />
            <button type="submit" disabled={loading === "work-break" || !clinicId} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60 sm:col-span-2">
              {loading === "work-break" ? "Saving..." : "Add break"}
            </button>
          </form>
          <ul className="mt-3 space-y-1 text-sm text-zinc-600">
            {workBreaks.map((workBreak) => (
              <li key={workBreak.id}>• {workBreak.break_start.slice(0, 5)} - {workBreak.break_end.slice(0, 5)}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-lg font-medium">Procedures</h2>
          <form onSubmit={onCreateProcedure} className="grid gap-2 sm:grid-cols-2">
            <input required value={procedureName} onChange={(e) => setProcedureName(e.target.value)} placeholder="Procedure name" className="rounded-md border px-3 py-2 text-sm" />
            <input required type="number" min={5} step={5} value={procedureSlotCount} onChange={(e) => setProcedureSlotCount(e.target.value)} placeholder="Number of 30-min slots" className="rounded-md border px-3 py-2 text-sm" />
            <button type="submit" disabled={loading === "procedure" || !clinicId} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60 sm:col-span-2">
              {loading === "procedure" ? "Creating..." : "Create procedure"}
            </button>
          </form>
          <ul className="mt-3 space-y-1 text-sm text-zinc-600">
            {procedures.map((procedure) => (
              <li key={procedure.id}>• {procedure.name} ({procedure.slot_count ?? Math.max(1, Math.round(procedure.slot_minutes / 30))} slots)</li>
            ))}
          </ul>
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

            <select
              aria-label="Procedure"
              value={procedureId}
              onChange={(e) => setProcedureId(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
            >
              <option value="">Select procedure</option>
              {procedures.map((procedure) => (
                <option key={procedure.id} value={procedure.id}>
                  {procedure.name} ({procedure.slot_count ?? Math.max(1, Math.round(procedure.slot_minutes / 30))} slots)
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
              disabled={loading === "appointment" || !clinicId || !patientId || !procedureId || !workingHours}
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
