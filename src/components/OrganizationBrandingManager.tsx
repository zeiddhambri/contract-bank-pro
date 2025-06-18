
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Palette, Upload, Code, Settings } from 'lucide-react';

const brandingSchema = z.object({
  logo_primary_url: z.string().url().optional().or(z.literal('')),
  logo_secondary_url: z.string().url().optional().or(z.literal('')),
  primary_color: z.string().min(1, 'Couleur primaire requise'),
  secondary_color: z.string().min(1, 'Couleur secondaire requise'),
  accent_color: z.string().min(1, 'Couleur d\'accent requise'),
  custom_css: z.string().optional(),
});

type BrandingFormData = z.infer<typeof brandingSchema>;

const OrganizationBrandingManager: React.FC = () => {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const form = useForm<BrandingFormData>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      logo_primary_url: '',
      logo_secondary_url: '',
      primary_color: '#009688',
      secondary_color: '#ff5722',
      accent_color: '#ffc107',
      custom_css: '',
    },
  });

  // Fetch current branding
  const { data: branding, isLoading } = useQuery({
    queryKey: ['organization_branding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_branding')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Fetch bank info
  const { data: bankInfo } = useQuery({
    queryKey: ['bank_info'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => {
    if (branding) {
      form.reset({
        logo_primary_url: branding.logo_primary_url || '',
        logo_secondary_url: branding.logo_secondary_url || '',
        primary_color: branding.primary_color || '#009688',
        secondary_color: branding.secondary_color || '#ff5722',
        accent_color: branding.accent_color || '#ffc107',
        custom_css: branding.custom_css || '',
      });
    }
  }, [branding, form]);

  const updateBrandingMutation = useMutation({
    mutationFn: async (data: BrandingFormData) => {
      if (branding) {
        const { error } = await supabase
          .from('organization_branding')
          .update(data)
          .eq('id', branding.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_branding')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization_branding'] });
      toast({
        title: 'Succès',
        description: 'Configuration de branding mise à jour.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de mettre à jour le branding.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: BrandingFormData) => {
    setIsUpdating(true);
    await updateBrandingMutation.mutateAsync(data);
    setIsUpdating(false);
  };

  if (userRole !== 'super_admin' && userRole !== 'bank_admin') {
    return (
      <Card className="bg-black/30 border-slate-700">
        <CardContent className="p-6">
          <p className="text-slate-400">Accès restreint aux administrateurs.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-black/30 border-slate-700">
        <CardContent className="p-6">
          <p className="text-slate-400">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-black/30 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Branding Organisationnel
          </CardTitle>
          <CardDescription className="text-slate-400">
            Personnalisez l'apparence de votre plateforme Contract Manager
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="colors" className="w-full">
        <TabsList className="bg-black/30 border border-slate-700/50">
          <TabsTrigger value="colors" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white">
            <Palette className="w-4 h-4 mr-2" />
            Couleurs
          </TabsTrigger>
          <TabsTrigger value="logos" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white">
            <Upload className="w-4 h-4 mr-2" />
            Logos
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white">
            <Code className="w-4 h-4 mr-2" />
            Avancé
          </TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <TabsContent value="colors" className="space-y-6">
              <Card className="bg-black/20 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Palette de couleurs</CardTitle>
                  <CardDescription className="text-slate-400">
                    Définissez les couleurs principales de votre interface
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="primary_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Couleur primaire</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input
                                type="color"
                                {...field}
                                className="w-16 h-10 border-0 p-1 bg-transparent"
                              />
                            </FormControl>
                            <FormControl>
                              <Input
                                {...field}
                                className="flex-1 bg-black/30 border-slate-600 text-white"
                                placeholder="#009688"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="secondary_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Couleur secondaire</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input
                                type="color"
                                {...field}
                                className="w-16 h-10 border-0 p-1 bg-transparent"
                              />
                            </FormControl>
                            <FormControl>
                              <Input
                                {...field}
                                className="flex-1 bg-black/30 border-slate-600 text-white"
                                placeholder="#ff5722"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accent_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Couleur d'accent</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input
                                type="color"
                                {...field}
                                className="w-16 h-10 border-0 p-1 bg-transparent"
                              />
                            </FormControl>
                            <FormControl>
                              <Input
                                {...field}
                                className="flex-1 bg-black/30 border-slate-600 text-white"
                                placeholder="#ffc107"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mt-6 p-4 bg-black/20 rounded-lg border border-slate-700">
                    <h4 className="text-white font-medium mb-3">Aperçu des couleurs</h4>
                    <div className="flex gap-4">
                      <div 
                        className="w-16 h-16 rounded-lg border-2 border-white/20"
                        style={{ backgroundColor: form.watch('primary_color') }}
                        title="Couleur primaire"
                      />
                      <div 
                        className="w-16 h-16 rounded-lg border-2 border-white/20"
                        style={{ backgroundColor: form.watch('secondary_color') }}
                        title="Couleur secondaire"
                      />
                      <div 
                        className="w-16 h-16 rounded-lg border-2 border-white/20"
                        style={{ backgroundColor: form.watch('accent_color') }}
                        title="Couleur d'accent"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logos" className="space-y-6">
              <Card className="bg-black/20 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Configuration des logos</CardTitle>
                  <CardDescription className="text-slate-400">
                    Ajoutez vos logos personnalisés
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="logo_primary_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Logo principal (URL)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-black/30 border-slate-600 text-white"
                            placeholder="https://exemple.com/logo-principal.png"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="logo_secondary_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Logo secondaire (URL)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-black/30 border-slate-600 text-white"
                            placeholder="https://exemple.com/logo-secondaire.png"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(form.watch('logo_primary_url') || form.watch('logo_secondary_url')) && (
                    <div className="mt-6 p-4 bg-black/20 rounded-lg border border-slate-700">
                      <h4 className="text-white font-medium mb-3">Aperçu des logos</h4>
                      <div className="flex gap-4">
                        {form.watch('logo_primary_url') && (
                          <img 
                            src={form.watch('logo_primary_url')} 
                            alt="Logo principal"
                            className="h-16 object-contain bg-white/10 rounded p-2"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        {form.watch('logo_secondary_url') && (
                          <img 
                            src={form.watch('logo_secondary_url')} 
                            alt="Logo secondaire"
                            className="h-16 object-contain bg-white/10 rounded p-2"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <Card className="bg-black/20 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">CSS personnalisé</CardTitle>
                  <CardDescription className="text-slate-400">
                    Ajoutez du CSS personnalisé pour des modifications avancées
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="custom_css"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">CSS personnalisé</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="bg-black/30 border-slate-600 text-white font-mono text-sm min-h-[200px]"
                            placeholder={`/* Exemple de CSS personnalisé */
.custom-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.custom-button {
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <div className="flex justify-end gap-3">
              <Button
                type="submit"
                disabled={isUpdating}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
              >
                {isUpdating ? 'Mise à jour...' : 'Sauvegarder le branding'}
              </Button>
            </div>
          </form>
        </Form>
      </Tabs>

      {bankInfo && (
        <Card className="bg-black/20 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Informations de l'organisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                Nom
              </Badge>
              <span className="text-white">{bankInfo.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                Plan
              </Badge>
              <span className="text-white capitalize">{bankInfo.subscription_plan || 'Basic'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                IA activée
              </Badge>
              <span className="text-white">{bankInfo.ai_features_enabled ? 'Oui' : 'Non'}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrganizationBrandingManager;
