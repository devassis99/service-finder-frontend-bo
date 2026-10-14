interface StatCardProps {
  label: string;
  value: string;
  /** A short line under the number — a change, a breakdown. */
  note?: { text: string; tone?: "accent" | "danger" | "muted" };
  /** Draws the number itself in red, for a figure that is bad news on its own (A03's UNFILLED). */
  alarming?: boolean;
}

const NOTE_TONES = {
  accent: "text-bo-accent",
  danger: "text-bo-danger",
  muted: "text-bo-muted",
} as const;

/** The stat tile from the Admin screens (A03 Marketplace health): mono label, big tight number, one note. */
export function StatCard({ label, value, note, alarming }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[13px] border border-bo-card-border bg-bo-paper p-4">
      <span className="font-mono text-[10px] leading-none text-bo-faint uppercase">{label}</span>
      <span
        className={`font-sans text-[26px] leading-none font-bold tracking-[-0.02em] tabular-nums ${
          alarming ? "text-bo-danger" : "text-bo-ink"
        }`}
      >
        {value}
      </span>
      {note && (
        <span className={`font-sans text-[11px] leading-none ${NOTE_TONES[note.tone ?? "muted"]}`}>
          {note.text}
        </span>
      )}
    </div>
  );
}

export default StatCard;
