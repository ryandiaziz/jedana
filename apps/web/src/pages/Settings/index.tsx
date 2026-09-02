import { ApiKeyManager, McpInstructions } from '../../features/settings';
import { useAuth } from '../../context';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <SettingsIcon size={24} />
          Settings
        </h1>
        <div className="px-4 py-8 bg-card border border-border rounded-lg text-center">
          <p className="text-muted-foreground">
            Login terlebih dahulu untuk mengakses Settings dan fitur MCP.
          </p>
          <a
            href="/api/auth/google"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Login via Google
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
        <SettingsIcon size={24} />
        Settings
      </h1>

      {/* API Key Section */}
      <section className="p-6 bg-card border border-border rounded-lg">
        <ApiKeyManager />
      </section>

      {/* MCP Setup Instructions */}
      <section className="p-6 bg-card border border-border rounded-lg">
        <McpInstructions />
      </section>
    </div>
  );
}
