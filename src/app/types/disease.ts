export interface DiseaseCategory {
  id: number;
  name: string;
}

export interface Disease {
  id: number;
  name: string;
  disease_category_id?: number;
  disease_category?: DiseaseCategory;
}

export interface DiseasePayload {
  name: string;
  category_id?: number;
}
