import { useI18n } from "./useI18n";

export interface LocaleSwitcherProps {
  className?: string;
}

export default function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const { availableLocales, getLocaleLabel, locale, setLocale, t } = useI18n();

  return (
    <div className={className}>
      <label className="flex items-center gap-3 text-sm font-body text-foreground-muted">
        <span>{t("common.labels.language")}</span>
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as typeof locale)}
          className="rounded-lg border border-gold/20 bg-surface px-3 py-2 text-sm text-foreground"
        >
          {availableLocales.map((option) => (
            <option key={option} value={option}>
              {getLocaleLabel(option)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
