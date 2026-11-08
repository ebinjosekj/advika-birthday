import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMagic } from '../../app/store';

export function MagicToast() {
  const toast = useMagic((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useMagic.getState().clearToast(), 5500);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} className="toast" data-testid="toast" initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
            <strong>{toast.title}</strong>
            {toast.body && <span>{toast.body}</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
