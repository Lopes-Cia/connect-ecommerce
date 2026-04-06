interface CategoryLineProps {
  title?: string;
  bgColor?: string;
  verticalLineColor?: string;
}

export default function CategoryLine({
  title = "Título da Categoria",
  bgColor = "bg-tints-french-blue/90",
  verticalLineColor = "bg-tints-bright-lemon"
}: CategoryLineProps) {
  return (
    <div className={`flex items-center ${bgColor} min-h-16`}>
      <div className={`w-2 self-stretch ${verticalLineColor} ml-2`}></div>
      <h2 
        className="text-white font-montserrat font-medium px-4 py-4 text-base md:text-lg"
      >
        {title}
      </h2>
    </div>
  );
}
