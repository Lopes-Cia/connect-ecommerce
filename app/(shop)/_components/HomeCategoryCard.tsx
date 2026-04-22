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
  const alt = `Categoria ${name}`;

  return (
    <Link href={href} aria-label={alt} className="group block focus:outline-none">
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-tints-french-blue/60">
        <div className="relative bg-black/[0.03]">
          <div className="aspect-[16/9] w-full">
            {isLocal ? (
              <img
                src={src}
                alt={alt}
                width={320}
                height={180}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                data-category-id={id}
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.src = "/logo.png";
                }}
              />
            ) : (
              <Image
                src={src}
                alt={alt}
                width={320}
                height={180}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                data-category-id={id}
              />
            )}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          />
        </div>

        <div className="px-4 py-3">
          <span className="block text-center font-montserrat text-sm font-semibold leading-snug text-custom-dark-1000">
            {name}
          </span>
        </div>
      </div>
    </Link>
  );
}
