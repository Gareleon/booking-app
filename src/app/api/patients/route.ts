import { NextRequest, NextResponse } from "next/server";

import { createPatient, listPatientsByClinic } from "@/lib/supabase";

type CreatePatientRequest = {
  clinicId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
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

    const patients = await listPatientsByClinic(clinicId);
    return NextResponse.json(patients);
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
    const body = (await request.json()) as CreatePatientRequest;

    if (!body.clinicId) {
      return NextResponse.json(
        { error: "clinicId is required" },
        { status: 400 }
      );
    }

    if (!body.firstName?.trim() || !body.lastName?.trim()) {
      return NextResponse.json(
        { error: "firstName and lastName are required" },
        { status: 400 }
      );
    }

    const phone = body.phone?.trim() || null;
    const email = body.email?.trim() || null;

    if (!phone && !email) {
      return NextResponse.json(
        { error: "phone or email is required" },
        { status: 400 }
      );
    }

    const patient = await createPatient({
      clinic_id: body.clinicId,
      first_name: body.firstName.trim(),
      last_name: body.lastName.trim(),
      phone,
      email,
    });

    return NextResponse.json(patient, { status: 201 });
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
