import { Minus, Plus } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const phoneRegex = /^\+?[0-9\s().-]{7,20}$/

export function JoinPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [partySize, setPartySize] = useState(4)
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
    <section className="mx-auto grid w-full max-w-[420px] gap-3">
      <Card className="overflow-hidden rounded-lg py-0">
        <div className="h-3 bg-primary" />
        <CardContent className="grid gap-4 p-6">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">La Terraza Azul</h1>
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
                placeholder="Carla"
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
              Unirme a la cola
            </Button>
          </form>

        </CardContent>
      </Card>
    </section>
  )
}
