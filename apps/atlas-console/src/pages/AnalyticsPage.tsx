import { PriceTrendChart } from "../components/analytics/PriceTrendChart"
import { OrderFlowChart } from "../components/analytics/OrderFlowChart"
import { ExposureChart } from "../components/analytics/ExposureChart"
import { PaperPnLChart } from "../components/analytics/PaperPnLChart"
import { OrderDistributionChart } from "../components/analytics/OrderDistributionChart"
import { SpreadChart } from "../components/analytics/SpreadChart"

export default function AnalyticsPage() {
    return (
        <div className="flex flex-col gap-6 h-full overflow-y-auto px-1 pb-20">
            <div className="flex flex-col gap-1 mt-4">
                <h1 className="text-2xl font-bold tracking-tight">Intelligence & Analytics</h1>
                <p className="text-sm text-muted-foreground italic">Full lifecycle execution monitoring and risk metrics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Status is now prioritized here too */}
                <OrderDistributionChart />
                <OrderFlowChart />
                <PaperPnLChart />
                <ExposureChart />
                <SpreadChart />
                <div className="lg:col-span-3">
                    <PriceTrendChart className="h-[400px]" />
                </div>
            </div>
        </div>
    )
}
