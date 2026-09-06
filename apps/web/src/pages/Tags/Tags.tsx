import { TagService } from '../../features/tags/services/tag.service';
import { Archive, ArchiveRestore } from 'lucide-react';

export default function Tags() {
  const tags = TagService.useAllTags();

  const activeTags = tags?.filter(t => !t.isArchived) || [];
  const archivedTags = tags?.filter(t => t.isArchived) || [];

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {activeTags.map(tag => (
              <div 
                key={tag.id} 
                className="bg-card border border-border/80 px-4 py-3 rounded-2xl flex items-center justify-between group hover:border-primary/40 hover:shadow-xs transition-all shadow-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-primary/70 shrink-0" />
                  <span className="font-semibold text-sm truncate">{tag.name}</span>
                </div>
                <button 
                  onClick={() => TagService.archiveTag(tag.id!)}
                  className="text-muted-foreground hover:text-destructive w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted active:scale-90 transition-all cursor-pointer"
                  title="Archive Tag"
                  aria-label={`Archive ${tag.name}`}
                >
                  <Archive size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {archivedTags.length > 0 && (
        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border/60">
          <h3 className="font-bold text-base tracking-tight text-muted-foreground">Archived Tags</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 opacity-60">
            {archivedTags.map(tag => (
              <div key={tag.id} className="bg-card border border-border/60 px-4 py-3 rounded-2xl flex items-center justify-between hover:opacity-100 transition-opacity">
                <span className="font-medium text-sm truncate line-through text-muted-foreground">{tag.name}</span>
                <button 
                  onClick={() => TagService.restoreTag(tag.id!)}
                  className="text-muted-foreground hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted active:scale-90 transition-all cursor-pointer"
                  title="Restore Tag"
                  aria-label={`Restore ${tag.name}`}
                >
                  <ArchiveRestore size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
