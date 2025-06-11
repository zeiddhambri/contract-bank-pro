
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const formSchema = z.object({
  client: z.string().min(1, "Le nom du client est requis"),
  type: z.string().min(1, "Le type de contrat est requis"),
  montant: z.number().min(0, "Le montant doit être positif"),
  garantie: z.string().min(1, "La garantie est requise"),
  agence: z.string().min(1, "L'agence est requise"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContractCreated: () => void;
}

const CreateContractDialog = ({ open, onOpenChange, onContractCreated }: CreateContractDialogProps) => {
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client: "",
      type: "",
      montant: 0,
      garantie: "",
      agence: "",
      description: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { error } = await supabase
        .from("contracts")
        .insert([{
          client: data.client,
          type: data.type,
          montant: data.montant,
          garantie: data.garantie,
          agence: data.agence,
          description: data.description || "",
        }]);

      if (error) throw error;

      toast({
        title: "Contrat créé",
        description: "Le nouveau contrat a été créé avec succès.",
      });

      form.reset();
      onOpenChange(false);
      onContractCreated();
    } catch (error) {
      console.error("Error creating contract:", error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la création du contrat.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nouveau Contrat</DialogTitle>
          <DialogDescription>
            Créez un nouveau contrat de financement bancaire.
          </DialogDescription>
        </DialogHeader>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez le type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="credit_immobilier">Crédit Immobilier</SelectItem>
                      <SelectItem value="credit_consommation">Crédit à la Consommation</SelectItem>
                      <SelectItem value="credit_auto">Crédit Auto</SelectItem>
                      <SelectItem value="decouvert_autorise">Découvert Autorisé</SelectItem>
                      <SelectItem value="pret_personnel">Prêt Personnel</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="montant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant (€)</FormLabel>
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
              name="garantie"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Garantie</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez la garantie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="hypotheque">Hypothèque</SelectItem>
                      <SelectItem value="caution">Caution</SelectItem>
                      <SelectItem value="nantissement">Nantissement</SelectItem>
                      <SelectItem value="gage">Gage</SelectItem>
                      <SelectItem value="aucune">Aucune</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    <SelectContent>
                      <SelectItem value="agence_centre">Agence Centre</SelectItem>
                      <SelectItem value="agence_nord">Agence Nord</SelectItem>
                      <SelectItem value="agence_sud">Agence Sud</SelectItem>
                      <SelectItem value="agence_est">Agence Est</SelectItem>
                      <SelectItem value="agence_ouest">Agence Ouest</SelectItem>
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
            <DialogFooter>
              <Button type="submit">Créer le Contrat</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateContractDialog;
