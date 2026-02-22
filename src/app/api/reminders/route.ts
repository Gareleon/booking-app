import { NextRequest, NextResponse } from "next/server";

import { createReminder } from "@/lib/supabase";

type CreateReminderRequest = {
  clinicId?: string;
  patientId?: string;
  reminderAt?: string;
  message?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateReminderRequest;

    if (!body.clinicId || !body.patientId || !body.reminderAt) {
      return NextResponse.json(
        { error: "clinicId, patientId and reminderAt are required" },
        { status: 400 }
      );
    }

    const parsedReminderAt = new Date(body.reminderAt);

    if (Number.isNaN(parsedReminderAt.getTime())) {
      return NextResponse.json(
        { error: "reminderAt must be a valid date" },
        { status: 400 }
      );
    }

    const reminder = await createReminder({
      clinic_id: body.clinicId,
      patient_id: body.patientId,
      reminder_at: parsedReminderAt.toISOString(),
      message: body.message?.trim() || null,
    });

    return NextResponse.json(reminder, { status: 201 });
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
