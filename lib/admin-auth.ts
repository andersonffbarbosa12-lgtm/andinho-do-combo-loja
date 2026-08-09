import crypto from "crypto";

export const ADMIN_COOKIE = "andinho_admin_session";

export function getAdminSessionValue() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return "";

  return crypto
    .createHash("sha256")
    .update(`andinho-admin:${password}`)
    .digest("hex");
}

export function isValidAdminSession(value?: string | null) {
  const expected = getAdminSessionValue();
  return Boolean(expected) && value === expected;
}
