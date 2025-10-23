import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { detectPromptInjection, sanitizeForAI } from "../_shared/promptInjection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const generateSchema = z.object({
  productId: z.string().uuid().optional(),
  productName: z.string().trim().min(1, "Product name is required").max(200, "Product name must be less than 200 characters"),
  categoryName: z.string().trim().max(100, "Category name must be less than 100 characters").optional(),
  existingDescription: z.string().max(2000, "Description must be less than 2000 characters").optional(),
  tone: z.enum(['professional', 'casual', 'luxury', 'concise']).default('professional')
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validationResult = generateSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Input validation failed:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ error: 'Invalid content generation request' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const validated = validationResult.data;
    
    // Check for prompt injection in text fields
    if (detectPromptInjection(validated.productName) || 
        (validated.existingDescription && detectPromptInjection(validated.existingDescription))) {
      console.warn('Potential prompt injection in content generation');
      return new Response(
        JSON.stringify({ error: 'Invalid input content' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const productId = validated.productId;
    const sanitizedProductName = sanitizeForAI(validated.productName);
    const categoryName = validated.categoryName;
    const sanitizedDescription = validated.existingDescription ? sanitizeForAI(validated.existingDescription) : undefined;
    const tone = validated.tone;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user has admin/manager role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // ACTUALLY check the role from database
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'manager', 'super_admin'])
      .single();

    if (roleError || !roles) {
      console.error('Role verification failed:', roleError);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin or Manager role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('User authorized with role:', roles.role);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const toneMap: Record<string, string> = {
      professional: "professional and informative",
      casual: "friendly and conversational",
      luxury: "elegant and premium",
      concise: "brief and to-the-point",
    };

    // tone is now guaranteed to be one of the enum values from validation
    const selectedTone = toneMap[tone];

    const prompt = sanitizedDescription
      ? `Improve this product description for "${sanitizedProductName}" (Category: ${categoryName ? sanitizeForAI(categoryName) : "General"})

Current description: ${sanitizedDescription}

Make it more engaging, ${selectedTone}, and highlight key features and benefits. Keep it between 50-150 words. Return only the improved description, no additional text.`
      : `Write a compelling product description for "${sanitizedProductName}" (Category: ${categoryName ? sanitizeForAI(categoryName) : "General"})

Make it ${selectedTone}, highlight key features and benefits, and make customers want to buy it. Keep it between 50-150 words. Return only the description, no additional text.`;

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
            content: "You are a professional product copywriter. Write engaging, accurate product descriptions that sell. Always respond with only the description text, no additional commentary."
          },
          {
            role: "user",
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Content generation service unavailable" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to generate content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const generatedDescription = aiData.choices?.[0]?.message?.content?.trim() || "";

    // Optionally update the product in database
    if (productId) {
      await supabase
        .from("products")
        .update({ description: generatedDescription })
        .eq("id", productId);
    }

    return new Response(
      JSON.stringify({ description: generatedDescription }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Content generation error:", error);
    return new Response(
      JSON.stringify({ error: "Content generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
