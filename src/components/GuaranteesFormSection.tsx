
import React from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { ContractFormData } from "@/lib/contractFormSchema";

interface GuaranteesFormSectionProps {
  form: UseFormReturn<ContractFormData>;
}

const GuaranteesFormSection = ({ form }: GuaranteesFormSectionProps) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "garanties",
  });

  const watchedGaranties = form.watch("garanties");

  return (
    <div>
      <FormLabel>Garanties</FormLabel>
      <div className="space-y-4 pt-2">
        {fields.map((item, index) => (
          <div key={item.id} className="p-3 border rounded-lg space-y-3 relative bg-slate-800/50 border-slate-700">
            <FormField
              control={form.control}
              name={`garanties.${index}.type`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Type de Garantie {index + 1}</FormLabel>
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

            {watchedGaranties[index]?.type === 'hypotheque' && (
              <>
                <FormField
                  control={form.control}
                  name={`garanties.${index}.hypotheque_type`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Type d'hypothèque</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez le type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="numero_titre">N° titre</SelectItem>
                          <SelectItem value="non_immatricule">Immeuble non immatriculé</SelectItem>
                          <SelectItem value="en_cours_immatriculation">En cours d'immatriculation</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`garanties.${index}.details`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Détails</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Entrez les détails de l'hypothèque..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-7 w-7"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {fields.length < 4 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => append({ type: "", hypotheque_type: "", details: "" })}
        >
          Ajouter une garantie
        </Button>
      )}
       <FormMessage>
        {form.formState.errors.garanties?.root?.message}
      </FormMessage>
    </div>
  );
};

export default GuaranteesFormSection;
