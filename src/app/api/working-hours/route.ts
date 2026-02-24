import { NextRequest, NextResponse } from "next/server";

import { getClinicWorkingHours, upsertClinicWorkingHours } from "@/lib/supabase";

type WorkingHoursPayload = {
  clinicId?: string;
  workdayStart?: string;
  workdayEnd?: string;
};

function parseTimeParts(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return { hour, minute };
}

export async function GET(request: NextRequest) {
  try {
    const clinicId = request.nextUrl.searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json(
        { error: "clinicId is required" },
        { status: 400 }
      );
    }

    const row = await getClinicWorkingHours(clinicId);
    return NextResponse.json(row);
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
    const body = (await request.json()) as WorkingHoursPayload;

    if (!body.clinicId || !body.workdayStart || !body.workdayEnd) {
      return NextResponse.json(
        { error: "clinicId, workdayStart and workdayEnd are required" },
        { status: 400 }
      );
    }

    const start = parseTimeParts(body.workdayStart);
    const end = parseTimeParts(body.workdayEnd);

    if (
      !Number.isFinite(start.hour) ||
      !Number.isFinite(start.minute) ||
      !Number.isFinite(end.hour) ||
      !Number.isFinite(end.minute)
    ) {
      return NextResponse.json({ error: "Invalid time format" }, { status: 400 });
    }

    if (start.hour * 60 + start.minute >= end.hour * 60 + end.minute) {
      return NextResponse.json(
        { error: "workdayEnd must be after workdayStart" },
        { status: 400 }
      );
    }

    const row = await upsertClinicWorkingHours({
      clinic_id: body.clinicId,
      workday_start: body.workdayStart,
      workday_end: body.workdayEnd,
    });

    return NextResponse.json(row, { status: 201 });
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
