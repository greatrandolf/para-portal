import { useCallback, useRef, useState } from 'react';

import type { ToastMessage } from '@packages/ui/Toast';

/** One-at-a-time toast state for a screen. */
export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const nextId = useRef(1);

  const show = useCallback((message: Omit<ToastMessage, 'id'>) => {
    setToast({ ...message, id: nextId.current++ });
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  return { toast, show, dismiss };
}
