import { useState } from 'react';
import { Upload, Image as ImageIcon, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageAnalysis {
  category?: string;
  features?: string[];
  quality?: string;
  suggestedName?: string;
  characteristics?: string[];
  rating?: string;
  issues?: string[];
  freshnessIndicators?: string[];
  recommendations?: string[];
  primaryCategory?: string;
  subCategory?: string;
  productType?: string;
  priceRange?: string;
  similarProducts?: string[];
}

interface ImageAnalyzerProps {
  imageUrl?: string;
  onAnalysisComplete?: (analysis: ImageAnalysis) => void;
}

export const ImageAnalyzer = ({ imageUrl: initialUrl, onAnalysisComplete }: ImageAnalyzerProps) => {
  const [imageUrl, setImageUrl] = useState(initialUrl || '');
  const [analysisType, setAnalysisType] = useState('product');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    
    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image.",
        variant: "destructive",
      });
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    setImageUrl(publicUrl);
  };

  const analyzeImage = async () => {
    if (!imageUrl) {
      toast({
        title: "No Image",
        description: "Please provide an image URL or upload an image.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { imageUrl, analysisType }
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

      setAnalysis(data.analysis);
      onAnalysisComplete?.(data.analysis);
      toast({
        title: "Analysis Complete!",
        description: "Image has been analyzed successfully.",
      });
    } catch (error) {
      console.error('Image analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          AI Image Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={analysisType} onValueChange={setAnalysisType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Analysis type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product">Product Info</SelectItem>
              <SelectItem value="quality">Quality Check</SelectItem>
              <SelectItem value="classification">Classification</SelectItem>
            </SelectContent>
          </Select>

          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="outline" className="w-full gap-2" asChild>
              <span>
                <Upload className="h-4 w-4" />
                Upload Image
              </span>
            </Button>
          </label>

          <Button
            onClick={analyzeImage}
            disabled={isAnalyzing || !imageUrl}
            className="gap-2"
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Analyze
          </Button>
        </div>

        {imageUrl && (
          <div className="rounded-lg overflow-hidden border">
            <img src={imageUrl} alt="Product" className="w-full max-h-64 object-contain bg-muted" />
          </div>
        )}

        {analysis && (
          <div className="space-y-3">
            <h4 className="font-semibold">Analysis Results:</h4>
            
            {analysis.category && (
              <div>
                <span className="text-sm font-medium">Category: </span>
                <Badge>{analysis.category}</Badge>
              </div>
            )}

            {analysis.suggestedName && (
              <div>
                <span className="text-sm font-medium">Suggested Name: </span>
                <span className="text-sm">{analysis.suggestedName}</span>
              </div>
            )}

            {analysis.quality && (
              <div>
                <span className="text-sm font-medium">Quality: </span>
                <Badge variant={analysis.quality === 'excellent' ? 'default' : 'secondary'}>
                  {analysis.quality}
                </Badge>
              </div>
            )}

            {analysis.rating && (
              <div>
                <span className="text-sm font-medium">Rating: </span>
                <Badge>{analysis.rating}</Badge>
              </div>
            )}

            {analysis.features && analysis.features.length > 0 && (
              <div>
                <span className="text-sm font-medium">Features:</span>
                <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                  {analysis.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.characteristics && analysis.characteristics.length > 0 && (
              <div>
                <span className="text-sm font-medium">Characteristics:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysis.characteristics.map((char, idx) => (
                    <Badge key={idx} variant="outline">{char}</Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <span className="text-sm font-medium">Recommendations:</span>
                <ul className="list-disc list-inside text-sm mt-1 space-y-1 text-muted-foreground">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
