import { PriceTrendChart } from "../components/analytics/PriceTrendChart"
import { OrderFlowChart } from "../components/analytics/OrderFlowChart"
import { ExposureChart } from "../components/analytics/ExposureChart"
import { PaperPnLChart } from "../components/analytics/PaperPnLChart"
import { OrderDistributionChart } from "../components/analytics/OrderDistributionChart"

export default function AnalyticsPage() {
    return (
        <div className="flex flex-col gap-4 h-full overflow-y-auto">
            <h1 className="text-2xl font-bold tracking-tight">Analytics & Insights</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                {/* Row 1: Price & Flow (Full Width / Large) */}
                <div className="col-span-1 md:col-span-2 lg:col-span-2">
                    <PriceTrendChart />
                </div>
                <div className="col-span-1">
                    <OrderFlowChart />
                </div>

                {/* Row 2: Financials & Status */}
                <ExposureChart />
                <PaperPnLChart />
                <OrderDistributionChart />
            </div>
        </div>
    )
}
