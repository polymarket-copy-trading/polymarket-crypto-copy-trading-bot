import { createHmac } from "node:crypto";

export interface PhemexAuthHeaders {
  "x-phemex-access-token": string;
  "x-phemex-request-expiry": string;
  "x-phemex-request-signature": string;
  "x-phemex-request-tracing"?: string;
}

/**
 * Phemex API secrets are Base64 URL-encoded.
 * Decode before use as HMAC key.
 */
export function decodeApiSecret(apiSecret: string): Buffer {
  const normalized = apiSecret.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded =
    padding === 0 ? normalized : normalized + "=".repeat(4 - padding);
  return Buffer.from(padded, "base64");
}

/**
 * Phemex HMAC SHA256 signature (lowercase hex).
 * Message = URL Path + QueryString + Expiry + body
 */
export function signPhemexRequest(
  apiSecret: string,
  path: string,
  queryString: string,
  expiry: number,
  body = "",
): string {
  const message = `${path}${queryString}${expiry}${body}`;
  const key = decodeApiSecret(apiSecret);
  return createHmac("sha256", key).update(message).digest("hex");
}

export function buildAuthHeaders(
  apiKey: string,
  apiSecret: string,
  path: string,
  queryString: string,
  body = "",
  expiryOffsetSec = 60,
): PhemexAuthHeaders {
  const expiry = Math.floor(Date.now() / 1000) + expiryOffsetSec;
  const signature = signPhemexRequest(
    apiSecret,
    path,
    queryString,
    expiry,
    body,
  );

  return {
    "x-phemex-access-token": apiKey,
    "x-phemex-request-expiry": String(expiry),
    "x-phemex-request-signature": signature,
    "x-phemex-request-tracing": cryptoRandomTracing(),
  };
}

function cryptoRandomTracing(): string {
  return Math.random().toString(36).slice(2, 14);
}

export function toQueryString(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [k, String(v)] as const);

  return entries.map(([k, v]) => `${k}=${v}`).join("&");
}
