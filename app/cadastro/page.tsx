"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function CadastroPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(
    event: FormEvent
  ) {
    event.preventDefault();

    setMessage("");

    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, "");
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setMessage("Digite seu nome.");
      return;
    }

    if (
      cleanPhone.length < 10 ||
      cleanPhone.length > 11
    ) {
      setMessage("Digite um telefone válido.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      setMessage("Digite um e-mail válido.");
      return;
    }

    if (password.length < 6) {
      setMessage(
        "A senha precisa ter pelo menos 6 caracteres."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage("As senhas não são iguais.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              phone: cleanPhone,
            },
          },
        });

      if (error) {
        console.error(error);

        const text =
          error.message.toLowerCase();

        if (
          text.includes(
            "user already registered"
          )
        ) {
          setMessage(
            "Este e-mail já possui cadastro."
          );
        } else {
          setMessage(
            error.message ||
              "Não foi possível criar sua conta."
          );
        }

        return;
      }

      if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      }

      setMessage(
        "Conta criada. Verifique seu e-mail para confirmar o cadastro."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Ocorreu um erro ao criar sua conta."
      );
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
              Criar minha conta
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Cadastre-se para acessar a loja.
            </p>
          </div>

          {message && (
            <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300">
              {message}
            </div>
          )}

          <form
            onSubmit={handleSignup}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="mb-2 block text-sm font-bold">
                Nome
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Seu nome"
                autoComplete="name"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                WhatsApp
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                placeholder="(24) 99999-9999"
                autoComplete="tel"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                E-mail
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="nome@email.com"
                autoComplete="email"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Senha
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Confirmar senha
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Digite a senha novamente"
                autoComplete="new-password"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-yellow-400 px-4 py-4 font-black text-black disabled:opacity-50"
            >
              {loading
                ? "CRIANDO CONTA..."
                : "CRIAR CONTA"}
            </button>
          </form>

          <button
            type="button"
            onClick={() =>
              router.push("/entrar")
            }
            className="mt-5 w-full text-center text-sm font-bold text-gray-400"
          >
            Já tenho conta — Entrar
          </button>
        </div>
      </div>
    </main>
  );
}
