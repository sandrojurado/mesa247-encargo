import { useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type QueueState = {
  name?: string
  partySize?: number
}

export function QueuePage() {
  const { state } = useLocation()
  const queueState = (state ?? {}) as QueueState

  return (
    <section className="mx-auto grid w-full max-w-[420px] gap-3">
      <Card className="overflow-hidden rounded-lg py-0 text-center">
        <div className="h-3 bg-primary" />
        <CardContent className="grid gap-5 p-6">
          <div>
            <p className="text-sm text-muted-foreground">Estás en el puesto</p>
            <p className="mt-2 text-8xl font-semibold leading-none text-primary">7</p>
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
            {queueState.name ? `, ${queueState.name}` : null}
            {queueState.partySize ? ` · ${queueState.partySize} pers.` : null}
          </p>

          <Button type="button" variant="outline" size="lg" className="w-full">
            Ya no voy
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
