import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, Star } from 'lucide-react';
import { useStore } from '../store';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'xp';
  message: string;
  duration?: number;
}

let toastId = 0;

export function useToast() {
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast_${++toastId}`;
    const event = new CustomEvent('add-toast', { detail: { ...toast, id } });
    window.dispatchEvent(event);
  };

  return {
    success: (msg: string, duration?: number) => addToast({ type: 'success', message: msg, duration: duration ?? 3000 }),
    error: (msg: string, duration?: number) => addToast({ type: 'error', message: msg, duration: duration ?? 4000 }),
    info: (msg: string, duration?: number) => addToast({ type: 'info', message: msg, duration: duration ?? 3000 }),
    xp: (msg: string, duration?: number) => addToast({ type: 'xp', message: msg, duration: duration ?? 3000 }),
  };
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setToasts(prev => [...prev, e.detail]);
    };
    window.addEventListener('add-toast', handler as any);
    return () => window.removeEventListener('add-toast', handler as any);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    toasts.forEach(toast => {
      if (toast.duration) {
        setTimeout(() => removeToast(toast.id), toast.duration);
      }
    });
  }, [toasts, removeToast]);

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success': return <CheckCircle size={18} className="text-emerald-400" />;
      case 'error': return <AlertCircle size={18} className="text-rose-400" />;
      case 'xp': return <Star size={18} className="text-orange-400" />;
      default: return <Info size={18} className="text-sky-400" />;
    }
  };

  const getBgColor = (type: Toast['type']) => {
    switch (type) {
      case 'success': return 'bg-emerald-500/10 border-emerald-500/30';
      case 'error': return 'bg-rose-500/10 border-rose-500/30';
      case 'xp': return 'bg-orange-500/10 border-orange-500/30';
      default: return 'bg-sky-500/10 border-sky-500/30';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className={`p-4 rounded-xl border backdrop-blur-md shadow-lg ${getBgColor(toast.type)}`}
          >
            <div className="flex items-center gap-3">
              {getIcon(toast.type)}
              <span className="text-sm text-white font-medium">{toast.message}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}