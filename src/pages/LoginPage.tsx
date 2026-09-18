import { type FormEvent, useState } from 'react'
import { login, signup } from '../api/auth'
import { ApiError } from '../api/client'
import { useAuthStore } from '../store/auth'

type Mode = 'login' | 'signup'

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Неверный логин или пароль'
    if (error.status === 409) return 'Пользователь с таким именем уже существует'
    if (error.status === 0) return 'Не удалось подключиться к серверу'
    return error.message
  }
  return 'Что-то пошло не так'
}

function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
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
    if (!username.trim() || !password || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const call = mode === 'login' ? login : signup
      const session = await call(username.trim(), password)
      setSession(session.token, session.username)
    } catch (caught) {
      setError(describeError(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
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
        <label>
          Имя пользователя
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </label>
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