// ============================================================================
// Utilitaires d'export des clauses (R1.2)
// ----------------------------------------------------------------------------
// ⚠️ La classe `AIService` qui appelait directement `https://api.openai.com`
// depuis le navigateur a été SUPPRIMÉE :
//   • elle exigeait une clé API OpenAI côté client (fuite inévitable : tout ce
//     qui est livré au navigateur est public) ;
//   • elle lisait `process.env.NEXT_PUBLIC_*`, inexistant dans une app Vite
//     (`process is not defined` à l'exécution) ;
//   • elle court-circuitait le quota, la journalisation et la validation.
//
// Toute génération IA passe désormais par les Edge Functions authentifiées :
//   supabase.functions.invoke('ai-assistant-chat' | 'ai-contract-generator')
// La clé OpenAI ne vit QUE dans `OPENAI_API_KEY` (secret de la Function).
// ============================================================================
import type { Clause } from "@/types/clause";

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
