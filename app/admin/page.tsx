import { cookies } from "next/headers";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function getAdminSessionValue() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return "";
  return crypto.createHash("sha256").update(`andinho-admin:${password}`).digest("hex");
}


type Order = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  order_type: string | null;
  payment_method: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  cep: string | null;
  subtotal: number | null;
  delivery_fee: number | null;
  discount: number | null;
  total: number | null;
  status: string | null;
  notes: string | null;
  created_at: string;
};

function money(value: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function statusInfo(status: string | null) {
  switch (status) {
    case "paid":
      return { label: "PAGO", className: "border-green-500/30 bg-green-500/10 text-green-400" };
    case "pending_payment":
      return { label: "AGUARDANDO PAGAMENTO", className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300" };
    case "cancelled":
    case "canceled":
      return { label: "CANCELADO", className: "border-red-500/30 bg-red-500/10 text-red-400" };
    default:
      return { label: "PENDENTE", className: "border-white/10 bg-white/5 text-gray-300" };
  }
}

function paymentLabel(method: string | null) {
  const labels: Record<string, string> = {
    mercado_pago: "Mercado Pago",
    pix: "PIX",
    cash: "Dinheiro",
    card_debit: "Cartão de débito",
    card_credit: "Cartão de crédito",
  };
  return method ? labels[method] ?? method : "Não informado";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("andinho_admin_session")?.value ?? "";
  const expectedSession = getAdminSessionValue();
  const loggedIn = Boolean(expectedSession) && sessionCookie === expectedSession;

  if (!loggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-yellow-500/20 bg-[#111] p-6 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-yellow-400/60 bg-black">
              <img src="/logo-andinho.png" alt="Andinho do Combo" className="h-full w-full object-cover" />
            </div>
            <p className="mt-5 text-xs font-bold tracking-widest text-yellow-400">ÁREA RESTRITA</p>
            <h1 className="mt-2 text-2xl font-black">Painel Administrativo</h1>
            <p className="mt-2 text-sm text-gray-500">Digite sua senha para continuar.</p>
          </div>

          {params.erro === "1" && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
              Senha incorreta. Tente novamente.
            </div>
          )}

          <form action="/api/admin/login" method="POST" className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">SENHA</label>
              <input
                type="password"
                name="password"
                placeholder="Digite sua senha"
                required
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-yellow-400"
              />
            </div>

            <button type="submit" className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black shadow-xl">
              ENTRAR NO PAINEL →
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-600">Andinho do Combo • Administração</p>
        </div>
      </main>
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let orders: Order[] = [];
  let ordersError = "";

  if (!supabaseUrl || !serviceRoleKey) {
    ordersError = "Variáveis do Supabase não configuradas no servidor.";
  } else {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, customer_name, customer_phone, order_type, payment_method, address, neighborhood, city, cep, subtotal, delivery_fee, discount, total, status, notes, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Erro ao carregar pedidos no Admin:", error);
      ordersError = "Não foi possível carregar os pedidos.";
    } else {
      orders = (data ?? []) as Order[];
    }
  }

  const paidOrders = orders.filter((order) => order.status === "paid");
  const waitingOrders = orders.filter((order) => order.status === "pending_payment");
  const totalPaid = paidOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <header className="border-b border-yellow-500/10 bg-black">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full border border-yellow-400/40">
              <img src="/logo-andinho.png" alt="Andinho do Combo" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-xs font-bold text-yellow-400">ADMIN</p>
              <h1 className="font-black">Andinho do Combo</h1>
            </div>
          </div>

          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-bold text-red-400">
              SAIR
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <section className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-6">
          <p className="text-xs font-bold text-yellow-400">PAINEL ADMINISTRATIVO</p>
          <h2 className="mt-2 text-2xl font-black">Acesso liberado ✅</h2>
          <p className="mt-2 text-sm text-gray-400">
            O login do Admin está funcionando. Agora vamos adicionar pedidos, produtos, estoque e configurações aqui.
          </p>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["📦", "Pedidos", String(orders.length)],
            ["✅", "Pagos", String(paidOrders.length)],
            ["⏳", "Aguardando", String(waitingOrders.length)],
            ["💰", "Recebido", money(totalPaid)],
          ].map(([icon, label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-[#121212] p-5">
              <div className="text-2xl">{icon}</div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
              <p className="mt-1 text-lg font-black">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-7">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-yellow-400">PEDIDOS</p>
              <h2 className="text-xl font-black">Pedidos recentes</h2>
            </div>
            <span className="text-xs text-gray-600">Últimos 50</span>
          </div>

          {ordersError && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
              {ordersError}
            </div>
          )}

          {!ordersError && orders.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#121212] p-6 text-center text-sm text-gray-500">
              Nenhum pedido encontrado.
            </div>
          )}

          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusInfo(order.status);
              const isDelivery = order.order_type === "delivery";

              return (
                <article key={order.id} className="rounded-3xl border border-white/10 bg-[#111] p-5 shadow-xl">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black">{order.customer_name || "Cliente sem nome"}</p>
                      <p className="mt-1 text-sm text-gray-500">{order.customer_phone || "Telefone não informado"}</p>
                    </div>

                    <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-2xl bg-black/40 p-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold text-gray-600">TIPO</p>
                      <p className="mt-1 font-bold">{isDelivery ? "🚚 Entrega" : "🏪 Retirada no local"}</p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-gray-600">PAGAMENTO</p>
                      <p className="mt-1 font-bold">{paymentLabel(order.payment_method)}</p>
                    </div>

                    {isDelivery && (
                      <div className="md:col-span-2">
                        <p className="text-xs font-bold text-gray-600">ENDEREÇO</p>
                        <p className="mt-1 font-bold">
                          {[order.address, order.neighborhood, order.city, order.cep].filter(Boolean).join(" • ") || "Não informado"}
                        </p>
                      </div>
                    )}

                    {order.notes && (
                      <div className="md:col-span-2">
                        <p className="text-xs font-bold text-gray-600">OBSERVAÇÕES</p>
                        <p className="mt-1 text-gray-300">{order.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                    <div className="rounded-xl border border-white/5 p-3">
                      <p className="text-[10px] font-bold text-gray-600">SUBTOTAL</p>
                      <p className="mt-1 font-bold">{money(order.subtotal)}</p>
                    </div>
                    <div className="rounded-xl border border-white/5 p-3">
                      <p className="text-[10px] font-bold text-gray-600">ENTREGA</p>
                      <p className="mt-1 font-bold">{money(order.delivery_fee)}</p>
                    </div>
                    <div className="rounded-xl border border-white/5 p-3">
                      <p className="text-[10px] font-bold text-gray-600">DESCONTO</p>
                      <p className="mt-1 font-bold">{money(order.discount)}</p>
                    </div>
                    <div className="rounded-xl border border-yellow-500/20 bg-yellow-400/5 p-3">
                      <p className="text-[10px] font-bold text-yellow-500/70">TOTAL</p>
                      <p className="mt-1 font-black text-yellow-400">{money(order.total)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-4 text-xs text-gray-600">
                    <span>Pedido #{order.id.slice(0, 8).toUpperCase()}</span>
                    <span>
                      {new Intl.DateTimeFormat("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(order.created_at))}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
