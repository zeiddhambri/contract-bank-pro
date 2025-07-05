
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
    const { contractText, extractionType, contractId } = await req.json()

    if (!contractText || !extractionType) {
      return new Response(
        JSON.stringify({ error: 'Contract text and extraction type are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Initialize OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Define extraction prompts based on type
    const prompts = {
      dates: `Extract all important dates from this contract text and return them in JSON format with keys: start_date, end_date, renewal_date, signature_date, key_milestones. Return only the JSON.`,
      penalties: `Extract penalty clauses and financial penalties from this contract text. Return in JSON format with keys: penalty_type, amount, condition, deadline. Return only the JSON.`,
      payments: `Extract payment terms from this contract text. Return in JSON format with keys: payment_amount, payment_schedule, due_dates, late_fees, payment_method. Return only the JSON.`,
      parties: `Extract information about all parties involved in this contract. Return in JSON format with keys: primary_party, secondary_party, guarantors, witnesses, legal_representatives. Return only the JSON.`,
      terms: `Extract key terms and conditions from this contract. Return in JSON format with keys: termination_conditions, renewal_terms, modification_clauses, governing_law, dispute_resolution. Return only the JSON.`
    }

    const prompt = prompts[extractionType as keyof typeof prompts]
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Invalid extraction type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a legal AI assistant specialized in contract analysis. ${prompt}`
          },
          {
            role: 'user',
            content: contractText
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const aiResponse = await response.json()
    const extractedContent = aiResponse.choices[0]?.message?.content

    if (!extractedContent) {
      throw new Error('No content extracted from AI response')
    }

    // Parse the JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(extractedContent.trim())
    } catch (e) {
      // If JSON parsing fails, wrap the content
      extractedData = { raw_extraction: extractedContent }
    }

    // Calculate confidence score based on the completeness of extraction
    const confidenceScore = calculateConfidenceScore(extractedData, extractionType)

    // Save extraction to database if contractId is provided
    if (contractId) {
      const { error: dbError } = await supabase
        .from('contract_ai_extractions')
        .insert({
          contract_id: contractId,
          extraction_type: extractionType,
          extracted_data: extractedData,
          confidence_score: confidenceScore,
          is_verified: false
        })

      if (dbError) {
        console.error('Database error:', dbError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        extracted_data: extractedData,
        confidence_score: confidenceScore,
        extraction_type: extractionType
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in AI contract extraction:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to extract contract data',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function calculateConfidenceScore(data: any, extractionType: string): number {
  if (!data || typeof data !== 'object') return 0.1

  const keys = Object.keys(data)
  if (keys.length === 0) return 0.1

  // Calculate score based on number of extracted fields and their content
  let score = 0.5 // Base score

  // Add points for each populated field
  for (const key of keys) {
    if (data[key] && data[key] !== '' && data[key] !== null) {
      score += 0.1
    }
  }

  // Type-specific bonuses
  switch (extractionType) {
    case 'dates':
      if (data.start_date && data.end_date) score += 0.2
      break
    case 'payments':
      if (data.payment_amount && data.payment_schedule) score += 0.2
      break
    case 'parties':
      if (data.primary_party && data.secondary_party) score += 0.2
      break
  }

  return Math.min(score, 1.0) // Cap at 1.0
}
