const sessionKey = 'mesa-queue-session'
const hostSessionKey = 'mesa-host-session'

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

export type HostSession = {
  token: string
  username: string
  role: 'admin' | 'operator'
  locationId?: number | null
  locationName?: string | null
}

export function getHostSession(): HostSession | null {
  const stored = window.localStorage.getItem(hostSessionKey)
  if (!stored) {
    return null
  }

  try {
    return JSON.parse(stored) as HostSession
  } catch {
    clearHostSession()
    return null
  }
}

export function saveHostSession(session: HostSession) {
  window.localStorage.setItem(hostSessionKey, JSON.stringify(session))
}

export function clearHostSession() {
  window.localStorage.removeItem(hostSessionKey)
}
