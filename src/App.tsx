import { useAuthStore } from './store/auth'
import LoginPage from './pages/LoginPage'
import ChatPage from './pages/ChatPage'

function App() {
  const token = useAuthStore((state) => state.token)
  return token ? <ChatPage /> : <LoginPage />
}

export default App