import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMarketData } from '../../context/MarketDataContext'

export function ExposureChart() {
    const { orders } = useMarketData()

    // Since we don't have historical balance API, we'll derive "exposure over time"
    // by replaying the fills. Assuming initial position = 0 for this chart.
    const data = useMemo(() => {
        const sortedOrders = [...orders]
            .filter(o => o.status === 'FILLED' || o.status === 'PARTIALLY_FILLED')
            .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())

        let currentBtc = 0
        let currentUsd = 100000 // Mock starting USD for visualization

        const history = sortedOrders.map(order => {
            if (order.side === 'BUY') {
                currentBtc += order.filled_qty
                currentUsd -= (order.filled_qty * order.avg_price)
            } else {
                currentBtc -= order.filled_qty
                currentUsd += (order.filled_qty * order.avg_price)
            }

            return {
                time: new Date(order.updated_at).toLocaleTimeString(),
                btc: currentBtc,
                usd: currentUsd
            }
        })

        // Add a "Start" point if empty
        if (history.length === 0) {
            return [{ time: 'Start', btc: 0, usd: 100000 }]
        }

        return history
    }, [orders])

    // Get latest non-zero value for header
    const latest = data[data.length - 1]

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle className="flex justify-between items-center bg-muted/20 p-2 rounded">
                    <span>Account Exposure</span>
                    <div className="flex gap-2 text-sm">
                        <span className="text-orange-400">BTC: {latest.btc.toFixed(4)}</span>
                        <span className="text-blue-400">USD: ${(latest.usd / 1000).toFixed(1)}k</span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorBtc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorUsd" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="time" stroke="#666" fontSize={10} tickFormatter={(v) => v.split(':').slice(0, 2).join(':')} />
                        <YAxis yAxisId="left" stroke="#f97316" fontSize={10} width={40} />
                        <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={10} width={40} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a' }} />
                        <Area yAxisId="left" type="monotone" dataKey="btc" stroke="#f97316" fillOpacity={1} fill="url(#colorBtc)" name="BTC Exposure" />
                        <Area yAxisId="right" type="step" dataKey="usd" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsd)" name="USD Balance" />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
