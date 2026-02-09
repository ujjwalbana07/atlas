import type { Level } from './marketMetrics'

export const estimateFillProbability = (
    side: 'BUY' | 'SELL',
    price: number,
    bestBid: number,
    bestAsk: number,
    volatilityLevel: Level,
    spreadLevel: Level
): { probability: number; label: string } => {
    if (price <= 0 || bestBid <= 0 || bestAsk <= 0) return { probability: 0, label: 'Unlikely' }

    const mid = (bestBid + bestAsk) / 2
    let probability = 0

    if (side === 'BUY') {
        if (price >= bestAsk) {
            probability = 95
        } else {
            const distanceBps = ((bestAsk - price) / mid) * 10000
            probability = mapDistanceToProbability(distanceBps)
        }
    } else {
        if (price <= bestBid) {
            probability = 95
        } else {
            const distanceBps = ((price - bestBid) / mid) * 10000
            probability = mapDistanceToProbability(distanceBps)
        }
    }

    // Adjust for market conditions
    if (volatilityLevel === 'HIGH') probability -= 5
    if (spreadLevel === 'HIGH') probability -= 5

    // Clamp
    probability = Math.max(5, Math.min(95, probability))

    let label = 'Unlikely'
    if (probability > 70) label = 'Likely to fill soon'
    else if (probability > 40) label = 'May rest'

    return { probability, label }
}

const mapDistanceToProbability = (distanceBps: number): number => {
    if (distanceBps <= 5) {
        // 0 -> 90%, 5 -> 70%
        return 90 - (distanceBps / 5) * 20
    } else if (distanceBps <= 20) {
        // 5 -> 70%, 20 -> 40%
        return 70 - ((distanceBps - 5) / 15) * 30
    } else {
        // 20 -> 40%, 100 -> 5%
        return Math.max(5, 40 - ((distanceBps - 20) / 80) * 35)
    }
}
