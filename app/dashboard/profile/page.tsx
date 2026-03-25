import { ClipboardList } from "lucide-react";
import { requireAuth } from "@/lib/auth/protected";

interface ProfileFieldProps {
  label: string;
  value: string;
}

function ProfileField({ label, value }: ProfileFieldProps) {
  return (
    <div>
      <p className="text-custom-dark-1000 font-montserrat font-bold text-sm">
        {label}
      </p>
      <p className="text-custom-light-600 font-montserrat text-sm">
        {value}
      </p>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await requireAuth();
  const userName = session.name?.trim() || "Nao informado";
  const userEmail = session.email || "Nao informado";

  return (
    <div className="min-h-screen bg-custom-light-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-2">
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList className="w-6 h-6 text-custom-dark-1000" />
            <h1 className="text-2xl font-montserrat font-bold text-custom-dark-1000">
              Meu Cadastro
            </h1>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-custom-light-400 mb-8" />

        {/* Profile Card */}
        <div className="bg-white rounded-lg border border-custom-light-300 p-6 shadow-sm">
          <div className="space-y-5">
            <ProfileField
              label="Nome"
              value={userName}
            />
            <ProfileField
              label="Perfil"
              value="Distribuidor"
            />
            <ProfileField
              label="Email"
              value={userEmail}
            />
            <ProfileField
              label="ID do Usuario"
              value={session.userId}
            />
            <ProfileField
              label="Status da Sessao"
              value="Ativa"
            />
            <ProfileField
              label="Origem"
              value="Autenticacao por token"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
