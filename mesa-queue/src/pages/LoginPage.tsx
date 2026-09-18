import { LockKeyhole } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { login } from '@/lib/api'
import { saveHostSession } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const session = await login({ username, password })
      saveHostSession({
        token: session.token,
        username: session.user.username,
        role: session.user.role,
        locationId: session.user.location_id,
        locationName: session.user.location_name,
      })
      navigate('/lista-espera')
    } catch {
      setError('Usuario o contraseña inválidos.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="grid place-items-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LockKeyhole size={22} />
          </div>
          <CardTitle>Acceso anfitrión</CardTitle>
          <CardDescription>Inicio de sesión temporal para administrar turnos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="anfitrion1"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Validando...' : 'Iniciar sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
