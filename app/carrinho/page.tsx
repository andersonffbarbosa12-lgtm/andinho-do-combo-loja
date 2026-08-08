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
    <main className="min-h-screen bg-[#070707] pb-36 text-white">
      {/* CABEÇALHO */}
      <header className="sticky top-0 z-50 border-b border-yellow-500/10 bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#151515] text-xl transition active:scale-95"
            aria-label="Voltar para a loja"
          >
            ←
          </button>

          <div className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-full border border-yellow-400/40 bg-black">
              <img
                src="/logo-andinho.png"
                alt="Andinho do Combo"
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <h1 className="text-sm font-black tracking-wide text-yellow-400">
                MEU CARRINHO
              </h1>
              <p className="text-[11px] text-gray-500">
                {totalItems} {totalItems === 1 ? "item" : "itens"}
              </p>
            </div>
          </div>

          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/20 bg-[#151515] text-lg transition active:scale-95 disabled:opacity-30"
            aria-label="Esvaziar carrinho"
          >
            🗑️
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4">
        <section className="pt-5">
          <div className="relative overflow-hidden rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-[#171717] via-[#111] to-black p-5">
            <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-yellow-400/10 blur-3xl" />

            <div className="relative flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-400/10 text-xl">
                🛒
              </div>

              <div>
                <p className="text-xs font-bold text-yellow-400">
                  ANDINHO DO COMBO
                </p>
                <h2 className="mt-1 text-xl font-black">
                  Revise seu pedido
                </h2>
                <p className="mt-1 text-sm leading-5 text-gray-400">
                  Confira os itens e quantidades antes de seguir para o checkout.
                </p>
              </div>
            </div>
          </div>
        </section>

        {cart.length === 0 ? (
          <section className="mt-5 rounded-3xl border border-white/10 bg-[#111] p-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400/10 text-4xl">
              🛒
            </div>

            <h2 className="mt-5 text-xl font-black">
              Seu carrinho está vazio
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
              Adicione suas bebidas favoritas e volte aqui para finalizar o pedido.
            </p>

            <button
              onClick={() => router.push("/")}
              className="mt-6 w-full rounded-2xl bg-yellow-400 px-6 py-4 font-black text-black shadow-lg transition active:scale-[0.99]"
            >
              VER PRODUTOS →
            </button>
          </section>
        ) : (
          <>
            <section className="mt-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-xs font-bold text-yellow-400">
                    SEU PEDIDO
                  </p>
                  <h2 className="text-xl font-black">
                    Itens no carrinho
                  </h2>
                </div>

                <span className="rounded-full border border-white/10 bg-[#111] px-3 py-1 text-xs text-gray-400">
                  {totalItems} {totalItems === 1 ? "item" : "itens"}
                </span>
              </div>

              {cart.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#131313] p-3 shadow-lg"
                >
                  <div className="flex gap-3">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0a0a0a]">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-contain p-3"
                        />
                      ) : (
                        <span className="text-5xl">🥃</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 font-black">
                            {item.name}
                          </h3>

                          {item.volume && (
                            <p className="mt-1 text-xs text-gray-500">
                              {item.volume}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-red-400"
                          aria-label={`Remover ${item.name}`}
                        >
                          🗑️
                        </button>
                      </div>

                      <p className="mt-2 text-lg font-black text-yellow-400">
                        {formatPrice(item.price)}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center rounded-2xl border border-yellow-500/25 bg-black p-1">
                          <button
                            onClick={() => decreaseItem(item.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#202020] text-xl font-black"
                            aria-label="Diminuir quantidade"
                          >
                            −
                          </button>

                          <span className="min-w-10 text-center font-black text-yellow-400">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() => increaseItem(item.id)}
                            disabled={item.quantity >= item.stock}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-xl font-black text-black disabled:opacity-30"
                            aria-label="Aumentar quantidade"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
                            Total
                          </p>
                          <p className="font-black">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="mt-5">
              <div className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#111] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10">
                    🏷️
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      Cupom de desconto
                    </p>
                    <p className="text-xs text-gray-500">
                      Disponível em breve
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold text-gray-500">
                  EM BREVE
                </span>
              </div>
            </section>

            <section className="mt-5 overflow-hidden rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-yellow-400">
                    RESUMO
                  </p>
                  <h2 className="text-xl font-black">
                    Seu pedido
                  </h2>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10">
                  🧾
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Subtotal</span>
                  <span className="font-bold text-white">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 text-sm text-gray-400">
                  <span>Taxa de entrega</span>
                  <span className="text-right">
                    Calculada no checkout
                  </span>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-gray-500">
                        Total parcial
                      </p>
                      <p className="text-2xl font-black text-yellow-400">
                        {formatPrice(subtotal)}
                      </p>
                    </div>

                    <span className="rounded-full border border-green-500/20 bg-green-500/5 px-3 py-1 text-[10px] font-bold text-green-400">
                      🔒 COMPRA SEGURA
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <button
              onClick={() => router.push("/")}
              className="mt-4 w-full rounded-2xl border border-yellow-500/30 bg-yellow-400/5 py-4 font-black text-yellow-400 transition active:scale-[0.99]"
            >
              + CONTINUAR COMPRANDO
            </button>

            <div className="py-7 text-center text-xs text-gray-600">
              🔞 Venda proibida para menores de 18 anos.
              <br />
              Beba com moderação.
            </div>
          </>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-yellow-500/10 bg-black/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <button
              onClick={() => router.push("/checkout")}
              className="flex w-full items-center justify-between rounded-2xl bg-yellow-400 px-5 py-4 text-black shadow-2xl transition active:scale-[0.99]"
            >
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wide">
                  {totalItems} {totalItems === 1 ? "item" : "itens"}
                </p>

                <p className="text-lg font-black">
                  {formatPrice(subtotal)}
                </p>
              </div>

              <span className="font-black">
                IR PARA O CHECKOUT →
              </span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
