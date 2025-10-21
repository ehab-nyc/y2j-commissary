import { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAITranslate } from '@/hooks/useAITranslate';

interface TranslateButtonProps {
  text: string;
  onTranslated: (translatedText: string, language: string) => void;
  context?: string;
  size?: 'sm' | 'default' | 'lg';
}

const languages = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
];

export const TranslateButton = ({ 
  text, 
  onTranslated, 
  context,
  size = 'sm' 
}: TranslateButtonProps) => {
  const { translate, isTranslating } = useAITranslate();
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  const handleTranslate = async (langCode: string, langName: string) => {
    setSelectedLang(langCode);
    const translated = await translate(text, langCode, context);
    onTranslated(translated, langCode);
    setSelectedLang(null);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size={size}
          disabled={isTranslating}
          className="gap-2"
        >
          {isTranslating && selectedLang ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Languages className="h-4 w-4" />
          )}
          {isTranslating ? 'Translating...' : 'Translate'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleTranslate(lang.code, lang.name)}
            disabled={isTranslating}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
