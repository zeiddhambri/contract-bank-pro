
import { Clause, AIResponse } from "@/types/clause";

export class AIService {
  private static instance: AIService;
  private apiKey: string | null = null;

  private constructor() {
    // Clé API à configurer via les variables d'environnement
    this.apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || null;
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public setApiKey(key: string) {
    this.apiKey = key;
  }

  private async callOpenAI(messages: any[], model = 'gpt-4'): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Clé API OpenAI non configurée');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur API OpenAI: ${response.statusText}`);
    }

    return response.json();
  }

  public async improveClause(content: string, context?: string): Promise<AIResponse> {
    try {
      const messages = [
        {
          role: 'system',
          content: `Tu es un expert en rédaction juridique. Ton rôle est d'améliorer les clauses contractuelles en :
          - Clarifiant le langage juridique
          - Ajoutant les éléments manquants importants
          - Optimisant la structure
          - Respectant les standards français
          ${context ? `Contexte spécifique: ${context}` : ''}`
        },
        {
          role: 'user',
          content: `Améliore cette clause contractuelle :\n\n${content}`
        }
      ];

      const response = await this.callOpenAI(messages);
      const improvedContent = response.choices[0].message.content;

      return {
        success: true,
        content: improvedContent,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  public async categorizeClause(content: string): Promise<AIResponse> {
    try {
      const categories = [
        'RGPD', 'SaaS', 'Travail', 'Commercial', 'Confidentialité',
        'Responsabilité', 'Propriété Intellectuelle', 'Résiliation'
      ];

      const messages = [
        {
          role: 'system',
          content: `Tu es un expert en classification de clauses juridiques. 
          Analyse le contenu et détermine la catégorie la plus appropriée parmi : ${categories.join(', ')}.
          Réponds uniquement avec le nom de la catégorie et un score de confiance (0-1).`
        },
        {
          role: 'user',
          content: `Classe cette clause :\n\n${content}`
        }
      ];

      const response = await this.callOpenAI(messages);
      const result = response.choices[0].message.content;
      
      // Parser la réponse pour extraire catégorie et confiance
      const lines = result.split('\n');
      const category = lines[0]?.trim();
      const confidenceMatch = result.match(/(\d+\.?\d*)/);
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;

      return {
        success: true,
        category: categories.includes(category) ? category : 'Commercial',
        confidence
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  public async summarizeClause(content: string): Promise<AIResponse> {
    try {
      const messages = [
        {
          role: 'system',
          content: `Tu es un expert juridique. Résume les clauses contractuelles de manière claire et concise,
          en extrayant les points clés, obligations principales, et éléments importants à retenir.`
        },
        {
          role: 'user',
          content: `Résume cette clause :\n\n${content}`
        }
      ];

      const response = await this.callOpenAI(messages);
      const summary = response.choices[0].message.content;

      return {
        success: true,
        content: summary
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  public async generateSuggestions(content: string, category: string): Promise<AIResponse> {
    try {
      const messages = [
        {
          role: 'system',
          content: `Tu es un conseiller juridique expert en ${category}. 
          Analyse la clause et propose 3-5 suggestions d'amélioration concrètes et actionables.`
        },
        {
          role: 'user',
          content: `Analyse cette clause ${category} et propose des améliorations :\n\n${content}`
        }
      ];

      const response = await this.callOpenAI(messages);
      const suggestionsText = response.choices[0].message.content;
      
      // Parser les suggestions (supposer qu'elles sont séparées par des numéros ou puces)
      const suggestions = suggestionsText
        .split(/\d+\.|\-|\•/)
        .filter(s => s.trim().length > 10)
        .map(s => s.trim())
        .slice(0, 5);

      return {
        success: true,
        suggestions
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  public async generateFromTemplate(template: string, variables: Record<string, any>): Promise<AIResponse> {
    try {
      let processedTemplate = template;
      
      // Remplacer les variables dans le template
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processedTemplate = processedTemplate.replace(regex, value);
      });

      const messages = [
        {
          role: 'system',
          content: `Tu es un rédacteur juridique expert. Finalise cette clause en t'assurant qu'elle est 
          juridiquement correcte, bien structurée et adaptée au contexte français.`
        },
        {
          role: 'user',
          content: `Finalise cette clause :\n\n${processedTemplate}`
        }
      ];

      const response = await this.callOpenAI(messages);
      const finalClause = response.choices[0].message.content;

      return {
        success: true,
        content: finalClause
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

export const aiService = AIService.getInstance();

// Fonctions utilitaires d'export
export const exportUtils = {
  toMarkdown: (clauses: Clause[]): string => {
    return clauses.map(clause => {
      return `# ${clause.title}

**Catégorie:** ${clause.category}
**Tags:** ${clause.tags.join(', ')}
**Dernière modification:** ${clause.updatedAt.toLocaleDateString('fr-FR')}

## Contenu

${clause.content}

---
`;
    }).join('\n');
  },

  toJSON: (clauses: Clause[]): string => {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalClauses: clauses.length,
      clauses: clauses.map(clause => ({
        ...clause,
        createdAt: clause.createdAt.toISOString(),
        updatedAt: clause.updatedAt.toISOString()
      }))
    }, null, 2);
  },

  downloadFile: (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
