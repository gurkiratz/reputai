import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { completeConnection } from "@/lib/google/oauth";

export async function GET(req: NextRequest) {
  const back = (query: string) => {
    const res = NextResponse.redirect(new URL(`/settings/google?${query}`, process.env.APP_URL));
    res.cookies.delete("google_oauth_state");
    return res;
  };

  const session = await auth();
  if (session?.user?.role !== "MANAGER") return back("error=manager_only");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (req.nextUrl.searchParams.get("error")) return back("error=access_denied");
  if (!code || !state || state !== req.cookies.get("google_oauth_state")?.value) {
    return back("error=invalid_state");
  }

  try {
    await completeConnection({ code, organizationId: session.user.organizationId, userId: session.user.id });
    return back("connected=1");
  } catch (err) {
    console.error("Google connection failed:", err);
    return back("error=token_exchange");
  }
}
