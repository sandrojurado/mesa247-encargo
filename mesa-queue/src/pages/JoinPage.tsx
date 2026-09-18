import { Minus, Plus, Users } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const phoneRegex = /^\+?[0-9\s().-]{7,20}$/

export function JoinPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [submitted, setSubmitted] = useState(false)

  const errors = useMemo(() => {
    return {
      name: name.trim().length === 0 || name.trim().length > 50,
      phone: phone.trim().length > 0 && !phoneRegex.test(phone.trim()),
    }
  }, [name, phone])

  const canSubmit = name.trim().length > 0 && !errors.name && phoneRegex.test(phone.trim())

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)

    if (!canSubmit) {
      return
    }

    navigate('/cola', { state: { name: name.trim(), phone: phone.trim(), partySize } })
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
      <div className="pt-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Lista de espera</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
          Anota tu mesa y sigue tu turno sin acercarte al anfitrión.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
          Registra tus datos y la cantidad de personas. La pantalla de cola queda lista para mostrar
          la posición cuando conectemos la API.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unirse a la cola</CardTitle>
          <CardDescription>Máximo 6 personas por turno.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                maxLength={50}
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={submitted && errors.name}
                placeholder="Nombre de reserva"
              />
              <p className="text-xs text-muted-foreground">{name.length}/50 caracteres</p>
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
                placeholder="+51 999 999 999"
              />
              {submitted && !phoneRegex.test(phone.trim()) ? (
                <p className="text-xs text-destructive">Ingresa un número de teléfono válido.</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Cantidad</Label>
              <div className="flex items-center justify-between rounded-md border bg-background p-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPartySize((value) => Math.max(1, value - 1))}
                  disabled={partySize === 1}
                  aria-label="Reducir cantidad"
                >
                  <Minus size={16} />
                </Button>
                <div className="flex min-w-24 items-center justify-center gap-2 text-lg font-semibold">
                  <Users size={18} />
                  <span>{partySize}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPartySize((value) => Math.min(6, value + 1))}
                  disabled={partySize === 6}
                  aria-label="Aumentar cantidad"
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full">
              Entrar a la cola
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
