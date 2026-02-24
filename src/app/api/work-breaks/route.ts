import { NextRequest, NextResponse } from "next/server";

import { createWorkBreak, listWorkBreaksByClinic } from "@/lib/supabase";

type WorkBreakPayload = {
  clinicId?: string;
  breakStart?: string;
  breakEnd?: string;
};

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
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

    const rows = await listWorkBreaksByClinic(clinicId);
    return NextResponse.json(rows);
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
    const body = (await request.json()) as WorkBreakPayload;

    if (!body.clinicId || !body.breakStart || !body.breakEnd) {
      return NextResponse.json(
        { error: "clinicId, breakStart and breakEnd are required" },
        { status: 400 }
      );
    }

    const startMinutes = toMinutes(body.breakStart);
    const endMinutes = toMinutes(body.breakEnd);

    if (
      !Number.isFinite(startMinutes) ||
      !Number.isFinite(endMinutes) ||
      startMinutes >= endMinutes
    ) {
      return NextResponse.json(
        { error: "Invalid break range" },
        { status: 400 }
      );
    }

    if (startMinutes % 30 !== 0 || endMinutes % 30 !== 0) {
      return NextResponse.json(
        { error: "Breaks must align to 30-minute boundaries" },
        { status: 400 }
      );
    }

    const row = await createWorkBreak({
      clinic_id: body.clinicId,
      break_start: body.breakStart,
      break_end: body.breakEnd,
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
