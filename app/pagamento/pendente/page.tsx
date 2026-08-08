"use client";

import { useRouter } from "next/navigation";

export default function PagamentoPendentePage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070707] px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-yellow-500/20 bg-[#121212] p-7 text-center shadow-2xl">
        <div className="text-6xl">
          ⏳
        </div>

        <p className="mt-5 text-xs font-bold text-yellow-400">
          PAGAMENTO PENDENTE
        </p>

        <h1 className="mt-2 text-2xl font-black">
          Estamos aguardando
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-400">
          O Mercado Pago ainda não confirmou seu pagamento.
          Assim que a confirmação acontecer, o pedido poderá ser processado.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black p-4">
          <p className="text-xs text-gray-500">
            Não é necessário fazer um novo pagamento enquanto este estiver pendente.
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
