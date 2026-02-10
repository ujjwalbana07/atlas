import { useState, useEffect } from 'react'
import { useMode } from '../context/ModeContext'
import { DemoEngine } from '../demo/engine'

export interface Balance {
    available: number
    reserved: number
}

export interface Account {
    usd: Balance
    btc: Balance
}

export function useBalances(accountId: string = "ACC_CHILD_1") {
    const { isDemoMode } = useMode()
    const [account, setAccount] = useState<Account | null>(null)

    useEffect(() => {
        const fetchBalances = async () => {
            if (isDemoMode) {
                setAccount(DemoEngine.getInstance().getBalances())
                return
            }
            try {
                const res = await fetch(`http://localhost:8001/balances?account_id=${accountId}`)
                if (res.ok) {
                    const data = await res.json()
                    setAccount(data)
                }
            } catch (err) {
                console.error("Failed to fetch balances", err)
            }
        }

        fetchBalances()
        const interval = setInterval(fetchBalances, 2000)
        return () => clearInterval(interval)
    }, [accountId, isDemoMode])

    return account
}
