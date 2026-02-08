
import type { MarketDataUpdate } from "../../types"

interface MarketDepthProps {
    data?: MarketDataUpdate
}

export function MarketDepth({ data }: MarketDepthProps) {
    if (!data) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Waiting for Market Data...
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col p-4">
            <h3 className="font-semibold mb-2 flex justify-between items-center">
                <span>{data.symbol} Order Book</span>
                <span className="text-xs text-muted-foreground">
                    {new Date(data.timestamp).toLocaleTimeString()}
                </span>
            </h3>

            <div className="flex-1 grid grid-cols-2 gap-4 text-xs">
                {/* Bids */}
                <div>
                    <div className="grid grid-cols-2 font-medium text-muted-foreground mb-1 pb-1 border-b">
                        <span>Qty</span>
                        <span className="text-right">Bid</span>
                    </div>
                    <div className="space-y-1">
                        {data.bids?.map((bid, i) => (
                            <div key={i} className="grid grid-cols-2 text-green-500">
                                <span>{bid.qty.toFixed(4)}</span>
                                <span className="text-right">{bid.price.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Asks */}
                <div>
                    <div className="grid grid-cols-2 font-medium text-muted-foreground mb-1 pb-1 border-b">
                        <span>Ask</span>
                        <span className="text-right">Qty</span>
                    </div>
                    <div className="space-y-1">
                        {data.asks?.map((ask, i) => (
                            <div key={i} className="grid grid-cols-2 text-red-500">
                                <span>{ask.price.toFixed(2)}</span>
                                <span className="text-right">{ask.qty.toFixed(4)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
