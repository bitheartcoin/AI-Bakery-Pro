import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, context } = await req.json()

    // Get Google API key from environment
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
    if (!googleApiKey) {
      throw new Error('Google API key not configured')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get database context
    const dbContext = await getDatabaseContext(supabase)
    
    // Prepare the prompt with database context
    const systemPrompt = `Te egy AI asszisztens vagy egy pékség menedzsment rendszerében. A következő adatbázis információk állnak rendelkezésedre:

${dbContext}

Válaszolj magyarul és segíts a felhasználónak a pékség működésével kapcsolatos kérdésekben. Használd az aktuális adatokat a válaszaidban.`

    // Prepare messages for Gemini
    const geminiMessages = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      ...messages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))
    ]

    // Call Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API')
    }

    const assistantMessage = {
      role: 'assistant',
      content: data.candidates[0].content.parts[0].text
    }

    return new Response(
      JSON.stringify(assistantMessage),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in AI Assistant:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        role: 'assistant',
        content: 'Sajnálom, hiba történt a válasz generálása során. Kérlek próbáld újra.'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

async function getDatabaseContext(supabase: any) {
  try {
    // Get current statistics
    const [
      { data: orders },
      { data: inventory },
      { data: batches },
      { data: locations },
      { data: products },
      { data: employees }
    ] = await Promise.all([
      supabase.from('orders').select('*').limit(10),
      supabase.from('inventory').select('*').limit(20),
      supabase.from('production_batches').select('*').limit(10),
      supabase.from('locations').select('*'),
      supabase.from('products').select('*').limit(20),
      supabase.from('profiles').select('*').limit(10)
    ])

    const context = `
AKTUÁLIS ADATOK:

RENDELÉSEK (${orders?.length || 0} db):
${orders?.map(order => `- ${order.order_number}: ${order.customer_name}, ${order.total_amount} Ft, státusz: ${order.status}`).join('\n') || 'Nincs adat'}

KÉSZLET (${inventory?.length || 0} tétel):
${inventory?.map(item => `- ${item.name}: ${item.current_stock} ${item.unit}, kategória: ${item.category}`).join('\n') || 'Nincs adat'}

GYÁRTÁSI TÉTELEK (${batches?.length || 0} db):
${batches?.map(batch => `- ${batch.batch_number}: ${batch.batch_size} db, státusz: ${batch.status}`).join('\n') || 'Nincs adat'}

HELYSZÍNEK (${locations?.length || 0} db):
${locations?.map(loc => `- ${loc.name}: ${loc.type}, ${loc.city}`).join('\n') || 'Nincs adat'}

TERMÉKEK (${products?.length || 0} db):
${products?.map(product => `- ${product.name}: ${product.retail_price} Ft, kategória: ${product.category}`).join('\n') || 'Nincs adat'}

ALKALMAZOTTAK (${employees?.length || 0} fő):
${employees?.map(emp => `- ${emp.full_name}: ${emp.role}`).join('\n') || 'Nincs adat'}
`

    return context
  } catch (error) {
    console.error('Error getting database context:', error)
    return 'Adatbázis kontextus nem elérhető.'
  }
}