import { type FormEvent, useState } from 'react'
import { login, signup } from '../api/auth'
import { ApiError } from '../api/client'
import { useAuthStore } from '../store/auth'
import ThemeToggle from '../components/ThemeToggle'

type Mode = 'login' | 'signup'

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Не удалось подключиться к серверу'
    if (error.status === 401) return 'Неверный ник или пароль'
    if (error.status === 409) return 'Этот ник уже используется'
    return error.message
  }
  return 'Что-то пошло не так'
}

function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [identifier, setIdentifier] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const setSession = useAuthStore((state) => state.setSession)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const isLogin = mode === 'login'
    if (submitting) return
    if (isLogin && (!identifier.trim() || !password)) return
    if (!isLogin && (!username.trim() || !password)) return
    setSubmitting(true)
    setError(null)
    try {
      const session = isLogin
        ? await login(identifier.trim(), password)
        : await signup(username.trim(), password)
      setSession(session.token, session.username)
    } catch (caught) {
      setError(describeError(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <ThemeToggle />
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Мессенджер</h1>
        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => switchMode('login')}
          >
            Вход
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => switchMode('signup')}
          >
            Регистрация
          </button>
        </div>
        {mode === 'login' ? (
          <label>
            Ник
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
            />
          </label>
        ) : (
          <label>
            Ник
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="nickname"
            />
          </label>
        )}
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting
            ? 'Отправляем...'
            : mode === 'login'
              ? 'Войти'
              : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  )
}

export default LoginPage