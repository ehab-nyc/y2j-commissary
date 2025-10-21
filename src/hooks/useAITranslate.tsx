import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAITranslate = () => {
  const [isTranslating, setIsTranslating] = useState(false);
  const { toast } = useToast();

  const translate = async (
    text: string,
    targetLanguage: string,
    context?: string
  ): Promise<string> => {
    if (!text.trim()) return text;

    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-translate', {
        body: { text, targetLanguage, context }
      });

      if (error) {
        if (error.message?.includes('Rate limit')) {
          toast({
            title: "Rate Limit",
            description: "Too many translation requests. Please wait a moment.",
            variant: "destructive",
          });
        } else if (error.message?.includes('credits')) {
          toast({
            title: "Credits Exhausted",
            description: "AI translation credits exhausted. Please contact support.",
            variant: "destructive",
          });
        }
        throw error;
      }

      return data.translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation Error",
        description: "Failed to translate. Please try again.",
        variant: "destructive",
      });
      return text;
    } finally {
      setIsTranslating(false);
    }
  };

  return { translate, isTranslating };
};
