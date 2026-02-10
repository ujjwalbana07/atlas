import type { ExecutionReport, MarketDataUpdate, OrderCommand, Account } from '../types'

export class DemoEngine {
    private static instance: DemoEngine
    private balances: Account
    private orders: Record<string, any> = {}
    private trades: any[] = []
    private lastPrice: number = 50000.00
    private subscribers: ((data: any) => void)[] = []
    private intervalId: any = null

    private constructor() {
        const saved = localStorage.getItem('atlas_demo_state')
        if (saved) {
            const state = JSON.parse(saved)
            this.balances = state.balances
            this.orders = state.orders
            this.trades = state.trades
            this.lastPrice = state.lastPrice
        } else {
            this.balances = {
                usd: { available: 100000, reserved: 0 },
                btc: { available: 50.0000, reserved: 0 }
            }
        }
        this.startEngine()
    }

    public static getInstance(): DemoEngine {
        if (!DemoEngine.instance) {
            DemoEngine.instance = new DemoEngine()
        }
        return DemoEngine.instance
    }

    private startEngine() {
        if (this.intervalId) return
        this.intervalId = setInterval(() => {
            this.simulatePrice()
            this.matchOrders()
            this.broadcastMarketData()
            this.saveState()
        }, 250)
    }

    private simulatePrice() {
        // Random walk
        const change = (Math.random() - 0.5) * 10
        this.lastPrice = Math.max(1, this.lastPrice + change)
    }

    private broadcastMarketData() {
        const spread = Math.random() * 2 + 1
        const mid = this.lastPrice

        const bids = Array.from({ length: 10 }).map((_, i) => ({
            price: mid - (spread / 2) - (i * 0.5),
            qty: Math.random() * 2 + 0.1
        }))

        const asks = Array.from({ length: 10 }).map((_, i) => ({
            price: mid + (spread / 2) + (i * 0.5),
            qty: Math.random() * 2 + 0.1
        }))

        const update: MarketDataUpdate = {
            type: 'L2',
            symbol: 'BTC-USD',
            bids,
            asks,
            timestamp: new Date().toISOString()
        }

        this.notify(update)

        // Occasionally broadcast a trade
        if (Math.random() > 0.7) {
            const tradeUpdate: MarketDataUpdate = {
                type: 'TRADE',
                symbol: 'BTC-USD',
                trade: {
                    price: this.lastPrice,
                    qty: Math.random() * 0.5 + 0.01,
                    side: Math.random() > 0.5 ? 'BUY' : 'SELL'
                },
                timestamp: new Date().toISOString()
            }
            this.trades.unshift(tradeUpdate)
            this.trades = this.trades.slice(0, 100)
            this.notify(tradeUpdate)
        }
    }

    private matchOrders() {
        Object.values(this.orders).forEach(order => {
            if (order.status === 'FILLED' || order.status === 'CANCELED' || order.status === 'REJECTED') return

            let filled = false
            let fillPrice = 0
            let fillQty = 0

            if (order.side === 'BUY' && this.lastPrice <= order.price) {
                fillPrice = this.lastPrice
                fillQty = order.quantity - order.filled_qty
                filled = true
            } else if (order.side === 'SELL' && this.lastPrice >= order.price) {
                fillPrice = this.lastPrice
                fillQty = order.quantity - order.filled_qty
                filled = true
            }

            if (filled) {
                // Partial fill simulation (50% chance of full fill)
                const isPartial = Math.random() > 0.5
                if (isPartial) {
                    fillQty = Number((fillQty * Math.random()).toFixed(4))
                }

                if (fillQty > 0) {
                    const newFilledQty = Number((order.filled_qty + fillQty).toFixed(4))
                    const newAvgPrice = ((order.avg_price * order.filled_qty) + (fillPrice * fillQty)) / newFilledQty

                    order.filled_qty = newFilledQty
                    order.avg_price = newAvgPrice
                    order.status = order.filled_qty >= order.quantity ? 'FILLED' : 'PARTIALLY_FILLED'
                    order.updated_at = new Date().toISOString()

                    // Settle balances
                    if (order.side === 'BUY') {
                        const cost = fillPrice * fillQty
                        this.balances.usd.reserved -= cost
                        this.balances.btc.available += fillQty
                    } else {
                        this.balances.btc.reserved -= fillQty
                        this.balances.usd.available += (fillPrice * fillQty)
                    }

                    this.notifyOrder(order)
                }
            }
        })
    }

    public submitOrder(cmd: OrderCommand) {
        const order_id = cmd.order_id || Math.random().toString(36).substring(7)

        // Initial balance check & reservation
        if (cmd.side === 'BUY') {
            const cost = cmd.price * cmd.quantity
            if (this.balances.usd.available < cost) {
                this.notifyError(order_id, 'Insufficient USD balance')
                return
            }
            this.balances.usd.available -= cost
            this.balances.usd.reserved += cost
        } else {
            if (this.balances.btc.available < cmd.quantity) {
                this.notifyError(order_id, 'Insufficient BTC balance')
                return
            }
            this.balances.btc.available -= cmd.quantity
            this.balances.btc.reserved += cmd.quantity
        }

        const newOrder = {
            order_id,
            client_id: cmd.client_id,
            symbol: cmd.symbol,
            side: cmd.side,
            quantity: cmd.quantity,
            price: cmd.price,
            status: 'LIVE',
            filled_qty: 0,
            avg_price: 0,
            updated_at: new Date().toISOString()
        }

        this.orders[order_id] = newOrder
        this.notifyOrder(newOrder)
    }

    private notifyOrder(order: any) {
        const report: ExecutionReport = {
            exec_id: Math.random().toString(36).substring(7),
            order_id: order.order_id,
            client_id: order.client_id,
            symbol: order.symbol,
            side: order.side,
            order_qty: order.quantity,
            price: order.price,
            type: 'FILL',
            status: order.status,
            leaves_qty: Number((order.quantity - order.filled_qty).toFixed(4)),
            cum_qty: order.filled_qty,
            avg_px: order.avg_price,
            timestamp: order.updated_at
        }
        this.notify(report)
    }

    private notifyError(order_id: string, reason: string) {
        const report: ExecutionReport = {
            exec_id: Math.random().toString(36).substring(7),
            order_id,
            type: 'REJECTED',
            status: 'REJECTED',
            leaves_qty: 0,
            cum_qty: 0,
            avg_px: 0,
            timestamp: new Date().toISOString(),
            reason
        }
        this.notify(report)
    }

    private notify(data: any) {
        this.subscribers.forEach(sub => sub(data))
    }

    public subscribe(callback: (data: any) => void) {
        this.subscribers.push(callback)
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback)
        }
    }

    public getBalances(): Account {
        return this.balances
    }

    public reset() {
        this.balances = {
            usd: { available: 100000, reserved: 0 },
            btc: { available: 50.0000, reserved: 0 }
        }
        this.orders = {}
        this.trades = []
        this.lastPrice = 50000.00
        this.saveState()
        // Force a refresh of UI by notifying subscribers if needed, 
        // but usually resetting balances will trigger updates via hooks.
    }

    private saveState() {
        localStorage.setItem('atlas_demo_state', JSON.stringify({
            balances: this.balances,
            orders: this.orders,
            trades: this.trades,
            lastPrice: this.lastPrice
        }))
    }
}
