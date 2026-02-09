import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { RiskStatus } from '../../lib/riskUtils'

interface PreTradeRiskPreviewProps {
    side: 'BUY' | 'SELL'
    risk: RiskStatus
}

export function PreTradeRiskPreview({ side, risk }: PreTradeRiskPreviewProps) {
    const isBlock = risk.status === 'BLOCK'

    return (
        <div className="rounded-md border bg-muted/20 p-2 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <Shield className="h-3 w-3" />
                    Risk Preview
                </div>
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${isBlock ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
                    }`}>
                    {isBlock ? <XCircle className="h-2 w-2" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
                    {risk.status}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                    <p className="text-[9px] text-muted-foreground uppercase">{side === 'BUY' ? 'Req. USD' : 'Req. BTC'}</p>
                    <p className="text-xs font-mono font-bold">
                        {side === 'BUY' ? '$' : ''}{risk.requiredAmount.toLocaleString(undefined, { minimumFractionDigits: side === 'BUY' ? 2 : 4 })}
                    </p>
                </div>
                <div className="space-y-0.5">
                    <p className="text-[9px] text-muted-foreground uppercase">Exposure</p>
                    <p className={`text-xs font-mono font-bold ${risk.exposureChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {risk.exposureChange > 0 ? '+' : ''}{risk.exposureChange} BTC
                    </p>
                </div>
            </div>

            <div className="pt-1.5 border-t border-border/50 grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                    <p className="text-[9px] text-muted-foreground uppercase">USD Post</p>
                    <p className="text-[10px] font-mono font-medium">
                        ${(side === 'BUY' ? risk.amountAfter : risk.assetAfter).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="space-y-0.5">
                    <p className="text-[9px] text-muted-foreground uppercase">BTC Post</p>
                    <p className="text-[10px] font-mono font-medium">
                        {(side === 'BUY' ? risk.assetAfter : risk.amountAfter).toLocaleString(undefined, { minimumFractionDigits: 4 })}
                    </p>
                </div>
            </div>

            {risk.warnings.length > 0 && (
                <div className="space-y-1 pt-0.5">
                    {risk.warnings.map((warning, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[9px] text-yellow-600 dark:text-yellow-400 font-medium">
                            <AlertTriangle className="h-2 w-2" />
                            {warning}
                        </div>
                    ))}
                </div>
            )}

            {isBlock && risk.message && (
                <p className="text-[10px] text-red-500 font-bold bg-red-500/10 p-1 rounded text-center">
                    {risk.message}
                </p>
            )}
        </div>
    )
}
