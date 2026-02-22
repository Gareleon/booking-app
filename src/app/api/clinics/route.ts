import { NextRequest, NextResponse } from "next/server";

import { createClinic, listClinics } from "@/lib/supabase";

type CreateClinicRequest = {
  name?: string;
};

export async function GET() {
  try {
    const clinics = await listClinics();
    return NextResponse.json(clinics);
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
    const body = (await request.json()) as CreateClinicRequest;

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const clinic = await createClinic({ name: body.name.trim() });
    return NextResponse.json(clinic, { status: 201 });
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
