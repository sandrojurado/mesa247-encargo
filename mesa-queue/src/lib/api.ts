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
}

type JoinQueuePayload = {
  locationId: number
  name: string
  phone: string
  partySize: number
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
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
