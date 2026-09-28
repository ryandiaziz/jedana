import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { TagService } from '../../services/tag.service';
import { type Tag } from '../../../../db/db';
import { cn } from '../../../../utils/cn';
import { X, Tag as TagIcon, AlertCircle, Loader2 } from 'lucide-react';

interface TagEditModalProps {
  tag: Tag | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedTag: Tag) => void;
}

export default function TagEditModal({ tag, isOpen, onClose, onSuccess }: TagEditModalProps) {
  if (!isOpen || !tag) return null;

  return (
    <TagEditModalDialog
      key={tag.id}
      tag={tag}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function TagEditModalDialog({
  tag,
  onClose,
  onSuccess,
}: {
  tag: Tag;
  onClose: () => void;
  onSuccess?: (updatedTag: Tag) => void;
}) {
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 140);
  }, [onClose, isSubmitting]);

  // Lock background scroll while modal is mounted
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Tag name cannot be empty');
      return;
    }

    if (trimmed === tag.name) {
      handleClose();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await TagService.updateTagName(tag.id!, trimmed);
      if (!result.success) {
        setError(result.error || 'Failed to update tag name');
        setIsSubmitting(false);
        return;
      }

      onSuccess?.({ ...tag, name: trimmed, updatedAt: Date.now() });
      handleClose();
    } catch (err) {
      console.error('Failed to update tag name:', err);
      setError('An error occurred while saving changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center sm:p-4",
        isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={cn(
          "bg-card border-t sm:border border-border/80 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col",
          isClosing ? "animate-drawer-out sm:animate-modal-card-out" : "animate-drawer-in sm:animate-modal-card"
        )}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 cursor-grab">
          <span className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <TagIcon size={16} />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg tracking-tight text-foreground">
                Edit Tag Name
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium -mt-0.5">
                Update transaction label
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground cursor-pointer active:scale-95 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tag-name-input" className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Tag Name
            </label>
            <input
              id="tag-name-input"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Food, Transportation, Shopping"
              className={cn(
                "w-full bg-background border rounded-xl px-3.5 py-2.5 min-h-[44px] text-sm font-medium focus:outline-none focus:ring-2 transition-all cursor-text shadow-xs",
                error
                  ? "border-destructive focus:border-destructive focus:ring-destructive/20 text-destructive"
                  : "border-border/80 focus:border-primary focus:ring-primary/20 text-foreground"
              )}
              disabled={isSubmitting}
            />
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-destructive font-medium mt-0.5 animate-in fade-in duration-200">
                <AlertCircle size={13} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
              All transactions and budgets associated with this tag will be updated automatically.
            </p>
          </div>

          <div className="flex items-center gap-2.5 pt-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 font-semibold py-2.5 min-h-[44px] text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 bg-primary text-primary-foreground font-bold py-2.5 min-h-[44px] text-sm rounded-xl hover:bg-primary/90 active:scale-95 transition-all cursor-pointer shadow-md shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
