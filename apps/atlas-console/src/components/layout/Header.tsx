import { LayoutDashboard, Settings, Activity, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useUserContext } from '../../context/UserContext'

export default function Header() {
    const { clientId, account, strategy, setContext } = useUserContext()

    return (
        <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2 font-bold text-xl text-primary">
                    <Activity className="h-6 w-6 text-blue-500" />
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
