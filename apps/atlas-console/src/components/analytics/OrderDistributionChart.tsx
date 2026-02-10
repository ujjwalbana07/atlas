import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMarketData } from '../../context/MarketDataContext'

const COLORS = {
    'FILLED': '#10b981', // Green
    'NEW': '#3b82f6',    // Blue
    'LIVE': '#8b5cf6',   // Purple
    'CANCELED': '#6b7280', // Gray
    'REJECTED': '#ef4444', // Red
    'PARTIALLY_FILLED': '#f59e0b' // Amber
}

export function OrderDistributionChart() {
    const { orders } = useMarketData()

    const data = useMemo(() => {
        if (!orders || orders.length === 0) {
            return [{ name: 'NO ACTIVITY', value: 1 }]
        }

        const counts: Record<string, number> = {}
        orders.forEach(o => {
            const status = o.status || 'LIVE'
            counts[status] = (counts[status] || 0) + 1
        })

        return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }, [orders])

    const isEmpty = !orders || orders.length === 0

    return (
        <Card className="col-span-1 h-[400px] flex flex-col border-primary/20 bg-card/40 backdrop-blur-md overflow-hidden">
            <CardHeader className="pb-0 shrink-0">
                <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-primary">
                    <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    Order Status Distribution
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius="50%"
                            outerRadius="75%"
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                            isAnimationActive={false}
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={isEmpty ? '#262626' : (COLORS[entry.name as keyof typeof COLORS] || '#8884d8')}
                                    className="outline-none"
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                {isEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Awaiting Execution</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
