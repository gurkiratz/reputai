import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const ACCOUNTS_URL = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
  "openid",
  "email",
];

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

export function redirectUri(): string {
  return `${env("APP_URL")}/api/google/callback`;
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline", // needed to get a refresh token
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`Google token request failed (${res.status}): ${await res.text()}`);
  return res.json();
}

/** Exchanges the OAuth code and stores the encrypted tokens for the organization. */
export async function completeConnection(params: {
  code: string;
  organizationId: string;
  userId: string;
}) {
  const tokens = await tokenRequest({
    code: params.code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
  });
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Remove the app from your Google account and connect again.");
  }

  const auth = { Authorization: `Bearer ${tokens.access_token}` };
  const [user, accounts] = await Promise.all([
    fetch(USERINFO_URL, { headers: auth }).then((r) => (r.ok ? r.json() : {})),
    fetch(ACCOUNTS_URL, { headers: auth }).then((r) => (r.ok ? r.json() : {})),
  ]);

  const data = {
    googleAccountEmail: (user as { email?: string }).email ?? null,
    accountName: (accounts as { accounts?: { name: string }[] }).accounts?.[0]?.name ?? null,
    encryptedAccessToken: encrypt(tokens.access_token),
    encryptedRefreshToken: encrypt(tokens.refresh_token),
    accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    connectedById: params.userId,
    lastSyncError: null,
  };
  await prisma.googleConnection.upsert({
    where: { organizationId: params.organizationId },
    create: { organizationId: params.organizationId, ...data },
    update: data,
  });
}

/** Returns a valid access token, refreshing it when it expires in under a minute. */
export async function getAccessToken(organizationId: string): Promise<string> {
  const conn = await prisma.googleConnection.findUnique({ where: { organizationId } });
  if (!conn) throw new Error("No Google account is connected. Connect one in Settings → Google.");

  if (conn.accessTokenExpiresAt.getTime() - Date.now() > 60_000) {
    return decrypt(conn.encryptedAccessToken);
  }

  const tokens = await tokenRequest({
    refresh_token: decrypt(conn.encryptedRefreshToken),
    grant_type: "refresh_token",
  });
  await prisma.googleConnection.update({
    where: { organizationId },
    data: {
      encryptedAccessToken: encrypt(tokens.access_token),
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });
  return tokens.access_token;
}

export async function disconnect(organizationId: string) {
  await prisma.googleConnection.deleteMany({ where: { organizationId } });
}
