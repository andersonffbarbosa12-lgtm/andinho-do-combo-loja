"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function EntrarPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.includes("@")) {
      setMessage("Digite um e-mail válido.");
      return;
    }

    if (!password) {
      setMessage("Digite sua senha.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        console.error(error);
        setMessage("E-mail ou senha incorretos.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-yellow-500/20 bg-[#111] p-6 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-yellow-400/50 bg-black">
              <img
                src="/logo-andinho.png"
                alt="Andinho do Combo"
                className="h-full w-full object-cover"
              />
            </div>

            <p className="mt-5 text-xs font-black tracking-widest text-yellow-400">
              ANDINHO DO COMBO
            </p>

            <h1 className="mt-2 text-2xl font-black">
              Entrar na minha conta
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Entre para acessar a loja.
            </p>
          </div>

          {message && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
              {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
            />

            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-yellow-400 px-4 py-4 font-black text-black disabled:opacity-50"
            >
              {loading ? "ENTRANDO..." : "ENTRAR"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => router.push("/cadastro")}
            className="mt-5 w-full text-center text-sm font-bold text-gray-400"
          >
            Ainda não tenho conta — Criar cadastro
          </button>
        </div>
      </div>
    </main>
  );
}
