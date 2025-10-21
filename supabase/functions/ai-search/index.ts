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
    const searchSchema = z.object({
      query: z.string()
        .min(1, "Query cannot be empty")
        .max(500, "Query must be less than 500 characters")
        .trim(),
      type: z.enum(["products", "orders"]).optional()
    });

    const body = await req.json();
    const validationResult = searchSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid input",
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query, type = "products" } = validationResult.data;
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Check user roles for order searches
    if (type === "orders") {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["worker", "manager", "admin", "super_admin"]);

      if (!roles || roles.length === 0) {
        return new Response(
          JSON.stringify({ error: "Insufficient permissions to search orders" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch data based on type - RLS will automatically filter based on user permissions
    let data: any[] = [];
    if (type === "products") {
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("name");
      data = products || [];
    } else if (type === "orders") {
      // RLS policies will ensure users only see orders they have access to
      const { data: orders } = await supabase
        .from("orders")
        .select("*, profiles(full_name, cart_number)")
        .order("created_at", { ascending: false })
        .limit(100);
      data = orders || [];
    }

    // Use AI to enhance search
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const searchPrompt = `Given this search query: "${query}"
    
And this data:
${JSON.stringify(data, null, 2)}

Analyze the query and return the most relevant results. Consider:
- Semantic meaning (e.g., "cheap fruit" should match low-priced fruits)
- Synonyms and related terms
- Partial matches
- Context and intent

Return a JSON array of IDs in order of relevance. Maximum 10 results.
Format: {"ids": [1, 5, 3, ...]}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are a search assistant. Analyze queries and return relevant results based on semantic meaning. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: searchPrompt
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const resultIds = jsonMatch ? JSON.parse(jsonMatch[0]).ids : [];

    // Return results in AI-determined order
    const results = resultIds
      .map((id: number) => data.find((item) => item.id === id))
      .filter(Boolean);

    return new Response(
      JSON.stringify({ results, total: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
