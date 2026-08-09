import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  isValidAdminSession,
} from "../../../../../lib/admin-auth";
import { getSupabaseAdmin } from "../../../../../lib/supabase-admin";

function numberOrNull(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

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

  const volume =
    typeof body.volume === "string"
      ? body.volume.trim()
      : "";

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : "";

  const imageUrl =
    typeof body.image_url === "string"
      ? body.image_url.trim()
      : "";

  const categoryId =
    typeof body.category_id === "string" &&
    body.category_id
      ? body.category_id
      : null;

  const price = numberOrNull(body.price);
  const promotionalPrice = numberOrNull(
    body.promotional_price
  );
  const stock = Number(body.stock ?? 0);
  const minStock = Number(body.min_stock ?? 3);

  if (
    !name ||
    price === null ||
    price < 0 ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    return NextResponse.json(
      {
        error:
          "Nome, preço e estoque são obrigatórios.",
      },
      { status: 400 }
    );
  }

  const payload = {
    name,
    slug:
      typeof body.slug === "string" &&
      body.slug.trim()
        ? slugify(body.slug)
        : slugify(name),
    volume: volume || null,
    description: description || null,
    image_url: imageUrl || null,
    category_id: categoryId,
    price,
    promotional_price: promotionalPrice,
    stock,
    min_stock:
      Number.isInteger(minStock) && minStock >= 0
        ? minStock
        : 3,
    active: body.active !== false,
    featured: body.featured === true,
    on_sale: body.on_sale === true,
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabaseAdmin();

  if (id) {
    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error(
        "Erro atualizando produto:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível salvar o produto.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id });
  }

  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("Erro criando produto:", error);

    return NextResponse.json(
      {
        error:
          "Não foi possível criar o produto.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
  });
}
