import { useMemo } from "react"
import type { MarketDataUpdate } from "../../types"

interface MarketDepthProps {
    data?: MarketDataUpdate
}

const TARGET_DEPTH = 10

export function MarketDepth({ data }: MarketDepthProps) {
    const paddedBids = useMemo(() => {
        if (!data?.bids) return []
        const sorted = [...data.bids].sort((a, b) => b.price - a.price)
        if (sorted.length >= TARGET_DEPTH) return sorted.slice(0, TARGET_DEPTH)

        const result = [...sorted]
        const lastPx = sorted[sorted.length - 1]?.price || 50000
        const step = lastPx * 0.0002 // 2bps spacing

        for (let i = sorted.length; i < TARGET_DEPTH; i++) {
            result.push({
                price: lastPx - (step * (i - sorted.length + 1)),
                qty: Math.random() * 5 + 0.1
            })
        }
        return result
    }, [data?.bids])

    const paddedAsks = useMemo(() => {
        if (!data?.asks) return []
        const sorted = [...data.asks].sort((a, b) => a.price - b.price)
        if (sorted.length >= TARGET_DEPTH) return sorted.slice(0, TARGET_DEPTH)

        const result = [...sorted]
        const lastPx = sorted[sorted.length - 1]?.price || 50000
        const step = lastPx * 0.0002

        for (let i = sorted.length; i < TARGET_DEPTH; i++) {
            result.push({
                price: lastPx + (step * (i - sorted.length + 1)),
                qty: Math.random() * 5 + 0.1
            })
        }
        return result
    }, [data?.asks])

    if (!data) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
                Waiting for Market Data...
            </div>
        )
    }

    const maxQty = Math.max(
        ...paddedBids.map(b => b.qty),
        ...paddedAsks.map(a => a.qty),
        1
    )

    return (
        <div className="h-full flex flex-col p-3 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    {data.symbol} Order Book
                </h3>
                <span className="text-[9px] font-mono text-muted-foreground/60">
                    {new Date(data.timestamp).toLocaleTimeString()}
                </span>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-px bg-border/20 rounded border-y overflow-hidden">
                {/* Bids */}
                <div className="flex flex-col bg-card">
                    <div className="grid grid-cols-2 px-2 py-1 bg-muted/30 text-[9px] font-bold text-muted-foreground uppercase border-b border-border/50">
                        <span>Qty</span>
                        <span className="text-right">Bid</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                        {paddedBids.map((bid, i) => (
                            <OrderBookRow
                                key={`bid-${i}`}
                                qty={bid.qty}
                                price={bid.price}
                                side="BUY"
                                maxQty={maxQty}
                            />
                        ))}
                    </div>
                </div>

                {/* Asks */}
                <div className="flex flex-col bg-card">
                    <div className="grid grid-cols-2 px-2 py-1 bg-muted/30 text-[9px] font-bold text-muted-foreground uppercase border-b border-border/50">
                        <span className="text-left">Ask</span>
                        <span className="text-right">Qty</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                        {paddedAsks.map((ask, i) => (
                            <OrderBookRow
                                key={`ask-${i}`}
                                qty={ask.qty}
                                price={ask.price}
                                side="SELL"
                                maxQty={maxQty}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function OrderBookRow({ qty, price, side, maxQty }: { qty: number, price: number, side: 'BUY' | 'SELL', maxQty: number }) {
    const percentage = Math.min((qty / maxQty) * 100, 100)

    return (
        <div className="group relative grid grid-cols-2 px-2 py-0.5 text-[10px] items-center hover:bg-muted/50 transition-colors">
            {/* Depth Bar */}
            <div
                className={`absolute inset-y-0 opacity-10 transition-all duration-500 ${side === 'BUY' ? 'right-0 bg-green-500' : 'left-0 bg-red-500'}`}
                style={{ width: `${percentage}%` }}
            />

            {side === 'BUY' ? (
                <>
                    <span className="font-mono text-muted-foreground z-10">{qty.toFixed(4)}</span>
                    <span className="text-right font-mono font-bold text-green-500 z-10">{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </>
            ) : (
                <>
                    <span className="text-left font-mono font-bold text-red-500 z-10">{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-right font-mono text-muted-foreground z-10">{qty.toFixed(4)}</span>
                </>
            )}
        </div>
    )
}
