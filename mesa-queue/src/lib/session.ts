const sessionKey = 'mesa-queue-session'

export type QueueSession = {
  locationId?: number
  queueId?: number
}

export function getQueueSession(): QueueSession {
  const stored = window.sessionStorage.getItem(sessionKey)
  if (!stored) {
    return {}
  }

  try {
    return JSON.parse(stored) as QueueSession
  } catch {
    clearQueueSession()
    return {}
  }
}

export function updateQueueSession(session: QueueSession) {
  const nextSession = { ...getQueueSession(), ...session }
  window.sessionStorage.setItem(sessionKey, JSON.stringify(nextSession))
  return nextSession
}

export function clearQueueSession() {
  window.sessionStorage.removeItem(sessionKey)
}
