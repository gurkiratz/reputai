import { NextResponse, type NextRequest } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { runSlaCheck } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runSlaCheck();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
