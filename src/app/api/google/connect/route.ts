import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildAuthUrl } from "@/lib/google/oauth";

// Starts the Google OAuth flow. Only managers can connect an account.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", process.env.APP_URL));
  if (session.user.role !== "MANAGER") {
    return NextResponse.redirect(new URL("/settings/google?error=manager_only", process.env.APP_URL));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set("google_oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
