"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/formatting"
import { cn } from "@/lib/utils"
import type { ProductCardType, ProductCardViewModel } from "@/lib/products/viewModels"
import { Bookmark } from "lucide-react"

type CardCompM2Layout = "options" | "product"

type CardCompM2SharedProps = {
  href?: string
  categoryHref?: string
  showCategory?: boolean
  showOptionsSection?: boolean
  priceTopLabel?: string
  priceSubLabel?: string
  description?: string
  metaLabel?: string
  imageContainerClassName?: string
  imageClassName?: string
  colorLabel?: string
  sizeLabel?: string
  showOptionsAsText?: boolean
  colorValueText?: string
  sizeValueText?: string
  colorOptions?: string[]
  sizeOptions?: string[]
  defaultColor?: string
  defaultSize?: string
  ctaLabel?: string
  disabled?: boolean
  showFavorite?: boolean
  onToggleFavorite?: () => void
  onAddToCart?: (input: { color?: string; size?: string }) => void
  className?: string
  layout?: CardCompM2Layout
}

type CardCompM2Props =
  | (CardCompM2SharedProps & {
      product: ProductCardViewModel
      type?: ProductCardType
      imageUrl?: string
      imageAlt?: string
      categoryLabel?: string
      title?: string
      priceLabel?: string
    })
  | (CardCompM2SharedProps & {
      product?: undefined
      type?: never
      imageUrl: string
      imageAlt: string
      categoryLabel: string
      title: string
      priceLabel: string
    })

function normalizeProductHref(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : ""
  if (!raw) return null

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
  if (raw.startsWith("/produtos/")) return raw

  if (raw.startsWith("/products/")) {
    const parts = raw.split("/").filter(Boolean)
    const last = parts.at(-1) ?? ""
    if (!last || last === "products") return null
    return `/produtos/${last}`
  }

  if (raw.startsWith("/")) return raw
  if (raw.startsWith("produtos/")) return `/${raw}`

  if (raw.startsWith("products/")) {
    const parts = raw.split("/").filter(Boolean)
    const last = parts.at(-1) ?? ""
    if (!last || last === "products") return null
    return `/produtos/${last}`
  }

  return `/produtos/${raw}`
}

