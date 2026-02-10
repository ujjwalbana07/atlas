import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface ModeContextType {
    isDemoMode: boolean
    setIsDemoMode: (mode: boolean) => void
}

const ModeContext = createContext<ModeContextType | undefined>(undefined)

export function ModeProvider({ children }: { children: ReactNode }) {
    const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
        const saved = localStorage.getItem('atlas_demo_mode')
        return saved !== null ? JSON.parse(saved) : true
    })

    useEffect(() => {
        localStorage.setItem('atlas_demo_mode', JSON.stringify(isDemoMode))
    }, [isDemoMode])

    return (
        <ModeContext.Provider value={{ isDemoMode, setIsDemoMode }}>
            {children}
        </ModeContext.Provider>
    )
}

export function useMode() {
    const context = useContext(ModeContext)
    if (context === undefined) {
        throw new Error('useMode must be used within a ModeProvider')
    }
    return context
}
