import { TimerReset } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type QueueState = {
  name?: string
  partySize?: number
}

export function QueuePage() {
  const { state } = useLocation()
  const queueState = (state ?? {}) as QueueState

  return (
    <section className="grid place-items-center py-10">
      <Card className="w-full max-w-xl text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <TimerReset size={24} />
          </div>
          <CardTitle>Tu posición en la cola</CardTitle>
          <CardDescription>
            {queueState.name ? `${queueState.name}, mesa para ${queueState.partySize}` : 'Esperando datos de turno'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed bg-background px-6 py-14">
            <p className="text-sm text-muted-foreground">Posición</p>
            <p className="mt-3 text-6xl font-semibold text-muted-foreground/40">--</p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
