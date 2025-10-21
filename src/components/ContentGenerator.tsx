import { useState } from 'react';
import { Sparkles, Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContentGeneratorProps {
  productId?: string;
  productName: string;
  categoryName?: string;
  existingDescription?: string;
  onGenerated: (description: string) => void;
}

export const ContentGenerator = ({
  productId,
  productName,
  categoryName,
  existingDescription,
  onGenerated,
}: ContentGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [tone, setTone] = useState('professional');
  const [preview, setPreview] = useState('');
  const { toast } = useToast();

  const generateContent = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          productId,
          productName,
          categoryName,
          existingDescription,
          tone,
        }
      });

      if (error) {
        if (error.message?.includes('Rate limit')) {
          toast({
            title: "Rate Limit",
            description: "Too many requests. Please wait a moment.",
            variant: "destructive",
          });
        } else if (error.message?.includes('credits')) {
          toast({
            title: "Credits Exhausted",
            description: "AI credits exhausted. Please contact support.",
            variant: "destructive",
          });
        }
        throw error;
      }

      setPreview(data.description);
      toast({
        title: "Content Generated!",
        description: "Review the description and apply if satisfied.",
      });
    } catch (error) {
      console.error('Content generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const applyContent = () => {
    onGenerated(preview);
    setPreview('');
    toast({
      title: "Applied!",
      description: "Description has been updated.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={tone} onValueChange={setTone}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select tone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="luxury">Luxury</SelectItem>
            <SelectItem value="concise">Concise</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={generateContent}
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          {existingDescription ? 'Improve Description' : 'Generate Description'}
        </Button>
      </div>

      {preview && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Generated Preview:</span>
          </div>
          <Textarea
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
            className="min-h-[120px]"
          />
          <div className="flex gap-2">
            <Button onClick={applyContent}>Apply Description</Button>
            <Button onClick={() => setPreview('')} variant="outline">
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
