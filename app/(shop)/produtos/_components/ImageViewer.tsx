"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

interface ImageViewerProps {
  images: string[];
  productName: string;
}

function shouldDisableOptimization(src: string): boolean {
  const value = String(src ?? "").trim();
  if (!value) return false;

  try {
    const parsed = new URL(value, "http://localhost");
    const hostWithPort = `${parsed.hostname}:${parsed.port || (parsed.protocol === "https:" ? "443" : "80")}`;
    return hostWithPort === "localhost:4000" || hostWithPort === "127.0.0.1:4000";
  } catch {
    return value.includes("localhost:4000") || value.includes("127.0.0.1:4000");
  }
}

function shouldUseImgElement(src: string): boolean {
  const value = String(src ?? "").trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  return shouldDisableOptimization(value);
}

type SmartImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

function SmartImage({ src, alt, width, height, className, sizes, priority }: SmartImageProps) {
  if (shouldUseImgElement(src)) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={(event) => {
          const target = event.currentTarget;
          if (target.src.includes("/logo.png")) return;
          target.src = "/logo.png";
        }}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      priority={priority}
    />
  );
}

export default function ImageViewer({ images, productName }: ImageViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const currentImage = images[selectedIndex] || "/logo.png";

  useEffect(() => {
    if (!isZoomed) return;

    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsZoomed(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isZoomed]);

  return (
    <>
      <div className="w-full">
        <div className="p-0">
          <button
            type="button"
            onClick={() => setIsZoomed(true)}
            aria-label="Ampliar imagem do produto"
            className="w-full aspect-square rounded-xl bg-white  overflow-hidden flex items-center justify-center cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tints-french-blue focus-visible:ring-offset-2 focus-visible:ring-offset-white bg-white drop-shadow-[0_16px_26px_rgba(0,0,0,0.16)]"
          >
            <SmartImage
              src={currentImage}
              alt={productName}
              width={760}
              height={760}
              className="max-w-[98%] max-h-[98%] object-contain "
              sizes="(max-width: 768px) 94vw, 760px"
              priority
            />
          </button>

          <p className="text-custom-light-600 font-montserrat text-xs mt-3">
            Clique para ver a visualização completa
          </p>
        </div>

        <div className="mt-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => {
              const active = selectedIndex === index;
              return (
                <button
                  key={index}
                  onClick={() => setSelectedIndex(index)}
                  aria-label={`Selecionar imagem ${index + 1}`}
                  className={[
                    "shrink-0 w-14 h-14 rounded-md overflow-hidden bg-white border border-custom-light-400 transition-colors",
                    active ? "border-tints-french-blue shadow-sm" : "hover:border-custom-light-600",
                  ].join(" ")}
                >
                  <SmartImage
                    src={image}
                    alt={`${productName} - Imagem ${index + 1}`}
                    width={56}
                    height={56}
                    className="w-full h-full object-contain"
                    sizes="56px"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isZoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visualização ampliada da imagem do produto"
          className="fixed inset-0 bg-black/80 z-50 flex flex-col"
          onClick={() => setIsZoomed(false)}
        >
          <div className="flex justify-end p-4 shrink-0">
            <button
              ref={closeButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomed(false);
              }}
              className="text-white hover:text-custom-light-400 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
          </div>
          <div className="relative flex-1 min-h-0 w-full">
            <div className="absolute inset-0 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white rounded-xl p-4 border border-custom-light-400 max-w-full max-h-full">
                <SmartImage
                  src={currentImage}
                  alt={productName}
                  width={600}
                  height={600}
                  className="max-w-full max-h-full object-contain"
                  sizes="100vw"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
