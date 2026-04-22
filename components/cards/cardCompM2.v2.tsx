"use client"

import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type CardCompM2V2Props = {
  href: string
  imageUrl: string
  imageAlt: string
  title: string
  priceLabel: string
  priceSubLabel?: string
  ctaLabel?: string
  onAdd?: () => void
  className?: string
}

export function CardCompM2V2({
  href,
  imageUrl,
  imageAlt,
  title,
  priceLabel,
  priceSubLabel = "por unidade",
  ctaLabel = "Adicionar",
  onAdd,
  className,
}: CardCompM2V2Props) {
  return (
    <Card
      className={cn(
        "relative flex h-[400px] w-[184px] flex-col justify-start rounded-xs bg-white p-3",
        className
      )}
    >
      <Link href={href} className="block">
        <div className="mb-4 flex h-56 shrink-0 items-center justify-center rounded-xs border border-black/10">
          <Image
            src={imageUrl}
            alt={imageAlt}
            width={200}
            height={200}
            className="h-full w-3/5 object-contain"
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <h3 className="h-8 overflow-hidden line-clamp-2 font-montserrat text-[14px] font-black leading-tight text-[#192227]">
          <Link href={href}>{title}</Link>
        </h3>

        <div className="flex h-11 flex-col justify-end">
          <span className="text-[16px] font-bold text-[#192227]">{priceLabel}</span>
        </div>

        <p className="text-[11px] font-medium text-[#4D585E]">{priceSubLabel}</p>

        <Button
          type="button"
          className="mt-1.5 w-full rounded-xs bg-tints-french-blue py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-80"
          onClick={onAdd}
        >
          {ctaLabel}
        </Button>
      </div>
    </Card>
  )
}

