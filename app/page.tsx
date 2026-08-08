"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Product = {
  id: string;
  name: string;
  description: string | null;
  volume: string | null;
  image_url: string | null;
  price: number;
  promotional_price: number | null;
  stock: number;
  featured: boolean;
  on_sale: boolean;
  category_id: string | null;
  categories:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type CartItem = {
  id: string;
  name: string;
  volume: string | null;
  image_url: string | null;
  price: number;
  quantity: number;
  stock: number;
};

const categories = [
  { icon: "🔥", name: "Ofertas" },
  { icon: "🥃", name: "Whisky" },
  { icon: "🍸", name: "Gin" },
  { icon: "🍹", name: "Vodka" },
  { icon: "🍺", name: "Cervejas" },
  { icon: "⚡", name: "Energéticos" },
  { icon: "🧊", name: "Gelo" },
  { icon: "🎁", name: "Combos" },
];

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getCategoryName(product: Product) {
  if (!product.categories) return "";

  if (Array.isArray(product.categories)) {
    return product.categories[0]?.name ?? "";
  }

  return product.categories.name;
}

export default function Home() {
  const [category, setCategory] = useState("Ofertas");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          volume,
          image_url,
          price,
          promotional_price,
          stock,
          featured,
          on_sale,
          category_id,
          categories (
            name
          )
        `)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar produtos:", error);
        setProducts([]);
      } else {
        setProducts((data as Product[]) ?? []);
      }

      setLoading(false);
    }

    loadProducts();
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem("andinho-cart");

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        localStorage.removeItem("andinho-cart");
      }
    }

    setCartLoaded(true);
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;

    localStorage.setItem(
      "andinho-cart",
      JSON.stringify(cart)
    );
  }, [cart, cartLoaded]);

  function getProductPrice(product: Product) {
    return product.promotional_price ?? product.price;
  }

  function addToCart(product: Product) {
    const price = getProductPrice(product);

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.id === product.id
      );

      if (existing) {
        if (existing.quantity >= product.stock) {
          return currentCart;
        }

        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      if (product.stock <= 0) {
        return currentCart;
      }

      return [
        ...currentCart,
        {
          id: product.id,
          name: product.name,
          volume: product.volume,
          image_url: product.image_url,
          price,
          quantity: 1,
          stock: product.stock,
        },
      ];
    });
  }

  function increaseItem(productId: string) {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        if (item.quantity >= item.stock) {
          return item;
        }

        return {
          ...item,
          quantity: item.quantity + 1,
        };
      })
    );
  }

  function decreaseItem(productId: string) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

const filteredProducts = products.filter((product) => {
  const searchText = search.toLowerCase().trim();

  const matchesSearch =
    product.name.toLowerCase().includes(searchText) ||
    (product.description ?? "")
      .toLowerCase()
      .includes(searchText) ||
    (product.volume ?? "")
      .toLowerCase()
      .includes(searchText);

  if (searchText) {
    return matchesSearch;
  }

  if (category === "Ofertas") {
    return (
      product.on_sale ||
      product.promotional_price !== null
    );
  }

  return getCategoryName(product) === category;
});

  const featuredProducts = products.filter(
    (product) => product.featured
  );

  const totalItems = useMemo(() => {
    return cart.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }, [cart]);

  return (
    <main className="min-h-screen bg-[#070707] pb-32 text-white">

      {/* TOPO */}
      <header className="sticky top-0 z-50 border-b border-yellow-500/10 bg-black/95 backdrop-blur">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">

          <div className="flex items-center gap-3">

            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-yellow-400/70 bg-black shadow-[0_0_18px_rgba(250,204,21,0.20)]">
              <img
                src="/logo-andinho.png"
                alt="Logo Andinho do Combo"
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <h1 className="text-lg font-black tracking-wide text-yellow-400">
                ANDINHO DO COMBO
              </h1>

              <p className="text-[11px] text-gray-500">
                Bebidas • Combos • Delivery
              </p>
            </div>

          </div>

          <button
            onClick={() =>
              (window.location.href = "/carrinho")
            }
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#151515]"
          >
            🛒

            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-yellow-400 px-1 text-xs font-black text-black">
                {totalItems}
              </span>
            )}

          </button>

        </div>

      </header>

      <div className="mx-auto max-w-6xl">
        {/* BANNER PRINCIPAL */}
        <section className="px-4 pt-4">
          <button
            onClick={() => setCategory("Ofertas")}
            className="block w-full overflow-hidden rounded-2xl border border-yellow-500/20 bg-black shadow-2xl"
          >
            <img
              src="/banner-andinho.png"
              alt="Andinho do Combo - Bebidas e Delivery"
              className="h-auto w-full object-cover"
            />
          </button>
        </section>

        {/* STATUS DA LOJA */}
        <section className="px-4 pt-4">

          <div className="relative overflow-hidden rounded-[28px] border border-yellow-500/20 bg-gradient-to-br from-[#181818] via-[#101010] to-black p-6 shadow-2xl">

            <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-yellow-400/10 blur-3xl" />

            <div className="relative">

              <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-[11px] font-bold text-yellow-300">
                ⚡ DELIVERY RÁPIDO
              </span>

              <h2 className="mt-5 text-4xl font-black leading-none">
                Sua bebida,
                <br />
                <span className="text-yellow-400">
                  seu combo.
                </span>
              </h2>

              <p className="mt-3 max-w-sm text-sm leading-6 text-gray-400">
                Bebidas geladas, combos e praticidade
                até 04:00.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs">

                <span className="rounded-full bg-white/5 px-3 py-2 text-gray-300">
                  🚚 Delivery
                </span>

                <span className="rounded-full bg-white/5 px-3 py-2 text-gray-300">
                  💠 Pix
                </span>

                <span className="rounded-full bg-white/5 px-3 py-2 text-gray-300">
                  💳 Cartão no local
                </span>

              </div>

              <button
                onClick={() => setCategory("Ofertas")}
                className="mt-6 rounded-2xl bg-yellow-400 px-6 py-4 font-black text-black shadow-lg"
              >
                VER OFERTAS 🔥
              </button>

            </div>

          </div>

        </section>

        {/* STATUS DA LOJA */}
        <section className="px-4 pt-4">

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#111] px-4 py-3">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10">
                🕒
              </div>

              <div>
                <p className="text-sm font-bold">
                  Atendimento
                </p>

                <p className="text-xs text-gray-500">
                  Pedidos até 04:00
                </p>
              </div>

            </div>

            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400">
              Delivery ativo
            </span>

          </div>

        </section>

        {/* BUSCA */}
<section className="px-4 pt-5">
  <div className="relative">
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">
      🔍
    </span>

    <input
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Buscar whisky, gin, cerveja..."
      className="w-full rounded-2xl border border-white/10 bg-[#131313] py-4 pl-12 pr-12 text-sm text-white outline-none transition focus:border-yellow-400"
    />

    {search && (
      <button
        onClick={() => setSearch("")}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
        aria-label="Limpar busca"
      >
        ✕
      </button>
    )}
  </div>
</section>
        
        {/* CATEGORIAS */}
        <section className="pt-5">

          <div className="mb-3 flex items-center justify-between px-4">

            <div>
              <p className="text-xs font-bold text-yellow-400">
                ESCOLHA RÁPIDO
              </p>

              <h2 className="text-xl font-black">
                Categorias
              </h2>
            </div>

          </div>

          <div className="flex gap-3 overflow-x-auto px-4 pb-2">

            {categories.map((item) => (
              <button
                key={item.name}
                onClick={() => setCategory(item.name)}
                className={`min-w-[88px] rounded-2xl border px-3 py-4 transition ${
                  category === item.name
                    ? "border-yellow-400 bg-yellow-400 text-black"
                    : "border-white/10 bg-[#131313] text-white"
                }`}
              >

                <div className="text-2xl">
                  {item.icon}
                </div>

                <div className="mt-2 text-xs font-black">
                  {item.name}
                </div>

              </button>
            ))}

          </div>

        </section>

        {/* DESTAQUES */}
{featuredProducts.length > 0 && !search.trim() && (
  <section className="px-4 pt-7">

    <div className="mb-4 flex items-end justify-between">

      <div>
        <p className="text-xs font-bold text-yellow-400">
          SELEÇÃO ESPECIAL
        </p>

        <h2 className="text-2xl font-black">
          Destaques
        </h2>
      </div>

      <span className="text-xs text-gray-500">
        Mais procurados
      </span>

    </div>

    <div className="flex gap-3 overflow-x-auto pb-2">

      {featuredProducts.map((product) => {
        const price =
          product.promotional_price ??
          product.price;

        return (
          <article
            key={product.id}
            className="min-w-[220px] overflow-hidden rounded-3xl border border-yellow-500/20 bg-[#131313]"
          >

            <div className="flex aspect-square items-center justify-center bg-[#0b0b0b]">

              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-contain p-4"
                />
              ) : (
                <span className="text-7xl">
                  🥃
                </span>
              )}

            </div>

            <div className="p-4">

              <span className="rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-black text-black">
                DESTAQUE
              </span>

              <h3 className="mt-3 font-black">
                {product.name}
              </h3>

              {product.volume && (
                <p className="mt-1 text-xs text-gray-500">
                  {product.volume}
                </p>
              )}

              <p className="mt-3 text-xl font-black text-yellow-400">
                {formatPrice(price)}
              </p>

            </div>

          </article>
        );
      })}

    </div>

  </section>
)}
        
        {/* PRODUTOS */}
        <section className="px-4 pt-8">

          <div className="mb-4">

            <p className="text-xs font-bold text-yellow-400">
              ANDINHO DO COMBO
            </p>

            <h2 className="text-2xl font-black">
              {category}
            </h2>

          </div>

          {loading ? (

            <div className="rounded-3xl bg-[#111] p-10 text-center">
              <p className="text-gray-400">
                Carregando produtos...
              </p>
            </div>

          ) : filteredProducts.length === 0 ? (

            <div className="rounded-3xl border border-dashed border-yellow-500/30 bg-[#111] p-10 text-center">

              <div className="text-5xl">
                🥃
              </div>

              <h3 className="mt-4 font-black">
                Nenhum produto por aqui
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Novos produtos aparecerão nesta categoria.
              </p>

            </div>

          ) : (

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">

              {filteredProducts.map((product) => {
                const salePrice =
                  product.promotional_price ??
                  product.price;

                const cartItem = cart.find(
                  (item) => item.id === product.id
                );

                const hasDiscount =
                  product.promotional_price !== null;

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-[#131313] shadow-xl"
                  >

                    {/* FOTO */}
                    <div className="relative flex aspect-square items-center justify-center bg-[#0b0b0b]">

                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-contain p-4"
                        />
                      ) : (
                        <span className="text-7xl">
                          🥃
                        </span>
                      )}

                      {product.on_sale && (
                        <span className="absolute left-3 top-3 rounded-full bg-yellow-400 px-3 py-1 text-[10px] font-black text-black">
                          OFERTA
                        </span>
                      )}

                      {product.stock > 0 &&
                        product.stock <= 5 && (
                          <span className="absolute right-3 top-3 rounded-full bg-red-500/90 px-2 py-1 text-[10px] font-black text-white">
                            ÚLTIMOS
                          </span>
                        )}

                    </div>

                    <div className="p-4">

                      <h3 className="line-clamp-2 min-h-12 font-black">
                        {product.name}
                      </h3>

                      {product.volume && (
                        <p className="mt-1 text-xs text-gray-500">
                          {product.volume}
                        </p>
                      )}

                      <div className="mt-3">

                        {hasDiscount && (
                          <p className="text-xs text-gray-500 line-through">
                            {formatPrice(product.price)}
                          </p>
                        )}

                        <p className="text-xl font-black text-yellow-400">
                          {formatPrice(salePrice)}
                        </p>

                      </div>

                      {product.stock <= 0 ? (

                        <button
                          disabled
                          className="mt-4 w-full rounded-2xl bg-gray-800 px-3 py-3 text-sm font-black text-gray-500"
                        >
                          ESGOTADO
                        </button>

                      ) : cartItem ? (

                        <div className="mt-4 flex items-center justify-between rounded-2xl border border-yellow-500/30 bg-black p-1">

                          <button
                            onClick={() =>
                              decreaseItem(product.id)
                            }
                            className="h-10 w-10 rounded-xl bg-[#202020] text-xl font-black"
                          >
                            −
                          </button>

                          <span className="font-black text-yellow-400">
                            {cartItem.quantity}
                          </span>

                          <button
                            onClick={() =>
                              increaseItem(product.id)
                            }
                            disabled={
                              cartItem.quantity >=
                              product.stock
                            }
                            className="h-10 w-10 rounded-xl bg-yellow-400 text-xl font-black text-black disabled:opacity-40"
                          >
                            +
                          </button>

                        </div>

                      ) : (

                        <button
                          onClick={() =>
                            addToCart(product)
                          }
                          className="mt-4 w-full rounded-2xl bg-yellow-400 px-3 py-3 text-sm font-black text-black"
                        >
                          + ADICIONAR
                        </button>

                      )}

                    </div>

                  </article>
                );
              })}

            </div>

          )}

        </section>

        {/* BENEFÍCIOS */}
        <section className="grid grid-cols-3 gap-2 px-4 pt-8 text-center">

          <div className="rounded-2xl bg-[#111] p-4">
            <div className="text-2xl">🚚</div>
            <p className="mt-2 text-xs font-bold">
              Entrega rápida
            </p>
          </div>

          <div className="rounded-2xl bg-[#111] p-4">
            <div className="text-2xl">❄️</div>
            <p className="mt-2 text-xs font-bold">
              Bebida gelada
            </p>
          </div>

          <div className="rounded-2xl bg-[#111] p-4">
            <div className="text-2xl">🔒</div>
            <p className="mt-2 text-xs font-bold">
              Compra segura
            </p>
          </div>

        </section>

                {/* RODAPÉ */}
        <footer className="px-4 py-10 text-center">

          <p className="font-black text-yellow-400">
            ANDINHO DO COMBO
          </p>

          <p className="mt-2 text-xs text-gray-600">
            Bebidas • Combos • Delivery
          </p>

          <p className="mt-4 text-xs text-gray-600">
            🔞 Venda proibida para menores de 18 anos.
            <br />
            Beba com moderação.
          </p>

        </footer>

      </div>

      {/* CARRINHO FIXO */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-yellow-500/10 bg-black/95 p-4 backdrop-blur">

          <button
            onClick={() =>
              (window.location.href = "/carrinho")
            }
            className="mx-auto flex w-full max-w-md items-center justify-between rounded-2xl bg-yellow-400 px-5 py-4 text-black shadow-2xl"
          >

            <div className="text-left">

              <p className="text-xs font-bold">
                🛒 {totalItems}{" "}
                {totalItems === 1
                  ? "item"
                  : "itens"}
              </p>

              <p className="text-lg font-black">
                {formatPrice(cartTotal)}
              </p>

            </div>

            <span className="font-black">
              VER CARRINHO →
            </span>

          </button>

        </div>
      )}

    </main>
  );
                }
