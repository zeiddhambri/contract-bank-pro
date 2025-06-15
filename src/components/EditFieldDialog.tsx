
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tables } from '@/integrations/supabase/types';
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

interface EditFieldDialogProps {
  field: Tables<'template_fields'>;
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

const EditFieldDialog: React.FC<EditFieldDialogProps> = ({
  field,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const form = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      field_name: field.field_name,
      field_label: field.field_label,
      field_type: field.field_type,
      field_options: field.field_options ? 
        (field.field_options as any)?.options?.join('\n') || '' : '',
      is_required: field.is_required,
    },
  });

  const watchFieldType = form.watch('field_type');

  const updateFieldMutation = useMutation({
    mutationFn: async (data: FieldFormData) => {
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
        .update({
          field_name: data.field_name,
          field_label: data.field_label,
          field_type: data.field_type,
          field_options: fieldOptions,
          is_required: data.is_required,
        })
        .eq('id', field.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template_details', field.template_id] });
      toast({
        title: 'Succès',
        description: 'Champ mis à jour avec succès.',
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de mettre à jour le champ.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: FieldFormData) => {
    setIsUpdating(true);
    await updateFieldMutation.mutateAsync(data);
    setIsUpdating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le champ</DialogTitle>
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
                    <Input {...field} />
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
                    <Input {...field} />
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
                        <SelectValue />
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
                disabled={isUpdating}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Mise à jour...' : 'Mettre à jour'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditFieldDialog;
