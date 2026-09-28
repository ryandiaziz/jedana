import { useState } from 'react';
import { TagService } from '../../features/tags/services/tag.service';
import { TagEditModal } from '../../features/tags/components/TagEditModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { type Tag } from '../../db/db';
import { Archive, ArchiveRestore, Edit2, Trash2 } from 'lucide-react';

export default function Tags() {
  const tags = TagService.useAllTags();
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [archivingTag, setArchivingTag] = useState<Tag | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const activeTags = tags?.filter(t => !t.isArchived) || [];
  const archivedTags = tags?.filter(t => t.isArchived) || [];

  const handleArchiveConfirm = async () => {
    if (!archivingTag?.id) return;
    try {
      setIsArchiving(true);
      await TagService.archiveTag(archivingTag.id);
      setArchivingTag(null);
    } catch (err) {
      console.error('Failed to archive tag:', err);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTag?.id) return;
    try {
      setIsDeleting(true);
      await TagService.deleteTag(deletingTag.id);
      setDeletingTag(null);
    } catch (err) {
      console.error('Failed to delete tag:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-500 pb-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Tag Management</h2>
        <p className="text-muted-foreground text-xs sm:text-sm font-medium">Manage your transaction labels and categorization</p>
      </header>

      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-base md:text-lg tracking-tight">Active Tags</h3>
          {activeTags.length > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              {activeTags.length} active
            </span>
          )}
        </div>

        {!tags ? (
          <div className="text-muted-foreground text-sm animate-pulse p-4">Loading tags...</div>
        ) : activeTags.length === 0 ? (
          <div className="bg-card border border-border/80 border-dashed p-8 rounded-2xl text-center text-muted-foreground text-sm">
            No active tags yet. Tags are created automatically when you type them in the transaction form.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {activeTags.map(tag => (
              <div 
                key={tag.id} 
                className="bg-card border border-border/80 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl flex items-center justify-between group hover:border-primary/40 hover:shadow-xs transition-all shadow-xs gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-primary/70 shrink-0" />
                  <span className="font-semibold text-sm truncate" title={tag.name}>{tag.name}</span>
                </div>

                <div className="flex items-center gap-0.5 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                  <button 
                    type="button"
                    onClick={() => setEditingTag(tag)}
                    className="text-muted-foreground hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted active:scale-90 transition-all cursor-pointer"
                    title="Edit tag name"
                    aria-label={`Edit ${tag.name}`}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setArchivingTag(tag)}
                    className="text-muted-foreground hover:text-amber-500 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-500/10 active:scale-90 transition-all cursor-pointer"
                    title="Archive tag"
                    aria-label={`Archive ${tag.name}`}
                  >
                    <Archive size={14} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setDeletingTag(tag)}
                    className="text-muted-foreground hover:text-destructive w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 active:scale-90 transition-all cursor-pointer"
                    title="Delete tag permanently"
                    aria-label={`Delete ${tag.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {archivedTags.length > 0 && (
        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border/60">
          <h3 className="font-bold text-base tracking-tight text-muted-foreground">Archived Tags</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 opacity-75">
            {archivedTags.map(tag => (
              <div 
                key={tag.id} 
                className="bg-card border border-border/60 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl flex items-center justify-between group hover:opacity-100 transition-opacity gap-2"
              >
                <span className="font-medium text-sm truncate line-through text-muted-foreground" title={tag.name}>
                  {tag.name}
                </span>

                <div className="flex items-center gap-0.5 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                  <button 
                    type="button"
                    onClick={() => setEditingTag(tag)}
                    className="text-muted-foreground hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted active:scale-90 transition-all cursor-pointer"
                    title="Edit tag name"
                    aria-label={`Edit ${tag.name}`}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => TagService.restoreTag(tag.id!)}
                    className="text-muted-foreground hover:text-primary w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 active:scale-90 transition-all cursor-pointer"
                    title="Restore tag from archive"
                    aria-label={`Restore ${tag.name}`}
                  >
                    <ArchiveRestore size={14} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setDeletingTag(tag)}
                    className="text-muted-foreground hover:text-destructive w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 active:scale-90 transition-all cursor-pointer"
                    title="Delete tag permanently"
                    aria-label={`Delete ${tag.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Tag Modal */}
      <TagEditModal
        isOpen={!!editingTag}
        tag={editingTag}
        onClose={() => setEditingTag(null)}
      />

      {/* Archive Confirmation Modal */}
      <ConfirmModal
        isOpen={!!archivingTag}
        onClose={() => !isArchiving && setArchivingTag(null)}
        onConfirm={handleArchiveConfirm}
        isLoading={isArchiving}
        variant="warning"
        confirmIcon={Archive}
        title="Archive Tag?"
        description={
          <div className="flex flex-col gap-2 text-sm leading-relaxed">
            <p>
              Are you sure you want to archive tag <strong className="text-foreground font-semibold">"{archivingTag?.name}"</strong>?
            </p>
            <p className="text-xs text-muted-foreground bg-muted/60 p-2.5 rounded-xl border border-border/50">
              Archived tags will no longer appear in suggestions when creating or editing transactions. Existing transactions and history will keep this tag.
            </p>
          </div>
        }
        confirmLabel="Archive Tag"
        cancelLabel="Cancel"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingTag}
        onClose={() => !isDeleting && setDeletingTag(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        variant="danger"
        title="Permanently Delete Tag?"
        description={
          <div className="flex flex-col gap-2 text-sm leading-relaxed">
            <p>
              Tag <strong className="text-foreground font-semibold">"{deletingTag?.name}"</strong> will be permanently deleted from the system.
            </p>
            <p className="text-xs text-muted-foreground bg-muted/60 p-2.5 rounded-xl border border-border/50">
              Note: This tag will be detached from all transactions using it, and any associated budget target will also be removed.
            </p>
          </div>
        }
        confirmLabel="Delete Permanently"
        cancelLabel="Cancel"
      />
    </div>
  );
}
