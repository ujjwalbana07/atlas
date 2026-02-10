import { LayoutDashboard, Settings, Activity, User, Sun, Moon, Rocket, Radio } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useUserContext } from '../../context/UserContext'
import { useTheme } from '../../context/ThemeContext'
import { useMode } from '../../context/ModeContext'

export default function Header() {
    const { clientId, account, strategy, setContext } = useUserContext()
    const { theme, toggleTheme } = useTheme()
    const { isDemoMode, setIsDemoMode } = useMode()

    return (
        <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between shrink-0 transition-colors duration-300">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2 font-black text-xl text-primary">
                    <Activity className="h-6 w-6 text-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                    <span>ATLAS</span>
                </div>

                <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
                    <NavLink
                        to="/console"
                        className={({ isActive }) =>
                            isActive ? "text-foreground flex items-center gap-2" : "hover:text-foreground transition-colors flex items-center gap-2"
                        }
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Console
                    </NavLink>
                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            isActive ? "text-foreground flex items-center gap-2" : "hover:text-foreground transition-colors flex items-center gap-2"
                        }
                    >
                        <Settings className="h-4 w-4" />
                        Settings
                    </NavLink>
                    <NavLink
                        to="/analytics"
                        className={({ isActive }) =>
                            isActive ? "text-foreground flex items-center gap-2" : "hover:text-foreground transition-colors flex items-center gap-2"
                        }
                    >
                        <Activity className="h-4 w-4" />
                        Analytics
                    </NavLink>
                </nav>
            </div>

            <div className="flex items-center gap-4">
                {/* Mode Toggle */}
                <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border mr-2">
                    <button
                        onClick={() => setIsDemoMode(true)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${isDemoMode ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <Rocket className="h-3 w-3" />
                        Demo
                    </button>
                    <button
                        onClick={() => setIsDemoMode(false)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${!isDemoMode ? 'bg-green-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <Radio className="h-3 w-3" />
                        Live
                    </button>
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 hover:bg-muted/80 rounded-full transition-colors cursor-pointer text-muted-foreground mr-2"
                    title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                    {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </button>

                {/* Context Selector */}
                <div className="flex items-center gap-2 text-xs border rounded-md px-2 py-1 bg-muted/50">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <select
                        className="bg-transparent border-none focus:ring-0 cursor-pointer font-medium"
                        value={clientId}
                        onChange={(e) => setContext({ clientId: e.target.value })}
                    >
                        <option value="CLIENT_X">CLIENT_X</option>
                        <option value="CLIENT_Y">CLIENT_Y</option>
                        <option value="HFT_DESK">HFT_DESK</option>
                    </select>
                    <span className="text-muted-foreground">/</span>
                    <span className="font-mono text-muted-foreground">{account}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="font-mono text-sky-500">{strategy}</span>
                </div>

                <div className="h-4 border-l border-border"></div>
            </div>
        </header>
    )
}
