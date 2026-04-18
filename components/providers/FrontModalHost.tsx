"use client"

import { type ComponentType, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useFrontModalStore, type FrontModalAction, type FrontModalKind } from "@/stores/front-modal-store"

type Visual = {
  icon: ComponentType<{ className?: string }>
  iconWrapClassName: string
  overlayClassName: string
  titleClassName: string
}

function getVisual(kind: FrontModalKind | null): Visual {
  if (kind === "success") {
    return {
      icon: CheckCircle2,
      iconWrapClassName: "bg-emerald-500/15 text-emerald-700",
      overlayClassName: "bg-emerald-950/35 backdrop-blur-[2px]",
      titleClassName: "text-emerald-950",
    }
  }

  if (kind === "error") {
    return {
      icon: XCircle,
      iconWrapClassName: "bg-red-500/15 text-red-700",
      overlayClassName: "bg-red-950/40 backdrop-blur-[2px]",
      titleClassName: "text-red-950",
    }
  }

  if (kind === "warning") {
    return {
      icon: AlertTriangle,
      iconWrapClassName: "bg-amber-500/15 text-amber-800",
      overlayClassName: "bg-amber-950/35 backdrop-blur-[2px]",
      titleClassName: "text-amber-950",
    }
  }

  if (kind === "confirm") {
    return {
      icon: HelpCircle,
      iconWrapClassName: "bg-blue-500/15 text-blue-700",
      overlayClassName: "bg-black/60 backdrop-blur-[2px]",
      titleClassName: "text-custom-dark-1000",
    }
  }

  return {
    icon: HelpCircle,
    iconWrapClassName: "bg-custom-light-300 text-custom-dark-1000",
    overlayClassName: "bg-black/60 backdrop-blur-[2px]",
    titleClassName: "text-custom-dark-1000",
  }
}

function computeResult(args: {
  kind: FrontModalKind | null
  actionId: FrontModalAction["id"]
  value: string | null
  values: string[]
}): unknown {
  const { kind, actionId, value, values } = args

  if (kind === "confirm") {
    if (actionId === "confirm") return true
    return false
  }

  if (kind === "chooseOne") {
    if (actionId === "confirm") return value
    return null
  }

  if (kind === "chooseMany") {
    if (actionId === "confirm") return values
    return []
  }

  return undefined
}

export default function FrontModalHost() {
  const router = useRouter()

  const open = useFrontModalStore((s) => s.open)
  const kind = useFrontModalStore((s) => s.kind)
  const title = useFrontModalStore((s) => s.title)
  const description = useFrontModalStore((s) => s.description)
  const options = useFrontModalStore((s) => s.options)
  const value = useFrontModalStore((s) => s.value)
  const values = useFrontModalStore((s) => s.values)
  const actions = useFrontModalStore((s) => s.actions)

  const setValue = useFrontModalStore((s) => s.setValue)
  const toggleValue = useFrontModalStore((s) => s.toggleValue)
  const close = useFrontModalStore((s) => s.close)
  const closeAsCancel = useFrontModalStore((s) => s.closeAsCancel)

  const [busyActionId, setBusyActionId] = useState<string | null>(null)
  const visual = useMemo(() => getVisual(kind), [kind])

  async function runAction(action: FrontModalAction) {
    const shouldClose = action.closeOnClick ?? true

    setBusyActionId(action.id)
    try {
      await action.onClick?.()
      const result = computeResult({ kind, actionId: action.id, value, values })
      if (shouldClose) close(result)
      if (action.href) router.push(action.href)
    } catch (error) {
      console.error(error)
    } finally {
      setBusyActionId(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeAsCancel()
      }}
    >
      <DialogContent overlayClassName={visual.overlayClassName} className="sm:max-w-[34rem]">
        <DialogHeader className="text-left">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex size-10 items-center justify-center rounded-full",
                visual.iconWrapClassName
              )}
            >
              <visual.icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className={cn("leading-snug", visual.titleClassName)}>{title}</DialogTitle>
              {description ? (
                <DialogDescription className="mt-1 leading-relaxed">{description}</DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        {kind === "chooseOne" ? (
          <fieldset className="grid gap-2">
            <legend className="sr-only">{title}</legend>
            {options.map((opt) => (
              <label
                key={opt.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5",
                  "hover:bg-accent hover:text-accent-foreground",
                  "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                )}
              >
                <input
                  type="radio"
                  name="front-modal-choice"
                  className="mt-1"
                  value={opt.id}
                  checked={value === opt.id}
                  disabled={opt.disabled}
                  onChange={() => setValue(opt.id)}
                />
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium leading-snug">{opt.label}</span>
                  {opt.description ? (
                    <span className="text-xs text-muted-foreground leading-snug">{opt.description}</span>
                  ) : null}
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}

        {kind === "chooseMany" ? (
          <fieldset className="grid gap-2">
            <legend className="sr-only">{title}</legend>
            {options.map((opt) => {
              const checked = values.includes(opt.id)
              return (
                <label
                  key={opt.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5",
                    "hover:bg-accent hover:text-accent-foreground",
                    "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    value={opt.id}
                    checked={checked}
                    disabled={opt.disabled}
                    onChange={() => toggleValue(opt.id)}
                  />
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium leading-snug">{opt.label}</span>
                    {opt.description ? (
                      <span className="text-xs text-muted-foreground leading-snug">{opt.description}</span>
                    ) : null}
                  </span>
                </label>
              )
            })}
          </fieldset>
        ) : null}

        <DialogFooter>
          {actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={action.variant ?? "default"}
              disabled={busyActionId !== null}
              onClick={() => runAction(action)}
            >
              {busyActionId === action.id ? "Aguarde..." : action.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
