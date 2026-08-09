"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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
  whatsapp_opened: boolean | null;
  created_at: string;
  updated_at: string | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
};

type Product = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  volume: string | null;
  image_url: string | null;
  price: number;
  promotional_price: number | null;
  stock: number;
  min_stock: number | null;
  active: boolean;
  featured: boolean;
  on_sale: boolean;
  category_id: string | null;
  created_at: string;
  updated_at: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string | null;
  icon: string | null;
  active: boolean;
};

type Tab =
  | "dashboard"
  | "orders"
  | "products"
  | "stock"
  | "categories";

function money(
  value: number | null | undefined
) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function paymentLabel(
  method: string | null
) {
  const labels: Record<string, string> = {
    mercado_pago: "Mercado Pago",
    pix: "PIX",
    cash: "Dinheiro",
    card_debit: "Débito",
    card_credit: "Crédito",
  };

  return method
    ? labels[method] ?? method
    : "Não informado";
}

const STATUS_INFO: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "PENDENTE",
    className:
      "border-white/10 bg-white/5 text-gray-300",
  },
  pending_payment: {
    label: "AGUARDANDO PAGAMENTO",
    className:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  },
  paid: {
    label: "PAGO",
    className:
      "border-green-500/30 bg-green-500/10 text-green-400",
  },
  preparing: {
    label: "PREPARANDO",
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-300",
  },
  ready: {
    label: "PRONTO",
    className:
      "border-purple-500/30 bg-purple-500/10 text-purple-300",
  },
  out_for_delivery: {
    label: "SAIU PARA ENTREGA",
    className:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  },
  delivered: {
    label: "FINALIZADO",
    className:
      "border-green-500/30 bg-green-500/10 text-green-300",
  },
  cancelled: {
    label: "CANCELADO",
    className:
      "border-red-500/30 bg-red-500/10 text-red-400",
  },
  payment_rejected: {
    label: "PAGAMENTO RECUSADO",
    className:
      "border-red-500/30 bg-red-500/10 text-red-400",
  },
  refunded: {
    label: "REEMBOLSADO",
    className:
      "border-orange-500/30 bg-orange-500/10 text-orange-300",
  },
};

function statusInfo(
  status: string | null
) {
  return (
    STATUS_INFO[status ?? "pending"] ??
    STATUS_INFO.pending
  );
}

function nextActions(order: Order) {
  const delivery =
    order.order_type === "delivery";

  switch (order.status) {
    case "paid":
    case "pending":
      return [
        {
          status: "preparing",
          label: "🍹 PREPARAR",
        },
      ];

    case "preparing":
      return delivery
        ? [
            {
              status: "out_for_delivery",
              label:
                "🛵 SAIU PARA ENTREGA",
            },
          ]
        : [
            {
              status: "ready",
              label:
                "✅ PRONTO PARA RETIRADA",
            },
          ];

    case "ready":
    case "out_for_delivery":
      return [
        {
          status: "delivered",
          label: "✅ FINALIZAR",
        },
      ];

    default:
      return [];
  }
}

