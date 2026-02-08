
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts"

const mockTimeSeries = [
    { time: '10:00', orders: 40, fills: 24 },
    { time: '10:01', orders: 30, fills: 13 },
    { time: '10:02', orders: 20, fills: 58 },
    { time: '10:03', orders: 27, fills: 39 },
    { time: '10:04', orders: 18, fills: 48 },
]

const mockLatency = [
    { range: '<1ms', count: 120 },
    { range: '1-5ms', count: 45 },
    { range: '5-10ms', count: 20 },
    { range: '>10ms', count: 5 },
]

const mockOutcomes = [
    { name: 'Filled', value: 400, color: '#22c55e' },
    { name: 'Canceled', value: 300, color: '#eab308' },
    { name: 'Rejected', value: 30, color: '#ef4444' },
]

export function Telemetry() {
    return (
        <div className="grid grid-cols-3 gap-4 h-[200px]">
            {/* Orders vs Fills */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 flex flex-col">
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Orders vs Fills (5m)</h4>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mockTimeSeries}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="time" stroke="#666" fontSize={10} />
                            <YAxis stroke="#666" fontSize={10} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="fills" stroke="#22c55e" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Latency Dist */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 flex flex-col">
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Latency Distribution (Ack)</h4>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mockLatency}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="range" stroke="#666" fontSize={10} />
                            <YAxis stroke="#666" fontSize={10} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333' }}
                            />
                            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Outcomes */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 flex flex-col">
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Order Outcomes</h4>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={mockOutcomes}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {mockOutcomes.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333' }}
                            />
                            <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
