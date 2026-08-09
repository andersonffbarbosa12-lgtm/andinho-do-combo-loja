"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

type Address = {
  id: string;
  label: string;
  address: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  cep: string | null;
  is_default: boolean;
};

type Order = {
  id: string;
  total: number;
  status: string;
  order_type: string | null;
  created_at: string;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    pending_payment: "Aguardando pagamento",
    paid: "Pago",
    preparing: "Preparando",
    ready: "Pronto para retirada",
    out_for_delivery: "Saiu para entrega",
    delivered: "Finalizado",
    cancelled: "Cancelado",
    payment_rejected: "Pagamento recusado",
    refunded: "Reembolsado",
  };

  return labels[status] ?? status;
}

export default function MinhaContaPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [savingAddress, setSavingAddress] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [userId, setUserId] =
    useState("");

  const [name, setName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [addresses, setAddresses] =
    useState<Address[]>([]);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [label, setLabel] =
    useState("Principal");

  const [address, setAddress] =
    useState("");

  const [number, setNumber] =
    useState("");

  const [complement, setComplement] =
    useState("");

  const [neighborhood, setNeighborhood] =
    useState("");

  const [cep, setCep] =
    useState("");

  useEffect(() => {
    loadAccount();
  }, []);

  async function loadAccount() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/entrar");
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      const [
        profileResult,
        addressResult,
        ordersResult,
      ] =
        await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, full_name, phone"
            )
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("customer_addresses")
            .select(
              "id, label, address, number, complement, neighborhood, city, cep, is_default"
            )
            .eq("user_id", user.id)
            .order("is_default", {
              ascending: false,
            })
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("orders")
            .select(
              "id, total, status, order_type, created_at"
            )
            .eq("user_id", user.id)
            .order("created_at", {
              ascending: false,
            })
            .limit(50),
        ]);

      if (
        profileResult.error
      ) {
        console.error(
          "Erro perfil:",
          profileResult.error
        );
      }

      if (
        addressResult.error
      ) {
        console.error(
          "Erro endereços:",
          addressResult.error
        );
      }

      if (
        ordersResult.error
      ) {
        console.error(
          "Erro pedidos:",
          ordersResult.error
        );
      }

      const profile =
        profileResult.data as
          | Profile
          | null;

      setName(
        profile?.full_name ??
          user.user_metadata
            ?.full_name ??
          ""
      );

      setPhone(
        profile?.phone ??
          user.user_metadata
            ?.phone ??
          ""
      );

      setAddresses(
        (addressResult.data ??
          []) as Address[]
      );

      setOrders(
        (ordersResult.data ??
          []) as Order[]
      );
    } catch (error) {
      console.error(
        "Erro carregando conta:",
        error
      );

      setMessage(
        "Não foi possível carregar sua conta."
      );
    } finally {
      setLoading(false);
    }
  }

  function normalizePhone(
    value: string
  ) {
    return value
      .replace(/\D/g, "")
      .slice(0, 11);
  }

  async function saveProfile(
    event: FormEvent
  ) {
    event.preventDefault();

    setMessage("");

    if (
      name.trim().length < 2
    ) {
      setMessage(
        "Digite um nome válido."
      );
      return;
    }

    const cleanPhone =
      normalizePhone(phone);

    if (
      cleanPhone.length < 10
    ) {
      setMessage(
        "Digite um telefone válido."
      );
      return;
    }

    setSavingProfile(true);

    const {
      error,
    } =
      await supabase
        .from("profiles")
        .upsert({
          id: userId,
          full_name:
            name.trim(),
          phone:
            cleanPhone,
          updated_at:
            new Date()
              .toISOString(),
        });

    if (error) {
      console.error(error);

      setMessage(
        "Não foi possível salvar seus dados."
      );
    } else {
      setMessage(
        "Dados atualizados com sucesso."
      );
    }

    setSavingProfile(false);
  }

  async function saveAddress(
    event: FormEvent
  ) {
    event.preventDefault();

    setMessage("");

    if (
      !address.trim() ||
      !number.trim() ||
      !neighborhood.trim()
    ) {
      setMessage(
        "Preencha endereço, número e bairro."
      );

      return;
    }

    setSavingAddress(true);

    const isFirstAddress =
      addresses.length === 0;

    const {
      error,
    } =
      await supabase
        .from(
          "customer_addresses"
        )
        .insert({
          user_id: userId,
          label:
            label.trim() ||
            "Principal",
          address:
            address.trim(),
          number:
            number.trim(),
          complement:
            complement.trim() ||
            null,
          neighborhood:
            neighborhood.trim(),
          city:
            "Petrópolis - RJ",
          cep:
            cep.trim() ||
            null,
          is_default:
            isFirstAddress,
        });

    if (error) {
      console.error(error);

      setMessage(
        "Não foi possível salvar o endereço."
      );

      setSavingAddress(false);
      return;
    }

    setLabel("Principal");
    setAddress("");
    setNumber("");
    setComplement("");
    setNeighborhood("");
    setCep("");

    setMessage(
      "Endereço salvo com sucesso."
    );

    await loadAccount();

    setSavingAddress(false);
  }

  async function setDefaultAddress(
    id: string
  ) {
    setMessage("");

    const {
      error,
    } =
      await supabase
        .from(
          "customer_addresses"
        )
        .update({
          is_default: true,
          updated_at:
            new Date()
              .toISOString(),
        })
        .eq("id", id);

    if (error) {
      console.error(error);

      setMessage(
        "Não foi possível alterar o endereço padrão."
      );

      return;
    }

    await loadAccount();
  }

  async function deleteAddress(
    id: string
  ) {
    if (
      !window.confirm(
        "Excluir este endereço?"
      )
    ) {
      return;
    }

    const {
      error,
    } =
      await supabase
        .from(
          "customer_addresses"
        )
        .delete()
        .eq("id", id);

    if (error) {
      console.error(error);

      setMessage(
        "Não foi possível excluir o endereço."
      );

      return;
    }

    await loadAccount();
  }

  async function logout() {
    await supabase.auth.signOut();

    router.replace("/");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] text-white">
        <p className="text-sm text-gray-500">
          Carregando sua conta...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] pb-12 text-white">
      <header className="sticky top-0 z-50 border-b border-yellow-500/10 bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button
            onClick={() =>
              router.push("/")
            }
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#151515]"
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
              <p className="text-[10px] font-bold text-yellow-400">
                ANDINHO DO COMBO
              </p>

              <h1 className="text-sm font-black">
                Minha conta
              </h1>
            </div>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-400"
          >
            SAIR
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">

        {message && (
          <div className="mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-200">
            {message}
          </div>
        )}

        <section className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-5">
          <p className="text-xs font-black text-yellow-400">
            👤 MINHA CONTA
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Olá,{" "}
            {name ||
              "cliente"}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {email}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-black/40 p-4">
              <p className="text-[10px] font-bold text-gray-600">
                ENDEREÇOS
              </p>

              <p className="mt-1 text-xl font-black">
                {addresses.length}
              </p>
            </div>

            <div className="rounded-2xl bg-black/40 p-4">
              <p className="text-[10px] font-bold text-gray-600">
                PEDIDOS
              </p>

              <p className="mt-1 text-xl font-black">
                {orders.length}
              </p>
            </div>
          </div>
        </section>

        <form
          onSubmit={
            saveProfile
          }
          className="mt-5 rounded-3xl border border-white/10 bg-[#111] p-5"
        >
          <p className="text-xs font-bold text-yellow-400">
            DADOS PESSOAIS
          </p>

          <h2 className="mt-1 text-xl font-black">
            Seus dados
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                NOME
              </label>

              <input
                value={name}
                onChange={(event) =>
                  setName(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                TELEFONE
              </label>

              <input
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target
                      .value
                  )
                }
                inputMode="tel"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                E-MAIL
              </label>

              <input
                value={email}
                disabled
                className="w-full rounded-2xl border border-white/5 bg-black/50 px-4 py-4 text-gray-500"
              />
            </div>

            <button
              disabled={
                savingProfile
              }
              className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black disabled:opacity-50"
            >
              {savingProfile
                ? "SALVANDO..."
                : "SALVAR DADOS"}
            </button>
          </div>
        </form>

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#111] p-5">
          <p className="text-xs font-bold text-yellow-400">
            📍 ENDEREÇOS
          </p>

          <h2 className="mt-1 text-xl font-black">
            Endereços salvos
          </h2>

          <div className="mt-4 space-y-3">
            {addresses.length ===
              0 && (
              <p className="rounded-2xl bg-black/40 p-4 text-sm text-gray-500">
                Você ainda não possui
                endereço salvo.
              </p>
            )}

            {addresses.map(
              (item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-black/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black">
                          {item.label}
                        </p>

                        {item.is_default && (
                          <span className="rounded-full bg-green-500/10 px-2 py-1 text-[10px] font-bold text-green-400">
                            PADRÃO
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-gray-300">
                        {item.address},{" "}
                        {item.number}
                      </p>

                      {item.complement && (
                        <p className="text-sm text-gray-500">
                          {
                            item.complement
                          }
                        </p>
                      )}

                      <p className="text-sm text-gray-500">
                        {
                          item.neighborhood
                        }{" "}
                        • {item.city}
                      </p>

                      {item.cep && (
                        <p className="text-xs text-gray-600">
                          CEP:{" "}
                          {item.cep}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!item.is_default && (
                      <button
                        onClick={() =>
                          setDefaultAddress(
                            item.id
                          )
                        }
                        className="rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-2 text-xs font-bold text-green-400"
                      >
                        DEFINIR PADRÃO
                      </button>
                    )}

                    <button
                      onClick={() =>
                        deleteAddress(
                          item.id
                        )
                      }
                      className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-400"
                    >
                      EXCLUIR
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        <form
          onSubmit={
            saveAddress
          }
          className="mt-5 rounded-3xl border border-white/10 bg-[#111] p-5"
        >
          <p className="text-xs font-bold text-yellow-400">
            + NOVO ENDEREÇO
          </p>

          <h2 className="mt-1 text-xl font-black">
            Adicionar endereço
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                NOME DO ENDEREÇO
              </label>

              <input
                value={label}
                onChange={(event) =>
                  setLabel(
                    event.target
                      .value
                  )
                }
                placeholder="Ex: Casa"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                RUA / ENDEREÇO *
              </label>

              <input
                value={address}
                onChange={(event) =>
                  setAddress(
                    event.target
                      .value
                  )
                }
                placeholder="Rua..."
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-400">
                  NÚMERO *
                </label>

                <input
                  value={number}
                  onChange={(event) =>
                    setNumber(
                      event.target
                        .value
                    )
                  }
                  placeholder="123"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-gray-400">
                  COMPLEMENTO
                </label>

                <input
                  value={
                    complement
                  }
                  onChange={(event) =>
                    setComplement(
                      event.target
                        .value
                    )
                  }                   
                  placeholder="Casa..."
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                BAIRRO *
              </label>

              <select
                value={neighborhood}
                onChange={(event) =>
                  setNeighborhood(
                    event.target.value
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              >
                <option value="">
                  Selecione
                </option>

                <option value="Quitandinha">
                  Quitandinha
                </option>

                <option value="Independência">
                  Independência
                </option>

                <option value="Centro">
                  Centro
                </option>

                <option value="Bingen">
                  Bingen
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">
                CEP
              </label>

              <input
                value={cep}
                onChange={(event) =>
                  setCep(
                    event.target.value
                  )
                }
                placeholder="00000-000"
                inputMode="numeric"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />
            </div>

            <button
              disabled={savingAddress}
              className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black disabled:opacity-50"
            >
              {savingAddress
                ? "SALVANDO..."
                : "SALVAR ENDEREÇO"}
            </button>
          </div>
        </form>

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#111] p-5">
          <p className="text-xs font-bold text-yellow-400">
            📦 PEDIDOS
          </p>

          <h2 className="mt-1 text-xl font-black">
            Meus pedidos
          </h2>

          <div className="mt-4 space-y-3">
            {orders.length === 0 && (
              <p className="rounded-2xl bg-black/40 p-4 text-sm text-gray-500">
                Seus próximos pedidos aparecerão aqui.
              </p>
            )}

            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-white/10 bg-black/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-600">
                      PEDIDO
                    </p>

                    <p className="font-black">
                      #
                      {order.id
                        .slice(0, 8)
                        .toUpperCase()}
                    </p>
                  </div>

                  <span className="rounded-full border border-yellow-500/20 bg-yellow-500/5 px-3 py-1 text-[10px] font-bold text-yellow-400">
                    {statusLabel(
                      order.status
                    )}
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-gray-600">
                      {order.order_type ===
                      "delivery"
                        ? "🚚 Entrega"
                        : "🏪 Retirada"}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(
                        order.created_at
                      )}
                    </p>
                  </div>

                  <p className="text-lg font-black text-yellow-400">
                    {formatPrice(
                      order.total
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <button
          onClick={() =>
            router.push("/")
          }
          className="mt-5 w-full rounded-2xl border border-yellow-500/20 bg-yellow-400/5 px-5 py-4 font-black text-yellow-400"
        >
          🛒 VOLTAR PARA A LOJA
        </button>

        <p className="mt-6 text-center text-xs text-gray-600">
          🔒 Seus dados só podem ser acessados pela sua própria conta.
        </p>
      </div>
    </main>
  );
}
