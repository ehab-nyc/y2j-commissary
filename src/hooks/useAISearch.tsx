import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAISearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const search = async (query: string, type: 'products' | 'orders' = 'products') => {
    if (!query.trim()) {
      return { results: [], total: 0 };
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: { query, type }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('AI search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to perform AI search. Please try again.",
        variant: "destructive",
      });
      return { results: [], total: 0 };
    } finally {
      setIsSearching(false);
    }
  };

  return { search, isSearching };
};
