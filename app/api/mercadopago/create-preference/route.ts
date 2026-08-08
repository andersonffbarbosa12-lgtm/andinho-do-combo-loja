import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CartItemRequest = {
  id: string;
  quantity: number;
};

const DELIVERY_AREAS: Record<string, number> = {
  Quitandinha: 0,
  "Independência": 8,
  Centro: 10,
  Bingen: 15,
};

export async function POST(request: NextRequest) {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Mercado Pago não configurado." },
        { status: 500 }
      );
    }

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json(
        { error: "Supabase servidor não configurado." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const items: CartItemRequest[] = Array.isArray(body.items)
      ? body.items
      : [];

    const orderType =
      body.orderType === "pickup" ? "pickup" : "delivery";

    const neighborhood =
      typeof body.neighborhood === "string"
        ? body.neighborhood
        : "";

    const customerName =
      typeof body.name === "string" ? body.name.trim() : "";

    const customerPhone =
      typeof body.phone === "string" ? body.phone.trim() : "";

    const address =
      typeof body.address === "string" ? body.address.trim() : "";

    const number =
      typeof body.number === "string" ? body.number.trim() : "";

    const complement =
      typeof body.complement === "string"
        ? body.complement.trim()
        : "";

    const cep =
      typeof body.cep === "string" ? body.cep.trim() : "";

    const notes =
      typeof body.notes === "string" ? body.notes.trim() : "";

    if (!customerName || !customerPhone) {
      return NextResponse.json(
        { error: "Preencha nome e telefone." },
        { status: 400 }
      );
    }

    if (
      orderType === "delivery" &&
      (!address || !number || !neighborhood)
    ) {
      return NextResponse.json(
        { error: "Preencha o endereço de entrega." },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Carrinho vazio." },
        { status: 400 }
      );
    }

    const validItems = items.filter(
      (item) =>
        typeof item.id === "string" &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
    );

    if (validItems.length !== items.length) {
      return NextResponse.json(
        { error: "Carrinho inválido." },
        { status: 400 }
      );
    }

    const productIds = [
      ...new Set(validItems.map((item) => item.id)),
    ];

    const supabase = createClient(
      supabaseUrl,
      serviceRole,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: products, error: productsError } =
      await supabase
        .from("products")
        .select(`
          id,
          name,
          volume,
          price,
          promotional_price,
          stock,
          active
        `)
        .in("id", productIds)
        .eq("active", true);

    if (productsError) {
      console.error(productsError);

      return NextResponse.json(
        { error: "Não foi possível consultar os produtos." },
        { status: 500 }
      );
    }

    if (
      !products ||
      products.length !== productIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "Um ou mais produtos não estão disponíveis.",
        },
        { status: 400 }
      );
    }

    const mercadoPagoItems: Array<{
      id: string;
      title: string;
      quantity: number;
      currency_id: string;
      unit_price: number;
    }> = [];

    const orderItems: Array<{
      order_id: string;
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      total: number;
    }> = [];

    let subtotal = 0;

    const orderReference = crypto.randomUUID();

    for (const cartItem of validItems) {
      const product = products.find(
        (item) => item.id === cartItem.id
      );

      if (!product) {
        return NextResponse.json(
          { error: "Produto não encontrado." },
          { status: 400 }
        );
      }

      if (cartItem.quantity > Number(product.stock)) {
        return NextResponse.json(
          {
            error: `Estoque insuficiente para ${product.name}.`,
          },
          { status: 400 }
        );
      }

      const unitPrice =
        product.promotional_price !== null
          ? Number(product.promotional_price)
          : Number(product.price);

      const itemTotal =
        unitPrice * cartItem.quantity;

      subtotal += itemTotal;

      mercadoPagoItems.push({
        id: product.id,
        title: product.volume
          ? `${product.name} - ${product.volume}`
          : product.name,
        quantity: cartItem.quantity,
        currency_id: "BRL",
        unit_price: unitPrice,
      });

      orderItems.push({
        order_id: orderReference,
        product_id: product.id,
        product_name: product.name,
        quantity: cartItem.quantity,
        unit_price: unitPrice,
        total: itemTotal,
      });
    }

    let deliveryFee = 0;

    if (orderType === "delivery") {
      if (!(neighborhood in DELIVERY_AREAS)) {
        return NextResponse.json(
          { error: "Selecione um bairro atendido." },
          { status: 400 }
        );
      }

      deliveryFee = DELIVERY_AREAS[neighborhood];
    }

    if (deliveryFee > 0) {
      mercadoPagoItems.push({
        id: "delivery",
        title: `Taxa de entrega - ${neighborhood}`,
        quantity: 1,
        currency_id: "BRL",
        unit_price: deliveryFee,
      });
    }

    const total = subtotal + deliveryFee;

    const fullAddress =
      orderType === "delivery"
        ? `${address}, ${number}${
            complement ? ` - ${complement}` : ""
          }`
        : null;

    /*
      Criamos o pedido ANTES de abrir o Mercado Pago.
      Assim o webhook sempre terá um pedido para atualizar.
    */
    const { error: orderError } =
      await supabase
        .from("orders")
        .insert({
          id: orderReference,
          customer_name: customerName,
          customer_phone: customerPhone,
          order_type: orderType,
          address: fullAddress,
          neighborhood:
            orderType === "delivery"
              ? neighborhood
              : null,
          city: "Petrópolis - RJ",
          cep:
            orderType === "delivery" && cep
              ? cep
              : null,
          payment_method: "mercado_pago",
          change_for: null,
          subtotal,
          delivery_fee: deliveryFee,
          discount: 0,
          total,
          notes: notes || null,
          status: "pending_payment",
          whatsapp_opened: false,
        });

    if (orderError) {
      console.error(
        "Erro criando pedido online:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível criar o pedido para pagamento.",
        },
        { status: 500 }
      );
    }

    const { error: itemsError } =
      await supabase
        .from("order_items")
        .insert(orderItems);

    if (itemsError) {
      console.error(
        "Erro criando itens do pedido online:",
        itemsError
      );

      await supabase
        .from("orders")
        .delete()
        .eq("id", orderReference);

      return NextResponse.json(
        {
          error:
            "Não foi possível salvar os itens do pedido.",
        },
        { status: 500 }
      );
    }

    const origin = request.nextUrl.origin;

    const preferenceResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: mercadoPagoItems,

          external_reference: orderReference,

          payer: {
            name: customerName,
          },

          back_urls: {
            success: `${origin}/pagamento/sucesso`,
            pending: `${origin}/pagamento/pendente`,
            failure: `${origin}/pagamento/erro`,
          },

          notification_url:
            `${origin}/api/mercadopago/webhook`,

          auto_return: "approved",
        }),
      }
    );

    const preference =
      await preferenceResponse.json();

    if (!preferenceResponse.ok) {
      console.error(
        "Erro Mercado Pago:",
        preference
      );

      await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderReference);

      await supabase
        .from("orders")
        .delete()
        .eq("id", orderReference);

      return NextResponse.json(
        {
          error:
            "Não foi possível criar o pagamento.",
          details: preference,
        },
        {
          status:
            preferenceResponse.status,
        }
      );
    }

    if (!preference.init_point) {
      await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderReference);

      await supabase
        .from("orders")
        .delete()
        .eq("id", orderReference);

      return NextResponse.json(
        {
          error:
            "Mercado Pago não retornou a URL de pagamento.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preferenceId: preference.id,
      initPoint: preference.init_point,
      externalReference: orderReference,
    });
  } catch (error) {
    console.error(
      "Erro create-preference:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao gerar pagamento.",
      },
      { status: 500 }
    );
  }
}
