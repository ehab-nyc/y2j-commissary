import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const imageAnalysisSchema = z.object({
  imageUrl: z.string()
    .url({ message: "Invalid URL format" })
    .max(2000, { message: "URL too long (max 2000 characters)" })
    .refine((url) => url.startsWith("https://"), { message: "Only HTTPS URLs are allowed" }),
  analysisType: z.enum(["product", "quality", "classification"], {
    errorMap: () => ({ message: "Invalid analysis type. Must be 'product', 'quality', or 'classification'" })
  }).default("product")
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create client with user's JWT to enforce RLS
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log('User authenticated:', user.id);

    const body = await req.json();
    
    // Validate input
    const validationResult = imageAnalysisSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.format());
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: validationResult.error.errors.map(e => e.message)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { imageUrl, analysisType } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const prompts: Record<string, string> = {
      product: `Analyze this product image and provide:
1. Product category (e.g., fruits, vegetables, packaged goods)
2. Main features visible in the image
3. Quality assessment (freshness, condition)
4. Suggested product name if not obvious
5. Any notable characteristics

Format as JSON: {"category": "", "features": [], "quality": "", "suggestedName": "", "characteristics": []}`,
      
      quality: `Inspect this product image for quality control:
1. Overall quality rating (excellent/good/fair/poor)
2. Any visible defects or issues
3. Freshness indicators
4. Recommendations for improvement

Format as JSON: {"rating": "", "issues": [], "freshnessIndicators": [], "recommendations": []}`,
      
      classification: `Classify this product image:
1. Primary category
2. Sub-category
3. Product type
4. Estimated price range (budget/mid-range/premium)
5. Similar products

Format as JSON: {"primaryCategory": "", "subCategory": "", "productType": "", "priceRange": "", "similarProducts": []}`
    };

    const prompt = prompts[analysisType] || prompts.product;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a product image analysis expert. Analyze images accurately and provide detailed insights in JSON format only."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return new Response(
      JSON.stringify({ analysis, rawResponse: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Image analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
