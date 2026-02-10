import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import ConsolePage from './pages/ConsolePage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import { UserProvider } from './context/UserContext'
import { MarketDataProvider } from './context/MarketDataContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { ModeProvider } from './context/ModeContext'

function AppContent() {
  const { theme } = useTheme()

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col transition-colors duration-300">
      <Header />
      <main className="flex-1 p-6 overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/console" replace />} />
          <Route path="/console" element={<ConsolePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <Footer />
      <Toaster theme={theme} position="bottom-right" />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <ModeProvider>
        <UserProvider>
          <MarketDataProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </MarketDataProvider>
        </UserProvider>
      </ModeProvider>
    </ThemeProvider>
  )
}

export default App
