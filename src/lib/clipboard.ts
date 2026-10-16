/**
 * Copies text, answering whether it worked instead of throwing.
 *
 * It can fail for reasons that have nothing to do with the app: no
 * Clipboard API outside a secure context, a denied permission, or — the
 * common one — Safari refusing a write that happens after an await,
 * because the click that asked for it no longer counts as the user's
 * gesture. Callers that copy something fetched first should have a
 * fallback that shows the text instead.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
