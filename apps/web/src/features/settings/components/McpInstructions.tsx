import { useState } from 'react';
import { BookOpen, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

const MCP_CONFIG_EXAMPLES = {
  claude: {
    label: 'Claude Desktop',
    config: (serverUrl: string) => JSON.stringify(
      {
        mcpServers: {
          jedana: {
            url: `${serverUrl}/mcp`,
            headers: {
              Authorization: 'Bearer jdn_YOUR_API_KEY_HERE',
            },
          },
        },
      },
      null,
      2,
    ),
    description: 'Add to claude_desktop_config.json',
  },
  cursor: {
    label: 'Cursor / VS Code',
    config: (serverUrl: string) => JSON.stringify(
      {
        servers: {
          jedana: {
            type: 'http',
            url: `${serverUrl}/mcp`,
            headers: {
              Authorization: 'Bearer jdn_YOUR_API_KEY_HERE',
            },
          },
        },
      },
      null,
      2,
    ),
    description: 'Add to .cursor/mcp.json or settings.json',
  },
};

export default function McpInstructions() {
  const [expandedSection, setExpandedSection] = useState<string | null>('claude');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const serverUrl = window.location.origin;

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleSection = (key: string) => {
    setExpandedSection(expandedSection === key ? null : key);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen size={20} />
          How to Set Up MCP
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your AI agents to Jedana using the configuration below.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full shrink-0 mt-0.5">
            1
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Generate an API Key</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click "Create Key" above and copy the generated key.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full shrink-0 mt-0.5">
            2
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Add to MCP Client</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Copy the configuration below and replace <code className="font-mono bg-card px-1 rounded">jdn_YOUR_API_KEY_HERE</code> with your API key.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full shrink-0 mt-0.5">
            3
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Start Using</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Try prompting your AI: "Record lunch expense 50,000 from daily wallet"
            </p>
          </div>
        </div>
      </div>

      {/* Config examples */}
      <div className="space-y-2">
        {Object.entries(MCP_CONFIG_EXAMPLES).map(([key, example]) => (
          <div key={key} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection(key)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <span>{example.label}</span>
              {expandedSection === key ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSection === key && (
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-muted-foreground">{example.description}</p>
                <div className="relative">
                  <pre className="p-3 bg-background border border-border rounded-md text-xs font-mono text-foreground overflow-x-auto">
                    {example.config(serverUrl)}
                  </pre>
                  <button
                    onClick={() => handleCopy(example.config(serverUrl), key)}
                    className="absolute top-2 right-2 p-1.5 bg-card border border-border rounded-md hover:bg-muted transition-colors cursor-pointer"
                    title="Copy config"
                  >
                    {copiedKey === key ? (
                      <Check size={14} className="text-success" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Available tools */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Available Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { name: 'create_transaction', desc: 'Record a new transaction' },
            { name: 'list_transactions', desc: 'View transaction list' },
            { name: 'void_transaction', desc: 'Void a transaction' },
            { name: 'list_wallets', desc: 'View wallets & balances' },
            { name: 'create_wallet', desc: 'Create a new wallet' },
            { name: 'list_tags', desc: 'View tag list' },
            { name: 'create_tag', desc: 'Create a new tag' },
            { name: 'get_summary', desc: 'Financial summary' },
          ].map((tool) => (
            <div
              key={tool.name}
              className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-md"
            >
              <code className="text-xs font-mono text-primary">{tool.name}</code>
              <span className="text-xs text-muted-foreground">— {tool.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
