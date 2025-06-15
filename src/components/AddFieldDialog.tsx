
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

const fieldSchema = z.object({
  field_name: z.string().min(1, 'Le nom du champ est requis'),
  field_label: z.string().min(1, 'Le libellé est requis'),
  field_type: z.string().min(1, 'Le type est requis'),
  field_options: z.string().optional(),
  is_required: z.boolean().default(false),
});

type FieldFormData = z.infer<typeof fieldSchema>;

interface AddFieldDialogProps {
  templateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Liste déroulante' },
  { value: 'textarea', label: 'Zone de texte' },
  { value: 'checkbox', label: 'Case à cocher' },
];

const AddFieldDialog: React.FC<AddFieldDialogProps> = ({
  templateId,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      field_name: '',
      field_label: '',
      field_type: '',
      field_options: '',
      is_required: false,
    },
  });

  const watchFieldType = form.watch('field_type');

  const createFieldMutation = useMutation({
    mutationFn: async (data: FieldFormData) => {
      // Get the next display order
      const { data: existingFields } = await supabase
        .from('template_fields')
        .select('display_order')
        .eq('template_id', templateId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = (existingFields?.[0]?.display_order || 0) + 1;

      let fieldOptions = null;
      if (data.field_options && data.field_type === 'select') {
        try {
          const options = data.field_options.split('\n').filter(opt => opt.trim());
          fieldOptions = { options };
        } catch (e) {
          fieldOptions = { options: [] };
        }
      }

      const { error } = await supabase
        .from('template_fields')
        .insert([{
          template_id: templateId,
          field_name: data.field_name,
          field_label: data.field_label,
          field_type: data.field_type,
          field_options: fieldOptions,
          is_required: data.is_required,
          display_order: nextOrder,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template_details', templateId] });
      toast({
        title: 'Succès',
        description: 'Champ ajouté avec succès.',
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible d\'ajouter le champ.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: FieldFormData) => {
    setIsCreating(true);
    await createFieldMutation.mutateAsync(data);
    setIsCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un champ</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="field_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Libellé du champ</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Nom du client" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="field_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom technique</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: client_name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="field_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de champ</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FIELD_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchFieldType === 'select' && (
              <FormField
                control={form.control}
                name="field_options"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Options (une par ligne)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                    <FormLabel>Champ obligatoire</FormLabel>
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
                {isCreating ? 'Ajout...' : 'Ajouter le champ'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFieldDialog;
