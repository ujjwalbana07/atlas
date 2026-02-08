import { OrderBlotter } from "./OrderBlotter"
import { OrderEntry } from "./OrderEntry"
import { useMarketData } from "../../context/MarketDataContext"
import { Activity, Settings, LayoutDashboard } from "lucide-react"
import { MarketDepth } from "./MarketDepth"
import { RecentTrades } from "./RecentTrades"
import { SettingsModal } from "./SettingsModal"
import { useState } from "react"
import { PriceTrendChart } from "../analytics/PriceTrendChart"
import { OrderFlowChart } from "../analytics/OrderFlowChart"
import { ExposureChart } from "../analytics/ExposureChart"
import { PaperPnLChart } from "../analytics/PaperPnLChart"
import { OrderDistributionChart } from "../analytics/OrderDistributionChart"
import { SpreadChart } from "../analytics/SpreadChart"

export default function Dashboard() {
    const { orders, isConnected, l2Data, trades } = useMarketData()
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    // For demo, just pick the first symbol or BTC-USD
    const activeSymbol = "BTC-USD"
    const currentL2 = l2Data[activeSymbol]

    return (
        <div className="flex flex-col h-full gap-4">
            <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between p-2 border-b">
                <div className="flex items-center gap-2 font-bold text-xl">
                    <LayoutDashboard className="h-6 w-6 text-primary" />
                    ATLAS <span className="text-muted-foreground font-normal text-sm">PRO</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        className="p-2 hover:bg-secondary rounded-full transition-colors cursor-pointer"
                        title="Settings"
                        onClick={() => window.location.href = '/settings'}
                    >
                        <Settings className="h-5 w-5 text-muted-foreground" />
                    </button>

                    <div className="flex items-center gap-2 text-xs border px-3 py-1 rounded-full bg-muted/50">
                        <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                        <span className="font-medium text-muted-foreground">API OK</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs border px-3 py-1 rounded-full">
                        <span className={isConnected ? "text-green-500 animate-pulse" : "text-red-500"}>●</span>
                        <span className="font-medium">{isConnected ? "Connected" : "Disconnected"}</span>
                    </div>
                </div>
            </div>

            {/* Top Section: Trading Console (Grid) */}
            <div className="grid grid-cols-12 gap-4">
                {/* [Left Col] Market Data & Charts (9 cols) */}
                <div className="col-span-12 lg:col-span-9 flex flex-col gap-4">
                    {/* Top Row: Price Chart & Order Book */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[350px]">
                        <PriceTrendChart className="col-span-2 h-full" />
                        <div className="col-span-1 rounded-lg border bg-card text-card-foreground shadow-sm">
                            <MarketDepth data={currentL2} />
                        </div>
                    </div>

                    {/* Bottom Row: Blotter */}
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 flex flex-col max-h-[260px] lg:max-h-[280px]">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Live Orders
                            </h3>
                            <span className="text-muted-foreground text-xs">{orders.length} orders</span>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0">
                            <OrderBlotter data={orders} />
                        </div>
                    </div>
                </div>

                {/* [Right Col] Entry & Trades (3 cols) */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
                    <OrderEntry />

                    <div className="flex-1 rounded-lg border bg-card text-card-foreground shadow-sm min-h-[300px]">
                        <RecentTrades trades={trades} />
                    </div>
                </div>
            </div>

            {/* Analytics / Insights Section */}
            <div className="flex flex-col gap-4 mt-4">
                <h3 className="text-lg font-semibold tracking-tight px-1">Analytics & Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                    {/* 1. Order Flow */}
                    <div className="h-[250px]">
                        <OrderFlowChart />
                    </div>
                    {/* 2. Spread & Mid */}
                    <div className="h-[250px]">
                        <SpreadChart />
                    </div>
                    {/* 3. Account Exposure */}
                    <div className="h-[250px]">
                        <ExposureChart />
                    </div>
                    {/* 4. Paper PnL */}
                    <div className="h-[250px]">
                        <PaperPnLChart />
                    </div>
                    {/* 5. Order State Distribution */}
                    <div className="h-[250px]">
                        <OrderDistributionChart />
                    </div>
                </div>
            </div>
        </div>
    )
}
