import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Info, CheckCircle2, X, Loader2, type LucideIcon } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmIcon?: LucideIcon | React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
}

const VARIANT_CONFIG = {
  danger: {
    icon: AlertTriangle,
    iconContainerClass: 'text-destructive bg-destructive/10 border-destructive/20',
    buttonClass: 'bg-destructive hover:opacity-90 active:opacity-80 text-destructive-foreground shadow-lg shadow-destructive/20',
  },
  warning: {
    icon: AlertTriangle,
    iconContainerClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    buttonClass: 'bg-amber-500 hover:bg-amber-600 active:opacity-90 text-white shadow-lg shadow-amber-500/20',
  },
  info: {
    icon: Info,
    iconContainerClass: 'text-primary bg-primary/10 border-primary/20',
    buttonClass: 'bg-primary hover:bg-primary/90 active:opacity-90 text-primary-foreground shadow-lg shadow-primary/20',
  },
  success: {
    icon: CheckCircle2,
    iconContainerClass: 'text-success bg-success/10 border-success/20',
    buttonClass: 'bg-success hover:bg-success/90 active:opacity-90 text-white shadow-lg shadow-success/20',
  },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  variant = 'danger',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmIcon: ConfirmIcon,
  isLoading = false,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);

  const effectiveLoading = isLoading || internalLoading;

  const handleClose = useCallback(() => {
    if (effectiveLoading) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 140);
  }, [effectiveLoading, onClose]);

  // Lock background scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !effectiveLoading) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, effectiveLoading, handleClose]);

  const handleConfirm = async () => {
    if (effectiveLoading) return;
    try {
      const result = onConfirm();
      if (result instanceof Promise) {
        setInternalLoading(true);
        await result;
      }
    } catch (err) {
      console.error('Confirm action failed:', err);
    } finally {
      setInternalLoading(false);
    }
  };

  if (!isOpen) return null;

  const config = VARIANT_CONFIG[variant];
  const HeaderIcon = config.icon;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !effectiveLoading) {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className={`relative w-full max-w-md bg-card border border-border rounded-2xl p-5 md:p-6 shadow-2xl space-y-5 md:space-y-6 ${
          isClosing ? 'animate-modal-card-out' : 'animate-modal-card'
        }`}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={effectiveLoading}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 p-2 rounded-lg hover:bg-muted cursor-pointer active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-xl border ${config.iconContainerClass}`}>
            <HeaderIcon className="w-6 h-6" />
          </div>
          <h3 id="confirm-modal-title" className="text-xl font-semibold text-foreground">
            {title}
          </h3>
        </div>

        <div className="text-sm text-muted-foreground leading-relaxed">
          {typeof description === 'string' ? <p>{description}</p> : description}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={effectiveLoading}
            className="px-4 py-3 sm:py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted active:scale-95 transition-all text-sm font-medium disabled:opacity-50 cursor-pointer min-h-[44px]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={effectiveLoading}
            className={`flex items-center justify-center space-x-2 px-4 py-3 sm:py-2.5 rounded-xl active:scale-95 transition-all text-sm font-medium disabled:opacity-50 cursor-pointer min-h-[44px] ${config.buttonClass}`}
          >
            {effectiveLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : ConfirmIcon ? (
              <ConfirmIcon className="w-4 h-4" />
            ) : null}
            <span>{effectiveLoading ? 'Processing...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default ConfirmModal;
