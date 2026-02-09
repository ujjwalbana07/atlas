import { useState } from "react"
import type { MarketDataUpdate } from "../../types"

interface RecentTradesProps {
    trades: MarketDataUpdate[]
}

type TradeLimit = 25 | 50 | 100 | 'All'

export function RecentTrades({ trades }: RecentTradesProps) {
    const [limit, setLimit] = useState<TradeLimit>(25)

    if (trades.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No recent trades
            </div>
        )
    }

    const displayTrades = limit === 'All' ? trades : Array.isArray(trades) ? trades.slice(0, limit) : []

    return (
        <div className="flex flex-col h-full max-h-[260px] p-4 overflow-hidden bg-card">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Recent Trades</h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">View:</span>
                    <select
                        value={limit}
                        onChange={(e) => setLimit(e.target.value === 'All' ? 'All' : Number(e.target.value) as TradeLimit)}
                        className="bg-muted text-[10px] rounded px-1 py-0.5 border border-transparent hover:border-border focus:outline-none cursor-pointer font-medium"
                    >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value="All">All</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-3 font-medium text-[10px] text-muted-foreground mb-1 pb-1 border-b sticky top-0 bg-card z-10">
                <span>Price</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Time</span>
            </div>

            <div className="flex-1 overflow-y-auto text-[11px] space-y-1 pr-1 custom-scrollbar">
                {displayTrades.map((t, i) => (
                    <div key={i} className="grid grid-cols-3 border-b border-transparent hover:border-muted-foreground/10 py-0.5">
                        <span className={`font-mono ${t.trade?.side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                            {t.trade?.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-center font-mono opacity-90">{t.trade?.qty.toFixed(4)}</span>
                        <span className="text-right text-muted-foreground font-mono opacity-80">
                            {new Date(t.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
