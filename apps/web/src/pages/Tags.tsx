import { TagService } from '../services/tag.service';
import { Archive, ArchiveRestore } from 'lucide-react';

export default function Tags() {
  const tags = TagService.useAllTags();

  const activeTags = tags?.filter(t => !t.isArchived) || [];
  const archivedTags = tags?.filter(t => t.isArchived) || [];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight">Manajemen Tag</h2>
        <p className="text-muted-foreground text-sm font-medium">Kelola label klasifikasi transaksi Anda</p>
      </header>

      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-lg tracking-tight">Tag Aktif</h3>
        {!tags ? (
          <div className="text-muted-foreground text-sm animate-pulse">Memuat tag...</div>
        ) : activeTags.length === 0 ? (
          <div className="bg-card border border-border border-dashed p-8 rounded-xl text-center text-muted-foreground text-sm">
            Belum ada tag aktif. Tag akan terbuat otomatis saat Anda memasukkannya di form transaksi.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {activeTags.map(tag => (
              <div key={tag.id} className="bg-card border border-border px-4 py-3 rounded-xl flex items-center justify-between group hover:border-muted-foreground/30 transition-colors">
                <span className="font-medium truncate">{tag.name}</span>
                <button 
                  onClick={() => TagService.archiveTag(tag.id!)}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-1"
                  title="Arsipkan Tag"
                >
                  <Archive size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {archivedTags.length > 0 && (
        <div className="flex flex-col gap-4 mt-4">
          <h3 className="font-semibold text-lg tracking-tight text-muted-foreground">Tag Diarsipkan</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 opacity-60">
            {archivedTags.map(tag => (
              <div key={tag.id} className="bg-card border border-border px-4 py-3 rounded-xl flex items-center justify-between hover:opacity-100 transition-opacity">
                <span className="font-medium truncate line-through text-muted-foreground">{tag.name}</span>
                <button 
                  onClick={() => TagService.restoreTag(tag.id!)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  title="Pulihkan Tag"
                >
                  <ArchiveRestore size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
