import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
import {
  ArrowRight,
  Database,
  Shield,
  Zap,
  TrendingUp,
  Lock,
  ChevronRight,
  Star,
  Globe,
  Activity,
} from "lucide-react";
import { api, DatasetMeta } from "../lib/api";
import { useCountUp } from "../hooks/useCountUp";
import DatasetCard from "../components/ui/DatasetCard";
import clsx from "clsx";

function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: 4,
        height: 4,
        background: "rgba(201,168,76,0.6)",
        boxShadow: "0 0 8px rgba(201,168,76,0.8)",
        animation: `float ${6 + Math.random() * 6}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 5}s`,
        ...style,
      }}
    />
  );
}

/* ── Animated stat card ── */
function StatCard({
  value,
  label,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const animated = useCountUp(value, 2200, decimals);
  return (
    <div className="glass-card-gold px-8 py-6 text-center flex-1 min-w-[160px]">
      <div className="stat-number text-3xl md:text-4xl text-gold-gradient mb-1">
        {prefix}
        {decimals > 0
          ? animated.toFixed(decimals)
          : Math.round(animated).toLocaleString()}
        {suffix}
      </div>
      <p className="text-sm text-foreground-muted font-body">{label}</p>
    </div>
  );
}

/* ── How it works step ── */
function Step({
  number,
  title,
  desc,
  icon: Icon,
}: {
  number: string;
  title: string;
  desc: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center text-center group">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/25 flex items-center justify-center group-hover:border-gold/50 group-hover:shadow-gold transition-all duration-300">
          <Icon className="w-7 h-7 text-gold" />
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gold text-void text-xs font-bold font-body flex items-center justify-center">
          {number}
        </div>
      </div>
      <h3 className="font-display font-semibold text-lg text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-foreground-muted font-body leading-relaxed max-w-[220px]">
        {desc}
      </p>
    </div>
  );
}

export default function LandingPage() {
  const [stats, setStats] = useState({
    totalDatasets: 0,
    totalQueries: 0,
    totalUsdcEarned: 0,
  });
  const [featured, setFeatured] = useState<DatasetMeta[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch(() => {});
    api
      .getDatasets()
      .then((ds) => setFeatured(ds.slice(0, 3)))
      .catch(() => {});
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Generate particles positions once
  const particles = Array.from({ length: 30 }, (_, i) => ({
    key: i,
    style: {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      opacity: 0.3 + Math.random() * 0.5,
    },
  }));

  return (
    <div className="min-h-screen">
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-20">
        {/* Background patterns */}
        <div className="absolute inset-0 pattern-kente" />
        <div className="absolute inset-0 bg-gradient-to-b from-void via-void/95 to-void-2" />

        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(201,168,76,0.07) 0%, transparent 70%)",
          }}
        />

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <Particle key={p.key} style={p.style} />
          ))}
        </div>

        {/* Hero content */}
        <div
          className={clsx(
            "relative z-10 text-center px-4 max-w-5xl mx-auto transition-all duration-700",
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/25 bg-gold/5 mb-8">
            <Star className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs font-body font-medium text-gold tracking-widest uppercase">
              Web3 Data Marketplace on Stellar
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-foreground mb-6 leading-[1.05]">
            Your Data.
            <br />
            <span className="text-gold-gradient">Your Price.</span>
            <br />
            Automatic Earnings.
          </h1>

          {/* Sub */}
          <p className="text-lg md:text-xl text-foreground-muted font-body max-w-2xl mx-auto mb-12 leading-relaxed">
            Hazina is the luxury marketplace for on-chain intelligence. Upload
            your datasets, set your price, and let our AI escrow agent collect{" "}
            <span className="text-gold font-medium">Stellar micropayments</span>{" "}
            while you sleep.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            data-tour="hero-cta"
          >
            <Link
              to="/sell"
              className="btn-gold text-base px-8 py-4 flex items-center gap-2 shadow-gold-md"
            >
              List Your Data
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/marketplace"
              className="btn-ghost text-base px-8 py-4 flex items-center gap-2"
            >
              Browse Marketplace
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center gap-4">
            <StatCard value={stats.totalDatasets} label="Datasets Listed" />
            <StatCard value={stats.totalQueries} label="Queries Sold" />
            <StatCard
              value={stats.totalUsdcEarned}
              label="USDC Earned"
              prefix="$"
              decimals={2}
            />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-gold/50" />
          <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 relative">
        <div className="absolute inset-0 pattern-bg" />
        <div className="relative max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-gold text-sm font-body font-medium tracking-widest uppercase mb-3">
              The Flow
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              How Hazina Works
            </h2>
            <p className="text-foreground-muted font-body max-w-xl mx-auto">
              From upload to earnings in three steps. The escrow agent handles
              everything automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connector lines */}
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

            <Step
              number="1"
              icon={Upload}
              title="Upload Your Data"
              desc="List your on-chain datasets — whale wallets, trading signals, DeFi yields — and set your price per query."
            />
            <Step
              number="2"
              icon={Shield}
              title="Escrow Protects Both"
              desc="Our AI escrow agent holds data securely and verifies every Stellar x402 micropayment automatically."
            />
            <Step
              number="3"
              icon={TrendingUp}
              title="Earn While You Sleep"
              desc="95% of each payment goes directly to your Stellar wallet. No banks, no delays, instant settlement."
            />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 bg-void-2">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-gold text-sm font-body font-medium tracking-widest uppercase mb-3">
                Why Hazina
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                Built for the New Economy of{" "}
                <em className="text-gold not-italic">Data Sovereignty</em>
              </h2>
              <p className="text-foreground-muted font-body text-lg leading-relaxed mb-8">
                Hazina — <em>treasure</em> in Swahili — represents the untapped
                value in your on-chain intelligence. Stop giving it away free.
                Monetize it securely.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  {
                    icon: Zap,
                    label: "x402 Micropayments",
                    desc: "Sub-second Stellar payment verification",
                  },
                  {
                    icon: Shield,
                    label: "AI-Powered Escrow",
                    desc: "Claude verifies every transaction before data release",
                  },
                  {
                    icon: Globe,
                    label: "Global Marketplace",
                    desc: "Reach data buyers across the world instantly",
                  },
                  {
                    icon: Activity,
                    label: "Real-time Earnings",
                    desc: "Watch USDC arrive in your wallet in real time",
                  },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <p className="font-body font-semibold text-foreground text-sm mb-0.5">
                        {label}
                      </p>
                      <p className="font-body text-sm text-foreground-muted">
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual vault */}
            <div className="relative flex items-center justify-center">
              <div className="relative w-80 h-80">
                {/* Outer ring */}
                <div
                  className="absolute inset-0 rounded-full border border-gold/15 animate-spin-slow"
                  style={{ animationDuration: "20s" }}
                />
                {/* Middle ring */}
                <div
                  className="absolute inset-8 rounded-full border border-gold/20"
                  style={{ animation: "spin 15s linear infinite reverse" }}
                />
                {/* Inner glow */}
                <div className="absolute inset-16 rounded-full bg-gold/5 border border-gold/30 flex items-center justify-center">
                  <div className="text-center">
                    <Lock className="w-10 h-10 text-gold mx-auto mb-2" />
                    <p className="text-xs text-gold font-body font-medium">
                      VAULT SECURED
                    </p>
                  </div>
                </div>
                {/* Orbiting dots */}
                {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 rounded-full bg-gold/60"
                    style={{
                      top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * 130}px - 6px)`,
                      left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * 130}px - 6px)`,
                      boxShadow: "0 0 8px rgba(201,168,76,0.8)",
                      animation: `pulseGold ${2 + i * 0.3}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED DATASETS ── */}
      {featured.length > 0 && (
        <section className="py-24 relative">
          <div className="absolute inset-0 pattern-dense" />
          <div className="relative max-w-6xl mx-auto px-4">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-gold text-sm font-body font-medium tracking-widest uppercase mb-3">
                  Live Now
                </p>
                <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
                  Featured Datasets
                </h2>
              </div>
              <Link
                to="/marketplace"
                className="hidden md:flex btn-ghost items-center gap-2 text-sm"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featured.map((ds) => (
                <DatasetCard key={ds.id} dataset={ds} onBuy={() => {}} />
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                to="/marketplace"
                className="btn-gold text-base px-8 py-4 inline-flex items-center gap-2"
              >
                <Database className="w-5 h-5" />
                Browse All Datasets
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA BANNER ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-void-2" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 70% at 50% 50%, rgba(201,168,76,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            Ready to Monetize Your{" "}
            <span className="text-gold-gradient">On-Chain Intelligence?</span>
          </h2>
          <p className="text-foreground-muted font-body text-lg mb-10">
            Join the sellers already earning USDC passively. Your data is your
            treasure — it's time to unlock it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/sell"
              className="btn-gold text-base px-10 py-4 flex items-center justify-center gap-2 shadow-gold-lg"
            >
              Start Selling Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/marketplace"
              className="btn-ghost text-base px-8 py-4 flex items-center justify-center gap-2"
            >
              Explore Marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/40 py-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center">
              <Database className="w-4 h-4 text-gold" />
            </div>
            <span className="font-display font-semibold text-foreground">
              Hazina
            </span>
          </div>
          <p className="text-xs text-muted-2 font-body">
            Built on Stellar Testnet · Powered by Anthropic Claude · x402
            Protocol
          </p>
          <div className="flex gap-6">
            <Link
              to="/marketplace"
              className="text-xs text-foreground-muted hover:text-gold transition-colors font-body"
            >
              Marketplace
            </Link>
            <Link
              to="/sell"
              className="text-xs text-foreground-muted hover:text-gold transition-colors font-body"
            >
              Sell Data
            </Link>
            <Link
              to="/dashboard"
              className="text-xs text-foreground-muted hover:text-gold transition-colors font-body"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Upload icon (missing from lucide imports above)
function Upload({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
