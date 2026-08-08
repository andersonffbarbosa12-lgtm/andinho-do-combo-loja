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
    const accessToken =
      process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "MERCADO_PAGO_ACCESS_TOKEN não configurado.",
        },
        { status: 500 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error:
            "Credenciais do Supabase não configuradas.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const items: CartItemRequest[] =
      Array.isArray(body.items)
        ? body.items
        : [];

    const orderType =
      body.orderType === "pickup"
        ? "pickup"
        : "delivery";

    const neighborhood =
      typeof body.neighborhood === "string"
        ? body.neighborhood
        : "";

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
      ...new Set(
        validItems.map((item) => item.id)
      ),
    ];

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    /*
      IMPORTANTE:
      Os preços NÃO vêm do celular do cliente.
      Buscamos novamente no Supabase para evitar
      alguém alterar o valor pelo navegador.
    */
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
        {
          error:
            "Não foi possível consultar os produtos.",
        },
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

    const mercadoPagoItems = [];

    for (const cartItem of validItems) {
      const product = products.find(
        (item) => item.id === cartItem.id
      );

      if (!product) {
        return NextResponse.json(
          {
            error:
              "Produto não encontrado.",
          },
          { status: 400 }
        );
      }

      if (
        cartItem.quantity >
        Number(product.stock)
      ) {
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

      mercadoPagoItems.push({
        id: product.id,
        title: product.volume
          ? `${product.name} - ${product.volume}`
          : product.name,
        quantity: cartItem.quantity,
        currency_id: "BRL",
        unit_price: unitPrice,
      });
    }

    let deliveryFee = 0;

    if (orderType === "delivery") {
      if (!(neighborhood in DELIVERY_AREAS)) {
        return NextResponse.json(
          {
            error:
              "Selecione um bairro atendido.",
          },
          { status: 400 }
        );
      }

      deliveryFee =
        DELIVERY_AREAS[neighborhood];
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

    const orderReference =
      crypto.randomUUID();

    const origin =
      request.nextUrl.origin;

    const preferenceResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          items: mercadoPagoItems,

          external_reference:
            orderReference,

          back_urls: {
            success:
              `${origin}/pagamento/sucesso`,
            pending:
              `${origin}/pagamento/pendente`,
            failure:
              `${origin}/pagamento/erro`,
          },

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
      return NextResponse.json(
        {
          error:
            "Mercado Pago não retornou a URL de pagamento.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preferenceId:
        preference.id,

      initPoint:
        preference.init_point,

      externalReference:
        orderReference,
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
