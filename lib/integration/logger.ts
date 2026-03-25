import 'server-only'

type LogLevel = 'info' | 'warn' | 'error'

type LogPayload = Record<string, unknown>

function log(level: LogLevel, event: string, payload?: LogPayload): void {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...(payload ?? {}),
  }

  const serialized = JSON.stringify(entry)

  if (level === 'error') {
    console.error(serialized)
    return
  }

  if (level === 'warn') {
    console.warn(serialized)
    return
  }

  console.info(serialized)
}

export function logInfo(event: string, payload?: LogPayload): void {
  log('info', event, payload)
}

export function logWarn(event: string, payload?: LogPayload): void {
  log('warn', event, payload)
}

export function logError(event: string, payload?: LogPayload): void {
  log('error', event, payload)
}
