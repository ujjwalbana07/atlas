import type { Account } from "../../hooks/useBalances"

export function BalancePanel({ account }: { account: Account | null }) {
    if (!account) return <div className="text-xs text-muted-foreground">Loading balances...</div>

    const format = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 mb-4">
            <h3 className="font-semibold mb-2 text-sm">Balances</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <div className="text-muted-foreground text-xs">USD Available</div>
                    <div className="font-mono font-bold">${format(account.usd.available)}</div>
                    <div className="text-muted-foreground text-xs mt-1">Reserved</div>
                    <div className="font-mono text-muted-foreground">${format(account.usd.reserved)}</div>
                </div>
                <div>
                    <div className="text-muted-foreground text-xs">BTC Available</div>
                    <div className="font-mono font-bold">{format(account.btc.available)} BTC</div>
                    <div className="text-muted-foreground text-xs mt-1">Reserved</div>
                    <div className="font-mono text-muted-foreground">{format(account.btc.reserved)} BTC</div>
                </div>
            </div>
        </div>
    )
}
