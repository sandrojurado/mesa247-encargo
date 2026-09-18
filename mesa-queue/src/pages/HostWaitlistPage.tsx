import { GripVertical, LogOut } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type DragEvent, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import {
  getHostQueue,
  getHostQueueEventsUrl,
  reorderHostQueue,
  updateHostQueueStatus,
  validateSession,
  type HostQueueEntry,
} from '@/lib/api'
import { clearHostSession, getHostSession } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function formatElapsedTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 1) {
    return 'menos de 1 min'
  }
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours} h ${remainingMinutes} min` : `${hours} h`
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items]
  const [movedItem] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, movedItem)
  return nextItems
}

export function HostWaitlistPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = getHostSession()
  const [draggedQueueId, setDraggedQueueId] = useState<number | null>(null)

  const sessionQuery = useQuery({
    queryKey: ['host-session', session?.token],
    queryFn: () => validateSession(session?.token ?? ''),
    enabled: Boolean(session?.token),
    retry: false,
  })

  const queueQuery = useQuery({
    queryKey: ['host-queue', session?.token],
    queryFn: () => getHostQueue(session?.token ?? ''),
    enabled: Boolean(session?.token) && sessionQuery.isSuccess,
    retry: false,
  })

  const statusMutation = useMutation({
    mutationFn: ({ queueId, status }: { queueId: number; status: 'SERVING' | 'COMPLETED' }) =>
      updateHostQueueStatus(session?.token ?? '', queueId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-queue', session?.token] })
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (queueIds: number[]) => reorderHostQueue(session?.token ?? '', queueIds),
    onSuccess: (entries) => {
      queryClient.setQueryData(['host-queue', session?.token], entries)
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['host-queue', session?.token] })
    },
  })

  useEffect(() => {
    if (sessionQuery.isError || queueQuery.isError) {
      clearHostSession()
    }
  }, [queueQuery.isError, sessionQuery.isError])

  useEffect(() => {
    if (!session?.token || !sessionQuery.isSuccess) {
      return
    }

    const token = session.token
    const events = new EventSource(getHostQueueEventsUrl(token))
    function refreshQueue() {
      queryClient.invalidateQueries({ queryKey: ['host-queue', token] })
    }

    events.addEventListener('refresh', refreshQueue)
    events.onerror = refreshQueue

    return () => {
      events.removeEventListener('refresh', refreshQueue)
      events.close()
    }
  }, [queryClient, session?.token, sessionQuery.isSuccess])

  const user = sessionQuery.data
  const entries = queueQuery.data ?? []
  const restaurantName = user?.location_name ?? session?.locationName ?? 'Todas las sedes'
  const waitingCount = entries.filter((entry) => entry.status === 'WAITING').length
  const averageElapsedSeconds =
    entries.length === 0
      ? 0
      : Math.round(
          entries.reduce((total, entry) => total + entry.elapsed_seconds, 0) / entries.length,
        )

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (sessionQuery.isError || queueQuery.isError) {
    return <Navigate to="/login" replace />
  }

  function logout() {
    clearHostSession()
    navigate('/login')
  }

  function handleStatusClick(entry: HostQueueEntry) {
    if (entry.status === 'WAITING') {
      statusMutation.mutate({ queueId: entry.id, status: 'SERVING' })
      return
    }
    if (entry.status === 'SERVING' || entry.status === 'ACCEPTED') {
      statusMutation.mutate({ queueId: entry.id, status: 'COMPLETED' })
    }
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, entry: HostQueueEntry) {
    if (entry.status !== 'WAITING') {
      return
    }
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(entry.id))
    setDraggedQueueId(entry.id)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, entry: HostQueueEntry) {
    if (draggedQueueId === null || entry.status !== 'WAITING') {
      return
    }
    event.preventDefault()
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetEntry: HostQueueEntry) {
    event.preventDefault()
    if (draggedQueueId === null || targetEntry.status !== 'WAITING') {
      setDraggedQueueId(null)
      return
    }

    const waitingEntries = entries.filter((entry) => entry.status === 'WAITING')
    const fromIndex = waitingEntries.findIndex((entry) => entry.id === draggedQueueId)
    const toIndex = waitingEntries.findIndex((entry) => entry.id === targetEntry.id)
    setDraggedQueueId(null)

    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
      return
    }

    const reorderedWaitingEntries = moveItem(waitingEntries, fromIndex, toIndex)
    const reorderedWaitingById = new Map(
      reorderedWaitingEntries.map((entry, index) => [
        entry.id,
        { ...entry, position: index + 1, sort_order: index + 1 },
      ]),
    )
    const optimisticWaitingEntries = reorderedWaitingEntries.map(
      (entry) => reorderedWaitingById.get(entry.id) ?? entry,
    )
    const optimisticEntries = entries.map((entry) =>
      entry.status === 'WAITING' ? optimisticWaitingEntries.shift() ?? entry : entry,
    )
    const nextQueueIds = reorderedWaitingEntries.map((entry) => entry.id)
    queryClient.setQueryData(['host-queue', session?.token], optimisticEntries)
    reorderMutation.mutate(nextQueueIds)
  }

  if (sessionQuery.isPending || queueQuery.isPending) {
    return (
      <section className="grid min-h-[18rem] place-items-center">
        <p className="text-sm font-medium text-muted-foreground">Cargando lista...</p>
      </section>
    )
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Sesión: <span className="font-medium text-foreground">{user?.username}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={logout}>
          <LogOut size={14} />
          Salir
        </Button>
      </div>

      <Card className="overflow-hidden rounded-lg py-0">
        <CardContent className="p-0">
          <div className="flex flex-col gap-1 border-b bg-card px-4 py-3 text-sm font-semibold sm:flex-row sm:items-center sm:justify-between">
            <span>{restaurantName} · hoy</span>
            <span className="text-muted-foreground">
              {waitingCount} en cola · espera media {formatElapsedTime(averageElapsedSeconds)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[860px] p-3">
              <div className="grid grid-cols-[2.5rem_3rem_1.7fr_0.8fr_0.9fr_0.95fr_6.5rem] gap-3 px-3 pb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                <span />
                <span>Orden</span>
                <span>Solicitante</span>
                <span>Pasajeros</span>
                <span>Tiempo</span>
                <span>Tags</span>
                <span>Acción</span>
              </div>

              <div className="grid gap-2">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    draggable={entry.status === 'WAITING'}
                    onDragStart={(event) => handleDragStart(event, entry)}
                    onDragOver={(event) => handleDragOver(event, entry)}
                    onDrop={(event) => handleDrop(event, entry)}
                    onDragEnd={() => setDraggedQueueId(null)}
                    className={[
                      'grid grid-cols-[2.5rem_3rem_1.7fr_0.8fr_0.9fr_0.95fr_6.5rem] items-center gap-3 rounded-md border px-3 py-3 text-sm',
                      entry.status === 'SERVING' || entry.status === 'ACCEPTED'
                        ? 'border-primary/35 bg-accent/55'
                        : 'bg-background',
                      draggedQueueId === entry.id ? 'opacity-60' : '',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex text-muted-foreground',
                        entry.status === 'WAITING' ? 'cursor-grab' : 'opacity-40',
                      ].join(' ')}
                      aria-label="Arrastrar para reordenar"
                    >
                      <GripVertical size={18} />
                      <GripVertical className="-ml-3" size={18} />
                    </span>
                    <b className="text-base">{entry.status === 'WAITING' ? entry.position : '-'}</b>
                    <span className="font-medium">{entry.customer_name}</span>
                    <span>{entry.party_size} pax</span>
                    <span>{formatElapsedTime(entry.elapsed_seconds)}</span>
                    <span className="flex flex-wrap gap-1">
                      {entry.status === 'SERVING' || entry.status === 'ACCEPTED' ? (
                        <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          Llamado · {formatElapsedTime(entry.called_elapsed_seconds ?? 0)}
                        </span>
                      ) : null}
                      {entry.is_frequent ? (
                        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                          Frecuente
                        </span>
                      ) : null}
                    </span>
                    <Button
                      type="button"
                      variant={entry.status === 'SERVING' || entry.status === 'ACCEPTED' ? 'outline' : 'secondary'}
                      size="sm"
                      disabled={statusMutation.isPending}
                      onClick={() => handleStatusClick(entry)}
                    >
                      {entry.status === 'WAITING' ? 'Llamar' : 'Sentar'}
                    </Button>
                  </div>
                ))}
              </div>

              {entries.length === 0 ? (
                <div className="grid min-h-[10rem] place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
                  No hay turnos pendientes.
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
