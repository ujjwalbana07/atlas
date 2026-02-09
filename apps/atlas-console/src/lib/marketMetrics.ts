import type { MarketDataUpdate } from '../types'

export type Level = 'LOW' | 'MEDIUM' | 'HIGH'
export type Bias = 'BUY-SIDE' | 'SELL-SIDE' | 'NEUTRAL'

export interface MarketMetrics {
    volatility: { value: number; level: Level }
    spread: { value: number; level: Level }
    liquidity: { value: number; level: Level }
    trendBias: { value: number; bias: Bias }
}

export const computeVolatility = (trades: MarketDataUpdate[], n = 50): { value: number; level: Level } => {
    if (trades.length < 2) return { value: 0, level: 'LOW' }

    const relevantTrades = trades.slice(0, n).reverse() // Oldest to newest
    const returns: number[] = []

    for (let i = 1; i < relevantTrades.length; i++) {
        const prevPrice = relevantTrades[i - 1].trade?.price || 0
        const currPrice = relevantTrades[i].trade?.price || 0
        if (prevPrice > 0) {
            returns.push((currPrice - prevPrice) / prevPrice)
        }
    }

    if (returns.length < 2) return { value: 0, level: 'LOW' }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)

    const value = stdDev * 100 // as percentage
    let level: Level = 'LOW'
    if (value >= 0.2 && value <= 0.6) level = 'MEDIUM'
    if (value > 0.6) level = 'HIGH'

    return { value, level }
}

export const computeSpread = (l2: MarketDataUpdate | undefined): { value: number; level: Level } => {
    if (!l2 || !l2.asks?.[0] || !l2.bids?.[0]) return { value: 0, level: 'LOW' }

    const bestAsk = l2.asks[0].price
    const bestBid = l2.bids[0].price
    const mid = (bestAsk + bestBid) / 2

    if (mid === 0) return { value: 0, level: 'LOW' }

    const spreadBps = ((bestAsk - bestBid) / mid) * 10000

    let level: Level = 'LOW' // TIGHT
    if (spreadBps >= 5 && spreadBps <= 20) level = 'MEDIUM' // NORMAL
    if (spreadBps > 20) level = 'HIGH' // WIDE

    return { value: spreadBps, level }
}

export const computeLiquidity = (l2: MarketDataUpdate | undefined): { value: number; level: Level } => {
    if (!l2) return { value: 0, level: 'LOW' }

    const top3Bids = (l2.bids || []).slice(0, 3).reduce((sum, b) => sum + b.qty, 0)
    const top3Asks = (l2.asks || []).slice(0, 3).reduce((sum, a) => sum + a.qty, 0)
    const totalDepth = top3Bids + top3Asks

    // Thresholds based on typical simulation values
    // Let's assume 10.0 is MEDIUM, 20.0 is HIGH
    let level: Level = 'LOW'
    if (totalDepth >= 5 && totalDepth < 15) level = 'MEDIUM'
    if (totalDepth >= 15) level = 'HIGH'

    return { value: totalDepth, level }
}

export const computeTrendBias = (trades: MarketDataUpdate[], n = 50): { value: number; bias: Bias } => {
    if (trades.length === 0) return { value: 0, bias: 'NEUTRAL' }

    const relevantTrades = trades.slice(0, n)
    let buyVol = 0
    let sellVol = 0

    for (let i = 0; i < relevantTrades.length; i++) {
        const t = relevantTrades[i]
        if (!t.trade) continue

        let side = t.trade.side
        if (!side) {
            // Infer from price move if side is missing
            if (i < relevantTrades.length - 1) {
                const prevPrice = relevantTrades[i + 1].trade?.price || 0
                side = t.trade.price > prevPrice ? 'BUY' : 'SELL'
            }
        }

        if (side === 'BUY') buyVol += t.trade.qty
        else if (side === 'SELL') sellVol += t.trade.qty
    }

    const biasValue = buyVol - sellVol
    const totalVol = buyVol + sellVol

    let bias: Bias = 'NEUTRAL'
    // Neutral zone around 5% of total volume or fixed 0.1
    const threshold = totalVol * 0.05
    if (biasValue > threshold) bias = 'BUY-SIDE'
    if (biasValue < -threshold) bias = 'SELL-SIDE'

    return { value: biasValue, bias }
}
