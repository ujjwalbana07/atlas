import { useState } from 'react';
import {
    ChevronUp,
    ChevronDown,
    Shield,
    Zap,
    Box,
    Cpu,
    Layers,
    Globe,
    Database,
    Activity
} from 'lucide-react';

export default function Footer() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <footer className="w-full border-t border-primary/30 bg-zinc-950/90 backdrop-blur-xl text-zinc-400 shrink-0 z-50 transition-all duration-500 ease-in-out font-mono relative shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            {/* Top Precision Glow */}
            <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent blur-[1px]" />

            {/* Refined Details Drawer (Collapsible) */}
            <div
                className={`overflow-hidden transition-all duration-500 ease-in-out border-b border-white/5 bg-black/20 ${isExpanded ? 'max-h-[400px] opacity-100 py-10' : 'max-h-0 opacity-0 py-0'
                    }`}
            >
                <div className="px-10 grid grid-cols-1 md:grid-cols-2 gap-20 max-w-7xl mx-auto">
                    {/* Section 1: EXECUTION RADIUS */}
                    <div className="space-y-8 relative">
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                <Cpu className="h-5 w-5 text-primary" />
                            </div>
                            <h4 className="text-sm font-black tracking-[0.4em] text-white uppercase italic">
                                Execution Radius
                            </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm">
                            <div className="space-y-1.5">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Instrument</span>
                                <p className="text-white font-bold flex items-center gap-2 text-base">
                                    BTC-USD <span className="text-[10px] text-primary px-1.5 py-0.5 rounded-sm bg-primary/10 border border-primary/30 font-black">X-PERP</span>
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Matching Mode</span>
                                <p className="text-white font-bold text-base">Low-Latency</p>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Connectivity</span>
                                <p className="text-white font-bold text-base">TCP/Direct</p>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Risk Guard</span>
                                <p className="text-green-400 font-black flex items-center gap-2 text-base">
                                    <Shield className="h-4 w-4" /> ENABLED
                                </p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden md:block absolute -right-10 top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                    </div>

                    {/* Section 2: SAFETY & PROTOCOL */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                                <Shield className="h-5 w-5 text-amber-400" />
                            </div>
                            <h4 className="text-sm font-black tracking-[0.4em] text-white uppercase italic">
                                Safety & Protocol
                            </h4>
                        </div>

                        <div className="space-y-5">
                            <div className="flex gap-4 group">
                                <Layers className="h-5 w-5 text-zinc-500 shrink-0 group-hover:text-primary transition-colors mt-1" />
                                <div className="space-y-1">
                                    <p className="text-white font-bold text-sm">Simulation Engine v2.4</p>
                                    <p className="text-zinc-400 text-xs leading-relaxed">
                                        All trades and balances are strictly virtual. Platform simulates institutional liquidity without financial risk.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4 group">
                                <Globe className="h-5 w-5 text-zinc-500 shrink-0 group-hover:text-purple-400 transition-colors mt-1" />
                                <div className="space-y-1">
                                    <p className="text-white font-bold text-sm">Deployment Environment</p>
                                    <p className="text-zinc-400 text-xs leading-relaxed">
                                        Public engineering demonstration optimized for the ATLAS distributed trading stack.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Status Bar (Always Visible) */}
            <div className="h-[60px] px-8 flex items-center justify-between relative bg-black/20">
                <div className="flex items-center gap-10">
                    {/* Left: Branding */}
                    <div className="flex items-center gap-5">
                        <div className="flex flex-col group cursor-default">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Box className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="font-black text-sm tracking-[0.3em] text-white">ATLAS</span>
                                    <span className="text-[10px] font-black text-zinc-500 tracking-widest">PRO</span>
                                </div>
                            </div>
                            <span className="text-[8px] font-black tracking-[0.1em] text-zinc-600 uppercase mt-0.5">
                                Advanced Trading Lifecycle & Audit System
                            </span>
                        </div>
                        <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                            <span className="text-[10px] font-black text-zinc-500 uppercase">Beta_0.1</span>
                        </div>
                    </div>

                    <div className="h-5 w-px bg-white/10 hidden lg:block" />

                    {/* Center: Live Metrics */}
                    <div className="hidden lg:flex items-center gap-8">
                        <StatusBarBadge icon={<Zap className="h-3.5 w-3.5" />} label="Market" status="LIVE" color="green" />
                        <StatusBarBadge icon={<Database className="h-3.5 w-3.5" />} label="Gateway" status="ONLINE" color="green" />
                        <StatusBarBadge icon={<Activity className="h-3.5 w-3.5" />} label="OMS" status="HEALTHY" color="green" />
                        <StatusBarBadge icon={<Globe className="h-3.5 w-3.5" />} label="Venue" status="ACTIVE" color="blue" />
                    </div>
                </div>

                {/* Right: Credit & Toggle */}
                <div className="flex items-center gap-8">
                    <div className="hidden sm:flex items-center gap-2.5">
                        <span className="text-[10px] font-black tracking-widest text-zinc-600 uppercase">DEVELOPED BY</span>
                        <span className="text-[11px] font-black text-white tracking-widest uppercase italic bg-white/5 px-3 py-1 rounded-sm border border-white/5 hover:border-primary transition-all cursor-default">
                            Ujjwal Bana
                        </span>
                    </div>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`flex items-center gap-2.5 px-5 py-2 rounded-full border transition-all duration-300 text-[11px] font-black uppercase tracking-widest group ${isExpanded
                            ? 'bg-primary text-white border-primary shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                            : 'bg-white/5 text-zinc-300 border-white/10 hover:border-white/30 hover:bg-white/10'
                            }`}
                    >
                        {isExpanded ? 'System Min' : 'System Details'}
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                        )}
                    </button>
                </div>
            </div>
        </footer>
    );
}

function StatusBarBadge({ icon, label, status, color }: { icon: React.ReactNode, label: string, status: string, color: 'green' | 'blue' | 'amber' }) {
    const colorClasses = {
        green: 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]',
        blue: 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]',
        amber: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
    };

    const textClasses = {
        green: 'text-green-400',
        blue: 'text-blue-400',
        amber: 'text-amber-400'
    };

    return (
        <div className="flex items-center gap-3 group cursor-default">
            <div className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-white/5 border border-white/5 group-hover:border-primary/20 transition-all">
                <span className="text-zinc-600 group-hover:text-zinc-300 transition-colors uppercase text-[10px] font-black tracking-widest flex items-center gap-2">
                    {icon}
                    {label}
                </span>
                <span className={`h-1.5 w-1.5 rounded-full ${colorClasses[color]}`} />
                <span className={`text-[10px] font-black tracking-widest ${textClasses[color]}`}>{status}</span>
            </div>
        </div>
    );
}
