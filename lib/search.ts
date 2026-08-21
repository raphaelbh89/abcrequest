import { prisma } from "./db";
import { computeAvailableStock } from "./allocation";

export interface SearchResultItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  availableQuantity: number;
  minStock: number;
  price: number | null;
  location: string | null;
  imageUrl?: string | null;
  matchType: "exact" | "fuzzy" | "semantic";
  score: number;
}

/**
 * 1. Chuẩn hóa chuỗi tiếng Việt: Bỏ dấu + Lowercase + Bỏ khoảng trắng thừa
 */
export function normalizeVietnamese(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 2. Thuật toán Trigram Similarity (tương đương chuẩn PostgreSQL pg_trgm)
 * Trích xuất 3-gram với padding 2 khoảng trắng đầu và 1 khoảng trắng cuối.
 */
export function getTrigrams(text: string): Set<string> {
  const padded = `  ${text} `;
  const trigrams = new Set<string>();
  for (let i = 0; i <= padded.length - 3; i++) {
    trigrams.add(padded.substring(i, i + 3));
  }
  return trigrams;
}

export function computeTrigramSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const norm1 = normalizeVietnamese(str1);
  const norm2 = normalizeVietnamese(str2);

  if (norm1 === norm2) return 1.0;
  if (norm1.length === 0 || norm2.length === 0) return 0;

  const tri1 = getTrigrams(norm1);
  const tri2 = getTrigrams(norm2);

  let intersectionCount = 0;
  tri1.forEach((t) => {
    if (tri2.has(t)) {
      intersectionCount++;
    }
  });

  const unionCount = tri1.size + tri2.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * 3. Từ điển ngữ nghĩa đa chiều theo nhóm đồng nghĩa chuyên dụng cho đồ dùng học tập & mầm non (Semantic Synonym Groups)
 */
const SYNONYM_GROUPS: string[][] = [
  ["viet chi", "but chi", "chi go", "but chi 2b", "but chi hb", "but chi than go"],
  ["viet bi", "but bi", "but muc", "but viet", "but bi thien long"],
  ["but da", "but long", "but long bang", "but da mau", "but mau da", "but long ve", "but da 12 mau"],
  ["sap mau", "but sap", "but mau sap", "mau sap", "sap dau", "sap mau huu co", "sap 16 mau"],
  ["mau nuoc", "mau acrylic", "mau ve", "mau nuoc ve tranh"],
  ["keo dan", "ho dan", "keo nuoc", "keo sua", "keo giay"],
  ["keo nen", "keo silicon", "sung ban keo", "keo cay", "keo dan nen", "keo nen dong khung"],
  ["bang dinh", "bang keo", "bang dinh 2 mat", "bang keo 2 mat", "keo 2 mat", "bang dinh hai mat", "bang keo hai mat", "bang dinh sieu dinh"],
  ["dat nan", "dat set", "dat nan tao hinh", "dat set tao hinh", "dat nan mau", "dat set nhe"],
  ["giay mau", "giay thu cong", "giay a4 mau", "giay xep hinh", "giay a4 thu cong", "giay a4 mau thu cong"],
  ["giay a4", "giay in", "giay photocopy", "giay double a"],
  ["bia thai", "giay bia", "bia mau", "giay bia cung", "bia a4"],
  ["format", "formex", "tam format", "tam formex", "xop form", "tam formex format"],
  ["keo cat", "keo thu cong", "keo mini", "keo an toan", "keo cat giay", "keo mui tron", "keo thu cong mui tron"],
  ["ruy bang", "ruybang", "day ruy bang", "ruy bang trang tri", "ruy bang hoa"],
  ["khan lau", "khan mat", "khan lau tay", "khan xo", "khan lau mat"],
  ["khau trang", "khau trang tre em", "khau trang y te", "khau trang 3d"],
  ["nuoc rua tay", "xa phong", "dung dich sat khuan", "nuoc sat khuan", "gel rua tay", "xa bong"],
];

/**
 * 4. Tính toán điểm tương đồng ngữ nghĩa (Semantic match score)
 */
export function computeSemanticSimilarity(queryNorm: string, targetNorm: string): number {
  if (queryNorm === targetNorm) return 1.0;

  // 1. Kiểm tra ánh xạ nhóm từ đồng nghĩa đa chiều
  for (const group of SYNONYM_GROUPS) {
    const hasQuery = group.some(
      (term) => queryNorm.includes(term) || term.includes(queryNorm)
    );

    if (hasQuery) {
      const hasTarget = group.some(
        (term) => targetNorm.includes(term) || term.includes(targetNorm)
      );
      if (hasTarget) {
        return 0.85;
      }
    }
  }

  // 2. Phân tích tập từ khóa giao thoa (Jaccard on words)
  const qWords = new Set(queryNorm.split(" ").filter((w) => w.length > 1));
  const tWords = new Set(targetNorm.split(" ").filter((w) => w.length > 1));

  if (qWords.size === 0 || tWords.size === 0) return 0;

  let commonCount = 0;
  qWords.forEach((w) => {
    if (tWords.has(w)) commonCount++;
  });

  const wordScore = commonCount / Math.max(qWords.size, tWords.size);
  return wordScore >= 0.5 ? 0.65 + wordScore * 0.15 : 0;
}

/**
 * BƯỚC 2: HÀM TÌM KIẾM 3 TẦNG TUẦN TỰ TRONG BẢNG ITEMS
 * Chạy Tầng A -> Tầng B -> Tầng C, DỪNG NGAY khi tầng trước đã đủ >= 5 kết quả tốt.
 */
export async function searchInternalItems(query: string): Promise<{
  query: string;
  results: SearchResultItem[];
  tiersExecuted: { tierA: boolean; tierB: boolean; tierC: boolean };
  executionTimeMs: number;
}> {
  const startTime = Date.now();
  const rawQuery = String(query || "").trim();
  const queryNormalized = normalizeVietnamese(rawQuery);

  if (!queryNormalized) {
    return {
      query: rawQuery,
      results: [],
      tiersExecuted: { tierA: true, tierB: false, tierC: false },
      executionTimeMs: 0,
    };
  }

  // 1. Lấy dữ liệu kho kèm tính toán số lượng khả dụng
  const items = await prisma.item.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const pendingAllocations = await prisma.requestItem.groupBy({
    by: ["itemId"],
    where: {
      request: {
        status: "pending",
      },
    },
    _sum: {
      allocatedQty: true,
    },
  });

  const pendingMap = new Map<string, number>();
  pendingAllocations.forEach((pa) => {
    if (pa.itemId) {
      pendingMap.set(pa.itemId, pa._sum.allocatedQty || 0);
    }
  });

  const itemRecords = items.map((item) => {
    const pendingAllocated = pendingMap.get(item.id) || 0;
    const availableQuantity = computeAvailableStock(item.quantity, pendingAllocated);
    const itemNorm = item.nameNormalized || normalizeVietnamese(item.name);

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
      availableQuantity,
      minStock: item.minStock,
      price: item.price,
      location: item.location,
      imageUrl: item.imageUrl,
      nameNormalized: itemNorm,
    };
  });

  const collectedResults: SearchResultItem[] = [];
  const addedIds = new Set<string>();

  let tierAExecuted = true;
  let tierBExecuted = false;
  let tierCExecuted = false;

  // =========================================================================
  // TẦNG A: Exact / Prefix / Substring Match (Độ tin cậy cao nhất)
  // =========================================================================
  for (const item of itemRecords) {
    let matchScore = 0;

    if (item.nameNormalized === queryNormalized) {
      matchScore = 1.0;
    } else if (item.nameNormalized.startsWith(queryNormalized)) {
      matchScore = 0.95;
    } else if (
      item.nameNormalized.includes(` ${queryNormalized} `) ||
      item.nameNormalized.startsWith(`${queryNormalized} `) ||
      item.nameNormalized.endsWith(` ${queryNormalized}`)
    ) {
      matchScore = 0.90;
    } else if (item.nameNormalized.includes(queryNormalized)) {
      matchScore = 0.85;
    }

    if (matchScore > 0) {
      // Ưu tiên khớp cả dấu nguyên bản tiếng Việt nếu có
      const rawLower = rawQuery.toLowerCase();
      if (item.name.toLowerCase().includes(rawLower)) {
        matchScore += 0.03;
      }

      // Nếu query có dấu thanh và từ đầu tiên của item cũng có dấu thanh (ví dụ: 'keó' -> 'Kéo' thay vì 'Keo')
      const queryHasTone = /[áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(rawQuery);
      const firstWordHasTone = /[áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(item.name.split(" ")[0]);
      if (queryHasTone && firstWordHasTone) {
        matchScore += 0.02;
      }

      collectedResults.push({
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity,
        availableQuantity: item.availableQuantity,
        minStock: item.minStock,
        price: item.price,
        location: item.location,
        imageUrl: item.imageUrl,
        matchType: "exact",
        score: matchScore,
      });
      addedIds.add(item.id);
    }
  }

  // Sắp xếp Tầng A theo điểm giảm dần
  collectedResults.sort((a, b) => b.score - a.score);

  // NẾU TẦNG A ĐÃ ĐẠT >= 5 KẾT QUẢ TỐT -> DỪNG NGAY, KHÔNG CẦN CHẠY TẦNG B & C
  if (collectedResults.length >= 5) {
    const finalResults = collectedResults.slice(0, 8);
    return {
      query: rawQuery,
      results: finalResults,
      tiersExecuted: { tierA: true, tierB: false, tierC: false },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // =========================================================================
  // TẦNG B: Fuzzy Match (Trigram Similarity > 0.25 - Xử lý lỗi chính tả, gõ tắt)
  // =========================================================================
  tierBExecuted = true;
  const fuzzyCandidates: SearchResultItem[] = [];

  for (const item of itemRecords) {
    if (addedIds.has(item.id)) continue;

    const similarity = computeTrigramSimilarity(item.nameNormalized, queryNormalized);

    if (similarity > 0.25) {
      // Score dao động từ 0.50 đến 0.82 dựa trên similarity
      let fuzzyScore = Number((0.40 + similarity * 0.45).toFixed(3));

      // Boost nếu tiền tố ký tự khớp
      if (item.nameNormalized.slice(0, 3) === queryNormalized.slice(0, 3)) {
        fuzzyScore += 0.05;
      }

      fuzzyCandidates.push({
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity,
        availableQuantity: item.availableQuantity,
        minStock: item.minStock,
        price: item.price,
        location: item.location,
        imageUrl: item.imageUrl,
        matchType: "fuzzy",
        score: fuzzyScore,
      });
    }
  }

  // Sắp xếp các ứng viên Tầng B theo điểm giảm dần
  fuzzyCandidates.sort((a, b) => b.score - a.score);

  for (const item of fuzzyCandidates) {
    collectedResults.push(item);
    addedIds.add(item.id);
  }

  // NẾU TẦNG A + B ĐÃ ĐẠT >= 5 KẾT QUẢ -> DỪNG NGAY, KHÔNG CẦN CHẠY TẦNG C
  if (collectedResults.length >= 5) {
    const finalResults = collectedResults.slice(0, 8);
    return {
      query: rawQuery,
      results: finalResults,
      tiersExecuted: { tierA: true, tierB: true, tierC: false },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // =========================================================================
  // TẦNG C: Semantic Match (Cosine / Từ đồng nghĩa - Xử lý "viết chì" -> "bút chì")
  // =========================================================================
  tierCExecuted = true;
  const semanticCandidates: SearchResultItem[] = [];

  for (const item of itemRecords) {
    if (addedIds.has(item.id)) continue;

    const semanticScore = computeSemanticSimilarity(queryNormalized, item.nameNormalized);

    if (semanticScore >= 0.40) {
      semanticCandidates.push({
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity,
        availableQuantity: item.availableQuantity,
        minStock: item.minStock,
        price: item.price,
        location: item.location,
        imageUrl: item.imageUrl,
        matchType: "semantic",
        score: Number(semanticScore.toFixed(3)),
      });
    }
  }

  // Sắp xếp các ứng viên Tầng C theo điểm giảm dần
  semanticCandidates.sort((a, b) => b.score - a.score);

  for (const item of semanticCandidates) {
    collectedResults.push(item);
    addedIds.add(item.id);
  }

  // Sắp xếp tổng thể: Tầng A (exact) > Tầng B (fuzzy) > Tầng C (semantic), khi bằng điểm so theo score
  const typePriority: Record<string, number> = {
    exact: 3,
    fuzzy: 2,
    semantic: 1,
  };

  collectedResults.sort((a, b) => {
    if (typePriority[a.matchType] !== typePriority[b.matchType]) {
      return typePriority[b.matchType] - typePriority[a.matchType];
    }
    return b.score - a.score;
  });

  const finalResults = collectedResults.slice(0, 8);
  const executionTimeMs = Date.now() - startTime;

  return {
    query: rawQuery,
    results: finalResults,
    tiersExecuted: { tierA: tierAExecuted, tierB: tierBExecuted, tierC: tierCExecuted },
    executionTimeMs,
  };
}
