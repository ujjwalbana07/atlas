export interface RiskStatus {
    status: 'OK' | 'BLOCK'
    message?: string
    requiredAmount: number
    amountAfter: number
    assetAfter: number
    exposureChange: number
    warnings: string[]
}

const HIGH_NOTIONAL_THRESHOLD = 500000
const LOW_BUFFER_PERCENTAGE = 0.1

export const calculatePreTradeRisk = (
    side: 'BUY' | 'SELL',
    qty: number,
    price: number,
    usdAvailable: number,
    btcAvailable: number,
    startingUsd: number = 1000000 // Default or passed from config
): RiskStatus => {
    const total = qty * price
    const warnings: string[] = []

    if (total > HIGH_NOTIONAL_THRESHOLD) {
        warnings.push('High notional')
    }

    if (side === 'BUY') {
        const requiredUsd = total
        const usdAfter = usdAvailable - requiredUsd
        const btcAfter = btcAvailable + qty

        if (usdAfter < startingUsd * LOW_BUFFER_PERCENTAGE && usdAfter >= 0) {
            warnings.push('Low buffer')
        }

        return {
            status: requiredUsd > usdAvailable ? 'BLOCK' : 'OK',
            message: requiredUsd > usdAvailable ? 'Insufficient USD' : undefined,
            requiredAmount: requiredUsd,
            amountAfter: usdAfter,
            assetAfter: btcAfter,
            exposureChange: qty,
            warnings
        }
    } else {
        const requiredBtc = qty
        const btcAfter = btcAvailable - requiredBtc
        const usdAfter = usdAvailable + total

        // Low buffer check for sell doesn't make much sense in terms of USD remaining, 
        // but the requirement said "remaining USD would be < 10% of starting USD".
        // For a sell, USD increases, so buffer usually improves.
        if (usdAvailable < startingUsd * LOW_BUFFER_PERCENTAGE) {
            warnings.push('Low buffer')
        }

        return {
            status: requiredBtc > btcAvailable ? 'BLOCK' : 'OK',
            message: requiredBtc > btcAvailable ? 'Insufficient BTC' : undefined,
            requiredAmount: requiredBtc,
            amountAfter: btcAfter,
            assetAfter: usdAfter,
            exposureChange: -qty,
            warnings
        }
    }
}
