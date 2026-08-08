"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CartItem = {
  id: string;
  name: string;
  volume: string | null;
  image_url: string | null;
  price: number;
  quantity: number;
  stock: number;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function CarrinhoPage() {
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem("andinho-cart");

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        localStorage.removeItem("andinho-cart");
      }
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(
      "andinho-cart",
      JSON.stringify(cart)
    );
  }, [cart, loaded]);

  function increaseItem(id: string) {
    setCart((current) =>
      current.map((item) => {
        if (item.id !== id) return item;

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

  function decreaseItem(id: string) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(id: string) {
    setCart((current) =>
      current.filter((item) => item.id !== id)
    );
  }

  function clearCart() {
    const confirmClear = window.confirm(
      "Deseja realmente esvaziar o carrinho?"
    );

    if (confirmClear) {
      setCart([]);
    }
  }

  const totalItems = useMemo(() => {
    return cart.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }, [cart]);

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808] text-white">
        Carregando carrinho...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] pb-32 text-white">

      {/* CABEÇALHO */}
      <header className="sticky top-0 z-50 border-b border-yellow-500/20 bg-black/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">

          <button
            onClick={() => router.push("/")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#151515] text-xl"
          >
            ←
          </button>

          <div className="text-center">
            <h1 className="font-black">
              MEU CARRINHO
            </h1>

            <p className="text-xs text-gray-500">
              {totalItems}{" "}
              {totalItems === 1
                ? "item"
                : "itens"}
            </p>
          </div>

          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-red-500/20 bg-[#151515] disabled:opacity-30"
          >
            🗑️
          </button>

        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4">

        {/* SEGURANÇA */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/5 p-4">

          <div className="text-2xl">
            🛡️
          </div>

          <div>
            <p className="text-sm font-bold text-green-400">
              Compra segura
            </p>

            <p className="text-xs text-gray-500">
              Revise seu pedido antes de continuar.
            </p>
          </div>

        </div>

        {cart.length === 0 ? (

          /* CARRINHO VAZIO */
          <div className="mt-6 rounded-3xl border border-white/10 bg-[#111] p-10 text-center">

            <div className="text-6xl">
              🛒
            </div>

            <h2 className="mt-4 text-xl font-black">
              Seu carrinho está vazio
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Adicione suas bebidas favoritas para continuar.
            </p>

            <button
              onClick={() => router.push("/")}
              className="mt-6 rounded-xl bg-yellow-400 px-6 py-4 font-black text-black"
            >
              VER PRODUTOS
            </button>

          </div>

        ) : (

          <>
            {/* PRODUTOS */}
            <section className="mt-5 space-y-3">

              {cart.map((item) => (

                <article
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-[#141414] p-3"
                >

                  <div className="flex gap-3">

                    {/* FOTO */}
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#090909]">

                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <span className="text-4xl">
                          🥃
                        </span>
                      )}

                    </div>

                    {/* INFORMAÇÕES */}
                    <div className="min-w-0 flex-1">

                      <div className="flex items-start justify-between gap-2">

                        <div>
                          <h3 className="font-bold">
                            {item.name}
                          </h3>

                          {item.volume && (
                            <p className="mt-1 text-xs text-gray-500">
                              {item.volume}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() =>
                            removeItem(item.id)
                          }
                          className="text-lg text-red-400"
                        >
                          🗑️
                        </button>

                      </div>

                      <p className="mt-2 font-black text-yellow-400">
                        {formatPrice(item.price)}
                      </p>

                      <div className="mt-3 flex items-center justify-between">

                        {/* QUANTIDADE */}
                        <div className="flex items-center rounded-xl border border-yellow-500/30 bg-black">

                          <button
                            onClick={() =>
                              decreaseItem(item.id)
                            }
                            className="h-10 w-10 text-xl font-bold"
                          >
                            −
                          </button>

                          <span className="min-w-9 text-center font-black text-yellow-400">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              increaseItem(item.id)
                            }
                            disabled={
                              item.quantity >= item.stock
                            }
                            className="h-10 w-10 text-xl font-black disabled:opacity-30"
                          >
                            +
                          </button>

                        </div>

                        {/* TOTAL DO ITEM */}
                        <p className="font-black">
                          {formatPrice(
                            item.price *
                              item.quantity
                          )}
                        </p>

                      </div>

                    </div>

                  </div>

                </article>

              ))}

            </section>

            {/* CUPOM */}
            <section className="mt-5">
              <button className="flex w-full items-center justify-between rounded-2xl border border-yellow-500/20 bg-[#141414] p-4">

                <div className="flex items-center gap-3">
                  <span>🏷️</span>

                  <span className="font-bold">
                    Adicionar cupom
                  </span>
                </div>

                <span className="text-yellow-400">
                  ›
                </span>

              </button>
            </section>

            {/* RESUMO */}
            <section className="mt-5 rounded-2xl border border-white/10 bg-[#141414] p-5">

              <h2 className="font-black">
                Resumo do pedido
              </h2>

              <div className="mt-4 space-y-3">

                <div className="flex justify-between text-sm text-gray-400">
                  <span>
                    Subtotal
                  </span>

                  <span>
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-sm text-gray-400">
                  <span>
                    Taxa de entrega
                  </span>

                  <span>
                    Calculada no checkout
                  </span>
                </div>

                <div className="border-t border-white/10 pt-4">

                  <div className="flex items-center justify-between">

                    <span className="font-bold">
                      Total parcial
                    </span>

                    <span className="text-xl font-black text-yellow-400">
                      {formatPrice(subtotal)}
                    </span>

                  </div>

                </div>

              </div>

            </section>

            {/* CONTINUAR COMPRANDO */}
            <button
              onClick={() => router.push("/")}
              className="mt-4 w-full rounded-xl border border-yellow-500/30 py-4 font-bold text-yellow-400"
            >
              + CONTINUAR COMPRANDO
            </button>

            {/* AVISO */}
            <p className="py-6 text-center text-xs text-gray-600">
              🔞 Venda proibida para menores de 18 anos.
            </p>
          </>
        )}

      </div>

      {/* BOTÃO FIXO */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/95 p-4">

          <div className="mx-auto max-w-3xl">

            <button
              onClick={() =>
                router.push("/checkout")
              }
              className="flex w-full items-center justify-between rounded-2xl bg-yellow-400 px-5 py-4 text-black shadow-2xl"
            >

              <div className="text-left">

                <p className="text-xs font-bold">
                  {totalItems}{" "}
                  {totalItems === 1
                    ? "ITEM"
                    : "ITENS"}
                </p>

                <p className="text-lg font-black">
                  {formatPrice(subtotal)}
                </p>

              </div>

              <span className="font-black">
                FINALIZAR PEDIDO →
              </span>

            </button>

          </div>

        </div>
      )}

    </main>
  );
    }
