
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
import AddFieldDialog from './AddFieldDialog';
import EditFieldDialog from './EditFieldDialog';

interface TemplateFieldsManagerProps {
  templateId: string;
  fields: Tables<'template_fields'>[];
}

const FIELD_TYPE_LABELS = {
  text: 'Texte',
  number: 'Nombre',
  date: 'Date',
  select: 'Liste déroulante',
  textarea: 'Zone de texte',
  checkbox: 'Case à cocher',
};

const TemplateFieldsManager: React.FC<TemplateFieldsManagerProps> = ({
  templateId,
  fields,
}) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<Tables<'template_fields'> | null>(null);
  const queryClient = useQueryClient();

  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase
        .from('template_fields')
        .delete()
        .eq('id', fieldId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template_details', templateId] });
      toast({
        title: 'Succès',
        description: 'Champ supprimé avec succès.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de supprimer le champ.',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Champs dynamiques</h3>
          <p className="text-sm text-muted-foreground">
            Configurez les champs personnalisés pour ce modèle de contrat
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un champ
        </Button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <Card key={field.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{field.field_label}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {FIELD_TYPE_LABELS[field.field_type as keyof typeof FIELD_TYPE_LABELS] || field.field_type}
                      </Badge>
                      {field.is_required && (
                        <Badge variant="destructive" className="text-xs">
                          Requis
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingField(field)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le champ</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer ce champ ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteFieldMutation.mutate(field.id)}
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
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <div><strong>Nom du champ:</strong> {field.field_name}</div>
                {field.field_options && (
                  <div><strong>Options:</strong> {JSON.stringify(field.field_options)}</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {fields.length === 0 && (
        <Card className="p-8 text-center">
          <h4 className="font-semibold mb-2">Aucun champ configuré</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Ajoutez des champs dynamiques pour personnaliser ce modèle
          </p>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter le premier champ
          </Button>
        </Card>
      )}

      <Ad dFieldDialog
        templateId={templateId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      {editingField && (
        <EditFieldDialog
          field={editingField}
          open={!!editingField}
          onOpenChange={(open) => !open && setEditingField(null)}
        />
      )}
    </div>
  );
};

export default TemplateFieldsManager;
