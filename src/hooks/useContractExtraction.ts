
import { useMutation } from '@tanstack/react-query';
import type { Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

interface ExtractionRequest {
  contractText: string;
  extractionType: 'dates' | 'penalties' | 'payments' | 'parties' | 'terms';
  contractId?: string;
}

interface ExtractionResponse {
  success: boolean;
  extracted_data: Json;
  confidence_score: number;
  extraction_type: string;
  error?: string;
}

export const useContractExtraction = () => {
  return useMutation<ExtractionResponse, Error, ExtractionRequest>({
    mutationFn: async ({ contractText, extractionType, contractId }) => {
      const { data, error } = await supabase.functions.invoke('ai-contract-extraction', {
        body: {
          contractText,
          extractionType,
          contractId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    }
  });
};
