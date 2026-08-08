"use client";

import { useRouter } from "next/navigation";

export default function PagamentoErroPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070707] px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#121212] p-7 text-center shadow-2xl">
        <div className="text-6xl">
          ❌
        </div>

        <p className="mt-5 text-xs font-bold text-red-400">
          PAGAMENTO NÃO CONCLUÍDO
        </p>

        <h1 className="mt-2 text-2xl font-black">
          Não conseguimos concluir
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-400">
          O pagamento foi recusado, cancelado ou não pôde ser processado.
          Seu carrinho continua disponível para tentar novamente.
        </p>

        <button
          onClick={() => router.push("/checkout")}
          className="mt-6 w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black"
        >
          TENTAR NOVAMENTE
        </button>

        <button
          onClick={() => router.push("/")}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 font-bold text-gray-300"
        >
          VOLTAR PARA A LOJA
        </button>
      </div>
    </main>
  );
}