export function CardCompM2({
  product,
  type,
  href,
  imageUrl,
  imageAlt,
  categoryLabel,
  categoryHref = "#",
  showCategory = true,
  title,
  priceTopLabel,
  priceLabel,
  priceSubLabel,
  description,
  metaLabel,
  imageContainerClassName,
  imageClassName,
  colorLabel = "Color",
  sizeLabel = "Size",
  showOptionsSection = true,
  showOptionsAsText = false,
  colorValueText,
  sizeValueText,
  colorOptions = ["Lighter"],
  sizeOptions = ["30"],
  defaultColor,
  defaultSize,
  ctaLabel,
  disabled = false,
  showFavorite = true,
  onToggleFavorite,
  onAddToCart,
  className,
  layout = "options",
}: CardCompM2Props) {
  const resolvedType = type ?? product?.cardType ?? "standard"
  const isComingSoon = resolvedType === "coming-soon"
  const hasDiscount =
    resolvedType === "discount" || resolvedType === "highlighted-discount"

  const resolvedHref = href ?? normalizeProductHref(product?.slug)
  const resolvedImageUrl = imageUrl ?? product?.image_url ?? "/placeholder.svg"
  const resolvedImageAlt = imageAlt ?? product?.name ?? "Produto"
  const resolvedCategoryLabel = categoryLabel ?? product?.category ?? ""
  const resolvedTitle = title ?? product?.name ?? ""
  const resolvedPriceTopLabel =
    priceTopLabel ?? (hasDiscount && product ? formatCurrency(product.price) : undefined)
  const resolvedPriceLabel =
    priceLabel ??
    (product ? formatCurrency(product.discountPrice ?? product.price) : "")
  const resolvedPriceSubLabel =
    priceSubLabel ?? (product ? "por unidade" : undefined)
  const resolvedCtaLabel =
    ctaLabel ?? (product ? (isComingSoon ? "EM BREVE!" : "Comprar") : "Add to cart")
  const resolvedDisabled = disabled || isComingSoon

  const initialColor = useMemo(
    () => defaultColor ?? colorOptions[0] ?? "",
    [defaultColor, colorOptions]
  )
  const initialSize = useMemo(
    () => defaultSize ?? sizeOptions[0] ?? "",
    [defaultSize, sizeOptions]
  )

  const [color, setColor] = useState(initialColor)
  const [size, setSize] = useState(initialSize)
  const [imageSrc, setImageSrc] = useState(resolvedImageUrl || "/placeholder.svg")

  useEffect(() => {
    setImageSrc(resolvedImageUrl || "/placeholder.svg")
  }, [resolvedImageUrl])

  const shouldUseImgTag =
    (imageSrc ?? "").startsWith("http://") || (imageSrc ?? "").startsWith("https://")

  const effectiveColor = showOptionsAsText ? colorValueText ?? "" : color
  const effectiveSize = showOptionsAsText ? sizeValueText ?? "" : size

  return (
    <Card className={cn("flex flex-col gap-3 p-4", className)}>
      <div className="relative">
        {resolvedHref ? (
          <Link href={resolvedHref} className="block">
            <div className={cn("relative w-full overflow-hidden rounded-md", imageContainerClassName)}>
              {shouldUseImgTag ? (
                <img
                  src={imageSrc}
                  alt={resolvedImageAlt}
                  width={560}
                  height={540}
                  className={cn("h-[270px] w-full object-cover", imageClassName)}
                  onError={() => setImageSrc("/placeholder.svg")}
                />
              ) : (
                <Image
                  src={imageSrc}
                  alt={resolvedImageAlt}
                  width={560}
                  height={540}
                  className={cn("h-[270px] w-full object-cover", imageClassName)}
                  unoptimized
                />
              )}
            </div>
          </Link>
        ) : (
          <div className={cn("relative w-full overflow-hidden rounded-md", imageContainerClassName)}>
            {shouldUseImgTag ? (
              <img
                src={imageSrc}
                alt={resolvedImageAlt}
                width={560}
                height={540}
                className={cn("h-[270px] w-full object-cover", imageClassName)}
                onError={() => setImageSrc("/placeholder.svg")}
              />
            ) : (
              <Image
                src={imageSrc}
                alt={resolvedImageAlt}
                width={560}
                height={540}
                className={cn("h-[270px] w-full object-cover", imageClassName)}
                unoptimized
              />
            )}
          </div>
        )}
        {showFavorite && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute bottom-2 right-2 z-10 h-8 w-8 rounded-md bg-background/80 backdrop-blur hover:bg-background"
            onClick={onToggleFavorite}
            aria-label="Favoritar"
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {showCategory ? (
            <Link
              href={categoryHref}
              tabIndex={-1}
              className="text-[11px] text-muted-foreground hover:underline"
            >
              {resolvedCategoryLabel}
            </Link>
          ) : null}
          <h2 className="truncate text-lg font-semibold text-foreground">
            {resolvedHref ? <Link href={resolvedHref}>{resolvedTitle}</Link> : resolvedTitle}
          </h2>
        </div>
      </div>

      {layout === "options" ? (
        <>
          {showOptionsSection ? (
            <div className="grid grid-cols-2 items-end gap-2">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-muted-foreground">{colorLabel}</span>
                {showOptionsAsText ? (
                  <div className="h-9 w-full rounded-md border bg-muted/40 px-3 text-sm flex items-center">
                    {colorValueText ?? "—"}
                  </div>
                ) : (
                  <select
                    className="h-9 w-full rounded-md border bg-muted/40 px-3 text-sm"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  >
                    {colorOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-muted-foreground">{sizeLabel}</span>
                {showOptionsAsText ? (
                  <div className="h-9 w-full rounded-md border bg-muted/40 px-3 text-sm flex items-center">
                    {sizeValueText ?? "—"}
                  </div>
                ) : (
                  <select
                    className="h-9 w-full rounded-md border bg-muted/40 px-3 text-sm"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                  >
                    {sizeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ) : null}

          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          {metaLabel ? <p className="text-xs font-medium text-muted-foreground">{metaLabel}</p> : null}

          <div className="my-1 h-px w-full bg-border" />

          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0 text-left">
              {resolvedPriceTopLabel ? (
                <div className="text-xs font-semibold text-destructive/60 line-through">
                  {resolvedPriceTopLabel}
                </div>
              ) : null}
              <div className="text-xl font-semibold">{resolvedPriceLabel}</div>
              {resolvedPriceSubLabel ? <p className="text-[11px] font-medium text-[#4D585E]">{resolvedPriceSubLabel}</p> : null}
            </div>
            <Button
              type="button"
              disabled={resolvedDisabled}
              onClick={() => onAddToCart?.({ color: effectiveColor, size: effectiveSize })}
              className="shrink-0 bg-tints-french-blue text-white hover:opacity-90"
            >
              {resolvedCtaLabel}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="shrink-0 text-right">
            {resolvedPriceTopLabel ? (
              <div className="text-xs font-semibold text-destructive/60 line-through">
                {resolvedPriceTopLabel}
              </div>
            ) : null}
            <div className="text-xl font-semibold">{resolvedPriceLabel}</div>
            {resolvedPriceSubLabel ? <p className="text-[11px] font-medium text-[#4D585E]">{resolvedPriceSubLabel}</p> : null}
          </div>

          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          {metaLabel ? <p className="text-xs font-medium text-muted-foreground">{metaLabel}</p> : null}

          <div className="my-1 h-px w-full bg-border" />

          <Button
            type="button"
            disabled={resolvedDisabled}
            onClick={() => onAddToCart?.({})}
            className="w-full bg-tints-french-blue py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resolvedCtaLabel}
          </Button>
        </>
      )}
    </Card>
  )
}
