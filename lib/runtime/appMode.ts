export function isBackendMode(): boolean {
  const value = process.env.NEXT_PUBLIC_FONTE ?? ""
  return value.trim().toLowerCase() === "lopes"
}
