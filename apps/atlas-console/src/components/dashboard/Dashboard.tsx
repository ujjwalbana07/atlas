import { OrderBlotter } from "./OrderBlotter"
import { OrderEntry } from "./OrderEntry"
import { useMarketData } from "../../context/MarketDataContext"
import { useMode } from "../../context/ModeContext"
import { DemoEngine } from "../../demo/engine"
import { Activity, Settings, LayoutDashboard, ChevronDown, ChevronUp, Rocket, RefreshCcw } from "lucide-react"
import { MarketDepth } from "./MarketDepth"
import { RecentTrades } from "./RecentTrades"
import { SettingsModal } from "./SettingsModal"
import { useState, useMemo } from "react"
import { PriceTrendChart } from "../analytics/PriceTrendChart"
import { OrderFlowChart } from "../analytics/OrderFlowChart"
import { ExposureChart } from "../analytics/ExposureChart"
import { PaperPnLChart } from "../analytics/PaperPnLChart"
import { OrderDistributionChart } from "../analytics/OrderDistributionChart"
import { SpreadChart } from "../analytics/SpreadChart"

// New imports
import { TraderControlCenter } from "./TraderControlCenter"
import { computeVolatility, computeSpread, computeLiquidity, computeTrendBias } from "../../lib/marketMetrics"

export default function Dashboard() {
    const { orders, isConnected, l2Data, trades } = useMarketData()
    const { isDemoMode } = useMode()
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isTccOpen, setIsTccOpen] = useState(true) // For mobile accordion

    // Lifted Order Entry State
    const [orderForm, setOrderForm] = useState({
        symbol: "BTC-USD",
        quantity: "1.0",
        price: "50000.00",
        side: "BUY" as "BUY" | "SELL"
    })

    const handlePriceSuggest = (suggestedPrice: number) => {
        setOrderForm(prev => ({ ...prev, price: suggestedPrice.toFixed(2) }))
    }

    const handleResetDemo = () => {
        if (confirm("Reset Demo Account? All orders and balances will be cleared.")) {
            DemoEngine.getInstance().reset()
            window.location.reload() // Force reload to clear all local hook states
        }
    }

    // Pick active symbol
    const activeSymbol = orderForm.symbol
    const currentL2 = l2Data[activeSymbol]

    // Compute Market Metrics
    const metrics = useMemo(() => {
        return {
            volatility: computeVolatility(trades),
            spread: computeSpread(currentL2),
            liquidity: computeLiquidity(currentL2),
            trendBias: computeTrendBias(trades)
        }
    }, [trades, currentL2])

    const bestBid = currentL2?.bids?.[0]?.price || 0
    const bestAsk = currentL2?.asks?.[0]?.price || 0

    return (
        <div className="flex flex-col h-full gap-4">
            <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between p-2 border-b transition-colors duration-300">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 font-bold text-xl">
                        <LayoutDashboard className="h-6 w-6 text-primary" />
                        ATLAS <span className="text-muted-foreground font-normal text-sm">PRO</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isDemoMode && (
                        <div className="flex items-center gap-2 text-[10px] font-bold border px-3 py-1 rounded-full bg-primary/10 text-primary border-primary/20 animate-pulse">
                            <Rocket className="h-3 w-3" />
                            DEMO ENGINE RUNNING
                        </div>
                    )}

                    {isDemoMode && (
                        <button
                            onClick={handleResetDemo}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold hover:bg-muted transition-colors"
                        >
                            <RefreshCcw className="h-3 w-3" />
                            RESET DEMO
                        </button>
                    )}

                    <button
                        className="p-2 hover:bg-secondary rounded-full transition-colors cursor-pointer"
                        title="Settings"
                        onClick={() => window.location.href = '/settings'}
                    >
                        <Settings className="h-5 w-5 text-muted-foreground" />
                    </button>

                    {!isDemoMode && (
                        <div className="flex items-center gap-2 text-xs border px-3 py-1 rounded-full bg-muted/50">
                            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                            <span className="font-medium text-muted-foreground">API OK</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-xs border px-3 py-1 rounded-full">
                        <span className={isConnected ? "text-green-500 animate-pulse" : "text-red-500"}>●</span>
                        <span className="font-medium">{isConnected ? (isDemoMode ? "Engine Active" : "Connected") : "Disconnected"}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {/* Top Section: Trading Console (Grid) */}
                <div className="grid grid-cols-12 gap-4">
                    {/* [Left Col] Market Data & Charts (9 cols) */}
                    <div className="col-span-12 lg:col-span-9 flex flex-col gap-4">
                        {/* Top Row: Price Chart & Order Book */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <PriceTrendChart className="col-span-2 h-[350px]" />
                            <div className="col-span-1 rounded-lg border bg-card text-card-foreground shadow-sm h-[350px]">
                                <MarketDepth data={currentL2} />
                            </div>
                        </div>

                        {/* Bottom Row: Blotter */}
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 flex flex-col h-[250px]">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    Live Orders
                                </h3>
                                <span className="text-muted-foreground text-xs">{orders.length} orders</span>
                            </div>
                            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                                <OrderBlotter data={orders} />
                            </div>
                        </div>
                    </div>

                    {/* [Right Col] Entry, TCC & Trades (3 cols) */}
                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
                        <OrderEntry
                            initialForm={orderForm}
                            onFormChange={setOrderForm}
                        />

                        {/* TCC - Accordion on mobile, regular on desktop */}
                        <div className="lg:block hidden">
                            <TraderControlCenter
                                metrics={metrics}
                                side={orderForm.side}
                                bestBid={bestBid}
                                bestAsk={bestAsk}
                                price={parseFloat(orderForm.price) || 0}
                                onPriceSuggest={handlePriceSuggest}
                            />
                        </div>

                        <div className="lg:hidden block border rounded-lg overflow-hidden">
                            <button
                                onClick={() => setIsTccOpen(!isTccOpen)}
                                className="w-full flex items-center justify-between p-3 bg-muted/50 font-semibold text-sm"
                            >
                                Trader Control Center
                                {isTccOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                            {isTccOpen && (
                                <TraderControlCenter
                                    metrics={metrics}
                                    side={orderForm.side}
                                    bestBid={bestBid}
                                    bestAsk={bestAsk}
                                    price={parseFloat(orderForm.price) || 0}
                                    onPriceSuggest={handlePriceSuggest}
                                />
                            )}
                        </div>

                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm h-[250px] overflow-hidden flex flex-col">
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <RecentTrades trades={trades} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analytics / Insights Section */}
                <div className="flex flex-col gap-4 mt-8 pb-32">
                    <div className="flex items-center gap-4 px-1">
                        <h3 className="text-lg font-bold tracking-tight uppercase text-[10px] tracking-[0.3em] text-primary">Intelligence Hub</h3>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/50 to-transparent"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {/* Status is now prioritized */}
                        <OrderDistributionChart />
                        <OrderFlowChart />
                        <PaperPnLChart />
                        <SpreadChart />
                        <ExposureChart />
                    </div>
                </div>
            </div>
        </div>
    )
}

