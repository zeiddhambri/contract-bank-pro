
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CreateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateContractDialog = ({ open, onOpenChange }: CreateContractDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    client: "",
    typeFinancement: "",
    montant: "",
    devise: "EUR",
    objet: "",
    agence: "",
    numeroDecision: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate contract creation
    toast({
      title: "Contrat créé avec succès",
      description: `Le contrat pour ${formData.client} a été créé et est en cours de traitement.`,
    });
    
    // Reset form and close dialog
    setFormData({
      client: "",
      typeFinancement: "",
      montant: "",
      devise: "EUR",
      objet: "",
      agence: "",
      numeroDecision: ""
    });
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau contrat</DialogTitle>
          <DialogDescription>
            Saisissez les informations du nouveau contrat de financement
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client */}
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Input
                id="client"
                value={formData.client}
                onChange={(e) => handleInputChange("client", e.target.value)}
                placeholder="Nom du client"
                required
              />
            </div>

            {/* Type de financement */}
            <div className="space-y-2">
              <Label htmlFor="typeFinancement">Type de financement *</Label>
              <Select value={formData.typeFinancement} onValueChange={(value) => handleInputChange("typeFinancement", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_ct">Crédit Court Terme</SelectItem>
                  <SelectItem value="credit_mt">Crédit Moyen Terme</SelectItem>
                  <SelectItem value="credit_lt">Crédit Long Terme</SelectItem>
                  <SelectItem value="facilite">Facilité de caisse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Montant */}
            <div className="space-y-2">
              <Label htmlFor="montant">Montant *</Label>
              <Input
                id="montant"
                type="number"
                value={formData.montant}
                onChange={(e) => handleInputChange("montant", e.target.value)}
                placeholder="100000"
                required
              />
            </div>

            {/* Devise */}
            <div className="space-y-2">
              <Label htmlFor="devise">Devise</Label>
              <Select value={formData.devise} onValueChange={(value) => handleInputChange("devise", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="TND">TND - Dinar Tunisien</SelectItem>
                  <SelectItem value="USD">USD - Dollar US</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Agence */}
            <div className="space-y-2">
              <Label htmlFor="agence">Agence *</Label>
              <Select value={formData.agence} onValueChange={(value) => handleInputChange("agence", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner l'agence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tunis_centre">Tunis Centre</SelectItem>
                  <SelectItem value="sfax">Sfax</SelectItem>
                  <SelectItem value="sousse">Sousse</SelectItem>
                  <SelectItem value="monastir">Monastir</SelectItem>
                  <SelectItem value="gabes">Gabès</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Numéro de décision */}
            <div className="space-y-2">
              <Label htmlFor="numeroDecision">Numéro de décision</Label>
              <Input
                id="numeroDecision"
                value={formData.numeroDecision}
                onChange={(e) => handleInputChange("numeroDecision", e.target.value)}
                placeholder="DEC-2024-001"
              />
            </div>
          </div>

          {/* Objet */}
          <div className="space-y-2">
            <Label htmlFor="objet">Objet du financement</Label>
            <Textarea
              id="objet"
              value={formData.objet}
              onChange={(e) => handleInputChange("objet", e.target.value)}
              placeholder="Décrivez l'objet du financement..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Créer le contrat
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateContractDialog;
