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

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Selecione uma imagem." },
      { status: 400 }
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      {
        error:
          "O arquivo precisa ser uma imagem.",
      },
      { status: 400 }
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Imagem maior que 5 MB." },
      { status: 400 }
    );
  }

  const extension =
    file.name.split(".").pop()?.toLowerCase() ||
    "jpg";

  const path =
    `${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const buffer = Buffer.from(
    await file.arrayBuffer()
  );

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage
    .from("products")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error(
      "Erro upload produto:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível enviar a imagem.",
      },
      { status: 500 }
    );
  }

  const { data } = supabase.storage
    .from("products")
    .getPublicUrl(path);

  return NextResponse.json({
    ok: true,
    url: data.publicUrl,
  });
}
