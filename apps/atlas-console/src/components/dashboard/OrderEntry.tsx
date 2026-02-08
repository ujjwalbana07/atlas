import { useState } from "react"
import { api } from "../../lib/api"
import type { OrderCommand } from "../../types"
import { useUserContext } from "../../context/UserContext"
import { toast } from "sonner"

import { useBalances } from "../../hooks/useBalances"
import { BalancePanel } from "./BalancePanel"

export function OrderEntry() {
    const { clientId } = useUserContext()
    const account = useBalances()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        symbol: "BTC-USD",
        quantity: "1.0",
        price: "50000.00",
        side: "BUY" as "BUY" | "SELL"
    })

    const handleQuantityChange = (val: string) => {
        setForm({ ...form, quantity: val })
    }

    const handlePriceChange = (val: string) => {
        setForm({ ...form, price: val })
    }

    // Derived Total
    const quantityNum = parseFloat(form.quantity)
    const priceNum = parseFloat(form.price)
    const total = (!isNaN(quantityNum) && !isNaN(priceNum))
        ? (quantityNum * priceNum).toFixed(2)
        : "0.00"


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const qty = parseFloat(form.quantity)
        const price = parseFloat(form.price)

        if (isNaN(qty) || qty <= 0) {
            toast.error("Quantity must be a valid number greater than 0")
            return
        }
        if (isNaN(price) || price <= 0) {
            toast.error("Price must be a valid number greater than 0")
            return
        }

        setLoading(true)
        try {
            const order: OrderCommand = {
                order_id: `ord-${Date.now()}`,
                client_id: clientId,
                type: "NEW",
                symbol: form.symbol,
                side: form.side,
                quantity: qty,
                price: price
            }
            await api.submitOrder(order)
            toast.success("Order Submitted", {
                description: `${form.side} ${qty} ${form.symbol} @ ${price}`
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
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            <h3 className="font-semibold mb-4">Order Entry</h3>

            <BalancePanel account={account} />

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Symbol</label>
                    <input
                        className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors cursor-not-allowed opacity-50"
                        value={form.symbol}
                        readOnly
                        disabled
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        className={`h-9 rounded-md px-3 text-sm font-medium transition-colors ${form.side === 'BUY' ? 'bg-green-600 text-white' : 'bg-secondary text-secondary-foreground'}`}
                        onClick={() => setForm({ ...form, side: "BUY" })}
                    >
                        Buy
                    </button>
                    <button
                        type="button"
                        className={`h-9 rounded-md px-3 text-sm font-medium transition-colors ${form.side === 'SELL' ? 'bg-red-600 text-white' : 'bg-secondary text-secondary-foreground'}`}
                        onClick={() => setForm({ ...form, side: "SELL" })}
                    >
                        Sell
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Qty</label>
                        <input
                            type="number"
                            step="0.0001"
                            min="0"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={form.quantity}
                            onChange={e => handleQuantityChange(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">Price</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={form.price}
                            onChange={e => handlePriceChange(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium text-muted-foreground">Total (Notional)</label>
                    <input
                        className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors cursor-not-allowed opacity-50"
                        value={total}
                        readOnly
                        disabled
                    />
                </div>

                <button
                    disabled={loading}
                    type="submit"
                    className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                    {loading ? "Sending..." : "Submit Order"}
                </button>
            </form>
        </div>
    )
}
