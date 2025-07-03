
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Download, 
  Settings, 
  Brain,
  TrendingUp,
  Users,
  Clock,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import ClauseEditor from "@/components/ClauseEditor";
import ClauseSidebar from "@/components/ClauseSidebar";
import { Clause, DEFAULT_CATEGORIES } from "@/types/clause";
import { aiService, exportUtils } from "@/lib/ai-utils";

const ClauseManager = () => {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Données de démonstration
  useEffect(() => {
    const demoData: Clause[] = [
      {
        id: '1',
        title: 'Clause de confidentialité RGPD',
        content: `Le présent contrat impose aux parties de respecter la confidentialité des données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).

Les données collectées ne peuvent être utilisées que dans le cadre strict de l'exécution du présent contrat. Toute utilisation à des fins commerciales ou de marketing nécessite le consentement explicite de la personne concernée.

En cas de violation de données, la partie responsable s'engage à notifier l'incident dans les 72 heures aux autorités compétentes et aux personnes concernées.`,
        category: 'RGPD',
        tags: ['confidentialité', 'données personnelles', 'CNIL'],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20')
      },
      {
        id: '2',
        title: 'Conditions générales SaaS',
        content: `Les présentes conditions régissent l'accès et l'utilisation du service logiciel fourni en mode Software as a Service (SaaS).

Le Client bénéficie d'un droit d'usage non exclusif du logiciel, accessible via internet. Le Fournisseur garantit une disponibilité de service de 99.9% sur une base mensuelle.

En cas d'interruption de service supérieure à 4 heures consécutives, le Client pourra prétendre à une réduction de sa facture mensuelle proportionnelle à la durée d'indisponibilité.`,
        category: 'SaaS',
        tags: ['service', 'disponibilité', 'garantie'],
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-18')
      },
      {
        id: '3',
        title: 'Clause de non-concurrence',
        content: `Le salarié s\'engage à ne pas exercer, directement ou indirectement, une activité concurrente à celle de l\'employeur pendant une durée de 12 mois suivant la fin du contrat de travail.

Cette obligation s\'applique dans un rayon géographique de 50 kilomètres autour du siège social de l\'entreprise.

En contrepartie de cette obligation, l\'employeur versera au salarié une indemnité mensuelle équivalente à 30% de son dernier salaire brut mensuel.`,
        category: 'Travail',
        tags: ['non-concurrence', 'indemnité', 'durée'],
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-22')
      }
    ];

    setTimeout(() => {
      setClauses(demoData);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleSaveClause = async (clauseData: Partial<Clause>) => {
    if (clauseData.id) {
      // Modification
      setClauses(prev => prev.map(clause => 
        clause.id === clauseData.id 
          ? { ...clause, ...clauseData, updatedAt: new Date() }
          : clause
      ));
    } else {
      // Création
      const newClause: Clause = {
        id: Date.now().toString(),
        title: clauseData.title || '',
        content: clauseData.content || '',
        category: clauseData.category || 'Commercial',
        tags: clauseData.tags || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setClauses(prev => [newClause, ...prev]);
      setSelectedClause(newClause);
    }
  };

  const handleDeleteClause = (clauseId: string) => {
    setClauses(prev => prev.filter(clause => clause.id !== clauseId));
    setSelectedClause(null);
    toast.success("Clause supprimée");
  };

  const handleNewClause = () => {
    setSelectedClause(null);
  };

  const handleExportAll = (format: 'json' | 'markdown') => {
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'json') {
      const content = exportUtils.toJSON(clauses);
      exportUtils.downloadFile(content, `clauses-${timestamp}.json`, 'application/json');
    } else {
      const content = exportUtils.toMarkdown(clauses);
      exportUtils.downloadFile(content, `clauses-${timestamp}.md`, 'text/markdown');
    }
    
    toast.success(`Export ${format.toUpperCase()} terminé`);
  };

  // Statistiques
  const stats = {
    total: clauses.length,
    categories: DEFAULT_CATEGORIES.length,
    recentlyUpdated: clauses.filter(c => 
      (new Date().getTime() - c.updatedAt.getTime()) < 7 * 24 * 60 * 60 * 1000
    ).length,
    averageLength: Math.round(
      clauses.reduce((sum, c) => sum + c.content.length, 0) / (clauses.length || 1)
    )
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Chargement de Jurix.app...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* En-tête */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Jurix.app</h1>
                  <p className="text-slate-300 text-sm">Gestionnaire de clauses intelligentes</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportAll('markdown')}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <Download className="h-4 w-4 mr-2" />
                Export MD
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportAll('json')}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-black/40 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total clauses</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-black/40 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Catégories</p>
                  <p className="text-2xl font-bold text-white">{stats.categories}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-black/40 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Récentes</p>
                  <p className="text-2xl font-bold text-white">{stats.recentlyUpdated}</p>
                </div>
                <Clock className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-black/40 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Moy. caractères</p>
                  <p className="text-2xl font-bold text-white">{stats.averageLength}</p>
                </div>
                <Zap className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interface principale */}
      <div className="container mx-auto px-4 pb-8">
        <Card className="bg-black/40 border-slate-700 min-h-[600px]">
          <div className="flex h-full">
            {/* Sidebar */}
            <ClauseSidebar
              clauses={clauses}
              selectedClause={selectedClause}
              onSelectClause={setSelectedClause}
              onNewClause={handleNewClause}
              categories={DEFAULT_CATEGORIES.map(cat => cat.name)}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
            
            {/* Éditeur principal */}
            <div className="flex-1 p-6 bg-white">
              <ClauseEditor
                clause={selectedClause || undefined}
                onSave={handleSaveClause}
                onDelete={handleDeleteClause}
                categories={DEFAULT_CATEGORIES.map(cat => cat.name)}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ClauseManager;
