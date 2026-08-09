import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  isValidAdminSession,
} from "../../../../../lib/admin-auth";
import { getSupabaseAdmin } from "../../../../../lib/supabase-admin";

const ALLOWED_STATUSES = new Set([
  "pending",
  "pending_payment",
  "paid",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "payment_rejected",
  "refunded",
]);

export async function POST(request: NextRequest) {
  if (
    !isValidAdminSession(
      request.cookies.get(ADMIN_COOKIE)?.value
    )
  ) {
    return NextResponse.json(
      { error: "Não autorizado." },
      { status: 401 }
    );
  }

  const body = await request.json();
  const id = typeof body.id === "string" ? body.id : "";
  const status =
    typeof body.status === "string" ? body.status : "";

  if (!id || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json(
      { error: "Dados inválidos." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar status:", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar o pedido." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
