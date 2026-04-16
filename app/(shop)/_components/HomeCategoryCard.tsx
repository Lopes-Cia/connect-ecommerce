import Link from "next/link";
import Image from "next/image";

type HomeCategoryCardProps = {
  id: string;
  name: string;
  image: string;
  href?: string;
};

export default function HomeCategoryCard({ id, name, image, href = "#" }: HomeCategoryCardProps) {
  return (
    <Link href={href} className="hover:opacity-80 transition-opacity" aria-label={`Categoria ${name}`}>
      <div className="flex flex-col items-center gap-2">
        <Image
          src={image || "/placeholder.svg"}
          alt={`Categoria ${name}`}
          width={158}
          height={197}
          className="w-full h-auto"
          data-category-id={id}
          unoptimized={
            (image ?? "").startsWith("http://localhost:4000") ||
            (image ?? "").startsWith("http://127.0.0.1:4000")
          }
        />
        <span className="text-xs font-semibold text-center leading-tight">{name}</span>
      </div>
    </Link>
  );
}
