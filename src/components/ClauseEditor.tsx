
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Save, 
  Wand2, 
  FileText, 
  Download, 
  Trash2, 
  Plus,
  Brain,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface Clause {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ClauseEditorProps {
  clause?: Clause;
  onSave: (clause: Partial<Clause>) => void;
  onDelete?: (clauseId: string) => void;
  categories: string[];
}

const ClauseEditor = ({ clause, onSave, onDelete, categories }: ClauseEditorProps) => {
  const [title, setTitle] = useState(clause?.title || "");
  const [content, setContent] = useState(clause?.content || "");
  const [category, setCategory] = useState(clause?.category || categories[0] || "");
  const [tags, setTags] = useState<string[]>(clause?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Le titre et le contenu sont obligatoires");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: clause?.id,
        title: title.trim(),
        content: content.trim(),
        category,
        tags,
        updatedAt: new Date()
      });
      toast.success("Clause sauvegardée avec succès");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiImprove = async () => {
    if (!content.trim()) {
      toast.error("Veuillez saisir du contenu avant d'utiliser l'IA");
      return;
    }

    setIsGenerating(true);
    try {
      // Simulation d'appel IA - à remplacer par l'API réelle
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const improvedContent = content + "\n\n[Clause améliorée par IA - fonctionnalité en développement]";
      setContent(improvedContent);
      toast.success("Clause améliorée par l'IA");
    } catch (error) {
      toast.error("Erreur lors de l'amélioration IA");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleExportMarkdown = () => {
    const markdown = `# ${title}\n\n**Catégorie:** ${category}\n\n**Tags:** ${tags.join(', ')}\n\n## Contenu\n\n${content}`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clause-${title.toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Clause exportée en Markdown");
  };

  const handleExportJson = () => {
    const clauseData = {
      id: clause?.id || Date.now().toString(),
      title,
      content,
      category,
      tags,
      createdAt: clause?.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    const json = JSON.stringify(clauseData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clause-${title.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Clause exportée en JSON");
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              {clause ? "Modifier la clause" : "Nouvelle clause"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportMarkdown}
                className="text-slate-600 hover:text-blue-600"
              >
                <Download className="h-4 w-4 mr-1" />
                MD
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJson}
                className="text-slate-600 hover:text-green-600"
              >
                <Download className="h-4 w-4 mr-1" />
                JSON
              </Button>
              {clause && onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(clause.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Formulaire principal */}
      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Titre et catégorie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Titre de la clause
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Clause de confidentialité RGPD"
                className="bg-slate-50 border-slate-200 focus:border-orange-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-slate-50 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Separator />

          {/* Contenu avec actions IA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Contenu de la clause
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiImprove}
                disabled={isGenerating || !content.trim()}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                {isGenerating ? (
                  <Sparkles className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-1" />
                )}
                {isGenerating ? "Amélioration..." : "Améliorer avec IA"}
              </Button>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Rédigez le contenu de votre clause ici..."
              className="min-h-[300px] bg-slate-50 border-slate-200 focus:border-orange-500 resize-none"
            />
            <div className="text-sm text-slate-500">
              {content.length} caractères • {content.split(' ').filter(w => w.length > 0).length} mots
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-700">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Ajouter un tag..."
                className="flex-1 bg-slate-50 border-slate-200"
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions de sauvegarde */}
      <div className="flex items-center justify-end gap-3">
        <Button
          onClick={handleSave}
          disabled={isSaving || !title.trim() || !content.trim()}
          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
        >
          {isSaving ? (
            <Sparkles className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isSaving ? "Sauvegarde..." : "Sauvegarder la clause"}
        </Button>
      </div>
    </div>
  );
};

export default ClauseEditor;
