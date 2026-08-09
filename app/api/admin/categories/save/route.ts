import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  isValidAdminSession,
} from "../../../../../lib/admin-auth";
import { getSupabaseAdmin } from "../../../../../lib/supabase-admin";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
    typeof body.id === "string" && body.id
      ? body.id
      : null;

  const name =
    typeof body.name === "string"
      ? body.name.trim()
      : "";

  const icon =
    typeof body.icon === "string"
      ? body.icon.trim()
      : "";

  if (!name) {
    return NextResponse.json(
      {
        error:
          "Digite o nome da categoria.",
      },
      { status: 400 }
    );
  }

  const payload = {
    name,
    slug: slugify(name),
    icon: icon || null,
    active: body.active !== false,
  };

  const supabase = getSupabaseAdmin();

  if (id) {
    const { error } = await supabase
      .from("categories")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error(
        "Erro atualizando categoria:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível salvar a categoria.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id });
  }

  const { data, error } = await supabase
    .from("categories")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error(
      "Erro criando categoria:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível criar a categoria.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
  });
}
