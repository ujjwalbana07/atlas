import { useState } from 'react';
import { ChevronUp, ChevronDown, Shield, Zap, Box } from 'lucide-react';

export default function Footer() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <footer className="w-full border-t border-border bg-card/80 backdrop-blur-md text-muted-foreground shrink-0 z-50 transition-all duration-300 ease-in-out font-mono">
            {/* Expanded Details Panel */}
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out border-b border-border/30 bg-muted/20 ${isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-12 max-w-7xl mx-auto">
                    {/* Column A: Execution Scope */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-foreground uppercase">
                            <Zap className="h-3 w-3 text-blue-500" />
                            Execution Scope
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                            <span className="opacity-60">Asset:</span>
                            <span className="text-foreground">BTC-USD (Simulated)</span>
                            <span className="opacity-60">Order Types:</span>
                            <span className="text-foreground">Limit</span>
                            <span className="opacity-60">Settlement:</span>
                            <span className="text-foreground">T+0 (Sim)</span>
                            <span className="opacity-60">Risk Controls:</span>
                            <span className="text-green-500 font-medium whitespace-nowrap">Enabled</span>
                        </div>
                    </div>

                    {/* Column B: Usage / Safety */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-foreground uppercase">
                            <Shield className="h-3 w-3 text-red-500" />
                            Usage & Safety
                        </div>
                        <ul className="space-y-1.5 text-[11px] leading-relaxed list-none">
                            <li className="flex gap-2">
                                <span className="text-yellow-500 flex-shrink-0">•</span>
                                <span>Simulation environment only. No real funds involved.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-yellow-500 flex-shrink-0">•</span>
                                <span>This platform is not an exchange, broker, or custodian.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-yellow-500 flex-shrink-0">•</span>
                                <span>Engineering demonstration for high-frequency trading infra.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Compact Command Footer (Status Bar) */}
            <div className="h-[52px] px-6 flex items-center justify-between transition-colors duration-300">
                <div className="flex items-center gap-6">
                    {/* Left Section */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Box className="h-4 w-4 text-primary" />
                            <span className="font-bold text-xs tracking-wider text-foreground">ATLAS</span>
                        </div>
                        <div className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-sm text-[9px] font-bold text-blue-500 tracking-tighter uppercase">
                            Demo
                        </div>
                        <span className="text-[10px] opacity-40">v0.1.0</span>
                    </div>

                    <div className="h-4 w-px bg-border/50 hidden md:block" />

                    {/* Center Section: System Status */}
                    <div className="hidden md:flex items-center gap-5 text-[10px] font-medium tracking-tight">
                        <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                            <span className="opacity-60">Market:</span>
                            <span className="text-foreground/90">Live</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                            <span className="opacity-60">Gateway:</span>
                            <span className="text-foreground/90">Online</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                            <span className="opacity-60">OMS:</span>
                            <span className="text-foreground/90">Healthy</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                            <span className="opacity-60">Venue:</span>
                            <span className="text-foreground/90">Active</span>
                        </div>
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-6">
                    <span className="text-[10px] italic opacity-40 hover:opacity-100 transition-opacity cursor-default hidden sm:block">
                        Developed by Ujjwal Bana
                    </span>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-muted transition-colors text-[10px] font-bold uppercase tracking-wider text-foreground/80 group"
                    >
                        Details
                        {isExpanded ? (
                            <ChevronDown className="h-3 w-3 transition-transform group-hover:translate-y-0.5" />
                        ) : (
                            <ChevronUp className="h-3 w-3 transition-transform group-hover:-translate-y-0.5" />
                        )}
                    </button>
                </div>
            </div>
        </footer>
    );
}
