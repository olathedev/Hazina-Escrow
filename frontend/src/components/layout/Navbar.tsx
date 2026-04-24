import { Link, useLocation } from "react-router-dom";
import {
  Database,
  BarChart3,
  Upload,
  ShoppingCart,
  Menu,
  X,
  Bot,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const NAV_LINKS = [
  {
    to: "/marketplace",
    label: "Marketplace",
    icon: ShoppingCart,
    dataTour: "marketplace-link",
  },
  { to: "/agent", label: "AI Agent", icon: Bot, dataTour: "agent-link" },
  { to: "/sell", label: "Sell Data", icon: Upload, dataTour: "sell-link" },
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: BarChart3,
    dataTour: "dashboard-link",
  },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-4 mt-4">
        <nav className="glass-card-gold px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center group-hover:border-gold/60 transition-all duration-300">
              <Database className="w-5 h-5 text-gold" />
            </div>
            <span className="font-display font-semibold text-xl text-foreground group-hover:text-gold transition-colors duration-300">
              Hazina
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label, icon: Icon, dataTour }) => (
              <Link
                key={to}
                to={to}
                data-tour={dataTour}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium font-body transition-all duration-200",
                  pathname === to
                    ? "bg-gold/15 text-gold border border-gold/25"
                    : "text-foreground-muted hover:text-foreground hover:bg-surface-2",
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/marketplace" className="btn-gold text-sm px-5 py-2">
              Browse Data
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-foreground-muted hover:text-foreground p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="glass-card-gold mt-2 p-4 flex flex-col gap-2">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium font-body transition-all duration-200",
                  pathname === to
                    ? "bg-gold/15 text-gold border border-gold/25"
                    : "text-foreground-muted hover:text-foreground hover:bg-surface-2",
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            <Link
              to="/marketplace"
              className="btn-gold text-sm text-center mt-2"
              onClick={() => setMobileOpen(false)}
            >
              Browse Data
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
