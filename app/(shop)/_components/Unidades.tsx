import { ExternalLink } from "lucide-react";

const units = [
  {
    name: "Matriz São José Dos Pinhais:",
    address: "R. Francisco Munõz Madrid, 1003",
    neighborhood: "Roseira de São Sebastião",
    city: "São José dos Pinhais – PR",
    cep: "CEP: 83070-152",
    phone: "(41) 9 8445-1128",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=R.+Francisco+Munõz+Madrid,+1003,+São+José+dos+Pinhais,+PR",
    embedUrl:
      "https://maps.google.com/maps?q=R.+Francisco+Munoz+Madrid,+1003,+Sao+Jose+dos+Pinhais,+PR&output=embed",
  },
  {
    name: "Filial São Paulo:",
    address: "Av. Cdssa Elisabeth de Robiano, 320",
    neighborhood: "Bairro Catumbi",
    city: "São Paulo – SP",
    cep: "CEP: 03021-055",
    phone: "(41) 9 8445-1128",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Av.+Condessa+Elisabeth+de+Robiano,+320,+São+Paulo,+SP",
    embedUrl:
      "https://maps.google.com/maps?q=Av.+Condessa+Elisabeth+de+Robiano,+320,+Sao+Paulo,+SP&output=embed",
  },
  {
    name: "Filial Rio Grande Do Sul:",
    address: "Av. Frederico A. Ritter, 3200 – Sala 4",
    neighborhood: "Bairro: Distrito Industrial",
    city: "Cachoeirinha – RS",
    cep: "CEP: 94930-598",
    phone: "(41) 9 8445-1128",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Av.+Frederico+A.+Ritter,+3200,+Cachoeirinha,+RS",
    embedUrl:
      "https://maps.google.com/maps?q=Av.+Frederico+A.+Ritter,+3200,+Cachoeirinha,+RS&output=embed",
  },
];

export default function Unidades() {
  return (
    <section className="bg-white py-10 px-4">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold text-[#192227] mb-1">
          Nossas Unidades
        </h2>
        <p className="text-center text-sm text-[#4D585E] mb-8">
          Confira aqui onde você poderá agendar a coleta do seu pedido
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {units.map((unit) => (
            <div
              key={unit.name}
              className="rounded-xl bg-white overflow-hidden shadow-sm"
            >
              {/* Map */}
              <div className="relative h-48 w-full">
                <iframe
                  src={unit.embedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={unit.name}
                />
                <a
                  href={unit.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-3 left-3 flex items-center gap-1.5 rounded-sm bg-white px-3 py-1.5 text-[13px] font-semibold text-[#1A73E8] shadow-md hover:bg-gray-50 transition-colors"
                >
                  Abrir no Maps
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col gap-0.5">
                <p className="text-[14px] font-bold text-[#192227] mb-1">
                  {unit.name}
                </p>
                <p className="text-[13px] text-[#192227]">{unit.address}</p>
                <p className="text-[13px] text-[#192227]">{unit.neighborhood}</p>
                <p className="text-[13px] text-[#192227]">{unit.city}</p>
                <p className="text-[13px] text-[#192227] mb-2">{unit.cep}</p>

                <a
                  href={`https://wa.me/55${unit.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-[#25D366] hover:opacity-80 transition-opacity"
                >
                  {/* WhatsApp icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4 shrink-0"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  {unit.phone}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
