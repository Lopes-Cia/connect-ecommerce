"use client";

import { useState } from "react";
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
  if (shouldDisableOptimization(src)) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
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

  const currentImage = images[selectedIndex] || "/placeholder.svg";

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row w-full">
        <div className="flex flex-row md:flex-col gap-2 order-2 md:order-1 overflow-x-auto pb-1 md:pb-0">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`shrink-0 w-14 h-14 border-2 rounded overflow-hidden transition-colors ${
                selectedIndex === index ? "border-tints-french-blue" : "border-custom-light-400 hover:border-custom-light-500"
              }`}
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
          ))}
        </div>

        <div className="flex flex-col items-center order-1 md:order-2">
          <div
            onClick={() => setIsZoomed(true)}
            className="w-full h-64 md:w-100 md:h-100 bg-white rounded border border-custom-light-400 flex items-center justify-center cursor-zoom-in"
          >
            <SmartImage
              src={currentImage}
              alt={productName}
              width={380}
              height={380}
              className="max-w-full max-h-full object-contain"
              sizes="(max-width: 768px) 100vw, 400px"
              priority
            />
          </div>
          <p className="text-custom-light-600 font-montserrat text-xs mt-2">Clique para ver a visualização completa</p>
        </div>
      </div>

      {isZoomed && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col" onClick={() => setIsZoomed(false)}>
          <div className="flex justify-end p-4 shrink-0">
            <button
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
      )}
    </>
  );
}

