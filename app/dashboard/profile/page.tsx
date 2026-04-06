import {
  BadgeCheck,
  Building2,
  ClipboardList,
  Mail,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { requireAuth } from "@/lib/auth/protected";

interface ProfileFieldProps {
  label: string;
  value: string;
  icon?: React.ElementType;
}

function ProfileField({ label, value, icon: Icon }: ProfileFieldProps) {
  return (
    <div className="rounded-lg border border-custom-light-300 bg-custom-light-200/20 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <p className="text-sm font-montserrat font-semibold text-custom-dark-1000">
        {value}
      </p>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await requireAuth();
  const userName = session.name?.trim() || "Não informado";
  const userEmail = session.email || "Não informado";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f7f9_0%,#ffffff_34%,#ffffff_100%)] p-3 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-montserrat font-semibold uppercase tracking-[0.18em] text-custom-light-600">
                Governança de Conta
              </p>
              <div className="mt-1 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-custom-dark-1000" />
                <h1 className="text-xl font-league-spartan font-bold text-custom-dark-1000 sm:text-2xl">
                  Perfil do Cliente
                </h1>
              </div>
              <p className="mt-2 max-w-2xl text-xs font-montserrat text-custom-dark-700 sm:text-sm">
                Dados de identificação, compliance de acesso e parâmetros de sessão da operação.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:min-w-[320px] sm:gap-3">
              <div className="rounded-lg border border-custom-light-300 bg-custom-light-200/40 px-3 py-2">
                <p className="text-[10px] font-montserrat uppercase tracking-wider text-custom-light-600">
                  Perfil
                </p>
                <p className="mt-1 text-sm font-league-spartan font-bold text-custom-dark-1000 sm:text-base">
                  Distribuidor
                </p>
              </div>
              <div className="rounded-lg border border-custom-light-300 bg-custom-light-200/40 px-3 py-2">
                <p className="text-[10px] font-montserrat uppercase tracking-wider text-custom-light-600">
                  Sessão
                </p>
                <p className="mt-1 text-sm font-league-spartan font-bold text-green-700 sm:text-base">
                  Ativa
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
          <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-league-spartan font-bold text-custom-dark-1000 sm:text-xl">
              Informações principais
            </h2>
            <p className="mt-1 text-xs font-montserrat text-custom-light-600">
              Dados usados em faturamento, suporte e trilha de auditoria.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ProfileField label="Nome" value={userName} icon={UserCircle2} />
              <ProfileField label="Email" value={userEmail} icon={Mail} />
              <ProfileField label="Perfil" value="Distribuidor" icon={Building2} />
              <ProfileField label="ID do usuário" value={session.userId} icon={BadgeCheck} />
            </div>
          </section>

          <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-league-spartan font-bold text-custom-dark-1000 sm:text-xl">
              Integridade de acesso
            </h2>
            <p className="mt-1 text-xs font-montserrat text-custom-light-600">
              Sinais de confiança da sessão atual.
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-green-300 bg-green-50 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-montserrat font-semibold uppercase tracking-wider text-green-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Status da sessão
                </p>
                <p className="text-sm font-montserrat font-semibold text-green-800">Ativa e validada</p>
              </div>

              <ProfileField label="Origem" value="Autenticação por token" />
              <ProfileField label="Ultima atualizacao" value="31/03/2026 - 09:42" />
              <ProfileField label="Escopo" value="Portal B2B - Compras" />
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-league-spartan font-bold text-custom-dark-1000 sm:text-xl">
                Políticas e permissões
              </h2>
              <p className="mt-1 text-xs font-montserrat text-custom-light-600">
                Resumo do contexto operacional vinculado ao perfil atual.
              </p>
            </div>

            <span className="inline-flex w-fit items-center rounded-md border border-custom-light-300 bg-custom-light-200/30 px-2.5 py-1 text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
              Nível de acesso: comercial
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileField label="Pode criar pedidos" value="Sim" />
            <ProfileField label="Pode editar cadastro" value="Limitado" />
            <ProfileField label="Pode exportar dados" value="Sim" />
            <ProfileField label="Aprovação financeira" value="Necessária" />
          </div>
        </section>
      </div>
    </div>
  );
}
