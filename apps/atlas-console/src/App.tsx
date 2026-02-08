import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import Header from './components/layout/Header'
import ConsolePage from './pages/ConsolePage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import { UserProvider } from './context/UserContext'
import { MarketDataProvider } from './context/MarketDataContext'

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <UserProvider>
      <MarketDataProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col">
            <Header />
            <main className="flex-1 p-6 overflow-hidden">
              <Routes>
                <Route path="/" element={<Navigate to="/console" replace />} />
                <Route path="/console" element={<ConsolePage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </main>
            <Toaster theme="dark" position="bottom-right" />
          </div>
        </BrowserRouter>
      </MarketDataProvider>
    </UserProvider>
  )
}

export default App
