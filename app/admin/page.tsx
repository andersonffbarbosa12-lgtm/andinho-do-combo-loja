import { cookies } from "next/headers";
import crypto from "crypto";

function getAdminSessionValue() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return "";
  return crypto.createHash("sha256").update(`andinho-admin:${password}`).digest("hex");
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("andinho_admin_session")?.value ?? "";
  const expectedSession = getAdminSessionValue();
  const loggedIn = Boolean(expectedSession) && sessionCookie === expectedSession;

  if (!loggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-yellow-500/20 bg-[#111] p-6 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-yellow-400/60 bg-black">
              <img src="/logo-andinho.png" alt="Andinho do Combo" className="h-full w-full object-cover" />
            </div>
            <p className="mt-5 text-xs font-bold tracking-widest text-yellow-400">ÁREA RESTRITA</p>
            <h1 className="mt-2 text-2xl font-black">Painel Administrativo</h1>
            <p className="mt-2 text-sm text-gray-500">Digite sua senha para continuar.</p>
          </div>

          {params.erro === "1" && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
              Senha incorreta. Tente novamente.
            </div>
          )}

          <form action="/api/admin/login" method="POST" className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-400">SENHA</label>
              <input
                type="password"
                name="password"
                placeholder="Digite sua senha"
                required
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-yellow-400"
              />
            </div>

            <button type="submit" className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black shadow-xl">
              ENTRAR NO PAINEL →
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-600">Andinho do Combo • Administração</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <header className="border-b border-yellow-500/10 bg-black">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full border border-yellow-400/40">
              <img src="/logo-andinho.png" alt="Andinho do Combo" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-xs font-bold text-yellow-400">ADMIN</p>
              <h1 className="font-black">Andinho do Combo</h1>
            </div>
          </div>

          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-bold text-red-400">
              SAIR
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <section className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-6">
          <p className="text-xs font-bold text-yellow-400">PAINEL ADMINISTRATIVO</p>
          <h2 className="mt-2 text-2xl font-black">Acesso liberado ✅</h2>
          <p className="mt-2 text-sm text-gray-400">
            O login do Admin está funcionando. Agora vamos adicionar pedidos, produtos, estoque e configurações aqui.
          </p>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["📦", "Pedidos"],
            ["🥃", "Produtos"],
            ["📊", "Estoque"],
            ["⚙️", "Configurações"],
          ].map(([icon, label]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-[#121212] p-5">
              <div className="text-2xl">{icon}</div>
              <p className="mt-3 font-black">{label}</p>
              <p className="mt-1 text-xs text-gray-600">Em construção</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
