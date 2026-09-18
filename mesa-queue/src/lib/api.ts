const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

export type Location = {
  id: number
  name: string
}

export type QueueEntry = {
  id: number
  location_id: number
  location_name: string
  customer_name: string
  phone: string
  party_size: number
  position: number
  status: string
  elapsed_seconds?: number
}

export type HostQueueEntry = {
  id: number
  location_id: number
  location_name: string
  customer_name: string
  phone: string
  party_size: number
  position: number
  status: 'WAITING' | 'SERVING' | 'CANCELLED' | 'ACCEPTED' | 'COMPLETED'
  sort_order: number
  elapsed_seconds: number
  called_elapsed_seconds?: number | null
  is_frequent: boolean
}

export type AuthUser = {
  id: number
  username: string
  role: 'admin' | 'operator'
  location_id?: number | null
  location_name?: string | null
}

export type AuthSession = {
  token: string
  user: AuthUser
}

type JoinQueuePayload = {
  locationId: number
  name: string
  phone: string
  partySize: number
}

type LoginPayload = {
  username: string
  password: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function getLocations() {
  return request<Location[]>('/locations')
}

export function joinQueue(payload: JoinQueuePayload) {
  return request<QueueEntry>('/queue', {
    method: 'POST',
    body: JSON.stringify({
      location_id: payload.locationId,
      name: payload.name,
      phone: payload.phone,
      party_size: payload.partySize,
    }),
  })
}

export function getQueueEntry(queueId: number) {
  return request<QueueEntry>(`/queue/${queueId}`)
}

export function cancelQueueEntry(queueId: number) {
  return request<QueueEntry>(`/queue/${queueId}/cancel`, {
    method: 'PATCH',
  })
}

export function acceptQueueEntry(queueId: number) {
  return request<QueueEntry>(`/queue/${queueId}/accept`, {
    method: 'PATCH',
  })
}

export function login(payload: LoginPayload) {
  return request<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function validateSession(token: string) {
  return request<AuthUser>('/auth/session', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function getHostQueue(token: string) {
  return request<HostQueueEntry[]>('/host/queue', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function updateHostQueueStatus(
  token: string,
  queueId: number,
  status: 'SERVING' | 'COMPLETED',
) {
  return request<HostQueueEntry>(`/host/queue/${queueId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  })
}

export function reorderHostQueue(token: string, queueIds: number[]) {
  return request<HostQueueEntry[]>('/host/queue/reorder', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ queue_ids: queueIds }),
  })
}

export function getHostQueueEventsUrl(token: string) {
  const url = new URL(`${apiBaseUrl}/host/queue/events`)
  url.searchParams.set('token', token)
  return url.toString()
}

export function getQueueEventsUrl(locationId: number) {
  const url = new URL(`${apiBaseUrl}/queue/events`)
  url.searchParams.set('location_id', String(locationId))
  return url.toString()
}
