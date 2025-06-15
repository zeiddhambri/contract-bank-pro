
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import AddWorkflowStepDialog from './AddWorkflowStepDialog';

interface TemplateWorkflowManagerProps {
  templateId: string;
  workflowSteps: Tables<'template_workflow_steps'>[];
}

const ROLE_LABELS = {
  user: 'Utilisateur',
  manager: 'Manager',
  validator: 'Validateur',
  auditor: 'Auditeur',
  bank_admin: 'Admin Banque',
  super_admin: 'Super Admin',
};

const TemplateWorkflowManager: React.FC<TemplateWorkflowManagerProps> = ({
  templateId,
  workflowSteps,
}) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase
        .from('template_workflow_steps')
        .delete()
        .eq('id', stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template_details', templateId] });
      toast({
        title: 'Succès',
        description: 'Étape supprimée avec succès.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de supprimer l\'étape.',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Workflow de validation</h3>
          <p className="text-sm text-muted-foreground">
            Configurez les étapes de validation pour ce modèle de contrat
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une étape
        </Button>
      </div>

      <div className="space-y-3">
        {workflowSteps.map((step, index) => (
          <Card key={step.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Étape {step.step_order}
                    </Badge>
                    <CardTitle className="text-base">{step.step_name}</CardTitle>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {step.required_role && (
                    <Badge variant="secondary" className="text-xs">
                      {ROLE_LABELS[step.required_role as keyof typeof ROLE_LABELS] || step.required_role}
                    </Badge>
                  )}
                  {step.is_required && (
                    <Badge variant="destructive" className="text-xs">
                      Requis
                    </Badge>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer l'étape</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer cette étape ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteStepMutation.mutate(step.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            {step.step_description && (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {step.step_description}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {workflowSteps.length === 0 && (
        <Card className="p-8 text-center">
          <h4 className="font-semibold mb-2">Aucune étape configurée</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Ajoutez des étapes de workflow pour définir le processus de validation
          </p>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter la première étape
          </Button>
        </Card>
      )}

      <AddWorkflowStepDialog
        templateId={templateId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </div>
  );
};

export default TemplateWorkflowManager;
