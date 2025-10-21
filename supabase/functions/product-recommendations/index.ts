import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("authorization");
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } }
    });

    // Properly validate JWT using Supabase auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const userId = user.id;
    console.log('Request authenticated for user:', userId);

    // Get user's order history - RLS ensures they can only see their own orders
    const { data: orders } = await supabase
      .from("orders")
      .select("*, order_items(*, products(name, price, category_id, description))")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get all available products - RLS allows viewing active products
    const { data: allProducts } = await supabase
      .from("products")
      .select("*")
      .eq("active", true);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const recommendationPrompt = `Based on this customer's order history:
${JSON.stringify(orders, null, 2)}

And these available products:
${JSON.stringify(allProducts, null, 2)}

Recommend 5 products the customer might be interested in. Consider:
- Products they've ordered before (reorder suggestions)
- Complementary products
- Products in similar categories
- Price range preferences

Return ONLY a JSON array of product IDs in order of recommendation strength.
Format: {"productIds": [id1, id2, id3, id4, id5], "reasons": ["reason1", "reason2", "reason3", "reason4", "reason5"]}`;

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
            content: "You are a product recommendation engine. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: recommendationPrompt
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
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { productIds: [], reasons: [] };

    // Get full product details for recommendations
    const recommendations = parsed.productIds
      .map((id: string, index: number) => {
        const product = allProducts?.find((p: any) => p.id === id);
        return product ? { ...product, reason: parsed.reasons?.[index] || "Recommended for you" } : null;
      })
      .filter(Boolean);

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Recommendations error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
