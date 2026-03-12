import { ClipboardList } from "lucide-react";

// Mock profile data
const profileData = {
  companyName: "Connect Bebidas - Distribuidora Premium",
  cnpj: "12.345.678/0001-90",
  businessType: "Distribuidora de Bebidas",
  email: "vendas@connectbebidas.com.br",
  contactName: "João Silva",
  phone: "(35) 3722-1234",
  address: "Avenida Principal, 456 - Poços de Caldas, MG - 37700-000",
  registrationDate: "15 de Janeiro de 2024",
};

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

export default function ProfilePage() {
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
              label="Nome da Empresa"
              value={profileData.companyName}
            />
            <ProfileField
              label="Tipo de Negócio"
              value={profileData.businessType}
            />
            <ProfileField
              label="CNPJ"
              value={profileData.cnpj}
            />
            <ProfileField
              label="Email"
              value={profileData.email}
            />
            <ProfileField
              label="Contato"
              value={profileData.contactName}
            />
            <ProfileField
              label="Telefone"
              value={profileData.phone}
            />
            <ProfileField
              label="Endereço"
              value={profileData.address}
            />
            <ProfileField
              label="Data de Cadastro"
              value={profileData.registrationDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
