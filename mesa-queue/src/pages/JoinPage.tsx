import { Minus, Plus } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getLocations, joinQueue, type Location } from '@/lib/api'
import { getQueueSession, updateQueueSession } from '@/lib/session'

const phoneRegex = /^\+?[0-9\s().-]{7,20}$/

export function JoinPage() {
  const navigate = useNavigate()
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>(() => getQueueSession().locationId)
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [partySize, setPartySize] = useState(4)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    const session = getQueueSession()
    if (session.queueId) {
      navigate('/cola', { replace: true })
      return
    }

    getLocations()
      .then(setLocations)
      .catch(() => setApiError('No pudimos cargar los locales. Inténtalo nuevamente.'))
      .finally(() => setLoadingLocations(false))
  }, [navigate])

  const errors = useMemo(() => {
    return {
      name: name.trim().length === 0 || name.trim().length > 50,
      phone: phone.trim().length > 0 && !phoneRegex.test(phone.trim()),
    }
  }, [name, phone])

  const canSubmit = name.trim().length > 0 && !errors.name && phoneRegex.test(phone.trim())
  const selectedLocation = locations.find((location) => location.id === selectedLocationId)

  function selectLocation(locationId: number) {
    setSelectedLocationId(locationId)
    updateQueueSession({ locationId })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setApiError('')

    if (!canSubmit || !selectedLocationId) {
      return
    }

    setSubmitting(true)

    try {
      const queueEntry = await joinQueue({
        locationId: selectedLocationId,
        name: name.trim(),
        phone: phone.trim(),
        partySize,
      })
      updateQueueSession({ locationId: queueEntry.location_id, queueId: queueEntry.id })
      navigate('/cola')
    } catch {
      setApiError('No pudimos agregarte a la cola. Revisa tus datos e inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!selectedLocationId) {
    return (
      <section className="mx-auto grid w-full max-w-[420px] gap-3">
        <Card className="overflow-hidden rounded-lg py-0">
          <div className="h-3 bg-primary" />
          <CardContent className="grid gap-4 p-6">
            <div>
              <h1 className="text-2xl font-semibold leading-tight">Elige un local</h1>
              <p className="mt-1 text-sm text-muted-foreground">Selecciona dónde quieres unirte a la cola.</p>
            </div>

            <div className="grid gap-2">
              {loadingLocations ? (
                <p className="text-sm text-muted-foreground">Cargando locales...</p>
              ) : (
                locations.map((location) => (
                  <Button
                    key={location.id}
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full justify-start"
                    onClick={() => selectLocation(location.id)}
                  >
                    {location.name}
                  </Button>
                ))
              )}
            </div>

            {apiError ? <p className="text-sm text-destructive">{apiError}</p> : null}
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="mx-auto grid w-full max-w-[420px] gap-3">
      <Card className="overflow-hidden rounded-lg py-0">
        <div className="h-3 bg-primary" />
        <CardContent className="grid gap-4 p-6">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">{selectedLocation?.name ?? 'Local seleccionado'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Lista de espera · hoy</p>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                maxLength={50}
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={submitted && errors.name}
                placeholder="Su nombre"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                inputMode="tel"
                pattern="^\+?[0-9\s().-]{7,20}$"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                aria-invalid={submitted && !phoneRegex.test(phone.trim())}
                placeholder="+51 987 654 321"
              />
              {submitted && !phoneRegex.test(phone.trim()) ? (
                <p className="text-xs text-destructive">Ingresa un número de teléfono válido.</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>¿Cuántos son?</Label>
              <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center rounded-md border bg-background p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPartySize((value) => Math.max(1, value - 1))}
                  disabled={partySize === 1}
                  aria-label="Reducir cantidad"
                >
                  <Minus size={16} />
                </Button>
                <span className="text-center text-lg font-semibold">{partySize}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPartySize((value) => Math.min(12, value + 1))}
                  aria-label="Aumentar cantidad"
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full">
              {submitting ? 'Uniendo...' : 'Unirme a la cola'}
            </Button>
          </form>

          {apiError ? <p className="text-sm text-destructive">{apiError}</p> : null}

        </CardContent>
      </Card>
    </section>
  )
}
