interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** The switch draws no text of its own, so this names what it toggles. */
  label: string;
  disabled?: boolean;
  /** Why it's disabled, or what it does — shown on hover. */
  title?: string;
}

/**
 * The mockup's on/off switch (the Plans table's SELF-SIGNUP column): a
 * 40×24 track, teal when on and warm grey when off, with a white knob
 * that slides across. A real `role="switch"` button, so it's one Tab
 * stop and Space/Enter toggle it.
 */
export function Switch({ checked, onChange, label, disabled, title }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`box-border flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border-0 p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-bo-accent" : "bg-bo-switch-off"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgb(20_18_12/0.25)] transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default Switch;
