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
      { error: "Categoria inválida." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("categories")
    .update({ active })
    .eq("id", id);

  if (error) {
    console.error(
      "Erro alterando categoria:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível alterar a categoria.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
