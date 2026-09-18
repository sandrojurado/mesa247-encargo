import { GripVertical, LogOut } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const waitlist = [
  { id: 1, name: 'Carla M.', partySize: 4, wait: '34 min', tag: '', action: 'Llamar' },
  { id: 2, name: 'Jorge P.', partySize: 2, wait: '31 min', tag: 'Frecuente', action: 'Llamar' },
  { id: 3, name: 'Familia Rojas', partySize: 6, wait: '28 min', tag: 'Llamado 21:12', action: 'Sentar', called: true },
  { id: 4, name: 'Andrés V.', partySize: 2, wait: '22 min', tag: '', action: 'Llamar' },
  { id: 5, name: 'Lucía y Ana', partySize: 2, wait: '15 min', tag: '', action: 'Llamar' },
]

export function HostWaitlistPage() {
  const navigate = useNavigate()
  const session = window.localStorage.getItem('mesa-host-session')

  if (!session) {
    return <Navigate to="/login" replace />
  }

  function logout() {
    window.localStorage.removeItem('mesa-host-session')
    navigate('/login')
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={logout}>
          <LogOut size={14} />
          Salir
        </Button>
      </div>

      <Card className="overflow-hidden rounded-lg py-0">
        <CardContent className="p-0">
          <div className="flex flex-col gap-1 border-b bg-card px-4 py-3 text-sm font-semibold sm:flex-row sm:items-center sm:justify-between">
            <span>La Terraza Azul · viernes</span>
            <span className="text-muted-foreground">12 en cola · espera media 31 min</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px] p-3">
              <div className="grid gap-2">
                {waitlist.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={[
                      'grid grid-cols-[2.5rem_2.5rem_1.4fr_0.85fr_0.85fr_1fr_6rem] items-center gap-3 rounded-md border px-3 py-3 text-sm',
                      entry.called ? 'border-primary/35 bg-accent/55' : 'bg-background',
                    ].join(' ')}
                  >
                    <span className="flex text-muted-foreground" aria-label="Arrastrar para reordenar">
                      <GripVertical size={18} />
                      <GripVertical className="-ml-3" size={18} />
                    </span>
                    <b className="text-base">{index + 1}</b>
                    <span className="font-medium">{entry.name}</span>
                    <span>{entry.partySize} pers.</span>
                    <span>{entry.wait}</span>
                    <span>
                      {entry.tag ? (
                        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                          {entry.tag}
                        </span>
                      ) : null}
                    </span>
                    <Button type="button" variant={entry.called ? 'outline' : 'secondary'} size="sm">
                      {entry.action}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </section>
  )
}
