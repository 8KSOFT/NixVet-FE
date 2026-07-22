export interface BularioItem {
  id: string;
  title: string;
  subtitle?: string | null;
  origin?: string | null;
  details?: Array<{
    title: string;
    data: Array<{ title: string | null; data: string }>;
  }> | null;
  link_details?: string | null;
  // GRUPO 5 — dose estruturada (VetAlpha)
  dose_min_mg_kg?: number | null;
  dose_max_mg_kg?: number | null;
  dose_unit?: string | null;
  administration_routes?: string[] | null;
  frequency?: string | null;
  species?: string[] | null;
  toxicity_notes?: string | null;
  contraindications?: string | null;
  vetalpha_validated?: boolean;
  vetalpha_updated_at?: string | null;
}
