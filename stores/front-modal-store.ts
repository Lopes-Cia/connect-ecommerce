import { create } from "zustand"

export type FrontModalKind =
  | "success"
  | "error"
  | "warning"
  | "confirm"
  | "chooseOne"
  | "chooseMany"

export type FrontModalOverlayTone = "default" | "success" | "error" | "warning"

export type FrontModalOption = {
  id: string
  label: string
  description?: string
  disabled?: boolean
}

export type FrontModalButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"

export type FrontModalAction = {
  id: "ok" | "confirm" | "cancel" | (string & {})
  label: string
  variant?: FrontModalButtonVariant
  href?: string
  closeOnClick?: boolean
  onClick?: () => void | Promise<void>
}

type FrontModalBase = {
  open: boolean
  kind: FrontModalKind | null
  overlayTone: FrontModalOverlayTone
  title: string
  description: string | null
  actions: FrontModalAction[]
  options: FrontModalOption[]
  value: string | null
  values: string[]
  resolver: ((value: unknown) => void) | null
}

export type FrontModalState = FrontModalBase & {
  openWith: (next: Omit<FrontModalBase, "open" | "resolver">) => Promise<unknown>
  setValue: (value: string | null) => void
  toggleValue: (id: string) => void
  close: (result?: unknown) => void
  closeAsCancel: () => void
}

const DEFAULT_STATE: FrontModalBase = {
  open: false,
  kind: null,
  overlayTone: "default",
  title: "",
  description: null,
  actions: [],
  options: [],
  value: null,
  values: [],
  resolver: null,
}

function cancelResultFor(kind: FrontModalKind | null): unknown {
  if (kind === "confirm") return false
  if (kind === "chooseOne") return null
  if (kind === "chooseMany") return []
  return undefined
}

export const useFrontModalStore = create<FrontModalState>((set, get) => ({
  ...DEFAULT_STATE,

  openWith: (next) => {
    const current = get()
    if (current.open && current.resolver) {
      current.resolver(cancelResultFor(current.kind))
    }

    return new Promise((resolve) => {
      set({ ...DEFAULT_STATE, ...next, open: true, resolver: resolve })
    })
  },

  setValue: (value) => set({ value }),

  toggleValue: (id) =>
    set((state) => {
      const exists = state.values.includes(id)
      if (exists) return { values: state.values.filter((v) => v !== id) }
      return { values: [...state.values, id] }
    }),

  close: (result) => {
    const { resolver } = get()
    set({ ...DEFAULT_STATE })
    resolver?.(result)
  },

  closeAsCancel: () => {
    const { kind, close } = get()
    close(cancelResultFor(kind))
  },
}))

export type FrontModalNoticeInput = {
  title: string
  description?: string
  okText?: string
  okVariant?: FrontModalButtonVariant
  href?: string
  onOk?: () => void | Promise<void>
}

export type FrontModalConfirmInput = {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: FrontModalButtonVariant
  hrefOnConfirm?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void | Promise<void>
}

export type FrontModalChooseOneInput = {
  title: string
  description?: string
  options: FrontModalOption[]
  defaultValue?: string
  confirmText?: string
  cancelText?: string
}

export type FrontModalChooseManyInput = {
  title: string
  description?: string
  options: FrontModalOption[]
  defaultValues?: string[]
  confirmText?: string
  cancelText?: string
}

function overlayToneFor(kind: FrontModalKind): FrontModalOverlayTone {
  if (kind === "success") return "success"
  if (kind === "error") return "error"
  if (kind === "warning") return "warning"
  return "default"
}

function openNotice(kind: "success" | "error" | "warning", input: FrontModalNoticeInput): Promise<void> {
  const okText = input.okText ?? "OK"
  const okVariant = input.okVariant ?? "default"

  return useFrontModalStore
    .getState()
    .openWith({
      kind,
      overlayTone: overlayToneFor(kind),
      title: input.title,
      description: input.description ?? null,
      options: [],
      value: null,
      values: [],
      actions: [
        {
          id: "ok",
          label: okText,
          variant: okVariant,
          href: input.href,
          closeOnClick: true,
          onClick: input.onOk,
        },
      ],
    })
    .then(() => undefined)
}

export const frontModal = {
  success: (input: FrontModalNoticeInput) => openNotice("success", input),
  error: (input: FrontModalNoticeInput) =>
    openNotice("error", { ...input, okVariant: input.okVariant ?? "destructive" }),
  warning: (input: FrontModalNoticeInput) => openNotice("warning", input),

  confirm: async (input: FrontModalConfirmInput): Promise<boolean> => {
    const confirmText = input.confirmText ?? "Sim"
    const cancelText = input.cancelText ?? "Não"
    const confirmVariant = input.confirmVariant ?? "default"

    const result = await useFrontModalStore.getState().openWith({
      kind: "confirm",
      overlayTone: overlayToneFor("confirm"),
      title: input.title,
      description: input.description ?? null,
      options: [],
      value: null,
      values: [],
      actions: [
        {
          id: "cancel",
          label: cancelText,
          variant: "secondary",
          closeOnClick: true,
          onClick: input.onCancel,
        },
        {
          id: "confirm",
          label: confirmText,
          variant: confirmVariant,
          href: input.hrefOnConfirm,
          closeOnClick: true,
          onClick: input.onConfirm,
        },
      ],
    })

    return Boolean(result)
  },

  chooseOne: async (input: FrontModalChooseOneInput): Promise<string | null> => {
    const confirmText = input.confirmText ?? "Confirmar"
    const cancelText = input.cancelText ?? "Cancelar"

    const result = await useFrontModalStore.getState().openWith({
      kind: "chooseOne",
      overlayTone: overlayToneFor("chooseOne"),
      title: input.title,
      description: input.description ?? null,
      options: input.options,
      value: input.defaultValue ?? null,
      values: [],
      actions: [
        { id: "cancel", label: cancelText, variant: "secondary", closeOnClick: true },
        { id: "confirm", label: confirmText, variant: "default", closeOnClick: true },
      ],
    })

    return typeof result === "string" ? result : null
  },

  chooseMany: async (input: FrontModalChooseManyInput): Promise<string[]> => {
    const confirmText = input.confirmText ?? "Confirmar"
    const cancelText = input.cancelText ?? "Cancelar"

    const result = await useFrontModalStore.getState().openWith({
      kind: "chooseMany",
      overlayTone: overlayToneFor("chooseMany"),
      title: input.title,
      description: input.description ?? null,
      options: input.options,
      value: null,
      values: Array.isArray(input.defaultValues) ? input.defaultValues : [],
      actions: [
        { id: "cancel", label: cancelText, variant: "secondary", closeOnClick: true },
        { id: "confirm", label: confirmText, variant: "default", closeOnClick: true },
      ],
    })

    return Array.isArray(result) ? (result.filter((v) => typeof v === "string") as string[]) : []
  },

  close: () => useFrontModalStore.getState().closeAsCancel(),
}

