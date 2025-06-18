
import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wand2, FileText, Brain, CheckCircle } from 'lucide-react';

interface AiContractGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId?: string;
  onContractGenerated?: () => void;
}

const CONTRACT_CATEGORIES = [
  { value: 'banking', label: 'Bancaire' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'real_estate', label: 'Immobilier' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'services', label: 'Services' },
];

const GENERATION_TYPES = [
  { value: 'draft', label: 'Nouvelle rédaction', icon: FileText },
  { value: 'improvement', label: 'Amélioration', icon: Wand2 },
  { value: 'analysis', label: 'Analyse', icon: Brain },
  { value: 'summary', label: 'Résumé', icon: CheckCircle },
];

const AiContractGenerator: React.FC<AiContractGeneratorProps> = ({
  open,
  onOpenChange,
  contractId,
  onContractGenerated,
}) => {
  const { user, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('generate');
  const [generationType, setGenerationType] = useState('draft');
  const [category, setCategory] = useState('banking');
  const [parameters, setParameters] = useState({
    client_name: '',
    amount: '',
    duration: '',
    purpose: '',
    additional_clauses: '',
    existing_content: '',
  });
  const [generatedContent, setGeneratedContent] = useState('');

  // Fetch AI templates
  const { data: aiTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ['ai_contract_templates', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_contract_templates')
        .select('*')
        .eq('category', category)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Generate contract mutation
  const generateContractMutation = useMutation({
    mutationFn: async (params: any) => {
      const response = await fetch(
        'https://cqyuhztxmaawzzhdartp.functions.supabase.co/ai-contract-generator',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generation_type: generationType,
            category,
            parameters: params,
            contract_id: contractId,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Erreur lors de la génération');
      }
      return data;
    },
    onSuccess: (data) => {
      setGeneratedContent(data.generated_content);
      setActiveTab('result');
      toast({
        title: 'Succès',
        description: 'Contrat généré avec succès !',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur IA',
        description: error?.message || 'Impossible de générer le contrat',
        variant: 'destructive',
      });
    },
  });

  const handleGenerate = () => {
    if (!parameters.client_name || !parameters.amount) {
      toast({
        title: 'Paramètres manquants',
        description: 'Veuillez remplir au moins le nom du client et le montant.',
        variant: 'destructive',
      });
      return;
    }
    generateContractMutation.mutate(parameters);
  };

  const handleApplyGeneration = async () => {
    if (!generatedContent || !contractId) return;
    
    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          description: generatedContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contractId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Contrat mis à jour avec le contenu généré !',
      });
      
      onContractGenerated?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'appliquer les modifications',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-orange-600 to-red-600">
              <Brain className="w-5 h-5 text-white" />
            </div>
            Agent IA - Rédaction de Contrats
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-black/30 border border-slate-700/50">
            <TabsTrigger value="generate" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white">
              Paramètres
            </TabsTrigger>
            <TabsTrigger value="result" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white">
              Résultat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Type de génération</Label>
                <Select value={generationType} onValueChange={setGenerationType}>
                  <SelectTrigger className="bg-black/30 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENERATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Catégorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-black/30 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Nom du client</Label>
                <Input
                  value={parameters.client_name}
                  onChange={(e) => setParameters(prev => ({ ...prev, client_name: e.target.value }))}
                  className="bg-black/30 border-slate-600 text-white"
                  placeholder="Nom complet du client"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Montant</Label>
                <Input
                  value={parameters.amount}
                  onChange={(e) => setParameters(prev => ({ ...prev, amount: e.target.value }))}
                  className="bg-black/30 border-slate-600 text-white"
                  placeholder="Montant du contrat"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Durée</Label>
                <Input
                  value={parameters.duration}
                  onChange={(e) => setParameters(prev => ({ ...prev, duration: e.target.value }))}
                  className="bg-black/30 border-slate-600 text-white"
                  placeholder="Durée du contrat"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Objet</Label>
                <Input
                  value={parameters.purpose}
                  onChange={(e) => setParameters(prev => ({ ...prev, purpose: e.target.value }))}
                  className="bg-black/30 border-slate-600 text-white"
                  placeholder="Objet du contrat"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">Clauses additionnelles</Label>
              <Textarea
                value={parameters.additional_clauses}
                onChange={(e) => setParameters(prev => ({ ...prev, additional_clauses: e.target.value }))}
                className="bg-black/30 border-slate-600 text-white min-h-[100px]"
                placeholder="Clauses ou conditions spécifiques à inclure..."
              />
            </div>

            {generationType === 'improvement' && (
              <div className="space-y-2">
                <Label className="text-slate-200">Contenu existant à améliorer</Label>
                <Textarea
                  value={parameters.existing_content}
                  onChange={(e) => setParameters(prev => ({ ...prev, existing_content: e.target.value }))}
                  className="bg-black/30 border-slate-600 text-white min-h-[120px]"
                  placeholder="Collez ici le contenu du contrat à améliorer..."
                />
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={generateContractMutation.isPending}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
            >
              {generateContractMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Génération en cours...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Générer avec l'IA
                </div>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="result" className="space-y-4 mt-6">
            {generatedContent ? (
              <>
                <div className="bg-black/30 border border-slate-700/50 rounded-lg p-6">
                  <h3 className="text-white font-semibold mb-4">Contenu généré :</h3>
                  <div className="bg-black/20 rounded border border-slate-600 p-4 max-h-96 overflow-y-auto">
                    <pre className="text-slate-200 whitespace-pre-wrap text-sm">
                      {generatedContent}
                    </pre>
                  </div>
                </div>

                <div className="flex gap-3">
                  {contractId && (
                    <Button
                      onClick={handleApplyGeneration}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Appliquer au contrat
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => setActiveTab('generate')}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Nouveau paramétrage
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun contenu généré pour le moment.</p>
                <p className="text-sm">Configurez les paramètres et générez un contrat.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AiContractGenerator;
