
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TemplateBasicInfo from './TemplateBasicInfo';
import TemplateFieldsManager from './TemplateFieldsManager';
import TemplateWorkflowManager from './TemplateWorkflowManager';

interface EditTemplateDialogProps {
  template: Tables<'contract_templates'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fetchTemplateDetails = async (templateId: string) => {
  const [templateResult, fieldsResult, workflowResult] = await Promise.all([
    supabase.from('contract_templates').select('*').eq('id', templateId).single(),
    supabase.from('template_fields').select('*').eq('template_id', templateId).order('display_order'),
    supabase.from('template_workflow_steps').select('*').eq('template_id', templateId).order('step_order'),
  ]);

  if (templateResult.error) throw templateResult.error;
  if (fieldsResult.error) throw fieldsResult.error;
  if (workflowResult.error) throw workflowResult.error;

  return {
    template: templateResult.data,
    fields: fieldsResult.data || [],
    workflowSteps: workflowResult.data || [],
  };
};

const EditTemplateDialog: React.FC<EditTemplateDialogProps> = ({
  template,
  open,
  onOpenChange,
}) => {
  const [activeTab, setActiveTab] = useState('basic');

  const { data: templateDetails, isLoading } = useQuery({
    queryKey: ['template_details', template.id],
    queryFn: () => fetchTemplateDetails(template.id),
    enabled: open,
  });

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <p>Chargement des détails du modèle...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le modèle: {template.name}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Informations</TabsTrigger>
            <TabsTrigger value="fields">Champs dynamiques</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            {templateDetails && (
              <TemplateBasicInfo template={templateDetails.template} />
            )}
          </TabsContent>

          <TabsContent value="fields" className="space-y-4">
            {templateDetails && (
              <TemplateFieldsManager
                templateId={template.id}
                fields={templateDetails.fields}
              />
            )}
          </TabsContent>

          <TabsContent value="workflow" className="space-y-4">
            {templateDetails && (
              <TemplateWorkflowManager
                templateId={template.id}
                workflowSteps={templateDetails.workflowSteps}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditTemplateDialog;
