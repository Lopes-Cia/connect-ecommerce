import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type CardCompM1Props = {
  imageUrl: string
  imageAlt: string
  title: string
  description: string
  href?: string
  ctaLabel?: string
  onCtaClick?: () => void
}

export function CardCompM1({
  imageUrl,
  imageAlt,
  title,
  description,
  href = "#",
  ctaLabel = "Shop now",
  onCtaClick,
}: CardCompM1Props) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="relative w-full overflow-hidden rounded-md">
        <Image
          src={imageUrl}
          alt={imageAlt}
          width={560}
          height={424}
          className="h-[212px] w-full object-cover"
        />
      </div>

      <CardContent className="px-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link
              href={href}
              className="text-sm font-semibold text-foreground hover:underline"
              tabIndex={-1}
            >
              {title}
            </Link>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="shrink-0">
            <Button
              type="button"
              variant="secondary"
              className="font-medium"
              tabIndex={-1}
              onClick={onCtaClick}
            >
              {ctaLabel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

