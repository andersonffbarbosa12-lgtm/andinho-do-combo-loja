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

    localStorage.setItem("andinho-cart", JSON.stringify(cart));
  }, [cart, cartLoaded]);

  function getProductPrice(product: Product) {
    return product.promotional_price ?? product.price;
  }

  function addToCart(product: Product) {
    const price = getProductPrice(product);

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === product.id
      );

      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
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

  const filteredProducts = products.filter((product) => {
    if (category === "Ofertas") {
      return product.on_sale || product.promotional_price !== null;
    }

    return getCategoryName(product) === category;
  });

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
    <main className="min-h-screen bg-[#080808] pb-32 text-white">

      {/* CABEÇALHO */}
      <header className="sticky top-0 z-50 border-b border-yellow-500/20 bg-black/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">

          <div>
            <h1 className="text-xl font-black tracking-wide text-yellow-400">
              ANDINHO DO COMBO
            </h1>

            <p className="text-xs text-gray-400">
              Bebidas • Combos • Delivery
            </p>
          </div>

          <button
            aria-label="Carrinho"
            className="relative rounded-full border border-yellow-500/40 p-3"
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

        {/* BANNER */}
        <section className="px-4 pt-4">
          <div className="overflow-hidden rounded-3xl border border-yellow-500/20 bg-gradient-to-r from-[#151515] to-black p-6 shadow-2xl">

            <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-black">
              DELIVERY
            </span>

            <h2 className="mt-4 text-3xl font-black">
              Sua bebida,
              <br />
              <span className="text-yellow-400">
                seu combo.
              </span>
            </h2>

            <p className="mt-2 max-w-sm text-sm text-gray-400">
              Bebidas geladas, combos e entrega rápida.
            </p>

            <button
              onClick={() => setCategory("Ofertas")}
              className="mt-5 rounded-xl bg-yellow-400 px-5 py-3 font-bold text-black"
            >
              VER OFERTAS
            </button>

          </div>
        </section>

        {/* INFORMAÇÕES */}
        <section className="grid grid-cols-3 gap-2 px-4 py-4 text-center text-xs">

          <div className="rounded-xl bg-[#141414] p-3">
            🚚
            <p className="mt-1 text-gray-300">
              Delivery
            </p>
          </div>

          <div className="rounded-xl bg-[#141414] p-3">
            💳
            <p className="mt-1 text-gray-300">
              Pix ou cartão
            </p>
          </div>

          <div className="rounded-xl bg-[#141414] p-3">
            🌙
            <p className="mt-1 text-gray-300">
              Até 04:00
            </p>
          </div>

        </section>

        {/* CATEGORIAS */}
        <section>
          <div className="flex gap-3 overflow-x-auto px-4 pb-3">

            {categories.map((item) => (
              <button
                key={item.name}
                onClick={() => setCategory(item.name)}
                className={`min-w-[82px] rounded-2xl border p-3 text-center ${
                  category === item.name
                    ? "border-yellow-400 bg-yellow-400 text-black"
                    : "border-white/10 bg-[#141414]"
                }`}
              >
                <div className="text-2xl">
                  {item.icon}
                </div>

                <div className="mt-1 text-xs font-bold">
                  {item.name}
                </div>
              </button>
            ))}

          </div>
        </section>

        {/* PRODUTOS */}
        <section className="px-4 pt-5">

          <div className="mb-4">

            <p className="text-xs font-bold text-yellow-400">
              ANDINHO DO COMBO
            </p>

            <h2 className="text-2xl font-black">
              {category}
            </h2>

          </div>

          {loading ? (

            <div className="rounded-2xl bg-[#111] p-8 text-center">
              <p className="text-gray-400">
                Carregando produtos...
              </p>
            </div>

          ) : filteredProducts.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-yellow-500/30 bg-[#111] p-8 text-center">

              <div className="text-4xl">
                🥃
              </div>

              <h3 className="mt-3 font-bold">
                Nenhum produto nesta categoria
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Novos produtos aparecerão aqui.
              </p>

            </div>

          ) : (

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">

              {filteredProducts.map((product) => {
                const salePrice =
                  product.promotional_price ??
                  product.price;

                const cartItem = cart.find(
                  (item) => item.id === product.id
                );

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414]"
                  >

                    {/* IMAGEM */}
                    <div className="flex aspect-square items-center justify-center bg-[#0d0d0d]">

                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-contain p-3"
                        />
                      ) : (
                        <span className="text-6xl">
                          🥃
                        </span>
                      )}

                    </div>

                    <div className="p-3">

                      {product.on_sale && (
                        <span className="rounded-md bg-yellow-400 px-2 py-1 text-[10px] font-black text-black">
                          OFERTA
                        </span>
                      )}

                      <h3 className="mt-2 font-bold">
                        {product.name}
                      </h3>

                      {product.volume && (
                        <p className="mt-1 text-xs text-gray-500">
                          {product.volume}
                        </p>
                      )}

                      {product.promotional_price !== null && (
                        <p className="mt-2 text-xs text-gray-500 line-through">
                          {formatPrice(product.price)}
                        </p>
                      )}

                      <p className="text-lg font-black text-yellow-400">
                        {formatPrice(salePrice)}
                      </p>

                      {product.stock <= 0 ? (

                        <button
                          disabled
                          className="mt-3 w-full rounded-xl bg-gray-800 px-3 py-3 text-sm font-bold text-gray-500"
                        >
                          ESGOTADO
                        </button>

                      ) : cartItem ? (

                        <div className="mt-3 flex items-center justify-between rounded-xl border border-yellow-500/30 bg-black p-1">

                          <button
                            onClick={() =>
                              decreaseItem(product.id)
                            }
                            className="h-10 w-10 rounded-lg bg-[#222] text-xl font-bold"
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
                            className="h-10 w-10 rounded-lg bg-yellow-400 text-xl font-black text-black disabled:opacity-40"
                          >
                            +
                          </button>

                        </div>

                      ) : (

                        <button
                          onClick={() =>
                            addToCart(product)
                          }
                          className="mt-3 w-full rounded-xl bg-yellow-400 px-3 py-3 text-sm font-black text-black"
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

        {/* AVISO */}
        <section className="px-4 py-8 text-center text-xs text-gray-600">
          🔞 Venda proibida para menores de 18 anos.
          <br />
          Beba com moderação.
        </section>

      </div>

      {/* CARRINHO FIXO */}
      <div className="fixed bottom-4 left-0 right-0 z-50 px-4">

     <button
  onClick={() => {
    window.location.href = "/carrinho";
  }}
  className={`mx-auto flex w-full max-w-md items-center justify-between rounded-2xl px-5 py-4 font-black shadow-2xl ${
    totalItems > 0
      ? "bg-yellow-400 text-black"
      : "bg-[#1b1b1b] text-gray-500"
  }`}
>
          <span>
            🛒 Carrinho
            {totalItems > 0 &&
              ` • ${totalItems} ${
                totalItems === 1
                  ? "item"
                  : "itens"
              }`}
          </span>

          <span>
            {formatPrice(cartTotal)}
          </span>
        </button>

      </div>

    </main>
  );
    }
