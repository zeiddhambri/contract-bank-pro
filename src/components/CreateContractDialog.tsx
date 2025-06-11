
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContractCreated: () => void;
}

const CreateContractDialog = ({ open, onOpenChange, onContractCreated }: CreateContractDialogProps) => {
  const [formData, setFormData] = useState({
    client: "",
    type: "",
    montant: "",
    garantie: "",
    agence: "",
    description: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('contracts')
        .insert([
          {
            client: formData.client,
            type: formData.type,
            montant: parseFloat(formData.montant),
            garantie: formData.garantie,
            agence: formData.agence,
            description: formData.description || null
          }
        ]);

      if (error) {
        throw error;
      }

      toast({
        title: "Contrat créé",
        description: "Le contrat a été créé avec succès.",
      });

      onOpenChange(false);
      onContractCreated();
      
      // Reset form
      setFormData({
        client: "",
        type: "",
        montant: "",
        garantie: "",
        agence: "",
        description: ""
      });
    } catch (error) {
      console.error("Error creating contract:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du contrat.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-wide text-white">
            NOUVEAU CONTRAT
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client" className="text-slate-300">Client</Label>
            <Input
              id="client"
              value={formData.client}
              onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              placeholder="Nom du client"
              className="bg-black/30 border-slate-600 text-white placeholder:text-slate-400"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-slate-300">Type de crédit</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger className="bg-black/30 border-slate-600 text-white">
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="credit_ct">Crédit CT</SelectItem>
                <SelectItem value="credit_mt">Crédit MT</SelectItem>
                <SelectItem value="credit_lt">Crédit LT</SelectItem>
                <SelectItem value="credit_immobilier">Crédit Immobilier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="montant" className="text-slate-300">Montant (€)</Label>
            <Input
              id="montant"
              type="number"
              value={formData.montant}
              onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
              placeholder="Montant du crédit"
              className="bg-black/30 border-slate-600 text-white placeholder:text-slate-400"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="garantie" className="text-slate-300">Garantie</Label>
            <Select value={formData.garantie} onValueChange={(value) => setFormData({ ...formData, garantie: value })}>
              <SelectTrigger className="bg-black/30 border-slate-600 text-white">
                <SelectValue placeholder="Sélectionner la garantie" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="hypotheque">Hypothèque</SelectItem>
                <SelectItem value="nantissement">Nantissement</SelectItem>
                <SelectItem value="caution">Caution</SelectItem>
                <SelectItem value="gage">Gage</SelectItem>
                <SelectItem value="sans_garantie">Sans garantie</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agence" className="text-slate-300">Agence</Label>
            <Select value={formData.agence} onValueChange={(value) => setFormData({ ...formData, agence: value })}>
              <SelectTrigger className="bg-black/30 border-slate-600 text-white">
                <SelectValue placeholder="Sélectionner l'agence" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="tunis_centre">Tunis Centre</SelectItem>
                <SelectItem value="sfax">Sfax</SelectItem>
                <SelectItem value="sousse">Sousse</SelectItem>
                <SelectItem value="gabes">Gabès</SelectItem>
                <SelectItem value="bizerte">Bizerte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description du contrat..."
              className="bg-black/30 border-slate-600 text-white placeholder:text-slate-400 min-h-[80px]"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Création..." : "Créer le contrat"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateContractDialog;
