import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  isValidAdminSession,
} from "../../../../../lib/admin-auth";
import { getSupabaseAdmin } from "../../../../../lib/supabase-admin";

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
  const id =
    typeof body.id === "string" ? body.id : "";
  const active = body.active === true;

  if (!id) {
    return NextResponse.json(
      { error: "Produto inválido." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("products")
    .update({
      active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error(
      "Erro alterando produto:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível alterar o produto.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
