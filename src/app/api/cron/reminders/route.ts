import { NextRequest, NextResponse } from "next/server";

import { sendDueReminders } from "@/app/api/reminders/send/route";

const CRON_SECRET = process.env.CRON_SECRET;

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    if (!CRON_SECRET) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("authorization");
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";
    const expected = `Bearer ${CRON_SECRET}`;

    if (!isVercelCron && authHeader != expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = request.nextUrl.searchParams.get("clinicId") ?? undefined;
    const result = await sendDueReminders(clinicId);

    return NextResponse.json({ source: "cron", ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 },
    );
  }
}
