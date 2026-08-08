"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PagamentoSucessoPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.removeItem("andinho-cart");
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070707] px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-green-500/20 bg-[#121212] p-7 text-center shadow-2xl">
        <div className="text-6xl">
          ✅
        </div>

        <p className="mt-5 text-xs font-bold text-green-400">
          PAGAMENTO APROVADO
        </p>

        <h1 className="mt-2 text-2xl font-black">
          Pedido recebido!
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-400">
          Seu pagamento foi processado. Agora é só aguardar a confirmação
          e preparação do seu pedido.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black p-4">
          <p className="text-sm font-bold text-yellow-400">
            Andinho do Combo
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Obrigado pela preferência. 🥃
          </p>
        </div>

        <button
          onClick={() => router.push("/")}
          className="mt-6 w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black"
        >
          VOLTAR PARA A LOJA
        </button>
      </div>
    </main>
  );
      }
