"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type CartItem = {
  id: string;
  name: string;
  volume: string | null;
  image_url: string | null;
  price: number;
  quantity: number;
  stock: number;
};

type OrderType = "delivery" | "pickup";

type PaymentMethod =
  | "pix"
  | "cash"
  | "card_debit"
  | "card_credit";

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);

  const [orderType, setOrderType] =
    useState<OrderType>("delivery");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("pix");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [cep, setCep] = useState("");

  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");

  const [deliveryFee] = useState(0);

  useEffect(() => {
    const savedCart = localStorage.getItem("andinho-cart");

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        localStorage.removeItem("andinho-cart");
      }
    }

    setLoaded(true);
  }, []);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );
  }, [cart]);

  const total = useMemo(() => {
    return subtotal + deliveryFee;
  }, [subtotal, deliveryFee]);

  function getPaymentLabel() {
    switch (paymentMethod) {
      case "pix":
        return "Pix";

      case "cash":
        return "Dinheiro";

      case "card_debit":
        return "Cartão de débito na entrega";

      case "card_credit":
        return "Cartão de crédito na entrega";

      default:
        return "";
    }
  }

  function validateForm() {
    if (!name.trim()) {
      alert("Digite seu nome.");
      return false;
    }

    if (!phone.trim()) {
      alert("Digite seu telefone.");
      return false;
    }

    if (orderType === "delivery") {
      if (!address.trim()) {
        alert("Digite o endereço.");
        return false;
      }

      if (!number.trim()) {
        alert("Digite o número do endereço.");
        return false;
      }

      if (!neighborhood.trim()) {
        alert("Digite o bairro.");
        return false;
      }
    }

    if (
      paymentMethod === "cash" &&
      changeFor &&
      Number(changeFor.replace(",", ".")) < total
    ) {
      alert(
        "O valor informado para troco precisa ser maior que o total do pedido."
      );

      return false;
    }

    return true;
  }

  function buildWhatsAppMessage(orderId: string) {
    const productLines = cart
      .map((item) => {
        return `${item.quantity}x ${item.name}${
          item.volume
            ? ` (${item.volume})`
            : ""
        } — ${formatPrice(
          item.price * item.quantity
        )}`;
      })
      .join("\n");

    let deliveryInfo = "";

    if (orderType === "delivery") {
      deliveryInfo =
        `🚚 Entrega\n` +
        `${address}, ${number}\n` +
        `${complement ? `${complement}\n` : ""}` +
        `Bairro: ${neighborhood}\n` +
        `${cep ? `CEP: ${cep}\n` : ""}`;
    } else {
      deliveryInfo = "🏪 Retirada no local";
    }

    let paymentInfo =
      `💳 Pagamento: ${getPaymentLabel()}`;

    if (
      paymentMethod === "cash" &&
      changeFor
    ) {
      paymentInfo +=
        `\n💵 Troco para: ${formatPrice(
          Number(changeFor.replace(",", "."))
        )}`;
    }

    return encodeURIComponent(
      `Olá, Andinho do Combo! Quero fazer um pedido.\n\n` +
        `🧾 Pedido: ${orderId.slice(0, 8).toUpperCase()}\n\n` +
        `${productLines}\n\n` +
        `Subtotal: ${formatPrice(subtotal)}\n` +
        `Entrega: ${
          deliveryFee === 0
            ? "A confirmar"
            : formatPrice(deliveryFee)
        }\n` +
        `Total: ${formatPrice(total)}\n\n` +
        `👤 Nome: ${name}\n` +
        `📱 Telefone: ${phone}\n\n` +
        `${deliveryInfo}\n\n` +
        `${paymentInfo}\n` +
        `${
          notes
            ? `\n📝 Observação: ${notes}\n`
            : ""
        }`
    );
  }

  async function finishOrder() {
    if (cart.length === 0) {
      alert("Seu carrinho está vazio.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSending(true);

    try {
      const fullAddress =
        orderType === "delivery"
          ? `${address}, ${number}${
              complement
                ? ` - ${complement}`
                : ""
            }`
          : null;

      const changeValue =
        paymentMethod === "cash" &&
        changeFor
          ? Number(changeFor.replace(",", "."))
          : null;

      const { data: order, error: orderError } =
      const orderId = crypto.randomUUID();

const { error: orderError } =
  await supabase
    .from("orders")
    .insert({
      id: orderId,
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      order_type: orderType,
      address: fullAddress,
      neighborhood:
        orderType === "delivery"
          ? neighborhood.trim()
          : null,
      city: "Petrópolis - RJ",
      cep:
        orderType === "delivery" && cep.trim()
          ? cep.trim()
          : null,
      payment_method: paymentMethod,
      change_for: changeValue,
      subtotal,
      delivery_fee: deliveryFee,
      discount: 0,
      total,
      notes: notes.trim() || null,
      status: "pending",
      whatsapp_opened: true,
    });

      if (orderError || !order) {
        console.error(orderError);

        alert(
          "Não foi possível criar o pedido. Tente novamente."
        );

        setSending(false);
        return;
      }

      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.price * item.quantity,
      }));

      const { error: itemsError } =
        await supabase
          .from("order_items")
          .insert(orderItems);

      if (itemsError) {
        console.error(itemsError);

        alert(
          "O pedido foi criado, mas houve um erro ao salvar os itens."
        );

        setSending(false);
        return;
      }

      const message =
        buildWhatsAppMessage(order.id);

      /*
        IMPORTANTE:
        Na próxima etapa vamos colocar
        seu número real de WhatsApp aqui.
      */
      const whatsappNumber = "5524992359332";
      const whatsappUrl =
        `https://wa.me/${whatsappNumber}?text=${message}`;

      localStorage.removeItem("andinho-cart");

      window.location.href = whatsappUrl;
    } catch (error) {
      console.error(error);

      alert(
        "Ocorreu um erro ao finalizar o pedido."
      );

      setSending(false);
    }
  }

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808] text-white">
        Carregando checkout...
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[#080808] px-4 py-10 text-white">

        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-[#111] p-8 text-center">

          <div className="text-6xl">
            🛒
          </div>

          <h1 className="mt-4 text-2xl font-black">
            Carrinho vazio
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Adicione produtos antes de finalizar.
          </p>

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

  return (
    <main className="min-h-screen bg-[#080808] pb-36 text-white">

      {/* CABEÇALHO */}
      <header className="sticky top-0 z-50 border-b border-yellow-500/20 bg-black/95">

        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">

          <button
            onClick={() =>
              router.push("/carrinho")
            }
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#151515] text-xl"
          >
            ←
          </button>

          <div className="text-center">

            <h1 className="font-black">
              FINALIZAR PEDIDO
            </h1>

            <p className="text-xs text-gray-500">
              {totalItems}{" "}
              {totalItems === 1
                ? "item"
                : "itens"}
            </p>

          </div>

          <div className="w-11" />

        </div>

      </header>

      <div className="mx-auto max-w-3xl px-4">

        {/* ENTREGA OU RETIRADA */}
        <section className="mt-5">

          <h2 className="mb-3 font-black">
            Como você quer receber?
          </h2>

          <div className="grid grid-cols-2 gap-3">

            <button
              onClick={() =>
                setOrderType("delivery")
              }
              className={`rounded-2xl border p-4 text-left ${
                orderType === "delivery"
                  ? "border-yellow-400 bg-yellow-400 text-black"
                  : "border-white/10 bg-[#141414]"
              }`}
            >

              <div className="text-2xl">
                🚚
              </div>

              <p className="mt-2 font-black">
                Entrega
              </p>

              <p
                className={`text-xs ${
                  orderType === "delivery"
                    ? "text-black/60"
                    : "text-gray-500"
                }`}
              >
                Receber no endereço
              </p>

            </button>

            <button
              onClick={() =>
                setOrderType("pickup")
              }
              className={`rounded-2xl border p-4 text-left ${
                orderType === "pickup"
                  ? "border-yellow-400 bg-yellow-400 text-black"
                  : "border-white/10 bg-[#141414]"
              }`}
            >

              <div className="text-2xl">
                🏪
              </div>

              <p className="mt-2 font-black">
                Retirada
              </p>

              <p
                className={`text-xs ${
                  orderType === "pickup"
                    ? "text-black/60"
                    : "text-gray-500"
                }`}
              >
                Retirar no local
              </p>

            </button>

          </div>

        </section>

        {/* DADOS DO CLIENTE */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-[#141414] p-4">

          <h2 className="font-black">
            Seus dados
          </h2>

          <div className="mt-4 space-y-3">

            <div>

              <label className="mb-2 block text-xs font-bold text-gray-400">
                NOME *
              </label>

              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Seu nome"
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />

            </div>

            <div>

              <label className="mb-2 block text-xs font-bold text-gray-400">
                TELEFONE *
              </label>

              <input
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                placeholder="(24) 99999-9999"
                inputMode="tel"
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />

            </div>

          </div>

        </section>

        {/* ENDEREÇO */}
        {orderType === "delivery" && (
          <section className="mt-5 rounded-2xl border border-white/10 bg-[#141414] p-4">

            <h2 className="font-black">
              Endereço de entrega
            </h2>

            <div className="mt-4 space-y-3">

              <div>

                <label className="mb-2 block text-xs font-bold text-gray-400">
                  RUA / ENDEREÇO *
                </label>

                <input
                  value={address}
                  onChange={(e) =>
                    setAddress(e.target.value)
                  }
                  placeholder="Rua..."
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
                />

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="mb-2 block text-xs font-bold text-gray-400">
                    NÚMERO *
                  </label>

                  <input
                    value={number}
                    onChange={(e) =>
                      setNumber(e.target.value)
                    }
                    placeholder="123"
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-xs font-bold text-gray-400">
                    COMPLEMENTO
                  </label>

                  <input
                    value={complement}
                    onChange={(e) =>
                      setComplement(e.target.value)
                    }
                    placeholder="Casa, apto..."
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
                  />

                </div>

              </div>

              <div>

                <label className="mb-2 block text-xs font-bold text-gray-400">
                  BAIRRO *
                </label>

                <input
                  value={neighborhood}
                  onChange={(e) =>
                    setNeighborhood(
                      e.target.value
                    )
                  }
                  placeholder="Seu bairro"
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
                />

              </div>

              <div>

                <label className="mb-2 block text-xs font-bold text-gray-400">
                  CEP
                </label>

                <input
                  value={cep}
                  onChange={(e) =>
                    setCep(e.target.value)
                  }
                  placeholder="00000-000"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
                />

              </div>

            </div>

          </section>
        )}

        {/* PAGAMENTO */}
        <section className="mt-5 rounded-2xl border border-white/10 bg-[#141414] p-4">

          <h2 className="font-black">
            Forma de pagamento
          </h2>

          <div className="mt-4 space-y-2">

            <button
              onClick={() =>
                setPaymentMethod("pix")
              }
              className={`flex w-full items-center justify-between rounded-xl border p-4 ${
                paymentMethod === "pix"
                  ? "border-yellow-400 bg-yellow-400 text-black"
                  : "border-white/10 bg-black"
              }`}
            >
              <span className="font-bold">
                💠 Pix
              </span>

              <span>
                {paymentMethod === "pix"
                  ? "✓"
                  : ""}
              </span>
            </button>

            <button
              onClick={() =>
                setPaymentMethod("cash")
              }
              className={`flex w-full items-center justify-between rounded-xl border p-4 ${
                paymentMethod === "cash"
                  ? "border-yellow-400 bg-yellow-400 text-black"
                  : "border-white/10 bg-black"
              }`}
            >
              <span className="font-bold">
                💵 Dinheiro
              </span>

              <span>
                {paymentMethod === "cash"
                  ? "✓"
                  : ""}
              </span>
            </button>

            <button
              onClick={() =>
                setPaymentMethod(
                  "card_debit"
                )
              }
              className={`flex w-full items-center justify-between rounded-xl border p-4 ${
                paymentMethod ===
                "card_debit"
                  ? "border-yellow-400 bg-yellow-400 text-black"
                  : "border-white/10 bg-black"
              }`}
            >
              <span className="font-bold">
                💳 Débito na maquininha
              </span>

              <span>
                {paymentMethod ===
                "card_debit"
                  ? "✓"
                  : ""}
              </span>
            </button>

            <button
              onClick={() =>
                setPaymentMethod(
                  "card_credit"
                )
              }
              className={`flex w-full items-center justify-between rounded-xl border p-4 ${
                paymentMethod ===
                "card_credit"
                  ? "border-yellow-400 bg-yellow-400 text-black"
                  : "border-white/10 bg-black"
              }`}
            >
              <span className="font-bold">
                💳 Crédito na maquininha
              </span>

              <span>
                {paymentMethod ===
                "card_credit"
                  ? "✓"
                  : ""}
              </span>
            </button>

          </div>

          {paymentMethod === "cash" && (
            <div className="mt-4">

              <label className="mb-2 block text-xs font-bold text-gray-400">
                TROCO PARA QUANTO?
              </label>

              <input
                value={changeFor}
                onChange={(e) =>
                  setChangeFor(e.target.value)
                }
                placeholder="Ex: 200"
                inputMode="decimal"
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
              />

            </div>
          )}

        </section>

        {/* OBSERVAÇÃO */}
        <section className="mt-5 rounded-2xl border border-white/10 bg-[#141414] p-4">

          <h2 className="font-black">
            Observações
          </h2>

<textarea
  value={notes}
  onChange={(e) =>
    setNotes(e.target.value)
  }
  placeholder="Ex: interfone não funciona..."
  rows={4}
  className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400"
/>
        </section>

        {/* RESUMO */}
        <section className="mt-5 rounded-2xl border border-white/10 bg-[#141414] p-5">

          <h2 className="font-black">
            Resumo do pedido
          </h2>

          <div className="mt-4 space-y-3">

            {cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 text-sm"
              >
                <span className="text-gray-400">
                  {item.quantity}x {item.name}
                </span>

                <span>
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}

            <div className="border-t border-white/10 pt-4">

              <div className="flex justify-between text-sm text-gray-400">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              <div className="mt-2 flex justify-between text-sm text-gray-400">
                <span>Entrega</span>

                <span>
                  {orderType === "delivery"
                    ? "A confirmar"
                    : "Retirada"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="font-black">
                  Total parcial
                </span>

                <span className="text-2xl font-black text-yellow-400">
                  {formatPrice(total)}
                </span>
              </div>

            </div>
          </div>
        </section>

        <div className="py-6 text-center text-xs text-gray-600">
          🔞 Venda proibida para menores de 18 anos.
          <br />
          Beba com moderação.
        </div>

      </div>

      {/* FINALIZAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/95 p-4">

        <div className="mx-auto max-w-3xl">

          <button
            onClick={finishOrder}
            disabled={sending}
            className="flex w-full items-center justify-between rounded-2xl bg-yellow-400 px-5 py-4 text-black shadow-2xl disabled:opacity-50"
          >
            <div className="text-left">
              <p className="text-xs font-bold">
                TOTAL PARCIAL
              </p>

              <p className="text-lg font-black">
                {formatPrice(total)}
              </p>
            </div>

            <span className="font-black">
              {sending
                ? "ENVIANDO..."
                : "FINALIZAR NO WHATSAPP →"}
            </span>
          </button>

        </div>
      </div>

    </main>
  );
                }
