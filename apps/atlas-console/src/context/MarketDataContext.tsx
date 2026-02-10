import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import type { ExecutionReport, OrderRow, MarketDataUpdate } from '../types'
import { useMode } from './ModeContext'
import { DemoEngine } from '../demo/engine'

interface MarketDataContextType {
    orders: OrderRow[]
    l2Data: Record<string, MarketDataUpdate>
    trades: MarketDataUpdate[]
    isConnected: boolean
}

const MarketDataContext = createContext<MarketDataContextType | undefined>(undefined)

export function MarketDataProvider({ children }: { children: ReactNode }) {
    const { isDemoMode } = useMode()
    const [orders, setOrders] = useState<Record<string, OrderRow>>({})
    const [l2Data, setL2Data] = useState<Record<string, MarketDataUpdate>>({})
    const [trades, setTrades] = useState<MarketDataUpdate[]>([])
    const [isConnected, setIsConnected] = useState(false)
    const ws = useRef<WebSocket | null>(null)

    // Clear state when switching modes
    useEffect(() => {
        setOrders({})
        setL2Data({})
        setTrades([])
    }, [isDemoMode])

    useEffect(() => {
        if (isDemoMode) {
            console.log('🚀 Demo Mode active (Context)')
            setIsConnected(true)
            const unsubscribe = DemoEngine.getInstance().subscribe((data) => {
                if ('order_id' in data) {
                    handleExecutionReport(data as ExecutionReport)
                } else if ('type' in data && (data.type === 'L2' || data.type === 'TRADE')) {
                    handleMarketData(data as MarketDataUpdate)
                }
            })
            return () => unsubscribe()
        } else {
            // Prevent multiple connections
            if (ws.current?.readyState === WebSocket.OPEN) return

            ws.current = new WebSocket('ws://localhost:8001/ws')

            ws.current.onopen = () => {
                console.log('Connected to Order Gateway WS (Context)')
                setIsConnected(true)
            }

            ws.current.onclose = () => {
                setIsConnected(false)
            }

            ws.current.onerror = (err) => {
                console.error('WS Error', err)
                setIsConnected(false)
            }

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    if ('order_id' in data) {
                        handleExecutionReport(data as ExecutionReport)
                    } else if ('type' in data && (data.type === 'L2' || data.type === 'TRADE')) {
                        handleMarketData(data as MarketDataUpdate)
                    }
                } catch (e) {
                    console.error("Failed to parse WS message", e)
                }
            }

            return () => {
                ws.current?.close()
                ws.current = null
                setIsConnected(false)
            }
        }
    }, [isDemoMode])

    const handleMarketData = (update: MarketDataUpdate) => {
        if (update.type === 'L2') {
            setL2Data(prev => ({
                ...prev,
                [update.symbol]: update
            }))
        } else if (update.type === 'TRADE') {
            setTrades(prev => {
                const newTrades = [update, ...prev]
                return newTrades.slice(0, 200) // Keep last 200 trades for charts
            })
        }
    }

    const handleExecutionReport = (report: ExecutionReport) => {
        setOrders(prev => {
            const current = prev[report.order_id] || {
                order_id: report.order_id,
                client_id: report.client_id || 'unknown',
                symbol: report.symbol || 'unknown',
                side: report.side || 'BUY',
                quantity: report.order_qty || 0,
                price: report.price || 0,
                status: 'NEW',
                filled_qty: 0,
                avg_price: 0,
                updated_at: report.timestamp
            }

            if (current.updated_at && new Date(report.timestamp) < new Date(current.updated_at)) {
                return prev
            }

            const updated = {
                ...prev,
                [report.order_id]: {
                    ...current,
                    status: report.status,
                    quantity: report.order_qty ? report.order_qty : current.quantity,
                    price: report.price ? report.price : current.price,
                    filled_qty: report.cum_qty,
                    avg_price: report.avg_px,
                    updated_at: report.timestamp
                }
            }

            return updated
        })
    }

    const value = {
        orders: Object.values(orders).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
        l2Data,
        trades,
        isConnected
    }

    return (
        <MarketDataContext.Provider value={value}>
            {children}
        </MarketDataContext.Provider>
    )
}

export function useMarketData() {
    const context = useContext(MarketDataContext)
    if (context === undefined) {
        throw new Error('useMarketData must be used within a MarketDataProvider')
    }
    return context
}
