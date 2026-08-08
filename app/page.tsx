"use client";

import { useState } from "react";

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

export default function Home() {
  const [category, setCategory] = useState("Ofertas");

  return (
    <main className="min-h-screen bg-[#080808] text-white pb-24">

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
            className="rounded-full border border-yellow-500/40 p-3"
          >
            🛒
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

            <button className="mt-5 rounded-xl bg-yellow-400 px-5 py-3 font-bold text-black">
              VER OFERTAS
            </button>
          </div>
        </section>

        {/* INFORMAÇÕES */}
        <section className="grid grid-cols-3 gap-2 px-4 py-4 text-center text-xs">
          <div className="rounded-xl bg-[#141414] p-3">
            🚚
            <p className="mt-1 text-gray-300">Delivery</p>
          </div>

          <div className="rounded-xl bg-[#141414] p-3">
            💳
            <p className="mt-1 text-gray-300">Pix ou cartão</p>
          </div>

          <div className="rounded-xl bg-[#141414] p-3">
            🌙
            <p className="mt-1 text-gray-300">Até 04:00</p>
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
                <div className="text-2xl">{item.icon}</div>

                <div className="mt-1 text-xs font-bold">
                  {item.name}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* DESTAQUES */}
        <section className="px-4 pt-5">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold text-yellow-400">
                ANDINHO DO COMBO
              </p>

              <h2 className="text-2xl font-black">
                Destaques
              </h2>
            </div>

            <span className="text-sm text-gray-500">
              {category}
            </span>
          </div>

          {/* Enquanto ainda não conectamos os produtos */}
          <div className="rounded-2xl border border-dashed border-yellow-500/30 bg-[#111] p-8 text-center">
            <div className="text-4xl">🥃</div>

            <h3 className="mt-3 font-bold">
              Seus produtos aparecerão aqui
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Na próxima etapa vamos buscar automaticamente
              os produtos cadastrados no Supabase.
            </p>
          </div>
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
        <button className="mx-auto flex w-full max-w-md items-center justify-between rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black shadow-2xl">
          <span>🛒 Carrinho</span>
          <span>R$ 0,00</span>
        </button>
      </div>

    </main>
  );
          }
