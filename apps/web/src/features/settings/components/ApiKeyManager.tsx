import { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, Loader2 } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  isRevoked: boolean;
}

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/api-keys');
      if (!res.ok) throw new Error('Failed to fetch API keys');
      const data = await res.json();
      setKeys(data);
    } catch {
      setError('Gagal memuat API keys');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create API key');
      }

      const data = await res.json();
      setRevealedKey(data.plainKey);
      setNewKeyName('');
      setShowCreateForm(false);
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (keyId: string, keyName: string) => {
    if (!confirm(`Revoke API key "${keyName}"? Agent yang menggunakan key ini tidak akan bisa mengakses Jedana lagi.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to revoke API key');
      fetchKeys();
    } catch {
      setError('Gagal merevoke API key');
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const activeKeys = keys.filter((k) => !k.isRevoked);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Key size={20} />
            API Keys
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Generate API key untuk menghubungkan AI agent ke Jedana via MCP.
          </p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Buat Key
          </button>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}

      {/* Newly generated key reveal */}
      {revealedKey && (
        <div className="px-4 py-4 bg-success/10 border border-success/30 rounded-lg space-y-3">
          <p className="text-sm font-semibold text-success">
            ✓ API Key berhasil dibuat!
          </p>
          <p className="text-xs text-muted-foreground">
            Salin key ini sekarang. Key tidak akan ditampilkan lagi setelah ditutup.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-card border border-border rounded-md text-sm font-mono text-foreground break-all">
              {revealedKey}
            </code>
            <button
              onClick={() => handleCopy(revealedKey)}
              className="p-2 bg-card border border-border rounded-md hover:bg-muted transition-colors cursor-pointer shrink-0"
              title="Copy to clipboard"
            >
              {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="flex items-end gap-3 p-4 bg-card border border-border rounded-lg">
          <div className="flex-1">
            <label htmlFor="api-key-name" className="block text-sm font-medium text-foreground mb-1.5">
              Nama Key
            </label>
            <input
              id="api-key-name"
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="misal: Claude Desktop, Cursor"
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={100}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={isCreating || !newKeyName.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isCreating ? <Loader2 size={16} className="animate-spin" /> : 'Generate'}
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm(false)}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
          >
            Batal
          </button>
        </form>
      )}

      {/* Key list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2" />
          Memuat...
        </div>
      ) : activeKeys.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Belum ada API key. Buat key untuk mulai menggunakan MCP.
        </div>
      ) : (
        <div className="space-y-2">
          {activeKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Key size={16} className="text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {apiKey.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <code className="font-mono">{apiKey.keyPrefix}...</code>
                    {' · '}
                    Dibuat {formatDate(apiKey.createdAt)}
                    {apiKey.lastUsedAt && (
                      <> · Terakhir dipakai {formatDate(apiKey.lastUsedAt)}</>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRevoke(apiKey.id, apiKey.name)}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer shrink-0"
                title="Revoke key"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
