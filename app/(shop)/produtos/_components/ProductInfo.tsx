interface TechnicalSpec {
  label: string;
  value: string;
}

interface ProductInfoProps {
  ingredients: string;
  legalNotice: string;
  fullDescription: string;
  technicalSpecs: TechnicalSpec[];
}

export default function ProductInfo({ ingredients, legalNotice, fullDescription, technicalSpecs }: ProductInfoProps) {
  const safeIngredients = String(ingredients ?? "").trim() || "Informação indisponível para este produto.";
  const safeLegalNotice =
    String(legalNotice ?? "").trim() ||
    "As informações apresentadas são de responsabilidade do integrador. Consulte sempre a embalagem antes do consumo.";
  const safeFullDescription = String(fullDescription ?? "").trim() || "Descrição não disponível no momento.";
  const safeTechnicalSpecs = Array.isArray(technicalSpecs) ? technicalSpecs : [];

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-custom-light-100 border border-custom-light-400 rounded-md p-4">
        <h2 className="text-custom-dark-1000 font-montserrat font-bold text-base mb-4">Informações Importantes</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-custom-dark-1000 font-montserrat font-semibold text-sm mb-1">Ingredientes</h3>
            <p className="text-custom-dark-1000 font-montserrat text-xs leading-relaxed">{safeIngredients}</p>
          </div>

          <div>
            <h3 className="text-custom-dark-1000 font-montserrat font-semibold text-sm mb-1">Aviso legal</h3>
            <p className="text-custom-light-600 font-montserrat text-[10px] leading-relaxed">{safeLegalNotice}</p>
          </div>
        </div>
      </section>

      <section className="border-t border-custom-light-400 pt-4 bg-custom-light-100 border rounded-md p-4">
        <h2 className="text-custom-dark-1000 font-montserrat font-bold text-base mb-3">Descrição do produto</h2>
        <p className="text-custom-dark-1000 font-montserrat text-xs leading-relaxed">{safeFullDescription}</p>
      </section>

      <section className="border-t border-custom-light-400 pt-4 bg-custom-light-100 border rounded-md p-4">
        <h2 className="text-custom-dark-1000 font-montserrat font-bold text-base mb-3">Especificações do produto</h2>

        <h3 className="text-custom-dark-1000 font-montserrat font-semibold text-sm mb-3">Detalhes técnicos</h3>

        {safeTechnicalSpecs.length > 0 ? (
          <table className="w-full mb-14">
            <tbody>
              {safeTechnicalSpecs.map((spec, index) => (
                <tr key={index} className={`${index % 2 === 0 ? "bg-custom-light-300" : "bg-white"}`}>
                  <td className="py-2 px-3 text-custom-dark-1000 font-montserrat text-xs font-medium w-1/3">
                    {spec.label}
                  </td>
                  <td className="py-2 px-3 text-custom-dark-1000 font-montserrat text-xs">{spec.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-custom-dark-700 font-montserrat text-xs">Nenhuma informação técnica disponível.</div>
        )}
      </section>
    </div>
  );
}
