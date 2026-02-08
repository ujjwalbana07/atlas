import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMarketData } from '../../context/MarketDataContext'

export function OrderFlowChart() {
    const { trades } = useMarketData()

    const data = useMemo(() => {
        // Bucket trades by 1-minute intervals (or 30s)
        const buckets: Record<string, { time: string, buyQty: number, sellQty: number }> = {}

        trades.forEach(t => {
            const date = new Date(t.timestamp)
            // Round to nearest minute for bucketing
            date.setSeconds(0, 0)
            const key = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

            if (!buckets[key]) {
                buckets[key] = { time: key, buyQty: 0, sellQty: 0 }
            }

            if (t.trade?.side === 'BUY') {
                buckets[key].buyQty += t.trade.qty
            } else {
                buckets[key].sellQty += t.trade?.qty || 0
            }
        })

        // Return array sorted by time
        return Object.values(buckets).sort((a, b) => a.time.localeCompare(b.time))
    }, [trades])

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Order Flow (Volume)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                        <XAxis dataKey="time" stroke="#666" fontSize={12} />
                        <YAxis stroke="#666" fontSize={12} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                            cursor={{ fill: '#333', opacity: 0.2 }}
                        />
                        <Legend />
                        <Bar dataKey="buyQty" name="Buy vol" fill="#10b981" stackId="a" />
                        <Bar dataKey="sellQty" name="Sell vol" fill="#ef4444" stackId="a" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
