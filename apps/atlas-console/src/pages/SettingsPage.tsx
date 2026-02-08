
import { useState } from "react"
import { Activity, Shield, Wifi } from "lucide-react"

export default function SettingsPage() {
    const [paperTrading, setPaperTrading] = useState(false)
    const [limits, setLimits] = useState({
        maxQty: 100,
        maxNotional: 1000000,
        throttleRps: 10
    })

    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>

            {/* Connection Status */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex items-center gap-4 mb-4">
                    <Wifi className="h-6 w-6 text-blue-500" />
                    <h2 className="text-xl font-semibold">Connectivity</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between p-3 border rounded bg-muted/50">
                        <span>WebSocket Feed</span>
                        <span className="text-green-500 font-medium">Connected</span>
                    </div>
                    <div className="flex justify-between p-3 border rounded bg-muted/50">
                        <span>Order Gateway API</span>
                        <span className="text-green-500 font-medium">Online</span>
                    </div>
                </div>
            </div>

            {/* Trading Mode */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <Activity className="h-6 w-6 text-orange-500" />
                        <h2 className="text-xl font-semibold">Trading Mode</h2>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={paperTrading}
                            onChange={() => setPaperTrading(!paperTrading)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-sm font-medium">{paperTrading ? 'Paper Trading' : 'Live Trading'}</span>
                    </label>
                </div>
                <p className="text-muted-foreground text-sm">
                    {paperTrading ? "Execute orders internally without sending to exchange." : "Orders are sent directly to the matching engine."}
                </p>
            </div>

            {/* Risk Limits */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex items-center gap-4 mb-4">
                    <Shield className="h-6 w-6 text-red-500" />
                    <h2 className="text-xl font-semibold">Risk Controls</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Max Order Qty</label>
                        <input
                            type="number"
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={limits.maxQty}
                            onChange={e => setLimits({ ...limits, maxQty: Number(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Max Notional ($)</label>
                        <input
                            type="number"
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={limits.maxNotional}
                            onChange={e => setLimits({ ...limits, maxNotional: Number(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Throttle (RPS)</label>
                        <input
                            type="number"
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={limits.throttleRps}
                            onChange={e => setLimits({ ...limits, throttleRps: Number(e.target.value) })}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium transition-colors">
                    Save Changes
                </button>
            </div>
        </div>
    )
}
