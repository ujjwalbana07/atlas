import { useMemo } from 'react'
import { Activity, Zap, BarChart3, ArrowUpDown, Info } from 'lucide-react'
import type { MarketMetrics, Level } from '../../lib/marketMetrics'
import { estimateFillProbability } from '../../lib/probabilityUtils'

interface TraderControlCenterProps {
    metrics: MarketMetrics
    side: 'BUY' | 'SELL'
    bestBid: number
    bestAsk: number
    price: number
    onPriceSuggest: (price: number) => void
}

export function TraderControlCenter({
    metrics,
    side,
    bestBid,
    bestAsk,
    price,
    onPriceSuggest
}: TraderControlCenterProps) {
    const fillProb = useMemo(() => {
        return estimateFillProbability(
            side,
            price,
            bestBid,
            bestAsk,
            metrics.volatility.level,
            metrics.spread.level
        )
    }, [side, price, bestBid, bestAsk, metrics.volatility.level, metrics.spread.level])

    const mid = (bestBid + bestAsk) / 2

    const suggestionPrices = {
        passive: side === 'BUY' ? bestBid : bestAsk,
        mid: mid,
        aggressive: side === 'BUY' ? bestAsk : bestBid
    }

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Trader Control Center
                </h3>
            </div>

            {/* 1) Market State */}
            <div className="grid grid-cols-2 gap-2">
                <MetricTile
                    label="Volatility"
                    value={`${metrics.volatility.value.toFixed(2)}%`}
                    level={metrics.volatility.level}
                    tooltip="Standard deviation of returns over last 50 trades. High means rapid price swings."
                    icon={<Activity className="h-3 w-3" />}
                />
                <MetricTile
                    label="Spread"
                    value={`${metrics.spread.value.toFixed(1)} bps`}
                    level={metrics.spread.level}
                    tooltip="bestAsk - bestBid in basis points. Tighter is better for execution."
                    icon={<ArrowUpDown className="h-3 w-3" />}
                />
                <MetricTile
                    label="Liquidity"
                    value={`${metrics.liquidity.value.toFixed(1)} qty`}
                    level={metrics.liquidity.level}
                    tooltip="Sum of top 3 bid/ask levels. High means more depth to absorb orders."
                    icon={<BarChart3 className="h-3 w-3" />}
                />
                <MetricTile
                    label="Trend Bias"
                    value={metrics.trendBias.bias}
                    level={metrics.trendBias.bias === 'NEUTRAL' ? 'MEDIUM' : 'HIGH'}
                    badgeColor={metrics.trendBias.bias === 'BUY-SIDE' ? 'bg-green-500/20 text-green-500' : metrics.trendBias.bias === 'SELL-SIDE' ? 'bg-red-500/20 text-red-500' : undefined}
                    tooltip="Buy vs Sell volume in recent trades. Shows immediate market pressure."
                    icon={<TrendingIcon bias={metrics.trendBias.bias} />}
                />
            </div>

            {/* 2) Smart Price Suggestions */}
            <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggested Prices</h4>
                <div className="grid grid-cols-3 gap-2">
                    <SuggestionButton
                        label="Passive"
                        price={suggestionPrices.passive}
                        hint="Lower fee / fill"
                        onClick={() => onPriceSuggest(suggestionPrices.passive)}
                    />
                    <SuggestionButton
                        label="Mid"
                        price={suggestionPrices.mid}
                        hint="Fair value"
                        onClick={() => onPriceSuggest(suggestionPrices.mid)}
                    />
                    <SuggestionButton
                        label="Aggressive"
                        price={suggestionPrices.aggressive}
                        hint="Instant fill"
                        onClick={() => onPriceSuggest(suggestionPrices.aggressive)}
                    />
                </div>
            </div>

            {/* 3) Fill Probability Meter */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fill Probability</h4>
                    <span className="text-xs font-bold">{fillProb.probability}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${fillProb.probability > 70 ? 'bg-green-500' : fillProb.probability > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${fillProb.probability}%` }}
                    />
                </div>
                <p className="text-[10px] text-muted-foreground italic">{fillProb.label}</p>
            </div>
        </div>
    )
}

function MetricTile({ label, value, level, tooltip, icon, badgeColor }: {
    label: string,
    value: string,
    level: Level,
    tooltip: string,
    icon: React.ReactNode,
    badgeColor?: string
}) {
    const levelColors = {
        LOW: 'bg-green-500/20 text-green-600 dark:text-green-400',
        MEDIUM: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
        HIGH: 'bg-red-500/20 text-red-600 dark:text-red-400'
    }

    return (
        <div className="flex flex-col p-2 rounded border bg-muted/30 group relative" title={tooltip}>
            <div className="flex items-center gap-1.5 mb-1">
                <span className="text-muted-foreground">{icon}</span>
                <span className="text-[10px] uppercase font-medium text-muted-foreground">{label}</span>
                <Info className="h-2.5 w-2.5 text-muted-foreground/50 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold truncate">{value}</span>
                <span className={`text-[8px] px-1 rounded font-bold ${badgeColor || levelColors[level]}`}>
                    {level}
                </span>
            </div>
        </div>
    )
}

function SuggestionButton({ label, price, hint, onClick }: { label: string, price: number, hint: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center justify-center p-2 rounded border bg-muted/50 hover:bg-accent transition-colors text-center"
        >
            <span className="text-[10px] font-semibold">{label}</span>
            <span className="text-xs font-bold">{price.toFixed(2)}</span>
            <span className="text-[8px] text-muted-foreground mt-0.5">{hint}</span>
        </button>
    )
}

function TrendingIcon({ bias }: { bias: string }) {
    if (bias === 'BUY-SIDE') return <Activity className="h-3 w-3 text-green-500 rotate-45" />
    if (bias === 'SELL-SIDE') return <Activity className="h-3 w-3 text-red-500 -rotate-45" />
    return <Activity className="h-3 w-3 text-muted-foreground" />
}
