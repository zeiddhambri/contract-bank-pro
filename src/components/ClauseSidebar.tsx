
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Filter, 
  FileText, 
  Plus, 
  Folder,
  Tag,
  Calendar,
  TrendingUp
} from "lucide-react";

interface Clause {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ClauseSidebarProps {
  clauses: Clause[];
  selectedClause?: Clause;
  onSelectClause: (clause: Clause) => void;
  onNewClause: () => void;
  categories: string[];
  selectedCategory?: string;
  onSelectCategory: (category: string) => void;
}

const ClauseSidebar = ({
  clauses,
  selectedClause,
  onSelectClause,
  onNewClause,
  categories,
  selectedCategory,
  onSelectCategory
}: ClauseSidebarProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");

  // Filtrer les clauses
  const filteredClauses = clauses.filter(clause => {
    const matchesSearch = 
      clause.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clause.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || clause.category === selectedCategory;
    const matchesTag = !selectedTag || clause.tags.includes(selectedTag);
    
    return matchesSearch && matchesCategory && matchesTag;
  });

  // Récupérer tous les tags uniques
  const allTags = Array.from(new Set(
    clauses.flatMap(clause => clause.tags)
  )).sort();

  // Statistiques par catégorie
  const categoryStats = categories.reduce((acc, category) => {
    acc[category] = clauses.filter(clause => clause.category === category).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
      {/* En-tête avec bouton nouveau */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <Button
          onClick={onNewClause}
          className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle clause
        </Button>
      </div>

      {/* Recherche */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Rechercher une clause..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-slate-200"
          />
        </div>
      </div>

      {/* Filtres par catégorie */}
      <div className="px-4 pb-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Folder className="h-4 w-4 text-orange-500" />
              Catégories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Button
              variant={!selectedCategory ? "default" : "ghost"}
              size="sm"
              onClick={() => onSelectCategory("")}
              className="w-full justify-between text-left h-8"
            >
              <span>Toutes</span>
              <Badge variant="secondary" className="text-xs">
                {clauses.length}
              </Badge>
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "ghost"}
                size="sm"
                onClick={() => onSelectCategory(category)}
                className="w-full justify-between text-left h-8"
              >
                <span className="truncate">{category}</span>
                <Badge variant="secondary" className="text-xs">
                  {categoryStats[category] || 0}
                </Badge>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Filtres par tags */}
      {allTags.length > 0 && (
        <div className="px-4 pb-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-500" />
                Tags populaires
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1">
                {allTags.slice(0, 8).map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    className="text-xs cursor-pointer hover:bg-blue-100"
                    onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      {/* Liste des clauses */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Clauses ({filteredClauses.length})
            </h3>
          </div>
          
          {filteredClauses.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune clause trouvée</p>
            </div>
          ) : (
            filteredClauses.map((clause) => (
              <Card
                key={clause.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedClause?.id === clause.id 
                    ? 'ring-2 ring-orange-500 bg-orange-50' 
                    : 'hover:bg-white'
                }`}
                onClick={() => onSelectClause(clause)}
              >
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-slate-900 line-clamp-2">
                      {clause.title}
                    </h4>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {clause.category}
                      </Badge>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {clause.updatedAt.toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    
                    {clause.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {clause.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs bg-slate-100 text-slate-600"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {clause.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{clause.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {clause.content.substring(0, 100)}...
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Statistiques en bas */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>Total clauses</span>
              </div>
              <span className="font-medium">{clauses.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClauseSidebar;
