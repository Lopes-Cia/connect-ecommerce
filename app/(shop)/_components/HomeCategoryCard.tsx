import Link from "next/link";
import Image from "next/image";

type HomeCategoryCardProps = {
  id: string;
  name: string;
  image: string;
  href?: string;
};

function isLocalhostUrl(value: string): boolean {
  const src = String(value ?? "").trim();
  if (!src) return false;
  if (!/^https?:\/\//i.test(src)) return false;
  try {
    const parsed = new URL(src);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  } catch {
    return false;
  }
}

export default function HomeCategoryCard({ id, name, image, href = "#" }: HomeCategoryCardProps) {
  const src = image || "/logo.png";
  const isLocal = isLocalhostUrl(src);

  return (
    <Link href={href} className="hover:opacity-80 transition-opacity" aria-label={`Categoria ${name}`}>
      <div className="flex flex-col items-center gap-2">
        {isLocal ? (
          <img
            src={src}
            alt={`Categoria ${name}`}
            width={158}
            height={197}
            className="w-full h-auto"
            data-category-id={id}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Image
            src={src}
            alt={`Categoria ${name}`}
            width={158}
            height={197}
            className="w-full h-auto"
            data-category-id={id}
          />
        )}
        <span className="text-xs font-semibold text-center leading-tight">{name}</span>
      </div>
    </Link>
  );
}
