import { NextRequest, NextResponse } from "next/server";

import {
  createAppointment,
  createReminders,
  listAppointmentsByClinicAndDate,
} from "@/lib/supabase";

type FollowUpPayload = {
  enabled?: boolean;
  value?: number;
  unit?: "days" | "months";
  message?: string;
};

type CreateAppointmentPayload = {
  clinicId?: string;
  patientId?: string;
  appointmentAt?: string;
  notes?: string;
  reminderOffsetsHours?: number[];
  followUp?: FollowUpPayload;
};

function validateReminderOffsets(offsets: number[]) {
  if (offsets.length === 0 || offsets.length > 2) {
    throw new Error("You must configure one or two reminder offsets");
  }

  for (const offset of offsets) {
    if (!Number.isFinite(offset) || offset < 1 || offset > 24) {
      throw new Error("Each reminder offset must be between 1 and 24 hours");
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const clinicId = request.nextUrl.searchParams.get("clinicId");
    const date = request.nextUrl.searchParams.get("date");

    if (!clinicId) {
      return NextResponse.json(
        { error: "clinicId is required" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const appointments = await listAppointmentsByClinicAndDate(clinicId, date);
    return NextResponse.json(appointments);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateAppointmentPayload;

    if (!body.clinicId || !body.patientId || !body.appointmentAt) {
      return NextResponse.json(
        { error: "clinicId, patientId and appointmentAt are required" },
        { status: 400 }
      );
    }

    const appointmentAt = new Date(body.appointmentAt);
    if (Number.isNaN(appointmentAt.getTime())) {
      return NextResponse.json(
        { error: "appointmentAt must be a valid date" },
        { status: 400 }
      );
    }

    const reminderOffsetsHours = body.reminderOffsetsHours ?? [];
    validateReminderOffsets(reminderOffsetsHours);

    const appointment = await createAppointment({
      clinic_id: body.clinicId,
      patient_id: body.patientId,
      appointment_at: appointmentAt.toISOString(),
      notes: body.notes?.trim() || null,
    });

    const remindersToCreate = reminderOffsetsHours.map((hoursBefore, index) => {
      const reminderAt = new Date(
        appointmentAt.getTime() - hoursBefore * 60 * 60 * 1000
      );
      return {
        clinic_id: body.clinicId as string,
        patient_id: body.patientId as string,
        appointment_id: appointment.id,
        reminder_at: reminderAt.toISOString(),
        message:
          index === 0
            ? `Reminder: you have an appointment in ${hoursBefore} hour(s).`
            : `Second reminder: your appointment is in ${hoursBefore} hour(s).`,
      };
    });

    if (body.followUp?.enabled) {
      const value = Number(body.followUp.value ?? 0);
      if (!Number.isFinite(value) || value <= 0) {
        return NextResponse.json(
          { error: "followUp value must be a positive number" },
          { status: 400 }
        );
      }

      if (body.followUp.unit !== "days" && body.followUp.unit !== "months") {
        return NextResponse.json(
          { error: "followUp unit must be days or months" },
          { status: 400 }
        );
      }

      const followUpAt = new Date(appointmentAt);
      if (body.followUp.unit === "days") {
        followUpAt.setDate(followUpAt.getDate() + value);
      } else {
        followUpAt.setMonth(followUpAt.getMonth() + value);
      }

      remindersToCreate.push({
        clinic_id: body.clinicId,
        patient_id: body.patientId,
        appointment_id: appointment.id,
        reminder_at: followUpAt.toISOString(),
        message:
          body.followUp.message?.trim() ||
          `Control check-up reminder: it's been ${value} ${body.followUp.unit} since your last visit.`,
      });
    }

    const reminders = await createReminders(remindersToCreate);

    return NextResponse.json(
      { appointment, remindersCount: reminders.length },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 }
    );
  }
}
