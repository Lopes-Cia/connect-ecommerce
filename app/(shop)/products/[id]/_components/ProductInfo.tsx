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

export default function ProductInfo({
  ingredients,
  legalNotice,
  fullDescription,
  technicalSpecs,
}: ProductInfoProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Informações Importantes */}
      <section className="bg-custom-light-100 border border-custom-light-400 rounded-md p-4">
        <h2 className="text-custom-dark-1000 font-montserrat font-bold text-base mb-4">
          Informações Importantes
        </h2>

        <div className="space-y-4">
          {/* Ingredientes */}
          <div>
            <h3 className="text-custom-dark-1000 font-montserrat font-semibold text-sm mb-1">
              Ingredientes
            </h3>
            <p className="text-custom-dark-1000 font-montserrat text-xs leading-relaxed">
              {ingredients}
            </p>
          </div>

          {/* Aviso Legal */}
          <div>
            <h3 className="text-custom-dark-1000 font-montserrat font-semibold text-sm mb-1">
              Aviso legal
            </h3>
            <p className="text-custom-light-600 font-montserrat text-[10px] leading-relaxed">
              {legalNotice}
            </p>
          </div>
        </div>
      </section>

      {/* Descrição do produto */}
      <section className="border-t border-custom-light-400 pt-4 bg-custom-light-100 border rounded-md p-4">
        <h2 className="text-custom-dark-1000 font-montserrat font-bold text-base mb-3">
          Descrição do produto
        </h2>
        <p className="text-custom-dark-1000 font-montserrat text-xs leading-relaxed">
          {fullDescription}
        </p>
      </section>

      {/* Especificações do produto */}
      <section className="border-t border-custom-light-400 pt-4 bg-custom-light-100 border rounded-md p-4">
        <h2 className="text-custom-dark-1000 font-montserrat font-bold text-base mb-3">
          Especificações do produto
        </h2>

        <h3 className="text-custom-dark-1000 font-montserrat font-semibold text-sm mb-3">
          Detalhes técnicos
        </h3>

        <table className="w-full mb-14">
          <tbody>
            {technicalSpecs.map((spec, index) => (
              <tr
                key={index}
                className={`${
                  index % 2 === 0 ? "bg-custom-light-300" : "bg-white"
                }`}
              >
                <td className="py-2 px-3 text-custom-dark-1000 font-montserrat text-xs font-medium w-1/3">
                  {spec.label}
                </td>
                <td className="py-2 px-3 text-custom-dark-1000 font-montserrat text-xs">
                  {spec.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
