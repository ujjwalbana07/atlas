
import { createContext, useContext, useState, type ReactNode } from 'react'

interface UserContextType {
    clientId: string
    account: string
    strategy: string
    setContext: (ctx: Partial<{ clientId: string, account: string, strategy: string }>) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
    // Load from localStorage or default
    const [context, setContextState] = useState(() => {
        const saved = localStorage.getItem('atlas_user_context')
        return saved ? JSON.parse(saved) : {
            clientId: 'CLIENT_X',
            account: 'ACC_CHILD_1',
            strategy: 'STRAT_ALPHA'
        }
    })

    const setContext = (updates: Partial<typeof context>) => {
        setContextState((prev: any) => {
            const next = { ...prev, ...updates }
            localStorage.setItem('atlas_user_context', JSON.stringify(next))
            return next
        })
    }

    return (
        <UserContext.Provider value={{ ...context, setContext }}>
            {children}
        </UserContext.Provider>
    )
}

export const useUserContext = () => {
    const context = useContext(UserContext)
    if (!context) throw new Error("useUserContext must be used within UserProvider")
    return context
}
