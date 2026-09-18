import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cancelQueueEntry, getQueueEntry, type QueueEntry } from '@/lib/api'
import { clearQueueSession, getQueueSession } from '@/lib/session'

const activeQueueStatus = 'WAITING'

export function QueuePage() {
  const navigate = useNavigate()
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null)
  const [loading, setLoading] = useState(true)
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
        if (entry.location_id !== session.locationId || entry.status !== activeQueueStatus) {
          clearQueueSession()
          navigate('/', { replace: true })
          return
        }

        setQueueEntry(entry)
      })
      .catch(() => {
        clearQueueSession()
        navigate('/', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [navigate])

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
            <h1 className="mt-2 text-3xl font-semibold leading-tight">≈ 25 min</h1>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="queue-progress h-full rounded-full bg-primary" />
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            Te avisaremos por WhatsApp cuando tu mesa esté lista
            {`, ${queueEntry.customer_name}`}
            {` · ${queueEntry.party_size} pers.`}
          </p>

          <Button type="button" variant="outline" size="lg" className="w-full" onClick={cancelQueue} disabled={cancelling}>
            {cancelling ? 'Cancelando...' : 'Ya no voy'}
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </section>
  )
}
