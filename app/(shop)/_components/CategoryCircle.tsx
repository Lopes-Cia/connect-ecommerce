import Image from "next/image";

interface CategoryCircleProps {
  image_url: string;
  category_name: string;
}

export default function CategoryCircle({
  image_url,
  category_name,
}: CategoryCircleProps) {
  return (
    <div className="w-fit max-w-20 md:max-w-28 min-h-29 md:min-h-32 flex flex-col items-center gap-3 cursor-pointer">
      <div className="relative w-18 md:w-20 h-18 md:h-20 rounded-full border-2 border-dashed border-tints-french-blue flex items-center justify-center p-4 hover:bg-tints-french-blue/10 transition-colors">
        <Image
          src={image_url}
          alt={category_name}
          width={50}
          height={64}
          className="max-h-16"
        />
      </div>
      <p className="text-[0.6em] md:text-[0.75em] font-semibold text-tints-carbon-black text-center uppercase">
        {category_name}
      </p>
    </div>
  );
}
