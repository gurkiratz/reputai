/** Sends an email with the Resend REST API. Returns false (and logs) if email is not set up. */
export async function sendEmail(params: { to: string[]; subject: string; text: string; html?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "ReputAI <onboarding@resend.dev>";
  if (!apiKey || params.to.length === 0) {
    console.warn("Email skipped: RESEND_API_KEY or recipients missing.");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: params.to, subject: params.subject, text: params.text, html: params.html }),
  });
  if (!res.ok) {
    console.error(`Email failed (${res.status}): ${await res.text()}`);
    return false;
  }
  return true;
}
