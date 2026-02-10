export type OrderSide = 'BUY' | 'SELL'
export type OrderType = 'MARKET' | 'LIMIT'
export type OrderStatus = 'NEW' | 'PENDING_SUBMIT' | 'LIVE' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCEL_PENDING' | 'CANCELED' | 'REPLACE_PENDING' | 'REJECTED'

export interface OrderCommand {
    command_id?: string
    type: 'NEW' | 'CANCEL' | 'REPLACE'
    order_id: string
    client_id: string
    symbol: string
    side: OrderSide
    quantity: number
    price: number
    timestamp?: string
}

export interface ExecutionReport {
    exec_id: string
    order_id: string
    client_id?: string
    symbol?: string
    side?: OrderSide
    order_qty?: number
    price?: number
    type: string
    status: OrderStatus
    last_qty?: number
    last_px?: number
    leaves_qty: number
    cum_qty: number
    avg_px: number
    timestamp: string
    reason?: string
}

export type MarketDataType = 'L2' | 'TRADE'

export interface PriceLevel {
    price: number
    qty: number
}

export interface TradeInfo {
    price: number
    qty: number
    side: 'BUY' | 'SELL'
}

export interface MarketDataUpdate {
    type: MarketDataType
    symbol: string
    bids?: PriceLevel[]
    asks?: PriceLevel[]
    trade?: TradeInfo
    timestamp: string
}

// Flattened Order model for the Blotter
export interface OrderRow {
    order_id: string
    client_id: string
    symbol: string
    side: OrderSide
    quantity: number
    price: number
    status: OrderStatus
    filled_qty: number
    avg_price: number
    updated_at: string
}
export interface Balance {
    available: number
    reserved: number
}

export interface Account {
    usd: Balance
    btc: Balance
}
