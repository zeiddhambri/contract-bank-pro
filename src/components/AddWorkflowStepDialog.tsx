
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const workflowStepSchema = z.object({
  step_name: z.string().min(1, 'Le nom de l\'étape est requis'),
  step_description: z.string().optional(),
  required_role: z.string().optional(),
  is_required: z.boolean().default(true),
});

type WorkflowStepFormData = z.infer<typeof workflowStepSchema>;

interface AddWorkflowStepDialogProps {
  templateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLES = [
  { value: 'user', label: 'Utilisateur' },
  { value: 'manager', label: 'Manager' },
  { value: 'validator', label: 'Validateur' },
  { value: 'auditor', label: 'Auditeur' },
  { value: 'bank_admin', label: 'Admin Banque' },
];

const AddWorkflowStepDialog: React.FC<AddWorkflowStepDialogProps> = ({
  templateId,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<WorkflowStepFormData>({
    resolver: zodResolver(workflowStepSchema),
    defaultValues: {
      step_name: '',
      step_description: '',
      required_role: '',
      is_required: true,
    },
  });

  const createStepMutation = useMutation({
    mutationFn: async (data: WorkflowStepFormData) => {
      // Get the next step order
      const { data: existingSteps } = await supabase
        .from('template_workflow_steps')
        .select('step_order')
        .eq('template_id', templateId)
        .order('step_order', { ascending: false })
        .limit(1);

      const nextOrder = (existingSteps?.[0]?.step_order || 0) + 1;

      const { error } = await supabase
        .from('template_workflow_steps')
        .insert([{
          template_id: templateId,
          step_name: data.step_name,
          step_description: data.step_description || null,
          required_role: data.required_role || null,
          is_required: data.is_required,
          step_order: nextOrder,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template_details', templateId] });
      toast({
        title: 'Succès',
        description: 'Étape ajoutée avec succès.',
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible d\'ajouter l\'étape.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: WorkflowStepFormData) => {
    setIsCreating(true);
    await createStepMutation.mutateAsync(data);
    setIsCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une étape de workflow</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="step_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'étape</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Validation manager" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="step_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description de cette étape de validation..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="required_role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle requis (optionnel)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Aucun rôle spécifique</SelectItem>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_required"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Étape obligatoire</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Ajout...' : 'Ajouter l\'étape'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddWorkflowStepDialog;
