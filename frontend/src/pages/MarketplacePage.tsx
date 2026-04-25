import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  Search,
  SlidersHorizontal,
  TrendingUp,
  Clock,
  DollarSign,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api, DatasetMeta } from "../lib/api";
import { DATA_TYPE_META } from "../lib/utils";
import DatasetCard from "../components/ui/DatasetCard";
import QueryModal from "../components/ui/QueryModal";
import { DatasetCardSkeleton } from "../components/ui/SkeletonLoader";
import clsx from "clsx";
import { useI18n } from "../i18n";

export default function MarketplacePage() {
  const { locale, t } = useI18n();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(1);
  const [selectedDataset, setSelectedDataset] = useState<DatasetMeta | null>(
    null,
  );
  const pageSize = 9;

  const { data: datasets = [], isLoading: loading, refetch } = useQuery<DatasetMeta[]>({
    queryKey: ["datasets"],
    queryFn: api.getDatasets,
  });

  const filtered = useMemo(() => {
    return datasets
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
  }, [datasets, search, typeFilter, sort]);

  useEffect(() => {
    setPage(1);
  }, [search, sort, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [currentPage, filtered]);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = filtered.length === 0 ? 0 : Math.min(currentPage * pageSize, filtered.length);
  const visiblePages = useMemo(() => {
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, start + 2);
    const normalizedStart = Math.max(1, end - 2);
    return Array.from(
      { length: end - normalizedStart + 1 },
      (_, index) => normalizedStart + index,
    );
  }, [currentPage, totalPages]);

  const typeFilters = [
    { value: "", label: t("dataTypes.all") },
    { value: "whale-wallets", label: t("dataTypes.whaleWallets") },
    { value: "trading-signals", label: t("dataTypes.tradingSignals") },
    { value: "yield-data", label: t("dataTypes.yieldData") },
    { value: "risk-scores", label: t("dataTypes.riskScores") },
    { value: "nft-data", label: t("dataTypes.nftData") },
    { value: "sentiment", label: t("dataTypes.sentiment") },
  ];

  const sortOptions = [
    { value: "popular", label: t("marketplace.sorts.popular"), icon: TrendingUp },
    { value: "price-asc", label: t("marketplace.sorts.priceAsc"), icon: DollarSign },
    { value: "price-desc", label: t("marketplace.sorts.priceDesc"), icon: DollarSign },
    { value: "newest", label: t("marketplace.sorts.newest"), icon: Clock },
  ];

  return (
    <div className="min-h-screen pt-28 pb-20">
      <Helmet>
        <title>Marketplace | Premium Web3 Data</title>
        <meta name="description" content="Browse and buy premium on-chain intelligence datasets. Real-time whale movements, yield data, and sentiment analysis." />
        <meta property="og:title" content="Hazina Data Marketplace" />
        <meta property="og:description" content="Premium on-chain intelligence, priced per query." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-10">
          <p className="text-gold text-sm font-body font-medium tracking-widest uppercase mb-2">
            {t("marketplace.eyebrow")}
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-3">
            {t("marketplace.title")}
          </h1>
          <p className="text-foreground-muted font-body text-lg">
            {t("marketplace.subtitle")}
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
                placeholder={t("marketplace.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-void/60 border border-border/60 rounded-xl pl-11 pr-4 py-3 text-sm font-body text-foreground placeholder:text-muted focus:outline-none focus:border-gold/40 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  aria-label={t("common.actions.resetSearch")}
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
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type filter pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {typeFilters.map(({ value, label }) => {
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
              t("common.labels.loading")
            ) : (
              <>
                {t("marketplace.pagination.showing", {
                  start: pageStart.toLocaleString(locale),
                  end: pageEnd.toLocaleString(locale),
                  total: filtered.length.toLocaleString(locale),
                })}
              </>
            )}
          </p>
          {!loading && filtered.length > 0 && (
            <p className="text-sm text-foreground-muted font-body">
              {t("marketplace.pagination.page", {
                current: currentPage.toLocaleString(locale),
                total: totalPages.toLocaleString(locale),
              })}
            </p>
          )}
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
              {t("marketplace.noResultsTitle")}
            </h3>
            <p className="text-foreground-muted font-body text-sm">
              {t("marketplace.noResultsBody")}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((ds: DatasetMeta) => (
                <DatasetCard
                  key={ds.id}
                  dataset={ds}
                  onBuy={setSelectedDataset}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={clsx(
                    "btn-ghost px-4 py-2 text-sm flex items-center gap-2",
                    currentPage === 1 && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t("marketplace.pagination.previous")}
                </button>

                <div className="flex items-center gap-2">
                  {visiblePages.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={clsx(
                        "w-10 h-10 rounded-xl text-sm font-body font-medium transition-all duration-200",
                        currentPage === pageNumber
                          ? "bg-gold text-void"
                          : "bg-surface-2 text-foreground-muted hover:text-foreground hover:bg-surface",
                      )}
                    >
                      {pageNumber.toLocaleString(locale)}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={clsx(
                    "btn-ghost px-4 py-2 text-sm flex items-center gap-2",
                    currentPage === totalPages && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {t("marketplace.pagination.next")}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Query Modal */}
      {selectedDataset && (
        <QueryModal
          dataset={selectedDataset}
          onClose={() => setSelectedDataset(null)}
          onSuccess={() => {
            refetch();
            setSelectedDataset(null);
          }}
        />
      )}
    </div>
  );
}
