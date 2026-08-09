import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "crypto";

import {
  getSupabaseAdmin,
} from "../../../../lib/supabase-admin";

import {
  checkRateLimit,
  getRequestFingerprint,
} from "../../../../lib/rate-limit";

export const runtime = "nodejs";

type CartItemRequest = {
  id: string;
  quantity: number;
};

const DELIVERY_AREAS:
  Record<string, number> = {
    Quitandinha: 0,
    "Independência": 8,
    Centro: 10,
    Bingen: 15,
  };

function cleanText(
  value: unknown,
  maxLength: number
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}

function getBrasiliaMinutes() {
  const parts =
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        timeZone:
          "America/Sao_Paulo",

        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    ).formatToParts(
      new Date()
    );

  const hour =
    Number(
      parts.find(
        (part) =>
          part.type === "hour"
      )?.value ?? 0
    );

  const minute =
    Number(
      parts.find(
        (part) =>
          part.type === "minute"
      )?.value ?? 0
    );

  return (
    hour * 60 +
    minute
  );
}

function storeIsOpen() {
  const minutes =
    getBrasiliaMinutes();

  return (
    minutes >= 14 * 60 ||
    minutes < 4 * 60
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    if (!storeIsOpen()) {
      return NextResponse.json(
        {
          error:
            "A loja está fechada. Abrimos às 14:00.",
        },
        {
          status: 403,
        }
      );
    }

    const contentLength =
      Number(
        request.headers.get(
          "content-length"
        ) ?? 0
      );

    if (
      contentLength >
      50_000
    ) {
      return NextResponse.json(
        {
          error:
            "Requisição muito grande.",
        },
        {
          status: 413,
        }
      );
    }

    const fingerprint =
      getRequestFingerprint(
        request.headers
      );

    /*
      Evita criação abusiva
      de preferências/pedidos.
    */
    const rateLimit =
      await checkRateLimit({
        keyHash: fingerprint,
        action:
          "mercadopago_preference",

        limit: 15,
        windowSeconds: 10 * 60,
      });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Muitas tentativas. Aguarde alguns minutos.",
        },
        {
          status: 429,
        }
      );
    }

    const accessToken =
      process.env
        .MERCADO_PAGO_ACCESS_TOKEN;

    const siteUrl =
      process.env.SITE_URL;

    if (!accessToken) {
      throw new Error(
        "MERCADO_PAGO_ACCESS_TOKEN não configurado."
      );
    }

    if (!siteUrl) {
      throw new Error(
        "SITE_URL não configurada."
      );
    }

    const body =
      await request.json();

    const rawItems:
      CartItemRequest[] =
        Array.isArray(body.items)
          ? body.items
          : [];

    if (
      rawItems.length === 0 ||
      rawItems.length > 50
    ) {
      return NextResponse.json(
        {
          error:
            "Carrinho inválido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Agrupa produtos repetidos
      e limita quantidade.
    */
    const quantities =
      new Map<string, number>();

    for (
      const item of rawItems
    ) {
      if (
        typeof item.id !==
          "string" ||
        !Number.isInteger(
          item.quantity
        ) ||
        item.quantity < 1 ||
        item.quantity > 20
      ) {
        return NextResponse.json(
          {
            error:
              "Carrinho inválido.",
          },
          {
            status: 400,
          }
        );
      }

      const current =
        quantities.get(
          item.id
        ) ?? 0;

      const totalQuantity =
        current +
        item.quantity;

      if (
        totalQuantity > 20
      ) {
        return NextResponse.json(
          {
            error:
              "Quantidade máxima excedida.",
          },
          {
            status: 400,
          }
        );
      }

      quantities.set(
        item.id,
        totalQuantity
      );
    }

    const items:
      CartItemRequest[] =
        Array.from(
          quantities.entries()
        ).map(
          ([id, quantity]) => ({
            id,
            quantity,
          })
        );

    const orderType =
      body.orderType ===
      "pickup"
        ? "pickup"
        : "delivery";

    const neighborhood =
      cleanText(
        body.neighborhood,
        80
      );

    const customerName =
      cleanText(
        body.name,
        120
      );

    const customerPhone =
      cleanText(
        body.phone,
        30
      ).replace(
        /\D/g,
        ""
      );

    const address =
      cleanText(
        body.address,
        180
      );

    const number =
      cleanText(
        body.number,
        30
      );

    const complement =
      cleanText(
        body.complement,
        120
      );

    const cep =
      cleanText(
        body.cep,
        20
      );

    const notes =
      cleanText(
        body.notes,
        500
      );

    if (
      customerName.length < 2
    ) {
      return NextResponse.json(
        {
          error:
            "Digite um nome válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      customerPhone.length <
        10 ||
      customerPhone.length >
        11
    ) {
      return NextResponse.json(
        {
          error:
            "Digite um telefone válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      orderType ===
        "delivery" &&
      (
        !address ||
        !number ||
        !neighborhood
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Preencha o endereço de entrega.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      orderType ===
        "delivery" &&
      !Object.prototype
        .hasOwnProperty.call(
          DELIVERY_AREAS,
          neighborhood
        )
    ) {
      return NextResponse.json(
        {
          error:
            "Selecione um bairro atendido.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      getSupabaseAdmin();

    const productIds =
      items.map(
        (item) => item.id
      );

    const {
      data: products,
      error: productsError,
    } =
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
        .in(
          "id",
          productIds
        )
        .eq(
          "active",
          true
        );

    if (productsError) {
      console.error(
        "Erro buscando produtos:",
        productsError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível consultar os produtos.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !products ||
      products.length !==
        productIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "Um ou mais produtos não estão disponíveis.",
        },
        {
          status: 400,
        }
      );
    }

    const orderReference =
      crypto.randomUUID();

    const mercadoPagoItems:
      Array<{
        id: string;
        title: string;
        quantity: number;
        currency_id: "BRL";
        unit_price: number;
      }> = [];

    const orderItems:
      Array<{
        order_id: string;
        product_id: string;
        product_name: string;
        quantity: number;
        unit_price: number;
        total: number;
      }> = [];

    let subtotal = 0;

    for (
      const cartItem of items
    ) {
      const product =
        products.find(
          (item) =>
            item.id ===
            cartItem.id
        );

      if (!product) {
        return NextResponse.json(
          {
            error:
              "Produto não encontrado.",
          },
          {
            status: 400,
          }
        );
      }

      const stock =
        Number(
          product.stock
        );

      if (
        cartItem.quantity >
        stock
      ) {
        return NextResponse.json(
          {
            error:
              `Estoque insuficiente para ${product.name}.`,
          },
          {
            status: 400,
          }
        );
      }

      const normalPrice =
        Number(
          product.price
        );

      const promoPrice =
        product
          .promotional_price !==
        null
          ? Number(
              product
                .promotional_price
            )
          : null;

      const hasValidPromo =
        promoPrice !== null &&
        promoPrice > 0 &&
        promoPrice <
          normalPrice;

      const unitPrice =
        hasValidPromo
          ? promoPrice
          : normalPrice;

      if (
        !Number.isFinite(
          unitPrice
        ) ||
        unitPrice <= 0
      ) {
        console.error(
          "Produto com preço inválido:",
          product.id
        );

        return NextResponse.json(
          {
            error:
              "Produto com preço inválido.",
          },
          {
            status: 500,
          }
        );
      }

      const itemTotal =
        Number(
          (
            unitPrice *
            cartItem.quantity
          ).toFixed(2)
        );

      subtotal +=
        itemTotal;

      mercadoPagoItems.push({
        id: product.id,

        title:
          product.volume
            ? `${product.name} - ${product.volume}`
            : product.name,

        quantity:
          cartItem.quantity,

        currency_id:
          "BRL",

        unit_price:
          unitPrice,
      });

      orderItems.push({
        order_id:
          orderReference,

        product_id:
          product.id,

        product_name:
          product.name,

        quantity:
          cartItem.quantity,

        unit_price:
          unitPrice,

        total:
          itemTotal,
      });
    }

    subtotal =
      Number(
        subtotal.toFixed(2)
      );

    const deliveryFee =
      orderType ===
      "delivery"
        ? DELIVERY_AREAS[
            neighborhood
          ]
        : 0;

    if (
      deliveryFee > 0
    ) {
      mercadoPagoItems.push({
        id: "delivery",

        title:
          `Taxa de entrega - ${neighborhood}`,

        quantity: 1,

        currency_id:
          "BRL",

        unit_price:
          deliveryFee,
      });
    }

    const total =
      Number(
        (
          subtotal +
          deliveryFee
        ).toFixed(2)
      );

    const fullAddress =
      orderType ===
      "delivery"
        ? `${address}, ${number}${
            complement
              ? ` - ${complement}`
              : ""
          }`
        : null;

    const {
      error: orderError,
    } =
      await supabase
        .from("orders")
        .insert({
          id:
            orderReference,

          customer_name:
            customerName,

          customer_phone:
            customerPhone,

          order_type:
            orderType,

          address:
            fullAddress,

          neighborhood:
            orderType ===
            "delivery"
              ? neighborhood
              : null,

          city:
            "Petrópolis - RJ",

          cep:
            orderType ===
              "delivery" &&
            cep
              ? cep
              : null,

          payment_method:
            "mercado_pago",

          change_for: null,

          subtotal,

          delivery_fee:
            deliveryFee,

          discount: 0,

          total,

          notes:
            notes || null,

          status:
            "pending_payment",

          whatsapp_opened:
            false,
        });

    if (orderError) {
      console.error(
        "Erro criando pedido:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível criar o pedido.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: itemsError,
    } =
      await supabase
        .from("order_items")
        .insert(
          orderItems
        );

    if (itemsError) {
      console.error(
        "Erro salvando itens:",
        itemsError
      );

      await supabase
        .from("orders")
        .delete()
        .eq(
          "id",
          orderReference
        );

      return NextResponse.json(
        {
          error:
            "Não foi possível salvar o pedido.",
        },
        {
          status: 500,
        }
      );
    }

    const preferenceResponse =
      await fetch(
        "https://api.mercadopago.com/checkout/preferences",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              items:
                mercadoPagoItems,

              external_reference:
                orderReference,

              metadata: {
                order_id:
                  orderReference,
              },

              payer: {
                name:
                  customerName,
              },

              back_urls: {
                success:
                  `${siteUrl}/pagamento/sucesso`,

                pending:
                  `${siteUrl}/pagamento/pendente`,

                failure:
                  `${siteUrl}/pagamento/erro`,
              },

              notification_url:
                `${siteUrl}/api/mercadopago/webhook`,

              auto_return:
                "approved",
            }),

          signal:
            AbortSignal.timeout(
              15_000
            ),
        }
      );

    const preference =
      await preferenceResponse
        .json();

    if (
      !preferenceResponse.ok ||
      !preference.init_point ||
      !preference.id
    ) {
      console.error(
        "Erro Mercado Pago:",
        preference
      );

      await supabase
        .from("order_items")
        .delete()
        .eq(
          "order_id",
          orderReference
        );

      await supabase
        .from("orders")
        .delete()
        .eq(
          "id",
          orderReference
        );

      return NextResponse.json(
        {
          error:
            "Não foi possível criar o pagamento.",
        },
        {
          status: 502,
        }
      );
    }

    const {
      error:
        preferenceUpdateError,
    } =
      await supabase
        .from("orders")
        .update({
          mercado_pago_preference_id:
            String(
              preference.id
            ),
        })
        .eq(
          "id",
          orderReference
        );

    if (
      preferenceUpdateError
    ) {
      console.error(
        "Erro salvando preference_id:",
        preferenceUpdateError
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
      {
        status: 500,
      }
    );
  }
}
