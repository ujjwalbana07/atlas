import { useState, useEffect, useMemo } from "react"
import { api } from "../../lib/api"
import type { OrderCommand } from "../../types"
import { useUserContext } from "../../context/UserContext"
import { toast } from "sonner"

import { useBalances } from "../../hooks/useBalances"
import { BalancePanel } from "./BalancePanel"

// New imports
import { PreTradeRiskPreview } from "./PreTradeRiskPreview"
import { calculatePreTradeRisk } from "../../lib/riskUtils"

interface OrderEntryProps {
    initialForm: {
        symbol: string
        quantity: string
        price: string
        side: "BUY" | "SELL"
    }
    onFormChange: (form: any) => void
}

export function OrderEntry({ initialForm, onFormChange }: OrderEntryProps) {
    const { clientId } = useUserContext()
    const account = useBalances()
    const [loading, setLoading] = useState(false)
    const [localForm, setLocalForm] = useState(initialForm)

    // Sync from parent (e.g. from Click-to-fill)
    useEffect(() => {
        setLocalForm(initialForm)
    }, [initialForm])

    const handleFormUpdate = (updates: any) => {
        const next = { ...localForm, ...updates }
        setLocalForm(next)
        onFormChange(next)
    }

    const qtyNum = parseFloat(localForm.quantity) || 0
    const priceNum = parseFloat(localForm.price) || 0
    const total = (qtyNum * priceNum).toFixed(2)

    // Pre-Trade Risk
    const risk = useMemo(() => {
        return calculatePreTradeRisk(
            localForm.side,
            qtyNum,
            priceNum,
            account?.[localForm.side === 'BUY' ? 'usd' : 'btc'].available || 0,
            account?.[localForm.side === 'BUY' ? 'btc' : 'usd'].available || 0,
            100000 // Starting USD assumption
        )
    }, [localForm, account, qtyNum, priceNum])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (risk.status === 'BLOCK') {
            toast.error("Order Blocked", {
                description: risk.message || "Risk check failed"
            })
            return
        }

        if (qtyNum <= 0) {
            toast.error("Quantity must be a valid number greater than 0")
            return
        }
        if (priceNum <= 0) {
            toast.error("Price must be a valid number greater than 0")
            return
        }

        setLoading(true)
        try {
            const order: OrderCommand = {
                order_id: `ord-${Date.now()}`,
                client_id: clientId,
                type: "NEW",
                symbol: localForm.symbol,
                side: localForm.side,
                quantity: qtyNum,
                price: priceNum
            }
            await api.submitOrder(order)
            toast.success("Order Submitted", {
                description: `${localForm.side} ${qtyNum} ${localForm.symbol} @ ${priceNum}`
            })
        } catch (error: any) {
            console.error("Failed to submit order", error)
            const errorMsg = error.response?.data?.message || error.message || "Unknown error"
            toast.error("Order Submission Failed", {
                description: `Server Error: ${errorMsg}. Please check connectivity.`
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 flex flex-col">
            <h3 className="font-semibold mb-4">Order Entry</h3>

            <div className="flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                <BalancePanel account={account} />

                <form onSubmit={handleSubmit} className="space-y-2 pt-1">
                    <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Symbol</label>
                        <input
                            className="flex h-8 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors cursor-not-allowed opacity-50 font-bold"
                            value={localForm.symbol}
                            readOnly
                            disabled
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            className={`h-8 rounded-md px-3 text-sm font-bold transition-all ${localForm.side === 'BUY' ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                            onClick={() => handleFormUpdate({ side: "BUY" })}
                        >
                            Buy
                        </button>
                        <button
                            type="button"
                            className={`h-8 rounded-md px-3 text-sm font-bold transition-all ${localForm.side === 'SELL' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                            onClick={() => handleFormUpdate({ side: "SELL" })}
                        >
                            Sell
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Qty</label>
                            <input
                                type="number"
                                step="0.0001"
                                min="0"
                                className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                                value={localForm.quantity}
                                onChange={e => handleFormUpdate({ quantity: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Price</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                                value={localForm.price}
                                onChange={e => handleFormUpdate({ price: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total (Notional)</label>
                        <input
                            className="flex h-8 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors cursor-not-allowed opacity-50 font-mono font-bold"
                            value={total}
                            readOnly
                            disabled
                        />
                    </div>

                    {/* Pre-Trade Risk Preview */}
                    <div className="py-1">
                        <PreTradeRiskPreview side={localForm.side} risk={risk} />
                    </div>

                    <button
                        disabled={loading || risk.status === 'BLOCK'}
                        type="submit"
                        className={`w-full h-9 mt-1 inline-flex items-center justify-center rounded-md text-sm font-bold shadow-md transition-all active:scale-[0.98] ${risk.status === 'BLOCK'
                            ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            : localForm.side === 'BUY'
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                    >
                        {loading ? "Sending..." : risk.status === 'BLOCK' ? "Risk Block" : `Submit ${localForm.side} Order`}
                    </button>
                </form>
            </div>
        </div>
    )
}

