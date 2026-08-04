export const PARTNER_COOKIE_NAME = "ours_partner_session";
export const PARTNER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

type PartnerSessionPayload = {
  role: "site";
  exp: number;
  pwdVersion: number;
};

function getSigningSecret() {
  const secret = process.env.SESSION_SIGNING_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SIGNING_SECRET is missing or too short (min 16 chars).");
  }
  return secret;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodePayload(payload: PartnerSessionPayload) {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

async function sign(body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSigningSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return toBase64Url(signature);
}

export async function createPartnerSessionToken(
  pwdVersion: number,
  nowMs = Date.now(),
  ttlSeconds = PARTNER_SESSION_TTL_SECONDS,
) {
  const payload: PartnerSessionPayload = {
    role: "site",
    exp: Math.floor(nowMs / 1000) + ttlSeconds,
    pwdVersion,
  };
  const body = encodePayload(payload);
  return `${body}.${await sign(body)}`;
}

export async function verifyPartnerSessionToken(
  token: string,
  nowMs = Date.now(),
): Promise<{ ok: true; exp: number; pwdVersion: number } | { ok: false; reason: string }> {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return { ok: false, reason: "malformed" };
  }

  let expected: string;
  try {
    expected = await sign(body);
  } catch {
    return { ok: false, reason: "secret" };
  }

  const a = fromBase64Url(signature);
  const b = fromBase64Url(expected);
  if (a.length !== b.length) {
    return { ok: false, reason: "signature" };
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i]! ^ b[i]!;
  }
  if (diff !== 0) {
    return { ok: false, reason: "signature" };
  }

  try {
    const json = JSON.parse(
      new TextDecoder().decode(fromBase64Url(body)),
    ) as PartnerSessionPayload;
    if (
      json.role !== "site" ||
      typeof json.exp !== "number" ||
      typeof json.pwdVersion !== "number"
    ) {
      return { ok: false, reason: "payload" };
    }
    if (json.exp * 1000 <= nowMs) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true, exp: json.exp, pwdVersion: json.pwdVersion };
  } catch {
    return { ok: false, reason: "payload" };
  }
}

export function partnerCookieOptions(maxAgeSeconds = PARTNER_SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
