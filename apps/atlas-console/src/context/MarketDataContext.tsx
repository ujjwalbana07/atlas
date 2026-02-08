import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import type { ExecutionReport, OrderRow, MarketDataUpdate } from '../types'

interface MarketDataContextType {
    orders: OrderRow[]
    l2Data: Record<string, MarketDataUpdate>
    trades: MarketDataUpdate[]
    isConnected: boolean
}

const MarketDataContext = createContext<MarketDataContextType | undefined>(undefined)

export function MarketDataProvider({ children }: { children: ReactNode }) {
    const [orders, setOrders] = useState<Record<string, OrderRow>>({})
    const [l2Data, setL2Data] = useState<Record<string, MarketDataUpdate>>({})
    const [trades, setTrades] = useState<MarketDataUpdate[]>([])
    const [isConnected, setIsConnected] = useState(false)
    const ws = useRef<WebSocket | null>(null)

    useEffect(() => {
        // Prevent multiple connections
        if (ws.current?.readyState === WebSocket.OPEN) return

        ws.current = new WebSocket('ws://localhost:8001/ws')

        ws.current.onopen = () => {
            console.log('Connected to Order Gateway WS (Context)')
            setIsConnected(true)
        }

        ws.current.onclose = () => {
            setIsConnected(false)
            // Retry connection after 5s? For now just simple close.
        }

        ws.current.onerror = (err) => {
            console.error('WS Error', err)
            setIsConnected(false)
        }

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                // Execution reports have an order_id, Market Data doesn't
                if ('order_id' in data) {
                    handleExecutionReport(data as ExecutionReport)
                } else if ('type' in data && (data.type === 'L2' || data.type === 'TRADE')) {
                    handleMarketData(data as MarketDataUpdate)
                } else {
                    console.warn("Unknown message type received via WS:", data)
                }
            } catch (e) {
                console.error("Failed to parse WS message", e)
            }
        }

        return () => {
            ws.current?.close()
        }
    }, [])

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
        console.log('📨 Exec Report Received:', {
            order_id: report.order_id,
            status: report.status,
            cum_qty: report.cum_qty,
            avg_px: report.avg_px
        })

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
                console.log('⏭️  Skipping old exec report for', report.order_id)
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

            console.log('✅ Order Updated:', {
                order_id: report.order_id,
                old_status: current.status,
                new_status: report.status,
                old_filled: current.filled_qty,
                new_filled: report.cum_qty
            })

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
