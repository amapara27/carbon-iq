import { NavLink } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  Trophy,
  Leaf,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/staking", label: "Staking", icon: Landmark },
  { to: "/swaps", label: "Swaps", icon: ArrowLeftRight },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-surface-300/50 bg-surface/80 backdrop-blur-xl flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-surface-300/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-carbon-600 shadow-lg shadow-carbon-600/30">
          <Leaf className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold gradient-text">CarbonIQ</h1>
          <p className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">
            Solana · Devnet
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-carbon-600/20 text-accent-emerald border border-carbon-600/30 shadow-sm shadow-carbon-500/10"
                  : "text-gray-400 hover:text-white hover:bg-surface-200"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Wallet */}
      <div className="p-4 border-t border-surface-300/50">
        <WalletMultiButton className="!w-full !justify-center !rounded-lg !bg-surface-200 !border !border-surface-300 !text-sm !font-medium hover:!bg-surface-300 !transition-all !duration-200" />
      </div>
    </aside>
  );
}
