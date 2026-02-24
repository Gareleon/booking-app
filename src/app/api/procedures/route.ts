import { NextRequest, NextResponse } from "next/server";

import { createProcedure, listProceduresByClinic } from "@/lib/supabase";

type CreateProcedurePayload = {
  clinicId?: string;
  name?: string;
  slotCount?: number;
};

export async function GET(request: NextRequest) {
  try {
    const clinicId = request.nextUrl.searchParams.get("clinicId");
    if (!clinicId) {
      return NextResponse.json(
        { error: "clinicId is required" },
        { status: 400 }
      );
    }

    const rows = await listProceduresByClinic(clinicId);
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
    const body = (await request.json()) as CreateProcedurePayload;

    if (!body.clinicId || !body.name?.trim()) {
      return NextResponse.json(
        { error: "clinicId and name are required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(body.slotCount) || Number(body.slotCount) <= 0) {
      return NextResponse.json(
        { error: "slotCount must be a positive number" },
        { status: 400 }
      );
    }

    const slotCount = Math.round(Number(body.slotCount));

    const row = await createProcedure({
      clinic_id: body.clinicId,
      name: body.name.trim(),
      slot_count: slotCount,
      slot_minutes: slotCount * 30,
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
