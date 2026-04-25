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
import { LocaleSwitcher, useI18n } from "../../i18n";

const NAV_LINKS = [
  { to: "/marketplace", key: "nav.marketplace", icon: ShoppingCart, dataTour: "marketplace-link" },
  { to: "/agent", key: "nav.agent", icon: Bot, dataTour: "agent-link" },
  { to: "/sell", key: "nav.sell", icon: Upload, dataTour: "sell-link" },
  { to: "/dashboard", key: "nav.dashboard", icon: BarChart3, dataTour: "dashboard-link" },
] as const;

export default function Navbar() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-4 mt-4">
        <nav className="glass-card-gold px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="Hazina Home">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center group-hover:border-gold/60 transition-all duration-300">
              <Database className="w-5 h-5 text-gold" aria-hidden="true" />
            </div>
            <span className="font-display font-semibold text-xl text-foreground group-hover:text-gold transition-colors duration-300">
              {t("nav.brand")}
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, key, icon: Icon, dataTour }) => (
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
                <Icon className="w-4 h-4" aria-hidden="true" />
                {t(key)}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <LocaleSwitcher />
            <Link to="/marketplace" className="btn-gold text-sm px-5 py-2">
              {t("common.actions.browseData")}
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className="md:hidden text-foreground-muted hover:text-foreground p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={t("nav.mobileMenu")}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="glass-card-gold mt-2 p-4 flex flex-col gap-2">
            <div className="px-2 py-1">
              <LocaleSwitcher className="w-full" />
            </div>
            {NAV_LINKS.map(({ to, key, icon: Icon }) => (
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
                {t(key)}
              </Link>
            ))}
            <Link
              to="/marketplace"
              className="btn-gold text-sm text-center mt-2"
              onClick={() => setMobileOpen(false)}
            >
              {t("common.actions.browseData")}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
