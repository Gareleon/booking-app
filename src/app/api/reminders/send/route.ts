import { NextRequest, NextResponse } from "next/server";

import {
  fetchDueReminders,
  fetchDueRemindersAllClinics,
  markReminderAsSent,
  type ReminderRow,
} from "@/lib/supabase";
import { sendSms } from "@/lib/twilio";

export const runtime = "nodejs";

type SendReminderRequest = {
  clinicId?: string;
};

function formatMessage(reminder: ReminderRow) {
  const firstName = reminder.patient?.first_name ?? "Patient";
  const lastName = reminder.patient?.last_name ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    reminder.message ??
    `Hi ${fullName}, this is a reminder from your dental clinic about your upcoming appointment.`
  );
}

export async function sendDueReminders(clinicId?: string) {
  const reminders = clinicId
    ? await fetchDueReminders(clinicId)
    : await fetchDueRemindersAllClinics();

  let sentCount = 0;
  const skipped: string[] = [];

  for (const reminder of reminders) {
    const phone = reminder.patient?.phone;

    if (!phone) {
      skipped.push(reminder.id);
      continue;
    }

    await sendSms(phone, formatMessage(reminder));
    await markReminderAsSent(reminder.id);
    sentCount += 1;
  }

  return {
    clinicId: clinicId ?? "all",
    totalDue: reminders.length,
    sentCount,
    skipped,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendReminderRequest;
    const result = await sendDueReminders(body.clinicId);

    return NextResponse.json(result);
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
