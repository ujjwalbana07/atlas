import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMarketData } from '../../context/MarketDataContext'
import { cn } from "@/lib/utils"

interface PriceTrendChartProps {
    className?: string
}

export function PriceTrendChart({ className }: PriceTrendChartProps) {
    const { trades } = useMarketData()

    const data = useMemo(() => {
        // Sort trades by time ascending for the chart
        const sorted = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

        // Calculate SMA (Simple Moving Average) - e.g., last 10 points
        return sorted.map((trade, index, array) => {
            const windowSize = 10
            let sma = null
            if (index >= windowSize - 1) {
                const slice = array.slice(index - windowSize + 1, index + 1)
                const sum = slice.reduce((acc, t) => acc + (t.trade?.price || 0), 0)
                sma = sum / windowSize
            }
            return {
                time: new Date(trade.timestamp).toLocaleTimeString(),
                price: trade.trade?.price,
                sma: sma
            }
        })
    }, [trades])

    const lastPrice = trades.length > 0 ? trades[0].trade?.price : 0

    return (
        <Card className={cn("col-span-2", className)}>
            <CardHeader>
                <CardTitle className="flex justify-between">
                    <span>BTC-USD Price Trend</span>
                    <span className="text-xl font-mono text-primary">${lastPrice?.toFixed(2)}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="time" stroke="#666" fontSize={12} tickFormatter={(val) => val.split(':')[1] + ':' + val.split(':')[2]} />
                        <YAxis stroke="#666" fontSize={12} domain={['auto', 'auto']} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="sma" stroke="#10b981" strokeWidth={1} dot={false} strokeDasharray="5 5" name="SMA (10)" />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
