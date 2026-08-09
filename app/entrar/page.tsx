"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function EntrarPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

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
      const { error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        console.error(error);

        if (
          error.message
            .toLowerCase()
            .includes("invalid login credentials")
        ) {
          setMessage("E-mail ou senha incorretos.");
        } else {
          setMessage(
            error.message ||
              "Não foi possível entrar."
          );
        }

        return;
      }

      setSuccess(true);
      setMessage("Login realizado com sucesso.");

      router.push("/minha-conta");
    } catch (error) {
      console.error(error);
      setMessage("Ocorreu um erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setMessage("");
    setSuccess(false);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.includes("@")) {
      setMessage(
        "Digite seu e-mail primeiro."
      );
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo:
              `${window.location.origin}/redefinir-senha`,
          }
        );

      if (error) {
        console.error(error);
        setMessage(
          "Não foi possível enviar o link de recuperação."
        );
        return;
      }

      setSuccess(true);
      setMessage(
        "Se esse e-mail estiver cadastrado, você receberá um link para redefinir a senha."
      );
    } catch (error) {
      console.error(error);
      setMessage(
        "Erro ao iniciar recuperação de senha."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-md">

        <button
          onClick={() => router.push("/")}
          className="mb-5 text-sm font-bold text-gray-400"
        >
          ← Voltar para a loja
        </button>

        <div className="rounded-3xl border border-yellow-500/20 bg-[#111] p-6">

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
              Acesse seus dados e pedidos.
            </p>
          </div>

          {message && (
            <div
              className={`mt-5 rounded-2xl border p-4 text-sm ${
                success
                  ? "border-green-500/20 bg-green-500/5 text-green-400"
                  : "border-red-500/20 bg-red-500/5 text-red-400"
              }`}
            >
              {message}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                E-MAIL
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="seuemail@email.com"
                autoComplete="email"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                SENHA
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Sua senha"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />
            </div>

            <button
              disabled={loading}
              className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black disabled:opacity-50"
            >
              {loading
                ? "ENTRANDO..."
                : "ENTRAR →"}
            </button>
          </form>

          <button
            type="button"
            disabled={loading}
            onClick={handleForgotPassword}
            className="mt-4 w-full text-sm font-bold text-gray-400"
          >
            Esqueci minha senha
          </button>

          <div className="mt-6 border-t border-white/10 pt-5 text-center">
            <p className="text-sm text-gray-500">
              Ainda não possui conta?
            </p>

            <button
              onClick={() =>
                router.push("/cadastro")
              }
              className="mt-2 font-black text-yellow-400"
            >
              CRIAR MINHA CONTA
            </button>
          </div>

        </div>
      </div>
    </main>
  );
  }
