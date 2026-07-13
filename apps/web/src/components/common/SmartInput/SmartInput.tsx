import { useState, useMemo } from 'react';
import { X } from 'lucide-react';

interface SmartInputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  suggestionVariant?: 'default' | 'highlight';
}

export function SmartInput({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  options, 
  disabled,
  suggestionVariant = 'default'
}: SmartInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!options || options.length === 0) return [];
    if (!value) return options.slice(0, 5);
    const lowerInput = value.toLowerCase();
    return options
      .filter(o => o.toLowerCase().includes(lowerInput) && o !== value)
      .slice(0, 5);
  }, [options, value]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Delay so clicks on suggestions register
          className="w-full bg-background border border-border rounded-md px-3 py-2 pr-8 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          placeholder={placeholder}
          disabled={disabled}
        />
        {value && !disabled && (
          <button 
            type="button" 
            onClick={() => {
              onChange('');
              setIsOpen(true);
            }} 
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            title="Clear"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {isOpen && filteredOptions.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-2 mt-1">
          {filteredOptions.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={
                suggestionVariant === 'highlight' 
                ? "bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded-md text-xs transition-colors border border-primary/20"
                : "bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary px-2 py-1 rounded-md text-xs transition-colors"
              }
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
