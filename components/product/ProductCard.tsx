export default function ProductCard({ product }: { product?: { name: string; price: number } }) {
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
        <span className="text-gray-500">Product Image</span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{product?.name || 'Product Name'}</h3>
        <p className="text-gray-600">${product?.price || '0.00'}</p>
      </div>
    </div>
  )
}
