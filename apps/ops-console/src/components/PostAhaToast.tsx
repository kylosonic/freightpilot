import { useEffect, useState } from 'react';

const TOAST_COPY =
  'First optimization complete. Free tier covers 2,500 delivery_tasks per month — when you outgrow that, Starter lifts the cap.';
const AUTO_DISMISS_MS = 6000;

/**
 * NB-33 soft post-aha toast. Informational only: no upgrade button, no
 * pricing link, no commercial CTA. Auto-dismisses after 6 seconds.
 * Fire-once is server truth (post_aha_toast only on the first run);
 * this component only mirrors that response.
 */
export function PostAhaToast({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setShown(true);
    const timer = window.setTimeout(() => {
      setShown(false);
      onDismiss();
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!shown) return null;

  return (
    <div
      role="status"
      data-testid="post-aha-toast"
      className="fixed bottom-6 right-6 z-[60] max-w-[380px] border border-[#b9dcd1] border-l-4 border-l-[#16856b] bg-white px-4 py-3 shadow-lg"
    >
      <p className="text-xs font-medium leading-5 text-[#25483f]">{TOAST_COPY}</p>
    </div>
  );
}
