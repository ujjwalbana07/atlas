import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMarketData } from '../../context/MarketDataContext'

const COLORS = {
    'FILLED': '#10b981', // Green
    'NEW': '#3b82f6',    // Blue
    'CANCELED': '#6b7280', // Gray
    'REJECTED': '#ef4444', // Red
    'PARTIALLY_FILLED': '#f59e0b' // Amber
}

export function OrderDistributionChart() {
    const { orders } = useMarketData()

    const data = useMemo(() => {
        const counts: Record<string, number> = {}

        orders.forEach(o => {
            counts[o.status] = (counts[o.status] || 0) + 1
        })

        return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }, [orders])

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Order Statuses</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#8884d8'} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
