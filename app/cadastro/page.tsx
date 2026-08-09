"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function CadastroPage() {
  const router = useRouter();

  const [name, setName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [checking, setChecking] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (user) {
        router.replace(
          "/minha-conta"
        );

        return;
      }

      setChecking(false);
    }

    checkUser();
  }, [router]);

  function normalizePhone(
    value: string
  ) {
    return value
      .replace(/\D/g, "")
      .slice(0, 11);
  }

  function formatPhone(
    value: string
  ) {
    const digits =
      normalizePhone(value);

    if (
      digits.length <= 2
    ) {
      return digits;
    }

    if (
      digits.length <= 7
    ) {
      return `(${digits.slice(
        0,
        2
      )}) ${digits.slice(2)}`;
    }

    return `(${digits.slice(
      0,
      2
    )}) ${digits.slice(
      2,
      7
    )}-${digits.slice(7)}`;
  }

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    const cleanName =
      name.trim();

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    const cleanPhone =
      normalizePhone(phone);

    if (
      cleanName.length < 2
    ) {
      setMessage(
        "Digite seu nome completo."
      );

      return;
    }

    if (
      cleanPhone.length < 10
    ) {
      setMessage(
        "Digite um telefone válido."
      );

      return;
    }

    if (
      !cleanEmail.includes("@")
    ) {
      setMessage(
        "Digite um e-mail válido."
      );

      return;
    }

    if (
      password.length < 8
    ) {
      setMessage(
        "A senha precisa ter pelo menos 8 caracteres."
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setMessage(
        "As senhas não são iguais."
      );

      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email:
            cleanEmail,

          password,

          options: {
            data: {
              full_name:
                cleanName,

              phone:
                cleanPhone,
            },

            emailRedirectTo:
              `${window.location.origin}/entrar?confirmado=1`,
          },
        });

      if (error) {
        console.error(
          "Erro cadastro:",
          error
        );

        if (
          error.message
            .toLowerCase()
            .includes(
              "already registered"
            )
        ) {
          setMessage(
            "Este e-mail já possui uma conta."
          );
        } else {
          setMessage(
            error.message ||
              "Não foi possível criar sua conta."
          );
        }

        setLoading(false);
        return;
      }

      /*
        Nosso trigger no Supabase
        cria automaticamente o profile
        usando esses metadados.
      */

      if (
        data.session
      ) {
        setSuccess(true);

        setMessage(
          "Conta criada com sucesso!"
        );

        setTimeout(() => {
          router.push(
            "/minha-conta"
          );
        }, 1200);

        return;
      }

      /*
        Se confirmação por e-mail
        estiver ativada no Supabase.
      */
      setSuccess(true);

      setMessage(
        "Conta criada! Enviamos um e-mail para confirmar seu cadastro."
      );

      setPassword("");
      setConfirmPassword("");

    } catch (error) {
      console.error(
        "Erro inesperado:",
        error
      );

      setMessage(
        "Ocorreu um erro. Tente novamente."
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
              Criar minha conta
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Salve seus dados,
              endereços e acompanhe seus
              pedidos com segurança.
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
            onSubmit={
              handleSubmit
            }
            className="mt-6 space-y-4"
          >

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                NOME COMPLETO *
              </label>

              <input
                value={name}
                onChange={(event) =>
                  setName(
                    event.target
                      .value
                  )
                }
                autoComplete="name"
                maxLength={120}
                placeholder="Seu nome"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                TELEFONE *
              </label>

              <input
                value={phone}
                onChange={(event) =>
                  setPhone(
                    formatPhone(
                      event.target
                        .value
                    )
                  )
                }
                autoComplete="tel"
                inputMode="tel"
                placeholder="(24) 99999-9999"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                E-MAIL *
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target
                      .value
                  )
                }
                autoComplete="email"
                maxLength={200}
                placeholder="seuemail@email.com"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                SENHA *
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target
                      .value
                  )
                }
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
                required
              />

              <p className="mt-2 text-[11px] text-gray-600">
                Use uma senha diferente
                das suas contas bancárias.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                CONFIRMAR SENHA *
              </label>

              <input
                type="password"
                value={
                  confirmPassword
                }
                onChange={(event) =>
                  setConfirmPassword(
                    event.target
                      .value
                  )
                }
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                placeholder="Digite novamente"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
                required
              />
            </div>

            <button
              disabled={loading}
              className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black shadow-xl disabled:opacity-50"
            >
              {loading
                ? "CRIANDO CONTA..."
                : "CRIAR MINHA CONTA →"}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-5 text-center">

            <p className="text-sm text-gray-500">
              Já possui uma conta?
            </p>

            <button
              onClick={() =>
                router.push(
                  "/entrar"
                )
              }
              className="mt-2 font-black text-yellow-400"
            >
              ENTRAR NA MINHA CONTA
            </button>

          </div>

          <div className="mt-6 rounded-2xl border border-green-500/10 bg-green-500/5 p-4">

            <p className="text-xs font-bold text-green-400">
              🔒 Seus dados protegidos
            </p>

            <p className="mt-1 text-[11px] leading-5 text-gray-500">
              Sua senha é gerenciada
              pelo sistema de
              autenticação e não fica
              armazenada em texto no
              banco da loja.
            </p>

          </div>
        </div>

        <p className="mt-5 text-center text-xs text-gray-600">
          🔞 Venda proibida para
          menores de 18 anos.
        </p>
      </div>
    </main>
  );
        }
