import { useThemeStore } from '../store/theme'

function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      title={isLight ? 'Тёмная тема' : 'Светлая тема'}
      aria-label={isLight ? 'Включить тёмную тему' : 'Включить светлую тему'}
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
    >
      {isLight ? '☾' : '☼'}
    </button>
  )
}

export default ThemeToggle