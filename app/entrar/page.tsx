"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function EntrarPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.replace("/minha-conta");
        return;
      }

      setChecking(false);
    }

    checkUser();
  }, [router]);

  async function handleLogin(
    event: FormEvent
  ) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail.includes("@")) {
      setMessage(
        "Digite um e-mail válido."
      );
      return;
    }

    if (!password) {
      setMessage(
        "Digite sua senha."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        error,
      } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        console.error(
          "Erro login:",
          error
        );

        const text =
          error.message.toLowerCase();

        if (
          text.includes(
            "invalid login credentials"
          )
        ) {
          setMessage(
            "E-mail ou senha incorretos."
          );
        } else if (
          text.includes(
            "email not confirmed"
          )
        ) {
          setMessage(
            "Seu e-mail ainda não foi confirmado."
          );
        } else {
          setMessage(
            error.message ||
              "Não foi possível entrar."
          );
        }

        setLoading(false);
        return;
      }

      setSuccess(true);

      setMessage(
        "Login realizado com sucesso."
      );

      router.replace(
        "/minha-conta"
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Ocorreu um erro ao entrar."
      );
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setMessage("");
    setSuccess(false);

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail.includes("@")) {
      setMessage(
        "Digite seu e-mail acima primeiro."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        error,
      } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo:
              `${window.location.origin}/redefinir-senha`,
          }
        );

      if (error) {
        console.error(
          "Erro recuperação:",
          error
        );

        setMessage(
          error.message ||
            "Não foi possível enviar o e-mail."
        );

        setLoading(false);
        return;
      }

      setSuccess(true);

      setMessage(
        "Se esse e-mail estiver cadastrado, você receberá um link para redefinir a senha."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Não foi possível iniciar a recuperação de senha."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] text-white">
        <p className="text-sm text-gray-500">
          Carregando...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-md">

        <button
          onClick={() =>
            router.push("/")
          }
          className="mb-5 flex items-center gap-2 text-sm font-bold text-gray-400"
        >
          ← Voltar para a loja
        </button>

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

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Acesse seus dados,
              endereços e pedidos.
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
                  setEmail(
                    event.target.value
                  )
                }
                autoComplete="email"
                placeholder="seuemail@email.com"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
                required
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
                  setPassword(
                    event.target.value
                  )
                }
                autoComplete="current-password"
                placeholder="Sua senha"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
                required
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
            onClick={resetPassword}
            className="mt-4 w-full text-center text-sm font-bold text-gray-400"
          >
            Esqueci minha senha
          </button>

          <div className="mt-6 border-t border-white/10 pt-5 text-center">
            <p className="text-sm text-gray-500">
              Ainda não possui conta?
            </p>

            <button
              onClick={() =>
                router.push(
                  "/cadastro"
                )
              }
              className="mt-2 font-black text-yellow-400"
            >
              CRIAR MINHA CONTA
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-green-500/10 bg-green-500/5 p-4">
            <p className="text-xs font-bold text-green-400">
              🔒 Acesso protegido
            </p>

            <p className="mt-1 text-[11px] leading-5 text-gray-500">
              A autenticação é feita pelo Supabase Auth.
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-gray-600">
          🔞 Venda proibida para menores de 18 anos.
        </p>
      </div>
    </main>
  );
}
