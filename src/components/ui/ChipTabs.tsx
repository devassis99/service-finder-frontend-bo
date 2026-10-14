interface ChipTabsProps<T extends string> {
  tabs: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/**
 * The Admin screens' filter chips (A01's Pending / Active / At risk, A02's
 * Questions / Pricing / …): the selected one solid ink, the rest outlined
 * pills. Used for a page's sub-views.
 */
export function ChipTabs<T extends string>({ tabs, value, onChange, label }: ChipTabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`cursor-pointer rounded-full px-3.5 py-2.5 font-sans text-xs leading-none font-medium ${
              active
                ? "border border-bo-ink bg-bo-ink text-white"
                : "border border-bo-input-border bg-bo-paper text-bo-ink hover:border-bo-input-border-hover hover:bg-bo-hover"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default ChipTabs;
