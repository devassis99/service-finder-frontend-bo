import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { copyText } from "@/lib/clipboard";

/**
 * Shown only when a row's "Copy" fetched its signup link but the browser
 * wouldn't put it on the clipboard (Safari, mostly — see
 * lib/clipboard.ts). The link still exists, so it's put in front of the
 * admin to copy by hand, or with a button that's now a fresh click.
 */
export function SignupLinkModal({
  link,
  onClose,
}: {
  link: { url: string; plan: string } | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleClose() {
    setCopied(false);
    onClose();
  }

  return (
    <Modal
      open={link !== null}
      onClose={handleClose}
      title="Signup link"
      description={
        <>
          For <span className="font-semibold text-bo-ink">{link?.plan}</span>. Whoever opens it
          signs up with this plan already chosen. Your browser didn't let it be copied
          automatically.
        </>
      }
      footer={
        <>
          <Button
            variant="secondary"
            onClick={async () => {
              if (link) setCopied(await copyText(link.url));
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button onClick={handleClose}>Done</Button>
        </>
      }
    >
      <input
        readOnly
        value={link?.url ?? ""}
        aria-label="Signup link"
        onFocus={(e) => e.currentTarget.select()}
        // Selected on open so Cmd/Ctrl+C works straight away.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        // formInputClass's own font and size would fight these, so the
        // input spells its look out in full.
        className="box-border w-full rounded-xl border border-bo-input-border bg-bo-paper px-3.5 py-3 font-mono text-xs text-bo-ink outline-none focus:border-bo-accent focus:shadow-[0_0_0_1px_var(--color-bo-accent)]"
      />
    </Modal>
  );
}
