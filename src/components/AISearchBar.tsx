import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAISearch } from '@/hooks/useAISearch';

interface AISearchBarProps {
  type?: 'products' | 'orders';
  onResults: (results: any[]) => void;
  placeholder?: string;
}

export const AISearchBar = ({ type = 'products', onResults, placeholder }: AISearchBarProps) => {
  const [query, setQuery] = useState('');
  const { search, isSearching } = useAISearch();

  const handleSearch = async () => {
    const { results } = await search(query, type);
    onResults(results);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex gap-2 w-full max-w-2xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder || "Try 'cheap fruits' or 'recent orders'..."}
          className="pl-10"
        />
      </div>
      <Button 
        onClick={handleSearch} 
        disabled={isSearching || !query.trim()}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        {isSearching ? 'Searching...' : 'AI Search'}
      </Button>
    </div>
  );
};
