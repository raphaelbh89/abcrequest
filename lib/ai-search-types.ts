export interface AISearchResultItem {
  name: string;
  unit: string;
  price: number;
  priceRange?: [number, number];
  category: "hoc_tap" | "van_phong_pham" | "ve_sinh" | "su_kien" | "do_choi";
  categoryName?: string;
  imageUrl: string | null;
  description?: string;
  confidenceScore?: number;
  source: "gemini_ai";
}

export interface AISearchResponse {
  query: string;
  results: AISearchResultItem[];
  modelUsed: string;
  fromCache: boolean;
  executionTimeMs: number;
  error?: string;
}

// Danh sách các model Gemini theo thứ tự ưu tiên
export const GEMINI_SUPPORTED_MODELS = [
  { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash (Nhanh & Mới nhất - Khuyên dùng)" },
  { id: "gemini-flash-latest", name: "Gemini Flash Latest" },
  { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
];

export const DEFAULT_AI_MODEL = "gemini-3.6-flash";
