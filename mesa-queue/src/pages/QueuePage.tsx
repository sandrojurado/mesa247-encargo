import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  acceptQueueEntry,
  cancelQueueEntry,
  getQueueEntry,
  getQueueEventsUrl,
  type QueueEntry,
} from '@/lib/api'
import { clearQueueSession, getQueueSession } from '@/lib/session'

const activeQueueStatuses = new Set(['WAITING', 'SERVING', 'ACCEPTED'])
const estimatedWaitSeconds = 25 * 60

function formatRemainingTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0 min'
  }

  const minutes = Math.ceil(seconds / 60)
  return `${minutes} min`
}

function getElapsedSeconds(entry: QueueEntry) {
  return typeof entry.elapsed_seconds === 'number' && Number.isFinite(entry.elapsed_seconds)
    ? entry.elapsed_seconds
    : 0
}

export function QueuePage() {
  const navigate = useNavigate()
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null)
  const [localElapsedSeconds, setLocalElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const session = getQueueSession()
    if (!session.queueId || !session.locationId) {
      navigate('/', { replace: true })
      return
    }

    getQueueEntry(session.queueId)
      .then((entry) => {
        if (entry.location_id !== session.locationId || !activeQueueStatuses.has(entry.status)) {
          clearQueueSession()
          navigate('/', { replace: true })
          return
        }

        setQueueEntry(entry)
        setLocalElapsedSeconds(getElapsedSeconds(entry))
      })
      .catch(() => {
        clearQueueSession()
        navigate('/', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [navigate])

  useEffect(() => {
    const session = getQueueSession()
    if (!session.queueId || !session.locationId) {
      return
    }

    let isActive = true
    const events = new EventSource(getQueueEventsUrl(session.locationId))

    async function refreshEntry() {
      try {
        const entry = await getQueueEntry(session.queueId ?? 0)
        if (!isActive) {
          return
        }
        if (entry.location_id !== session.locationId || !activeQueueStatuses.has(entry.status)) {
          clearQueueSession()
          navigate('/', { replace: true })
          return
        }
        setQueueEntry(entry)
        setLocalElapsedSeconds(getElapsedSeconds(entry))
      } catch {
        if (isActive) {
          clearQueueSession()
          navigate('/', { replace: true })
        }
      }
    }

    events.addEventListener('refresh', refreshEntry)
    events.onerror = refreshEntry

    return () => {
      isActive = false
      events.removeEventListener('refresh', refreshEntry)
      events.close()
    }
  }, [navigate])

  useEffect(() => {
    if (!queueEntry) {
      return
    }

    const intervalId = window.setInterval(() => {
      setLocalElapsedSeconds((currentSeconds) => currentSeconds + 1)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [queueEntry])

  async function cancelQueue() {
    const session = getQueueSession()
    if (!session.queueId) {
      clearQueueSession()
      navigate('/', { replace: true })
      return
    }

    setCancelling(true)
    setError('')

    try {
      await cancelQueueEntry(session.queueId)
      clearQueueSession()
      navigate('/', { replace: true })
    } catch {
      setError('No pudimos cancelar tu cola. Inténtalo nuevamente.')
      setCancelling(false)
    }
  }

  async function acceptQueue() {
    if (!queueEntry) {
      return
    }

    setAccepting(true)
    setError('')

    try {
      const nextEntry = await acceptQueueEntry(queueEntry.id)
      setQueueEntry(nextEntry)
      setLocalElapsedSeconds(getElapsedSeconds(nextEntry))
    } catch {
      setError('No pudimos confirmar tu llegada. Inténtalo nuevamente.')
    } finally {
      setAccepting(false)
    }
  }

  const remainingSeconds = Math.max(0, estimatedWaitSeconds - localElapsedSeconds)
  const hasBeenCalled = queueEntry?.status === 'SERVING'
  const hasAccepted = queueEntry?.status === 'ACCEPTED'

  if (loading || !queueEntry) {
    return (
      <section className="mx-auto grid w-full max-w-[420px] gap-3">
        <Card className="overflow-hidden rounded-lg py-0 text-center">
          <div className="h-3 bg-primary" />
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Validando tu cola...</p>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="mx-auto grid w-full max-w-[420px] gap-3">
      <Card className="overflow-hidden rounded-lg py-0 text-center">
        <div className="h-3 bg-primary" />
        <CardContent className="grid gap-5 p-6">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">{queueEntry.location_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Lista de espera · hoy</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Estás en el puesto</p>
            <p className="mt-2 text-8xl font-semibold leading-none text-primary">{queueEntry.position}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Tiempo estimado</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">
              ≈ {formatRemainingTime(remainingSeconds)}
            </h1>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="queue-progress h-full rounded-full bg-primary" />
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            {hasBeenCalled
              ? 'Tu mesa está casi lista. Confirma que vienes en camino'
              : hasAccepted
                ? 'Confirmamos que vienes en camino'
                : 'Te avisaremos por WhatsApp cuando tu mesa esté lista'}
            {`, ${queueEntry.customer_name}`}
            {` · ${queueEntry.party_size} pers.`}
          </p>

          {hasBeenCalled ? (
            <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
              Te estamos llamando. Acércate al local cuando puedas.
            </div>
          ) : null}
          {hasBeenCalled ? (
            <Button type="button" size="lg" className="w-full" onClick={acceptQueue} disabled={accepting}>
              {accepting ? 'Confirmando...' : 'Voy en camino'}
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={cancelQueue} disabled={cancelling}>
            {cancelling ? 'Cancelando...' : 'Ya no voy'}
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </section>
  )
}
