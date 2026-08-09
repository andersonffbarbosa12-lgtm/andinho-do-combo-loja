import "server-only";

import crypto from "crypto";
import { getSupabaseAdmin } from "./supabase-admin";

export function getRequestFingerprint(
  headers: Headers
) {
  const forwarded =
    headers.get("x-forwarded-for") ?? "";

  const ip =
    forwarded.split(",")[0]?.trim() ||
    "unknown";

  const userAgent =
    headers.get("user-agent") ?? "unknown";

  return crypto
    .createHash("sha256")
    .update(`${ip}|${userAgent}`)
    .digest("hex");
}

export async function checkRateLimit({
  keyHash,
  action,
  limit,
  windowSeconds,
}: {
  keyHash: string;
  action: string;
  limit: number;
  windowSeconds: number;
}) {
  const supabase = getSupabaseAdmin();

  const since = new Date(
    Date.now() - windowSeconds * 1000
  ).toISOString();

  const { count, error } =
    await supabase
      .from("security_rate_limits")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("key_hash", keyHash)
      .eq("action", action)
      .gte("created_at", since);

  if (error) {
    console.error(
      "Erro verificando rate limit:",
      error
    );

    /*
      Em caso de falha do controle,
      não derrubamos a loja.
    */
    return {
      allowed: true,
      remaining: limit,
    };
  }

  if ((count ?? 0) >= limit) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  const { error: insertError } =
    await supabase
      .from("security_rate_limits")
      .insert({
        key_hash: keyHash,
        action,
      });

  if (insertError) {
    console.error(
      "Erro registrando rate limit:",
      insertError
    );
  }

  return {
    allowed: true,
    remaining:
      Math.max(
        limit - (count ?? 0) - 1,
        0
      ),
  };
  }
