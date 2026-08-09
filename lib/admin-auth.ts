import "server-only";

import crypto from "crypto";

export const ADMIN_COOKIE =
  "andinho_admin_session";

const SESSION_DURATION_SECONDS =
  60 * 60 * 12;

function getSessionSecret() {
  const secret =
    process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET precisa ter pelo menos 32 caracteres."
    );
  }

  return secret;
}

function sign(value: string) {
  return crypto
    .createHmac(
      "sha256",
      getSessionSecret()
    )
    .update(value)
    .digest("base64url");
}

export function createAdminSessionToken() {
  const payload = JSON.stringify({
    exp:
      Math.floor(Date.now() / 1000) +
      SESSION_DURATION_SECONDS,

    nonce:
      crypto.randomBytes(16).toString("hex"),
  });

  const encoded =
    Buffer.from(payload).toString(
      "base64url"
    );

  const signature = sign(encoded);

  return `${encoded}.${signature}`;
}

export function isValidAdminSession(
  token?: string | null
) {
  if (!token) {
    return false;
  }

  try {
    const [encoded, signature] =
      token.split(".");

    if (!encoded || !signature) {
      return false;
    }

    const expected =
      sign(encoded);

    const receivedBuffer =
      Buffer.from(signature);

    const expectedBuffer =
      Buffer.from(expected);

    if (
      receivedBuffer.length !==
      expectedBuffer.length
    ) {
      return false;
    }

    if (
      !crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      return false;
    }

    const payload =
      JSON.parse(
        Buffer.from(
          encoded,
          "base64url"
        ).toString("utf8")
      );

    if (
      typeof payload.exp !== "number"
    ) {
      return false;
    }

    return (
      payload.exp >
      Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export function safeCompare(
  valueA: string,
  valueB: string
) {
  const a =
    crypto
      .createHash("sha256")
      .update(valueA)
      .digest();

  const b =
    crypto
      .createHash("sha256")
      .update(valueB)
      .digest();

  return crypto.timingSafeEqual(a, b);
}

export const ADMIN_SESSION_MAX_AGE =
  SESSION_DURATION_SECONDS;
