import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  isValidAdminSession,
} from "../../lib/admin-auth";
import { getSupabaseAdmin } from "../../lib/supabase-admin";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();

  const loggedIn = isValidAdminSession(
    cookieStore.get(ADMIN_COOKIE)?.value
  );

  if (!loggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-yellow-500/20 bg-[#111] p-6 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-yellow-400/60 bg-black">
              <img
                src="/logo-andinho.png"
                alt="Andinho do Combo"
                className="h-full w-full object-cover"
              />
            </div>

            <p className="mt-5 text-xs font-bold tracking-widest text-yellow-400">
              ÁREA RESTRITA
            </p>

            <h1 className="mt-2 text-2xl font-black">
              Painel Administrativo
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Digite sua senha para continuar.
            </p>
          </div>

          {params.erro === "1" && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
              Senha incorreta. Tente novamente.
            </div>
          )}

          <form
            action="/api/admin/login"
            method="POST"
            className="mt-6 space-y-4"
          >
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                SENHA
              </label>

              <input
                type="password"
                name="password"
                placeholder="Digite sua senha"
                required
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-yellow-400"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black shadow-xl"
            >
              ENTRAR NO PAINEL →
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-600">
            Andinho do Combo • Administração
          </p>
        </div>
      </main>
    );
  }

  const supabase = getSupabaseAdmin();

  const [
    ordersResult,
    itemsResult,
    productsResult,
    categoriesResult,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, customer_name, customer_phone, order_type, payment_method, address, neighborhood, city, cep, subtotal, delivery_fee, discount, total, status, notes, whatsapp_opened, created_at, updated_at"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(100),

    supabase
      .from("order_items")
      .select(
        "id, order_id, product_id, product_name, quantity, unit_price, total"
      )
      .limit(1000),

    supabase
      .from("products")
      .select(
        "id, name, slug, description, volume, image_url, price, promotional_price, stock, min_stock, active, featured, on_sale, category_id, created_at, updated_at"
      )
      .order("name"),

    supabase
      .from("categories")
      .select(
        "id, name, slug, icon, active"
      )
      .order("name"),
  ]);

  if (ordersResult.error) {
    console.error(
      "Admin/orders:",
      ordersResult.error
    );
  }

  if (itemsResult.error) {
    console.error(
      "Admin/order_items:",
      itemsResult.error
    );
  }

  if (productsResult.error) {
    console.error(
      "Admin/products:",
      productsResult.error
    );
  }

  if (categoriesResult.error) {
    console.error(
      "Admin/categories:",
      categoriesResult.error
    );
  }

  return (
    <AdminDashboard
      initialOrders={ordersResult.data ?? []}
      initialOrderItems={itemsResult.data ?? []}
      initialProducts={productsResult.data ?? []}
      initialCategories={categoriesResult.data ?? []}
    />
  );
}