export default function AdminDashboard({
  initialOrders,
  initialOrderItems,
  initialProducts,
  initialCategories,
}: {
  initialOrders: Order[];
  initialOrderItems: OrderItem[];
  initialProducts: Product[];
  initialCategories: Category[];
}) {
  const router = useRouter();

  const [tab, setTab] =
    useState<Tab>("dashboard");

  const [orderFilter, setOrderFilter] =
    useState("all");

  const [orderSearch, setOrderSearch] =
    useState("");

  const [
    productSearch,
    setProductSearch,
  ] = useState("");

  const [busy, setBusy] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    editingProduct,
    setEditingProduct,
  ] = useState<Product | null>(null);

  const [
    showNewProduct,
    setShowNewProduct,
  ] = useState(false);

  const [
    newCategoryName,
    setNewCategoryName,
  ] = useState("");

  const [
    newCategoryIcon,
    setNewCategoryIcon,
  ] = useState("");

  const itemsByOrder = useMemo(() => {
    const map: Record<
      string,
      OrderItem[]
    > = {};

    for (const item of initialOrderItems) {
      (map[item.order_id] ??= []).push(
        item
      );
    }

    return map;
  }, [initialOrderItems]);

  const paidOrders =
    initialOrders.filter((order) =>
      [
        "paid",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
      ].includes(order.status ?? "")
    );

  const pendingPayment =
    initialOrders.filter(
      (order) =>
        order.status ===
        "pending_payment"
    );

  const activeOrders =
    initialOrders.filter((order) =>
      [
        "paid",
        "pending",
        "preparing",
        "ready",
        "out_for_delivery",
      ].includes(order.status ?? "")
    );

  const lowStockProducts =
    initialProducts.filter(
      (product) =>
        product.active &&
        product.stock <=
          Number(
            product.min_stock ?? 3
          )
    );

  const today =
    new Intl.DateTimeFormat("en-CA", {
      timeZone:
        "America/Sao_Paulo",
    }).format(new Date());

  const todayOrders =
    initialOrders.filter(
      (order) =>
        new Intl.DateTimeFormat(
          "en-CA",
          {
            timeZone:
              "America/Sao_Paulo",
          }
        ).format(
          new Date(order.created_at)
        ) === today
    );

  const todayPaid = todayOrders
    .filter((order) =>
      [
        "paid",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
      ].includes(order.status ?? "")
    )
    .reduce(
      (sum, order) =>
        sum +
        Number(order.total ?? 0),
      0
    );

  const totalPaid =
    paidOrders.reduce(
      (sum, order) =>
        sum +
        Number(order.total ?? 0),
      0
    );

  const filteredOrders =
    initialOrders.filter((order) => {
      if (
        orderFilter !== "all" &&
        order.status !== orderFilter
      ) {
        return false;
      }

      const query =
        orderSearch
          .trim()
          .toLowerCase();

      if (!query) return true;

      return [
        order.customer_name,
        order.customer_phone,
        order.neighborhood,
        order.id,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        );
    });

  const filteredProducts =
    initialProducts.filter(
      (product) => {
        const query =
          productSearch
            .trim()
            .toLowerCase();

        if (!query) return true;

        return [
          product.name,
          product.volume,
          product.slug,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query)
          );
      }
    );

  async function postJson(
    url: string,
    payload: unknown
  ) {
    const response = await fetch(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body:
          JSON.stringify(payload),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Não foi possível concluir a ação."
      );
    }

    return data;
  }

  async function updateOrderStatus(
    id: string,
    status: string
  ) {
    setBusy(`order-${id}`);
    setMessage("");

    try {
      await postJson(
        "/api/admin/orders/status",
        { id, status }
      );

      setMessage(
        "Pedido atualizado com sucesso."
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro atualizando pedido."
      );
    } finally {
      setBusy("");
    }
  }

  async function toggleProduct(
    product: Product,
    active: boolean
  ) {
    setBusy(
      `product-${product.id}`
    );

    try {
      await postJson(
        "/api/admin/products/toggle",
        {
          id: product.id,
          active,
        }
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro alterando produto."
      );
    } finally {
      setBusy("");
    }
  }

  async function toggleCategory(
    category: Category,
    active: boolean
  ) {
    setBusy(
      `category-${category.id}`
    );

    try {
      await postJson(
        "/api/admin/categories/toggle",
        {
          id: category.id,
          active,
        }
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro alterando categoria."
      );
    } finally {
      setBusy("");
    }
  }

  async function createCategory(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!newCategoryName.trim()) {
      return;
    }

    setBusy("new-category");

    try {
      await postJson(
        "/api/admin/categories/save",
        {
          name: newCategoryName,
          icon: newCategoryIcon,
          active: true,
        }
      );

      setNewCategoryName("");
      setNewCategoryIcon("");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro criando categoria."
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] pb-10 text-white">
      <header className="sticky top-0 z-50 border-b border-yellow-500/10 bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-yellow-400/40">
              <img
                src="/logo-andinho.png"
                alt="Andinho do Combo"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold text-yellow-400">
                ADMIN
              </p>
              <h1 className="truncate font-black">
                Andinho do Combo
              </h1>
            </div>
          </div>

          <form
            action="/api/admin/logout"
            method="POST"
          >
            <button className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-bold text-red-400">
              SAIR
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5">
        {message && (
          <div className="mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-200">
            {message}
          </div>
        )}

        <nav className="flex gap-2 overflow-x-auto pb-2">
          {[
            [
              "dashboard",
              "📊",
              "Visão geral",
            ],
            [
              "orders",
              "📦",
              "Pedidos",
            ],
            [
              "products",
              "🥃",
              "Produtos",
            ],
            [
              "stock",
              "📉",
              "Estoque",
            ],
            [
              "categories",
              "🗂️",
              "Categorias",
            ],
          ].map(
            ([
              value,
              icon,
              label,
            ]) => (
              <button
                key={value}
                onClick={() =>
                  setTab(
                    value as Tab
                  )
                }
                className={`shrink-0 rounded-2xl border px-4 py-3 text-sm font-bold ${
                  tab === value
                    ? "border-yellow-400 bg-yellow-400 text-black"
                    : "border-white/10 bg-[#121212] text-gray-300"
                }`}
              >
                {icon} {label}
              </button>
            )
          )}
        </nav>

        {tab === "dashboard" && (
          <DashboardTab
            todayPaid={todayPaid}
            activeOrders={
              activeOrders.length
            }
            pendingPayment={
              pendingPayment.length
            }
            lowStockProducts={
              lowStockProducts
            }
            totalPaid={totalPaid}
            products={initialProducts}
            todayOrders={
              todayOrders.length
            }
          />
        )}

        {tab === "orders" && (
          <OrdersTab
            orders={
              filteredOrders
            }
            itemsByOrder={
              itemsByOrder
            }
            filter={
              orderFilter
            }
            setFilter={
              setOrderFilter
            }
            search={
              orderSearch
            }
            setSearch={
              setOrderSearch
            }
            busy={busy}
            updateStatus={
              updateOrderStatus
            }
          />
        )}

        {tab === "products" && (
          <ProductsTab
            products={
              filteredProducts
            }
            categories={
              initialCategories
            }
            search={
              productSearch
            }
            setSearch={
              setProductSearch
            }
            editingProduct={
              editingProduct
            }
            setEditingProduct={
              setEditingProduct
            }
            showNewProduct={
              showNewProduct
            }
            setShowNewProduct={
              setShowNewProduct
            }
            toggleProduct={
              toggleProduct
            }
            busy={busy}
            routerRefresh={() =>
              router.refresh()
            }
            setBusy={setBusy}
            setMessage={
              setMessage
            }
          />
        )}

        {tab === "stock" && (
          <StockTab
            products={
              initialProducts
            }
          />
        )}

        {tab ===
          "categories" && (
          <CategoriesTab
            categories={
              initialCategories
            }
            newName={
              newCategoryName
            }
            setNewName={
              setNewCategoryName
            }
            newIcon={
              newCategoryIcon
            }
            setNewIcon={
              setNewCategoryIcon
            }
            createCategory={
              createCategory
            }
            toggleCategory={
              toggleCategory
            }
            busy={busy}
          />
        )}
      </div>
    </main>
  );
}

