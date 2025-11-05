import { Outlet, Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

export default function Layout() {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary-600 dark:bg-primary-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">💪 Workout Tracker</h1>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-around">
            <Link
              to="/"
              className={`flex-1 flex flex-col items-center py-3 transition-colors ${
                isActive('/') 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="text-2xl mb-1">🏠</span>
              <span className="text-xs font-medium">Home</span>
            </Link>
            <Link
              to="/templates"
              className={`flex-1 flex flex-col items-center py-3 transition-colors ${
                isActive('/templates') 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="text-2xl mb-1">📋</span>
              <span className="text-xs font-medium">Templates</span>
            </Link>
            <Link
              to="/history"
              className={`flex-1 flex flex-col items-center py-3 transition-colors ${
                isActive('/history') 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="text-2xl mb-1">📊</span>
              <span className="text-xs font-medium">History</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}
