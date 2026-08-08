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


function getBrasiliaMinutes() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(
    parts.find((part) => part.type === "hour")?.value ?? 0
  );
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0
  );

  return hour * 60 + minute;
}

export default function CheckoutPage() {
  const router = useRouter();

  const currentMinutes = getBrasiliaMinutes();
  const isOpen =
    currentMinutes >= 14 * 60 ||
    currentMinutes < 4 * 60;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [payingOnline, setPayingOnline] = useState(false);

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

  const [deliveryFee, setDeliveryFee] = useState(0);

  const deliveryAreas = [
    { name: "Quitandinha", fee: 0 },
    { name: "Independência", fee: 8 },
    { name: "Centro", fee: 10 },
    { name: "Bingen", fee: 15 },
  ];

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
          orderType === "pickup"
            ? "Retirada"
            : deliveryAreas.some(
                (area) =>
                  area.name.toLowerCase() ===
                  neighborhood.trim().toLowerCase()
              )
              ? deliveryFee === 0
                ? "Grátis"
                : formatPrice(deliveryFee)
              : "A confirmar"
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

  async function payOnline() {
    if (!isOpen) {
      alert("A loja está fechada no momento. Abrimos às 14:00.");
      return;
    }

    if (cart.length === 0) {
      alert("Seu carrinho está vazio.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setPayingOnline(true);

    try {
      const response = await fetch(
        "/api/mercadopago/create-preference",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: cart.map((item) => ({
              id: item.id,
              quantity: item.quantity,
            })),
            orderType,
            neighborhood,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        alert(
          data.error ||
            "Não foi possível gerar o pagamento."
        );
        setPayingOnline(false);
        return;
      }

      if (!data.initPoint) {
        alert("Não foi possível abrir o Mercado Pago.");
        setPayingOnline(false);
        return;
      }

      window.location.href = data.initPoint;
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com o Mercado Pago.");
      setPayingOnline(false);
    }
  }

  async function finishOrder() {
    if (!isOpen) {
      alert("A loja está fechada no momento. Abrimos às 14:00.");
      return;
    }

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

      if (orderError) {
        console.error(orderError);

        alert(
          "Não foi possível criar o pedido. Tente novamente."
        );

        setSending(false);
        return;
      }

      const orderItems = cart.map((item) => ({
        order_id: orderId,
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
        buildWhatsAppMessage(orderId);;

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
    <main className="min-h-screen bg-[#070707] pb-40 text-white">
      <header className="sticky top-0 z-50 border-b border-yellow-500/10 bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/carrinho")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#151515] text-xl"
          >
            ←
          </button>

          <div className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-full border border-yellow-400/40 bg-black">
              <img src="/logo-andinho.png" alt="Andinho do Combo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide text-yellow-400">FINALIZAR PEDIDO</h1>
              <p className="text-[11px] text-gray-500">
                {totalItems} {totalItems === 1 ? "item" : "itens"}
              </p>
            </div>
          </div>

          <div className="w-11" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4">
        {!isOpen && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="font-black text-red-400">🔴 Loja fechada no momento</p>
            <p className="mt-1 text-sm text-gray-400">
              Você pode revisar o pedido, mas a finalização será liberada às 14:00.
            </p>
          </div>
        )}

        <section className="mt-5">
          <div className="mb-3">
            <p className="text-xs font-bold text-yellow-400">ENTREGA</p>
            <h2 className="text-xl font-black">Como você quer receber?</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["delivery", "🚚", "Entrega", "Receber no endereço"],
              ["pickup", "🏪", "Retirada", "Retirar no local"],
            ].map(([value, icon, title, subtitle]) => (
              <button
                key={value}
                onClick={() => setOrderType(value as OrderType)}
                className={`rounded-3xl border p-4 text-left transition ${
                  orderType === value
                    ? "border-yellow-400 bg-yellow-400 text-black"
                    : "border-white/10 bg-[#131313]"
                }`}
              >
                <div className="text-2xl">{icon}</div>
                <p className="mt-3 font-black">{title}</p>
                <p className={`mt-1 text-xs ${orderType === value ? "text-black/60" : "text-gray-500"}`}>
                  {subtitle}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#131313] p-5">
          <p className="text-xs font-bold text-yellow-400">CLIENTE</p>
          <h2 className="mt-1 text-xl font-black">Seus dados</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">NOME *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">TELEFONE *</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(24) 99999-9999" inputMode="tel"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400" />
            </div>
          </div>
        </section>

        {orderType === "delivery" && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-[#131313] p-5">
            <p className="text-xs font-bold text-yellow-400">LOCALIZAÇÃO</p>
            <h2 className="mt-1 text-xl font-black">Endereço de entrega</h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-400">RUA / ENDEREÇO *</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua..."
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-400">NÚMERO *</label>
                  <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="123"
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-400">COMPLEMENTO</label>
                  <input value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Casa, apto..."
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-gray-400">BAIRRO *</label>
                <select
                  value={neighborhood}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNeighborhood(value);
                    const area = deliveryAreas.find((item) => item.name === value);
                    setDeliveryFee(area ? area.fee : 0);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-yellow-400"
                >
                  <option value="">Selecione seu bairro</option>
                  {deliveryAreas.map((area) => (
                    <option key={area.name} value={area.name}>
                      {area.name} — {area.fee === 0 ? "Entrega grátis" : formatPrice(area.fee)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-gray-400">CEP</label>
                <input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" inputMode="numeric"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400" />
              </div>
            </div>
          </section>
        )}

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#131313] p-5">
          <p className="text-xs font-bold text-yellow-400">PAGAMENTO</p>
          <h2 className="mt-1 text-xl font-black">Forma de pagamento</h2>

          <div className="mt-5 grid gap-2">
            {[
              ["pix", "💠", "Pix"],
              ["cash", "💵", "Dinheiro"],
              ["card_debit", "💳", "Débito na maquininha"],
              ["card_credit", "💳", "Crédito na maquininha"],
            ].map(([value, icon, label]) => (
              <button
                key={value}
                onClick={() => setPaymentMethod(value as PaymentMethod)}
                className={`flex w-full items-center justify-between rounded-2xl border p-4 ${
                  paymentMethod === value
                    ? "border-yellow-400 bg-yellow-400 text-black"
                    : "border-white/10 bg-black"
                }`}
              >
                <span className="font-bold">{icon} {label}</span>
                <span>{paymentMethod === value ? "✓" : ""}</span>
              </button>
            ))}
          </div>

          {paymentMethod === "cash" && (
            <div className="mt-4">
              <label className="mb-2 block text-xs font-bold text-gray-400">TROCO PARA QUANTO?</label>
              <input value={changeFor} onChange={(e) => setChangeFor(e.target.value)} placeholder="Ex: 200" inputMode="decimal"
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400" />
            </div>
          )}
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#131313] p-5">
          <p className="text-xs font-bold text-yellow-400">OBSERVAÇÃO</p>
          <h2 className="mt-1 text-xl font-black">Algum detalhe do pedido?</h2>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: interfone não funciona..." rows={4}
            className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-4 outline-none focus:border-yellow-400" />
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-yellow-400">RESUMO</p>
              <h2 className="mt-1 text-xl font-black">Seu pedido</h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10">🧾</div>
          </div>

          <div className="mt-5 space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="text-gray-400">{item.quantity}x {item.name}</span>
                <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
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
                    ? deliveryAreas.some((area) => area.name === neighborhood)
                      ? deliveryFee === 0 ? "Grátis" : formatPrice(deliveryFee)
                      : "Selecione o bairro"
                    : "Retirada"}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs text-gray-500">TOTAL</p>
                  <p className="text-2xl font-black text-yellow-400">{formatPrice(total)}</p>
                </div>
                <span className="rounded-full border border-green-500/20 bg-green-500/5 px-3 py-1 text-[10px] font-bold text-green-400">
                  🔒 COMPRA SEGURA
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="py-7 text-center text-xs text-gray-600">
          🔞 Venda proibida para menores de 18 anos.
          <br />
          Beba com moderação.
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-yellow-500/10 bg-black/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-xs text-gray-500">
              Total do pedido
            </span>

            <span className="text-xl font-black text-yellow-400">
              {formatPrice(total)}
            </span>
          </div>

          {!isOpen ? (
            <button
              disabled
              className="w-full rounded-2xl bg-gray-800 px-5 py-4 font-black text-gray-500"
            >
              🔴 LOJA FECHADA • ABRIMOS ÀS 14:00
            </button>
          ) : (
            <div className="grid gap-2">
              <button
                onClick={payOnline}
                disabled={payingOnline || sending}
                className="flex w-full items-center justify-between rounded-2xl bg-[#009ee3] px-5 py-4 font-black text-white shadow-xl disabled:opacity-50"
              >
                <span>💳 PAGAR ONLINE</span>
                <span>
                  {payingOnline
                    ? "ABRINDO..."
                    : "MERCADO PAGO →"}
                </span>
              </button>

              <button
                onClick={finishOrder}
                disabled={sending || payingOnline}
                className="flex w-full items-center justify-between rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black shadow-xl disabled:opacity-50"
              >
                <span>💬 WHATSAPP</span>
                <span>
                  {sending
                    ? "ENVIANDO..."
                    : "FINALIZAR PEDIDO →"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