function DashboardTab({
  todayPaid,
  activeOrders,
  pendingPayment,
  lowStockProducts,
  totalPaid,
  products,
  todayOrders,
}: {
  todayPaid: number;
  activeOrders: number;
  pendingPayment: number;
  lowStockProducts: Product[];
  totalPaid: number;
  products: Product[];
  todayOrders: number;
}) {
  return (
    <>
      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [
            "💰",
            "Vendas hoje",
            money(todayPaid),
          ],
          [
            "📦",
            "Pedidos ativos",
            String(activeOrders),
          ],
          [
            "⏳",
            "Aguardando pagamento",
            String(
              pendingPayment
            ),
          ],
          [
            "⚠️",
            "Estoque baixo",
            String(
              lowStockProducts.length
            ),
          ],
        ].map(
          ([
            icon,
            label,
            value,
          ]) => (
            <div
              key={label}
              className="rounded-3xl border border-white/10 bg-[#121212] p-5"
            >
              <div className="text-2xl">
                {icon}
              </div>
              <p className="mt-3 text-xs font-bold uppercase text-gray-600">
                {label}
              </p>
              <p className="mt-1 text-xl font-black">
                {value}
              </p>
            </div>
          )
        )}
      </section>

      <section className="mt-5 rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-5">
        <p className="text-xs font-bold text-yellow-400">
          RESUMO
        </p>
        <h2 className="mt-1 text-xl font-black">
          Operação da loja
        </h2>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Metric
            label="RECEBIDO NO HISTÓRICO"
            value={money(
              totalPaid
            )}
            accent
          />
          <Metric
            label="PRODUTOS ATIVOS"
            value={String(
              products.filter(
                (product) =>
                  product.active
              ).length
            )}
          />
          <Metric
            label="PEDIDOS HOJE"
            value={String(
              todayOrders
            )}
          />
        </div>
      </section>

      {lowStockProducts.length >
        0 && (
        <section className="mt-5">
          <p className="text-xs font-bold text-red-400">
            ATENÇÃO
          </p>
          <h2 className="text-xl font-black">
            Estoque baixo
          </h2>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {lowStockProducts
              .slice(0, 8)
              .map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/5 p-4"
                >
                  <div>
                    <p className="font-black">
                      {
                        product.name
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.volume ||
                        "Sem volume"}
                    </p>
                  </div>

                  <span className="rounded-xl bg-red-500/10 px-3 py-2 font-black text-red-400">
                    {
                      product.stock
                    }{" "}
                    un.
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}
    </>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-black/40 p-4">
      <p className="text-xs text-gray-600">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-black ${
          accent
            ? "text-green-400"
            : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}


function OrdersTab({
  orders,
  itemsByOrder,
  filter,
  setFilter,
  search,
  setSearch,
  busy,
  updateStatus,
}: {
  orders: Order[];
  itemsByOrder: Record<string, OrderItem[]>;
  filter: string;
  setFilter: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  busy: string;
  updateStatus: (id: string, status: string) => void;
}) {
  return (
    <section className="mt-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold text-yellow-400">
            PEDIDOS
          </p>
          <h2 className="text-2xl font-black">
            Gerenciar pedidos
          </h2>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente, telefone..."
            className="rounded-2xl border border-white/10 bg-[#111] px-4 py-3 outline-none focus:border-yellow-400"
          />

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-2xl border border-white/10 bg-[#111] px-4 py-3 outline-none"
          >
            <option value="all">
              Todos os status
            </option>

            {Object.entries(STATUS_INFO).map(
              ([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {orders.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#111] p-8 text-center text-gray-500">
            Nenhum pedido encontrado.
          </div>
        )}

        {orders.map((order) => {
          const info = statusInfo(order.status);
          const items = itemsByOrder[order.id] ?? [];
          const actions = nextActions(order);

          const normalizedPhone = String(
            order.customer_phone ?? ""
          ).replace(/\D/g, "");

          const whatsappPhone =
            normalizedPhone.startsWith("55")
              ? normalizedPhone
              : `55${normalizedPhone}`;

          return (
            <article
              key={order.id}
              className="rounded-3xl border border-white/10 bg-[#111] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black">
                    {order.customer_name || "Cliente"}
                  </p>

                  {normalizedPhone && (
                    <a
                      href={`https://wa.me/${whatsappPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-sm text-green-400"
                    >
                      💬 {order.customer_phone}
                    </a>
                  )}
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black ${info.className}`}
                >
                  {info.label}
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-black/40 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold text-gray-600">
                      ENTREGA
                    </p>
                    <p className="mt-1 font-bold">
                      {order.order_type === "delivery"
                        ? "🚚 Entrega"
                        : "🏪 Retirada"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-gray-600">
                      PAGAMENTO
                    </p>
                    <p className="mt-1 font-bold">
                      {paymentLabel(order.payment_method)}
                    </p>
                  </div>
                </div>

                {order.order_type === "delivery" && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold text-gray-600">
                      ENDEREÇO
                    </p>
                    <p className="mt-1 text-sm">
                      {[
                        order.address,
                        order.neighborhood,
                        order.city,
                        order.cep,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                )}

                {items.length > 0 && (
                  <div className="mt-4 border-t border-white/5 pt-4">
                    <p className="text-[10px] font-bold text-gray-600">
                      ITENS
                    </p>

                    <div className="mt-2 space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between gap-3 text-sm"
                        >
                          <span className="text-gray-300">
                            {item.quantity}x {item.product_name}
                          </span>

                          <span className="font-bold">
                            {money(item.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {order.notes && (
                  <div className="mt-4 border-t border-white/5 pt-4">
                    <p className="text-[10px] font-bold text-gray-600">
                      OBSERVAÇÃO
                    </p>
                    <p className="mt-1 text-sm text-gray-300">
                      {order.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                <MiniMetric
                  label="SUBTOTAL"
                  value={money(order.subtotal)}
                />
                <MiniMetric
                  label="ENTREGA"
                  value={money(order.delivery_fee)}
                />
                <MiniMetric
                  label="DESCONTO"
                  value={money(order.discount)}
                />
                <MiniMetric
                  label="TOTAL"
                  value={money(order.total)}
                  accent
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {actions.map((action) => (
                  <button
                    key={action.status}
                    disabled={busy === `order-${order.id}`}
                    onClick={() =>
                      updateStatus(
                        order.id,
                        action.status
                      )
                    }
                    className="rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black disabled:opacity-50"
                  >
                    {action.label}
                  </button>
                ))}

                {![
                  "delivered",
                  "cancelled",
                  "refunded",
                ].includes(order.status ?? "") && (
                  <button
                    disabled={busy === `order-${order.id}`}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Cancelar este pedido?"
                        )
                      ) {
                        updateStatus(
                          order.id,
                          "cancelled"
                        );
                      }
                    }}
                    className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-bold text-red-400"
                  >
                    CANCELAR
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-white/5 pt-4 text-xs text-gray-600">
                <span>
                  #{order.id.slice(0, 8).toUpperCase()}
                </span>
                <span>{dateTime(order.created_at)}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MiniMetric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        accent
          ? "border-yellow-500/20 bg-yellow-400/5"
          : "border-white/5"
      }`}
    >
      <p
        className={`text-[10px] ${
          accent
            ? "text-yellow-500/70"
            : "text-gray-600"
        }`}
      >
        {label}
      </p>

      <p
        className={`font-bold ${
          accent
            ? "text-yellow-400"
            : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ProductsTab({
  products,
  categories,
  search,
  setSearch,
  editingProduct,
  setEditingProduct,
  showNewProduct,
  setShowNewProduct,
  toggleProduct,
  busy,
  routerRefresh,
  setBusy,
  setMessage,
}: {
  products: Product[];
  categories: Category[];
  search: string;
  setSearch: (value: string) => void;
  editingProduct: Product | null;
  setEditingProduct: (product: Product | null) => void;
  showNewProduct: boolean;
  setShowNewProduct: (value: boolean) => void;
  toggleProduct: (
    product: Product,
    active: boolean
  ) => void;
  busy: string;
  routerRefresh: () => void;
  setBusy: (value: string) => void;
  setMessage: (value: string) => void;
}) {
  return (
    <section className="mt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold text-yellow-400">
            CATÁLOGO
          </p>
          <h2 className="text-2xl font-black">
            Produtos
          </h2>
        </div>

        <button
          onClick={() => {
            setEditingProduct(null);
            setShowNewProduct(true);
          }}
          className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black"
        >
          + NOVO PRODUTO
        </button>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar produto..."
        className="mt-4 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 outline-none focus:border-yellow-400"
      />

      {(showNewProduct || editingProduct) && (
        <ProductEditor
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setEditingProduct(null);
            setShowNewProduct(false);
          }}
          onSaved={() => {
            setEditingProduct(null);
            setShowNewProduct(false);
            routerRefresh();
          }}
          setBusy={setBusy}
          setMessage={setMessage}
        />
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const category = categories.find(
            (item) =>
              item.id === product.category_id
          );

          return (
            <article
              key={product.id}
              className="rounded-3xl border border-white/10 bg-[#111] p-4"
            >
              <div className="flex gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-4xl">
                      🥃
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black">
                        {product.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {product.volume || "Sem volume"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                        product.active
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {product.active ? "ATIVO" : "INATIVO"}
                    </span>
                  </div>

                  <p className="mt-2 text-lg font-black text-yellow-400">
                    {product.promotional_price !== null
                      ? money(product.promotional_price)
                      : money(product.price)}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {category?.name || "Sem categoria"} •{" "}
                    {product.stock} em estoque
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setShowNewProduct(false);
                    setEditingProduct(product);
                  }}
                  className="rounded-xl border border-yellow-500/20 bg-yellow-400/5 px-3 py-3 text-sm font-bold text-yellow-400"
                >
                  ✏️ EDITAR
                </button>

                <button
                  disabled={busy === `product-${product.id}`}
                  onClick={() =>
                    toggleProduct(
                      product,
                      !product.active
                    )
                  }
                  className={`rounded-xl border px-3 py-3 text-sm font-bold ${
                    product.active
                      ? "border-red-500/20 bg-red-500/5 text-red-400"
                      : "border-green-500/20 bg-green-500/5 text-green-400"
                  }`}
                >
                  {product.active
                    ? "DESATIVAR"
                    : "ATIVAR"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function StockTab({
  products,
}: {
  products: Product[];
}) {
  return (
    <section className="mt-5">
      <p className="text-xs font-bold text-yellow-400">
        ESTOQUE
      </p>
      <h2 className="text-2xl font-black">
        Controle de estoque
      </h2>

      <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-[#111]">
        {products.map((product) => {
          const low =
            product.stock <=
            Number(
              product.min_stock ?? 3
            );

          return (
            <div
              key={product.id}
              className="flex items-center justify-between gap-3 border-b border-white/5 p-4 last:border-b-0"
            >
              <div>
                <p className="font-bold">
                  {product.name}
                </p>
                <p className="text-xs text-gray-500">
                  Mínimo:{" "}
                  {product.min_stock ?? 3}
                </p>
              </div>

              <div className="text-right">
                <p
                  className={`text-xl font-black ${
                    low
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {product.stock}
                </p>
                <p className="text-[10px] text-gray-600">
                  UNIDADES
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CategoriesTab({
  categories,
  newName,
  setNewName,
  newIcon,
  setNewIcon,
  createCategory,
  toggleCategory,
  busy,
}: {
  categories: Category[];
  newName: string;
  setNewName: (value: string) => void;
  newIcon: string;
  setNewIcon: (value: string) => void;
  createCategory: (
    event: FormEvent
  ) => void;
  toggleCategory: (
    category: Category,
    active: boolean
  ) => void;
  busy: string;
}) {
  return (
    <section className="mt-5">
      <p className="text-xs font-bold text-yellow-400">
        ORGANIZAÇÃO
      </p>
      <h2 className="text-2xl font-black">
        Categorias
      </h2>

      <form
        onSubmit={createCategory}
        className="mt-4 grid gap-2 rounded-3xl border border-white/10 bg-[#111] p-4 sm:grid-cols-[100px_1fr_auto]"
      >
        <input
          value={newIcon}
          onChange={(event) =>
            setNewIcon(
              event.target.value
            )
          }
          placeholder="🥃"
          className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none"
        />

        <input
          value={newName}
          onChange={(event) =>
            setNewName(
              event.target.value
            )
          }
          placeholder="Nome da categoria"
          className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-yellow-400"
        />

        <button
          disabled={
            busy === "new-category"
          }
          className="rounded-xl bg-yellow-400 px-5 py-3 font-black text-black"
        >
          ADICIONAR
        </button>
      </form>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {categories.map(
          (category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">
                  {category.icon ||
                    "📦"}
                </div>

                <div>
                  <p className="font-black">
                    {category.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {category.slug}
                  </p>
                </div>
              </div>

              <button
                disabled={
                  busy ===
                  `category-${category.id}`
                }
                onClick={() =>
                  toggleCategory(
                    category,
                    !category.active
                  )
                }
                className={`rounded-xl px-3 py-2 text-xs font-bold ${
                  category.active
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {category.active
                  ? "ATIVA"
                  : "INATIVA"}
              </button>
            </div>
          )
        )}
      </div>
    </section>
  );
}

function ProductEditor({
  product,
  categories,
  onClose,
  onSaved,
  setBusy,
  setMessage,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
  setBusy: (value: string) => void;
  setMessage: (value: string) => void;
}) {
  const [name, setName] =
    useState(
      product?.name ?? ""
    );

  const [volume, setVolume] =
    useState(
      product?.volume ?? ""
    );

  const [
    description,
    setDescription,
  ] = useState(
    product?.description ?? ""
  );

  const [price, setPrice] =
    useState(
      product
        ? String(product.price)
        : ""
    );

  const [
    promotionalPrice,
    setPromotionalPrice,
  ] = useState(
    product?.promotional_price !== null &&
      product?.promotional_price !==
        undefined
      ? String(
          product.promotional_price
        )
      : ""
  );

  const [stock, setStock] =
    useState(
      product
        ? String(product.stock)
        : "0"
    );

  const [
    minStock,
    setMinStock,
  ] = useState(
    product
      ? String(
          product.min_stock ?? 3
        )
      : "3"
  );

  const [
    categoryId,
    setCategoryId,
  ] = useState(
    product?.category_id ?? ""
  );

  const [
    imageUrl,
    setImageUrl,
  ] = useState(
    product?.image_url ?? ""
  );

  const [active, setActive] =
    useState(
      product?.active ?? true
    );

  const [
    featured,
    setFeatured,
  ] = useState(
    product?.featured ?? false
  );

  const [onSale, setOnSale] =
    useState(
      product?.on_sale ?? false
    );

  const [
    uploading,
    setUploading,
  ] = useState(false);

  async function uploadImage(
    file: File
  ) {
    setUploading(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/admin/products/image",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Erro enviando imagem."
        );
      }

      setImageUrl(data.url);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro enviando imagem."
      );
    } finally {
      setUploading(false);
    }
  }

  async function save(
    event: FormEvent
  ) {
    event.preventDefault();
    setBusy("save-product");

    try {
      const response =
        await fetch(
          "/api/admin/products/save",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id:
                product?.id ??
                null,
              name,
              volume,
              description,
              price,
              promotional_price:
                promotionalPrice,
              stock:
                Number(stock),
              min_stock:
                Number(minStock),
              category_id:
                categoryId,
              image_url:
                imageUrl,
              active,
              featured,
              on_sale: onSale,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Erro salvando produto."
        );
      }

      setMessage(
        "Produto salvo com sucesso."
      );

      onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro salvando produto."
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <form
      onSubmit={save}
      className="mt-4 rounded-3xl border border-yellow-500/20 bg-[#111] p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-yellow-400">
            {product
              ? "EDITAR PRODUTO"
              : "NOVO PRODUTO"}
          </p>
          <h3 className="text-xl font-black">
            {product?.name ||
              "Cadastrar produto"}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/10 px-3 py-2 text-sm"
        >
          ✕
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Input
          label="NOME *"
          value={name}
          setValue={setName}
        />

        <Input
          label="VOLUME"
          value={volume}
          setValue={setVolume}
          placeholder="Ex: 1L"
        />

        <Input
          label="PREÇO *"
          value={price}
          setValue={setPrice}
          type="number"
          step="0.01"
        />

        <Input
          label="PREÇO PROMOCIONAL"
          value={
            promotionalPrice
          }
          setValue={
            setPromotionalPrice
          }
          type="number"
          step="0.01"
        />

        <Input
          label="ESTOQUE"
          value={stock}
          setValue={setStock}
          type="number"
        />

        <Input
          label="ESTOQUE MÍNIMO"
          value={minStock}
          setValue={setMinStock}
          type="number"
        />

        <div>
          <label className="mb-2 block text-xs font-bold text-gray-400">
            CATEGORIA
          </label>

          <select
            value={categoryId}
            onChange={(event) =>
              setCategoryId(
                event.target.value
              )
            }
            className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none"
          >
            <option value="">
              Sem categoria
            </option>

            {categories
              .filter(
                (category) =>
                  category.active
              )
              .map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {category.icon ||
                      "📦"}{" "}
                    {category.name}
                  </option>
                )
              )}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-gray-400">
            FOTO DO PRODUTO
          </label>

          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(event) => {
              const file =
                event.target
                  .files?.[0];

              if (file) {
                uploadImage(
                  file
                );
              }
            }}
            className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm"
          />

          {uploading && (
            <p className="mt-2 text-xs text-yellow-400">
              Enviando imagem...
            </p>
          )}
        </div>
      </div>

      {imageUrl && (
        <div className="mt-4 flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl bg-black">
          <img
            src={imageUrl}
            alt="Prévia"
            className="h-full w-full object-contain p-2"
          />
        </div>
      )}

      <div className="mt-4">
        <label className="mb-2 block text-xs font-bold text-gray-400">
          DESCRIÇÃO
        </label>

        <textarea
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value
            )
          }
          rows={3}
          className="w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <Check
          label="Produto ativo"
          checked={active}
          setChecked={setActive}
        />

        <Check
          label="Destaque"
          checked={featured}
          setChecked={
            setFeatured
          }
        />

        <Check
          label="Em oferta"
          checked={onSale}
          setChecked={setOnSale}
        />
      </div>

      <button
        disabled={uploading}
        className="mt-5 w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black disabled:opacity-50"
      >
        💾 SALVAR PRODUTO
      </button>
    </form>
  );
}

function Input({
  label,
  value,
  setValue,
  placeholder,
  type = "text",
  step,
}: {
  label: string;
  value: string;
  setValue: (
    value: string
  ) => void;
  placeholder?: string;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-gray-400">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          setValue(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        type={type}
        step={step}
        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
      />
    </div>
  );
}

function Check({
  label,
  checked,
  setChecked,
}: {
  label: string;
  checked: boolean;
  setChecked: (
    value: boolean
  ) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-bold text-gray-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          setChecked(
            event.target.checked
          )
        }
      />

      {label}
    </label>
  );
}
