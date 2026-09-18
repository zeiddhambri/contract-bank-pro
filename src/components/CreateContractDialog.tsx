
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ContractTypeSelect from "./ContractTypeSelect";
import { contractFormSchema, ContractFormData } from "@/lib/contractFormSchema";
import GuaranteesFormSection from "./GuaranteesFormSection";
import { MAX_FILE_SIZE_BYTES, uploadContractFile, validateContractFile } from "@/lib/storage";
import { AUDIT_ACTIONS, logAction } from "@/lib/audit-log";

interface CreateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContractCreated: () => void;
}

const CreateContractDialog = ({ open, onOpenChange, onContractCreated }: CreateContractDialogProps) => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      client: "",
      type: "",
      montant: 0,
      currency: "EUR",
      garanties: [{ type: "", hypotheque_type: "", details: "" }],
      agence: "",
      description: "",
    },
  });

  const onSubmit = async (data: ContractFormData) => {
    try {
      // 1. Périmètre de l'utilisateur (banque) — indispensable au stockage scopé.
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('bank_id')
        .eq('id', userData.user.id)
        .single();

      if (profileError || !profileData?.bank_id) {
        throw new Error("Profil utilisateur introuvable : contactez votre administrateur.");
      }

      const bankId = profileData.bank_id;

      // Validation du document avant toute écriture en base.
      if (selectedFile) {
        const fileError = validateContractFile(selectedFile);
        if (fileError) {
          setFileValidationError(fileError);
          toast({ title: "Fichier refusé", description: fileError, variant: "destructive" });
          return;
        }
      }

      // Clean up garanties data
      const cleanedGaranties = data.garanties.map(g => {
        const newG: {type: string; hypotheque_type?: string; details?: string} = { type: g.type };
        if (g.type === 'hypotheque' && g.hypotheque_type) {
          newG.hypotheque_type = g.hypotheque_type;
          newG.details = g.details || '';
        }
        return newG;
      });

      // 2. Création du contrat (la référence est générée par trigger, par banque).
      const { data: insertedData, error } = await supabase
        .from("contracts")
        .insert({
          client: data.client.trim(),
          type: data.type,
          montant: data.montant,
          // B21 : la devise choisie dans le formulaire était perdue (toujours EUR).
          currency: data.currency,
          garantie: data.garanties[0]?.type || "aucune",
          garanties: cleanedGaranties,
          agence: data.agence,
          description: data.description || "",
          reference_decision: "",
          bank_id: bankId,
        })
        .select()
        .single();

      if (error) throw error;

      const contract = insertedData;

      // 3. Document contractuel : téléversement dans {bank_id}/{contract_id}/…
      //    (bucket privé, servi ensuite en URL signée — jamais d'URL publique).
      if (selectedFile && contract?.id) {
        try {
          const path = await uploadContractFile({
            bankId,
            contractId: contract.id,
            file: selectedFile,
          });

          const { error: updateError } = await supabase
            .from("contracts")
            .update({ file_path: path })
            .eq("id", contract.id);

          if (updateError) throw updateError;

          await logAction(AUDIT_ACTIONS.documentUpload, {
            contractId: contract.id,
            reference: contract.reference_decision,
            fileName: selectedFile.name,
          });
        } catch (uploadError) {
          // Le contrat existe : on ne perd pas la saisie, on signale le document.
          toast({
            title: "Contrat créé, document non joint",
            description:
              uploadError instanceof Error
                ? uploadError.message
                : "Le téléversement du document a échoué. Ajoutez-le depuis la fiche du contrat.",
            variant: "destructive",
          });
        }
      }

      // 4. Traçabilité (attribution faite côté serveur par write_audit).
      await logAction(AUDIT_ACTIONS.contractCreate, {
        contractId: contract?.id,
        reference: contract?.reference_decision,
        type: data.type,
        agence: data.agence,
      });

      toast({
        title: "Contrat créé",
        description: `Référence ${contract?.reference_decision ?? "en cours d'attribution"}.`,
      });

      form.reset();
      setSelectedFile(null);
      setFileValidationError(null);
      onOpenChange(false);
      onContractCreated();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur s'est produite lors de la création du contrat.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelected = (file: File | null) => {
    setSelectedFile(file);
    if (!file) {
      setFileValidationError(null);
      return;
    }
    setFileValidationError(validateContractFile(file));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nouveau Contrat</SheetTitle>
          <SheetDescription>
            Créez un nouveau contrat de financement bancaire.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="client"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du client" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de Contrat</FormLabel>
                    <FormControl>
                      <ContractTypeSelect value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="montant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Devise</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Devise" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EUR">Euro (€)</SelectItem>
                          <SelectItem value="USD">Dollar ($)</SelectItem>
                          <SelectItem value="TND">Dinar Tunisien (TND)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <GuaranteesFormSection form={form} />

              <FormField
                control={form.control}
                name="agence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agence</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez l'agence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        <SelectItem value="agence_centrale_cun">Agence Centrale CUN</SelectItem>
                        <SelectItem value="la_marsa">La Marsa</SelectItem>
                        <SelectItem value="aouina">Aouina</SelectItem>
                        <SelectItem value="berges_du_lac_2">Les Berges du Lac 2</SelectItem>
                        <SelectItem value="petite_ariana">Petite Ariana</SelectItem>
                        <SelectItem value="ben_arous">Ben Arous</SelectItem>
                        <SelectItem value="denden">Denden</SelectItem>
                        <SelectItem value="ennasr">Ennasr</SelectItem>
                        <SelectItem value="kheireddine_pacha">Kheireddine Pacha</SelectItem>
                        <SelectItem value="bizerte">Bizerte</SelectItem>
                        <SelectItem value="nabeul">Nabeul</SelectItem>
                        <SelectItem value="nabeul_mrezga">Nabeul Mrezga</SelectItem>
                        <SelectItem value="sousse">Sousse</SelectItem>
                        <SelectItem value="monastir">Monastir</SelectItem>
                        <SelectItem value="sfax_bostene">Sfax Bostène</SelectItem>
                        <SelectItem value="sfax_gremda">Sfax Gremda</SelectItem>
                        <SelectItem value="sfax_route_gabes">Sfax Route de Gabès</SelectItem>
                        <SelectItem value="gabes">Gabès</SelectItem>
                        <SelectItem value="medenine">Médenine</SelectItem>
                        <SelectItem value="djerba">Djerba</SelectItem>
                        <SelectItem value="ras_jdir">Ras Jdir</SelectItem>
                        <SelectItem value="megrine">Mégrine</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Détails supplémentaires..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormItem>
                <FormLabel htmlFor="contract-file">Fichier du contrat (optionnel)</FormLabel>
                <FormControl>
                  <Input
                    id="contract-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
                    aria-describedby="contract-file-help"
                    aria-invalid={fileValidationError ? true : undefined}
                    onChange={(e) => handleFileSelected(e.target.files ? e.target.files[0] : null)}
                  />
                </FormControl>
                <p id="contract-file-help" className="text-xs text-muted-foreground">
                  PDF, Word, Excel ou image — {Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} Mo maximum.
                  Document stocké de façon privée, accessible uniquement aux membres de votre organisation.
                </p>
                {fileValidationError && (
                  <p role="alert" className="text-sm text-destructive">
                    {fileValidationError}
                  </p>
                )}
                <FormMessage />
              </FormItem>
              
              <SheetFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Création en cours..." : "Créer le Contrat"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CreateContractDialog;
