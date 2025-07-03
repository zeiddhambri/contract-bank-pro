
export interface Clause {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isActive?: boolean;
  version?: number;
  author?: string;
  lastModifiedBy?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  clauseCount?: number;
}

export interface ClauseTemplate {
  id: string;
  name: string;
  category: string;
  template: string;
  variables: ClauseVariable[];
  description?: string;
}

export interface ClauseVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  label: string;
  required: boolean;
  defaultValue?: any;
  options?: string[]; // pour les selects
}

export interface AIResponse {
  success: boolean;
  content?: string;
  suggestions?: string[];
  error?: string;
  category?: string;
  confidence?: number;
}

export interface ExportOptions {
  format: 'json' | 'markdown' | 'pdf' | 'docx';
  includeMetadata: boolean;
  includeTags: boolean;
  selectedClauses?: string[];
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'RGPD', description: 'Clauses de protection des données', color: '#3B82F6' },
  { id: '2', name: 'SaaS', description: 'Clauses pour logiciels en tant que service', color: '#10B981' },
  { id: '3', name: 'Travail', description: 'Clauses de droit du travail', color: '#F59E0B' },
  { id: '4', name: 'Commercial', description: 'Clauses commerciales générales', color: '#EF4444' },
  { id: '5', name: 'Confidentialité', description: 'Clauses de non-divulgation', color: '#8B5CF6' },
  { id: '6', name: 'Responsabilité', description: 'Clauses de limitation de responsabilité', color: '#EC4899' },
  { id: '7', name: 'Propriété Intellectuelle', description: 'Clauses de PI', color: '#6366F1' },
  { id: '8', name: 'Résiliation', description: 'Clauses de fin de contrat', color: '#64748B' }
];
