
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { generation_type, category, parameters, contract_id } = await req.json();

    console.log('AI Contract Generation Request:', { generation_type, category, parameters });
    
    if (!openAIApiKey) {
      throw new Error('Clé API OpenAI non configurée');
    }

    // Récupérer le template IA approprié
    const { data: template } = await supabase
      .from('ai_contract_templates')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .limit(1)
      .single();

    // Construire le prompt selon le type de génération
    let systemPrompt = '';
    let userPrompt = '';

    switch (generation_type) {
      case 'draft':
        systemPrompt = template?.prompt_template || `Vous êtes un expert juridique spécialisé dans la rédaction de contrats ${category}. Rédigez un contrat professionnel, clair et complet en français.`;
        userPrompt = `Rédigez un contrat ${category} avec les paramètres suivants :
- Client : ${parameters.client_name}
- Montant : ${parameters.amount}
- Durée : ${parameters.duration || 'Non spécifiée'}
- Objet : ${parameters.purpose || 'Non spécifié'}
- Clauses additionnelles : ${parameters.additional_clauses || 'Aucune'}

Le contrat doit inclure :
1. Les parties contractantes
2. L'objet du contrat
3. Les conditions financières
4. Les obligations de chaque partie
5. Les conditions de résiliation
6. Les clauses légales standard`;
        break;

      case 'improvement':
        systemPrompt = "Vous êtes un expert juridique qui améliore les contrats existants. Analysez le contenu fourni et proposez une version améliorée.";
        userPrompt = `Améliorez ce contrat en :
1. Clarifiant le langage juridique
2. Ajoutant les clauses manquantes importantes
3. Optimisant la structure
4. Renforçant la protection des parties

Contenu à améliorer :
${parameters.existing_content}

Paramètres additionnels :
- Client : ${parameters.client_name}
- Montant : ${parameters.amount}
- Clauses souhaitées : ${parameters.additional_clauses || 'Aucune'}`;
        break;

      case 'analysis':
        systemPrompt = "Vous êtes un expert juridique qui analyse les contrats. Fournissez une analyse détaillée des risques et opportunités.";
        userPrompt = `Analysez ce contrat et identifiez :
1. Les points forts
2. Les risques potentiels
3. Les clauses manquantes importantes
4. Les suggestions d'amélioration

Contenu à analyser :
${parameters.existing_content || 'Contrat standard ' + category}`;
        break;

      case 'summary':
        systemPrompt = "Vous êtes un expert qui résume les contrats de manière claire et accessible.";
        userPrompt = `Résumez ce contrat en français de manière claire :
1. Parties impliquées
2. Objet principal
3. Conditions financières
4. Obligations clés
5. Points d'attention

Contenu :
${parameters.existing_content || `Contrat ${category} - Client: ${parameters.client_name}, Montant: ${parameters.amount}`}`;
        break;

      default:
        throw new Error('Type de génération non supporté');
    }

    console.log('Calling OpenAI with prompts:', { systemPrompt: systemPrompt.substring(0, 200), userPrompt: userPrompt.substring(0, 200) });

    // Appel à l'API OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API Error:', error);
      throw new Error('Erreur API OpenAI: ' + error);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Generated content length:', generatedContent.length);

    // Sauvegarder la génération dans la base de données
    const { error: insertError } = await supabase
      .from('ai_contract_generations')
      .insert({
        contract_id,
        template_id: template?.id,
        generation_type,
        input_parameters: parameters,
        generated_content: generatedContent,
        quality_score: 0.85, // Score par défaut, pourrait être calculé
      });

    if (insertError) {
      console.error('Error saving generation:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated_content: generatedContent,
        generation_type,
        template_used: template?.name || 'Template par défaut',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in ai-contract-generator:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
