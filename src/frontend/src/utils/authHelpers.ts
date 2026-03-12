import { Ed25519KeyIdentity } from "@dfinity/identity";

/**
 * Derives a stable Ed25519 identity from the user's email.
 * The principal is always the same for the same email, regardless of password.
 */
export async function deriveIdentityFromEmail(
  email: string,
): Promise<Ed25519KeyIdentity> {
  const normalized = email.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(`delicious-cafe-v1:${normalized}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Ed25519KeyIdentity.fromSecretKey(new Uint8Array(hashBuffer));
}

/**
 * Hashes the password combined with the email for storage in the backend.
 * Email is included to prevent cross-account password reuse attacks.
 */
export async function hashPassword(
  email: string,
  password: string,
): Promise<string> {
  const normalized = email.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(`pwd:${normalized}:${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
