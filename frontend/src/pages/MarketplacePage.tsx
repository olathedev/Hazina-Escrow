import { useEffect, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  TrendingUp,
  Clock,
  DollarSign,
  X,
} from "lucide-react";
import { api, DatasetMeta } from "../lib/api";
import { DATA_TYPE_META } from "../lib/utils";
import DatasetCard from "../components/ui/DatasetCard";
import QueryModal from "../components/ui/QueryModal";
import { DatasetCardSkeleton } from "../components/ui/SkeletonLoader";
import clsx from "clsx";

const TYPE_FILTERS = [
  { value: "", label: "All Types" },
  { value: "whale-wallets", label: "Whale Wallets" },
  { value: "trading-signals", label: "Trading Signals" },
  { value: "yield-data", label: "Yield Data" },
  { value: "risk-scores", label: "Risk Scores" },
  { value: "nft-data", label: "NFT Data" },
  { value: "sentiment", label: "Sentiment" },
];

const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular", icon: TrendingUp },
  { value: "price-asc", label: "Price: Low → High", icon: DollarSign },
  { value: "price-desc", label: "Price: High → Low", icon: DollarSign },
  { value: "newest", label: "Newest First", icon: Clock },
];

export default function MarketplacePage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort, setSort] = useState("popular");
  const [selectedDataset, setSelectedDataset] = useState<DatasetMeta | null>(
    null,
  );

  useEffect(() => {
    api
      .getDatasets()
      .then(setDatasets)
      .finally(() => setLoading(false));
  }, []);

  const filtered = datasets
    .filter((d) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q);
      const matchType = !typeFilter || d.type === typeFilter;
      return matchSearch && matchType;
    })
    .sort((a, b) => {
      if (sort === "popular") return b.queriesServed - a.queriesServed;
      if (sort === "price-asc") return a.pricePerQuery - b.pricePerQuery;
      if (sort === "price-desc") return b.pricePerQuery - a.pricePerQuery;
      if (sort === "newest")
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      return 0;
    });

  return (
    <div className="min-h-screen pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-10">
          <p className="text-gold text-sm font-body font-medium tracking-widest uppercase mb-2">
            Browse & Buy
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-3">
            Data Marketplace
          </h1>
          <p className="text-foreground-muted font-body text-lg">
            Premium on-chain intelligence, priced per query. Pay only for what
            you need.
          </p>
        </div>

        {/* Search + Filters */}
        <div className="glass-card p-5 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search datasets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-void/60 border border-border/60 rounded-xl pl-11 pr-4 py-3 text-sm font-body text-foreground placeholder:text-muted focus:outline-none focus:border-gold/40 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-muted flex-shrink-0" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-void/60 border border-border/60 rounded-xl px-4 py-3 text-sm font-body text-foreground focus:outline-none focus:border-gold/40 transition-colors"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type filter pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {TYPE_FILTERS.map(({ value, label }) => {
              const meta = value ? DATA_TYPE_META[value] : null;
              return (
                <button
                  key={value}
                  onClick={() => setTypeFilter(value)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all duration-200",
                    typeFilter === value
                      ? "bg-gold text-void"
                      : meta
                        ? `${meta.bg} ${meta.color} hover:opacity-80`
                        : "bg-surface-2 text-foreground-muted hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-foreground-muted font-body">
            {loading ? (
              "Loading..."
            ) : (
              <>
                <span className="text-foreground font-medium">
                  {filtered.length}
                </span>{" "}
                datasets found
              </>
            )}
          </p>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <DatasetCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted" />
            </div>
            <h3 className="font-display text-xl text-foreground mb-2">
              No datasets found
            </h3>
            <p className="text-foreground-muted font-body text-sm">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((ds) => (
              <DatasetCard
                key={ds.id}
                dataset={ds}
                onBuy={setSelectedDataset}
              />
            ))}
          </div>
        )}
      </div>

      {/* Query Modal */}
      {selectedDataset && (
        <QueryModal
          dataset={selectedDataset}
          onClose={() => setSelectedDataset(null)}
          onSuccess={(updated) => {
            setDatasets((prev) =>
              prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)),
            );
            setSelectedDataset(null);
          }}
        />
      )}
    </div>
  );
}
