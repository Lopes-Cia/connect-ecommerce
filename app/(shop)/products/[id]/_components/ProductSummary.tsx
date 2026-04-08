interface ProductSpec {
  label: string;
  value: string;
}

interface ProductSummaryProps {
  name: string;
  shop?: string;
  price: number;
  oldPrice?: number;
  pricePerUnit?: string;
  specs: ProductSpec[];
  description: string;
}



export default function ProductSummary({
  name,
  shop,
  price,
  oldPrice,
  pricePerUnit,
  specs,
  description,
}: ProductSummaryProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Product Name */}
      <h1 className="text-custom-dark-1000 font-montserrat font-bold text-lg md:text-xl">
        {name}
      </h1>

      {/* Price */}
      <div className="flex items-baseline gap-2">
        <span className="text-custom-dark-1000 font-montserrat text-xs">R$</span>
        <span className="text-custom-dark-1000 font-montserrat font-bold text-2xl">
          {price.toFixed(2).replace(".", ",")}
        </span>
        {pricePerUnit && (
          <span className="text-custom-light-600 font-montserrat text-xs">
            ({pricePerUnit})
          </span>
        )}
      </div>

      {/* Payment Info */}
      <p className="text-custom-dark-1000 font-montserrat text-xs">
        À vista no PIX
        <br />
        ou em até 10x no cartão
      </p>

      {/* Specs Table */}
      <div className="border-t border-custom-light-400 pt-4">
        <table className="w-full">
          <tbody>
            {specs.map((spec, index) => (
              <tr key={index} className="border-b border-custom-light-300">
                <td className="py-2 pr-4 text-custom-light-600 font-montserrat text-xs font-medium w-1/3">
                  {spec.label}
                </td>
                <td className="py-2 text-custom-dark-1000 font-montserrat text-xs">
                  {spec.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* About Product */}
      <div className="mt-2">
        <h3 className="text-custom-dark-1000 font-montserrat font-semibold text-sm mb-2">
          Sobre este produto
        </h3>
        <p className="text-custom-dark-1000 font-montserrat text-xs leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
