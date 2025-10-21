import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT is already verified by Supabase (verify_jwt = true in config.toml)
    // We can extract user info from the JWT token if needed
    const authHeader = req.headers.get("authorization");
    console.log('Request authenticated via JWT verification');

    const translateSchema = z.object({
      text: z.string()
        .min(1, "Text cannot be empty")
        .max(5000, "Text must be less than 5000 characters for translation")
        .trim(),
      targetLanguage: z.string()
        .min(2, "Language code must be at least 2 characters")
        .max(5, "Language code must be at most 5 characters")
        .regex(/^[a-z]{2,5}$/, "Invalid language code format"),
      context: z.string()
        .max(200, "Context must be less than 200 characters")
        .optional()
    });

    const body = await req.json();
    
    console.log('=== AI Translate Edge Function Called ===');
    console.log('Request body:', body);
    
    const validationResult = translateSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input",
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, targetLanguage, context } = validationResult.data;
    
    console.log('Validated - Target Language:', targetLanguage);
    console.log('Validated - Text length:', text.length);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const languageMap: Record<string, string> = {
      en: "English",
      ar: "Arabic",
      es: "Spanish",
      fr: "French",
      de: "German",
      zh: "Chinese",
      ja: "Japanese",
    };

    const targetLangName = languageMap[targetLanguage] || targetLanguage;
    const contextNote = context ? `\n\nContext: ${context}` : "";

    console.log('Calling Lovable AI gateway...');
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
            content: `You are a professional translator. Translate the given text to ${targetLangName}. Maintain the tone, style, and meaning. Only return the translated text, nothing else.${contextNote}`
          },
          {
            role: "user",
            content: text
          }
        ],
      }),
    });

    console.log('AI Gateway response status:', response.status);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Translation request failed: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content || text;

    console.log('Translation successful, returning result');
    console.log('Translated text:', translatedText);

    return new Response(
      JSON.stringify({ translatedText, originalText: text, targetLanguage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
