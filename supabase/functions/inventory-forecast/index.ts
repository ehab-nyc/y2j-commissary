import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get products with sales history
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        quantity,
        reorder_point,
        low_stock_threshold,
        category_id,
        categories(name)
      `)
      .eq('active', true);

    if (productsError) throw productsError;

    // Get order history (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        created_at,
        orders!inner(status, updated_at)
      `)
      .eq('orders.status', 'completed')
      .gte('orders.updated_at', ninetyDaysAgo.toISOString());

    if (orderItemsError) throw orderItemsError;

    // Build sales history per product
    const salesHistory: Record<string, { dates: string[], quantities: number[], total: number }> = {};
    
    orderItems.forEach((item: any) => {
      if (!salesHistory[item.product_id]) {
        salesHistory[item.product_id] = { dates: [], quantities: [], total: 0 };
      }
      salesHistory[item.product_id].dates.push(item.created_at);
      salesHistory[item.product_id].quantities.push(item.quantity);
      salesHistory[item.product_id].total += item.quantity;
    });

    // Prepare data for AI analysis
    const productsWithHistory = products?.map(product => {
      const history = salesHistory[product.id] || { dates: [], quantities: [], total: 0 };
      const avgWeeklySales = history.total / 13; // 90 days ≈ 13 weeks
      const categories = product.categories as any;
      
      return {
        id: product.id,
        name: product.name,
        category: categories?.name || 'Uncategorized',
        currentStock: product.quantity,
        reorderPoint: product.reorder_point,
        lowStockThreshold: product.low_stock_threshold,
        totalSold90Days: history.total,
        avgWeeklySales: Math.round(avgWeeklySales * 10) / 10,
        salesTrend: history.quantities.length > 0 ? 'active' : 'inactive'
      };
    }) || [];

    // Call Lovable AI for forecasting
    const aiPrompt = `Analyze this inventory data and provide forecasting for each product. 
    
Products data (JSON):
${JSON.stringify(productsWithHistory, null, 2)}

For each product, calculate:
1. predicted_demand: Weekly demand prediction based on historical sales
2. days_until_stockout: Days until stock runs out at current demand rate
3. reorder_suggestion: Recommended reorder quantity (2-4 weeks of stock)
4. confidence_score: 0-1 score based on data quality
5. trend: "increasing", "stable", or "decreasing"

Return ONLY a JSON array with this exact structure for each product:
[{
  "product_id": "uuid",
  "predicted_demand": number,
  "days_until_stockout": number,
  "reorder_suggestion": number,
  "confidence_score": number,
  "trend": "increasing" | "stable" | "decreasing"
}]`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an inventory forecasting AI. Always return valid JSON arrays.' },
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI Gateway error');
    }

    const aiData = await aiResponse.json();
    let forecasts = [];

    try {
      const content = aiData.choices[0].message.content;
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[[\s\S]*\]/);
      forecasts = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : content);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      throw new Error('Invalid AI response format');
    }

    // Store forecasts in database
    const forecastsToInsert = forecasts.map((f: any) => ({
      product_id: f.product_id,
      predicted_demand: f.predicted_demand,
      days_until_stockout: f.days_until_stockout,
      reorder_suggestion: f.reorder_suggestion,
      confidence_score: f.confidence_score,
      trend: f.trend,
      forecast_date: new Date().toISOString().split('T')[0],
    }));

    // Delete old forecasts for today
    await supabase
      .from('inventory_forecasts')
      .delete()
      .eq('forecast_date', new Date().toISOString().split('T')[0]);

    // Insert new forecasts
    const { error: insertError } = await supabase
      .from('inventory_forecasts')
      .insert(forecastsToInsert);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        forecasts: forecastsToInsert,
        message: `Generated forecasts for ${forecastsToInsert.length} products`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in inventory-forecast:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
