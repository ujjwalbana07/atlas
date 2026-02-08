import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMarketData } from '../../context/MarketDataContext'

export function SpreadChart() {
    const { l2Data } = useMarketData()
    const [history, setHistory] = useState<{ time: string, spread: number, mid: number }[]>([])

    // Assume BTC-USD for now or derive from props
    const symbol = "BTC-USD"
    const currentL2 = l2Data[symbol]

    useEffect(() => {
        if (!currentL2 || !currentL2.bids || !currentL2.asks || currentL2.bids.length === 0 || currentL2.asks.length === 0) return

        const bestBid = currentL2.bids[0].price
        const bestAsk = currentL2.asks[0].price
        const spread = bestAsk - bestBid
        const mid = (bestAsk + bestBid) / 2

        const now = new Date().toLocaleTimeString()

        setHistory(prev => {
            const newPoint = { time: now, spread, mid }
            const newHistory = [...prev, newPoint]
            return newHistory.slice(-50) // Keep last 50
        })

    }, [currentL2])

    const currentSpread = history.length > 0 ? history[history.length - 1].spread : 0

    return (
        <Card className="col-span-1">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex justify-between">
                    <span>Spread & Mid</span>
                    <span className="font-mono text-xs text-muted-foreground">Spread: {currentSpread.toFixed(2)}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                        <XAxis dataKey="time" stroke="#666" fontSize={10} tick={false} />
                        <YAxis yAxisId="spread" orientation="left" stroke="#8884d8" fontSize={10} width={30} domain={['auto', 'auto']} />
                        {/* Mid price might be too large to plot on same scale comfortably without dual axis, simply plotting spread for visual clarity or dual axis if needed. Let's stick to Spread primarily per request "Show current spread value" */}
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', fontSize: '12px' }}
                            itemStyle={{ padding: 0 }}
                        />
                        <Line yAxisId="spread" type="monotone" dataKey="spread" stroke="#8884d8" strokeWidth={2} dot={false} name="Spread" />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
