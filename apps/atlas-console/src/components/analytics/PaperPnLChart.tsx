import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMarketData } from '../../context/MarketDataContext'

export function PaperPnLChart() {
    const { trades, orders } = useMarketData()
    const [history, setHistory] = useState<{ time: string, pnl: number }[]>([])

    // Calculate current PnL based on fills and current price
    const currentPrice = trades.length > 0 ? trades[0].trade?.price || 0 : 0

    // Effect to snapshot PnL every time price or fills change
    // Throttling could be added here
    useEffect(() => {
        if (currentPrice === 0) return

        let btc = 0
        let usd = 0 // Mock starting cash 0 change

        // Calculate position from fills
        orders.forEach(o => {
            if (o.status === 'FILLED' || o.status === 'PARTIALLY_FILLED') {
                if (o.side === 'BUY') {
                    btc += o.filled_qty
                    usd -= (o.filled_qty * o.avg_price)
                } else {
                    btc -= o.filled_qty
                    usd += (o.filled_qty * o.avg_price)
                }
            }
        })

        const pnl = (btc * currentPrice) + usd
        const now = new Date().toLocaleTimeString()

        setHistory(prev => {
            // Keep last 50 points
            const newHistory = [...prev, { time: now, pnl }]
            return newHistory.slice(-50)
        })

    }, [currentPrice, orders])

    const currentPnL = history.length > 0 ? history[history.length - 1].pnl : 0

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle className="flex justify-between">
                    <span>Paper PnL (Demo)</span>
                    <span className={currentPnL >= 0 ? "text-green-500" : "text-red-500"}>
                        ${currentPnL.toFixed(2)}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="time" stroke="#666" fontSize={10} tick={false} />
                        <YAxis stroke="#666" fontSize={10} width={40} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="pnl"
                            stroke={currentPnL >= 0 ? "#10b981" : "#ef4444"}
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
