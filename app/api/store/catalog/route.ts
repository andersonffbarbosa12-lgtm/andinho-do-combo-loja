import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [productsResult, categoriesResult] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, description, volume, image_url, price, promotional_price, stock, featured, on_sale, category_id, active, created_at"
        )
        .eq("active", true)
        .order("created_at", { ascending: false }),

      supabase
        .from("categories")
        .select("id, name, icon, active")
        .eq("active", true)
        .order("name", { ascending: true }),
    ]);

    if (productsResult.error) {
      console.error(
        "Store catalog/products:",
        productsResult.error
      );

      return NextResponse.json(
        { error: "Não foi possível carregar os produtos." },
        { status: 500 }
      );
    }

    if (categoriesResult.error) {
      console.error(
        "Store catalog/categories:",
        categoriesResult.error
      );

      return NextResponse.json(
        { error: "Não foi possível carregar as categorias." },
        { status: 500 }
      );
    }

    const categories = categoriesResult.data ?? [];

    const categoryById = new Map(
      categories.map((item) => [
        item.id,
        {
          id: item.id,
          name: item.name,
          icon: item.icon,
        },
      ])
    );

    const products = (productsResult.data ?? [])
      .filter((product) => {
        if (!product.category_id) {
          return true;
        }

        return categoryById.has(product.category_id);
      })
      .map((product) => {
        const category = product.category_id
          ? categoryById.get(product.category_id)
          : null;

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          volume: product.volume,
          image_url: product.image_url,
          price: Number(product.price),
          promotional_price:
            product.promotional_price === null
              ? null
              : Number(product.promotional_price),
          stock: Number(product.stock),
          featured: Boolean(product.featured),
          on_sale: Boolean(product.on_sale),
          category_id: product.category_id,
          categories: category
            ? { name: category.name }
            : null,
        };
      });

    return NextResponse.json(
      {
        products,
        categories: categories.map((item) => ({
          id: item.id,
          name: item.name,
          icon: item.icon,
        })),
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Store catalog:", error);

    return NextResponse.json(
      { error: "Erro interno ao carregar o catálogo." },
      { status: 500 }
    );
  }
}
