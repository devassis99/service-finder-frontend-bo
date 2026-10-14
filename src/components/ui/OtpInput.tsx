import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";

const LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once all six digits are in — typed, pasted, or on Enter. */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  /** Draws every box with the error border, after a wrong code. */
  invalid?: boolean;
}

/**
 * Six digit boxes, as the mockup's verification screen draws them:
 * 60px tall, Roboto Mono digits, white while empty and warm once filled,
 * a teal border and ring on the focused box, red borders after a wrong
 * code. Typing advances, Backspace on an empty box steps back, the arrow
 * keys move, Enter submits, and a pasted code fills all six at once.
 */
export function OtpInput({ value, onChange, onComplete, disabled, invalid }: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  function focus(index: number) {
    const el = inputRefs.current[index];
    el?.focus();
    el?.select();
  }

  // autoFocus only fires on mount, and a disabled box can't take focus —
  // so when the boxes start disabled (the setup screen, until its QR code
  // has loaded) the caret is placed once they're enabled instead.
  useEffect(() => {
    if (!disabled && value === "") focus(0);
    // Only on becoming enabled — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  function setDigit(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    const joined = next.join("").slice(0, LENGTH);
    onChange(joined);
    if (joined.length === LENGTH && !next.includes("")) onComplete?.(joined);
  }

  function handleChange(index: number, raw: string) {
    const typed = raw.replace(/\D/g, "");
    // Some keyboards (and autofill) put the whole code into one box.
    if (typed.length >= LENGTH) {
      const code = typed.slice(0, LENGTH);
      onChange(code);
      onComplete?.(code);
      focus(LENGTH - 1);
      return;
    }
    const digit = typed.slice(-1);
    setDigit(index, digit);
    if (digit && index < LENGTH - 1) focus(index + 1);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      setDigit(index - 1, "");
      focus(index - 1);
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focus(index - 1);
    } else if (e.key === "ArrowRight" && index < LENGTH - 1) {
      e.preventDefault();
      focus(index + 1);
    } else if (e.key === "Enter" && value.length === LENGTH) {
      onComplete?.(value);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    if (pasted.length === LENGTH) onComplete?.(pasted);
    focus(Math.min(pasted.length, LENGTH - 1));
  }

  return (
    <div className="flex gap-2.5">
      {digits.map((digit, index) => (
        <input
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="tel"
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          // A one-time-code screen exists to be typed into; landing the caret
          // on the first digit is the point, not a surprise.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={index === 0}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          aria-invalid={invalid || undefined}
          className={`box-border h-[60px] w-full min-w-0 flex-1 rounded-xl border p-0 text-center font-mono text-2xl leading-none font-medium text-bo-ink caret-bo-accent outline-none focus:border-bo-accent focus:bg-bo-paper focus:shadow-[0_0_0_1px_var(--color-bo-accent)] disabled:opacity-60 ${
            invalid
              ? "border-bo-error-border bg-bo-paper"
              : digit
                ? "border-bo-border bg-bo-hover"
                : "border-bo-input-border bg-bo-paper"
          }`}
        />
      ))}
    </div>
  );
}

export default OtpInput;
