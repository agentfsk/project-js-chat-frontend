import { useState } from 'react'

type LoginResponse = {
  token: string
  username: string
}

type CheckResult = {
  kind: 'success' | 'error'
  message: string
}

async function checkConnection(): Promise<CheckResult> {
  let response: Response
  try {
    response = await fetch('/api/v1/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    })
  } catch {
    return { kind: 'error', message: 'Не удалось подключиться к серверу' }
  }

  if (!response.ok) {
    return { kind: 'error', message: `Ошибка авторизации (${response.status})` }
  }

  const data = (await response.json()) as LoginResponse
  return { kind: 'success', message: `Вы вошли как ${data.username}. Токен: ${data.token}` }
}

function App() {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)

  const handleCheck = async () => {
    setChecking(true)
    setResult(null)
    const next = await checkConnection()
    setResult(next)
    setChecking(false)
  }

  return (
    <main>
      <h1>Здравствуй, мир!</h1>
      <p>Интерфейс учебного мессенджера</p>
      <button type="button" onClick={handleCheck} disabled={checking}>
        {checking ? 'Проверяем...' : 'Проверить связь'}
      </button>
      {result && (
        <div className={`result ${result.kind === 'error' ? 'error' : ''}`}>
          {result.message}
        </div>
      )}
    </main>
  )
}

export default App