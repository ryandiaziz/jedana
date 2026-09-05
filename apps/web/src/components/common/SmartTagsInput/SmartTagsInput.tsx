import { useState, useMemo } from 'react';
import { X } from 'lucide-react';

interface TagOption {
  id?: string;
  name: string;
  isArchived?: boolean;
}

interface SmartTagsInputProps {
  label: string;
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  availableTags: TagOption[];
  disabled?: boolean;
}

export function SmartTagsInput({
  label,
  selectedTags,
  onChange,
  availableTags,
  disabled
}: SmartTagsInputProps) {
  const [tagSearch, setTagSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredTags = useMemo(() => {
    if (!availableTags || availableTags.length === 0) return [];
    
    const activeSearch = tagSearch.toLowerCase();
    return availableTags
      .filter(t => !t.isArchived)
      .filter(t => !selectedTags.includes(t.name))
      .filter(t => t.name.toLowerCase().includes(activeSearch) && t.name.toLowerCase() !== activeSearch)
      .slice(0, 5);
  }, [availableTags, tagSearch, selectedTags]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const t = tagSearch.trim();
      if (t && !selectedTags.includes(t)) {
        onChange([...selectedTags, t]);
        setTagSearch('');
      }
    } else if (e.key === 'Backspace' && tagSearch === '' && selectedTags.length > 0) {
      onChange(selectedTags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</label>
      <div 
        className={`flex flex-wrap items-center gap-1.5 w-full bg-background border border-border rounded-md px-3 py-2 transition-colors ${
          disabled ? 'opacity-50' : 'focus-within:border-primary'
        }`}
      >
        {selectedTags.map(tag => (
          <div key={tag} className="flex items-center gap-1 bg-muted text-foreground px-2 py-0.5 rounded-sm text-xs">
            {tag}
            {!disabled && (
              <button 
                type="button" 
                onClick={() => onChange(selectedTags.filter(t => t !== tag))} 
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        <input
          type="text"
          value={tagSearch}
          onChange={e => {
            setTagSearch(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            const t = tagSearch.trim();
            if (t && !selectedTags.includes(t)) {
              onChange([...selectedTags, t]);
              setTagSearch('');
            }
            setTimeout(() => setIsOpen(false), 200);
          }}
          className="flex-1 bg-transparent border-none outline-none text-sm min-w-15"
          placeholder={selectedTags.length === 0 && !disabled ? "Type and press enter" : ""}
          disabled={disabled}
        />
        {selectedTags.length > 0 && !disabled && (
          <button 
            type="button" 
            onClick={() => {
              onChange([]);
              setTagSearch('');
            }} 
            className="text-muted-foreground hover:text-foreground ml-auto cursor-pointer p-0.5 rounded hover:bg-muted"
            title="Clear all"
          >
            <X size={16} />
          </button>
        )}
      </div>
      
      {isOpen && filteredTags.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-2 mt-1">
          {filteredTags.map(tag => (
            <button
              key={tag.id || tag.name}
              type="button"
              onClick={() => {
                if (!selectedTags.includes(tag.name)) {
                  onChange([...selectedTags, tag.name]);
                }
                setTagSearch('');
                setIsOpen(false);
              }}
              className="bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary px-2 py-1 rounded-md text-xs transition-colors cursor-pointer"
            >
              +{tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
