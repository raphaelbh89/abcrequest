/**
 * Real AI & Semantic Knowledge Engine for Kindergarten Supplies
 * Kho Mầm Non - Smart Dynamic Supplies Matching & Real Knowledge Base
 */

export interface KindergartenSupplyCatalog {
  name: string;
  category: "hoc_tap" | "ngoai_khoa";
  unit: string;
  subCategory: string; // Specific sub-category for strict functional matching
  keywords: string[];
  description: string;
  sampleImage: string; // Real photographic high-resolution image URL
  badgeTag: string;
}

// Helper to remove Vietnamese diacritics
export function removeVietnameseTones(str: string): string {
  if (!str) return "";
  let s = str.toLowerCase();
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[đĐ]/g, "d");
  s = s.replace(/[^a-z0-9\s]/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

function hasKeyword(cleanText: string, kw: string): boolean {
  if (kw.includes(" ")) {
    return cleanText.includes(kw);
  }
  return new RegExp(`(^|\\s)${kw}(\\s|$)`).test(cleanText);
}

/**
 * Universal Fail-Safe Unit Resolver for Vietnamese Stationery & Supplies
 */
export function inferStationeryUnit(text: string): string {
  const clean = removeVietnameseTones(text);
  if (!clean) return "cái";

  // 1. Roll (cuộn) - ONLY for tapes, ribbons, washi, nhún rolls
  if (
    clean.includes("bang keo") ||
    clean.includes("bang dinh") ||
    clean.includes("ruy bang") ||
    clean.includes("giay nhun") ||
    clean.includes("day no") ||
    clean.includes("kim tuyen")
  ) {
    return "cuộn";
  }

  // 2. Sheet / Board (tấm) - Format, Formex, Board, Foam, Mica, Xốp tấm
  if (
    clean.includes("format") ||
    clean.includes("formex") ||
    clean.includes("fomex") ||
    clean.includes("tam form") ||
    clean.includes("tam xop") ||
    clean.includes("tam bia") ||
    clean.includes("tam mica") ||
    clean.includes("tam alu")
  ) {
    return "tấm";
  }

  // 3. Ream (ram) - Printing paper A4/A3
  if (
    clean.includes("giay a4") ||
    clean.includes("giay in") ||
    clean.includes("double a") ||
    clean.includes("ik plus") ||
    clean.includes("paperone") ||
    clean.includes("giay photo")
  ) {
    return "ram";
  }

  // 4. Pack / Pad (tập) - Craft paper, Decal, Felt, EVA sheets
  if (
    clean.includes("giay mau") ||
    clean.includes("giay thu cong") ||
    clean.includes("decal") ||
    clean.includes("vai ni") ||
    clean.includes("vai da") ||
    clean.includes("xop eva") ||
    clean.includes("bia thai") ||
    clean.includes("bia kieng") ||
    clean.includes("bia a4")
  ) {
    return "tập";
  }

  // 5. Box / Pen / Set (hộp / cây) - Pencils, Pens, Markers, Crayons
  if (
    clean.includes("but chi") ||
    clean.includes("but bi") ||
    clean.includes("but sap") ||
    clean.includes("but da") ||
    clean.includes("but long") ||
    clean.includes("but muc") ||
    clean.includes("but gel") ||
    clean.includes("thien long") ||
    clean.includes("dat nan") ||
    clean.includes("mau nuoc") ||
    clean.includes("mau thuc pham") ||
    clean.includes("phan viet") ||
    clean.includes("kep buom")
  ) {
    return "hộp";
  }

  // 6. Glue stick (thỏi)
  if (
    clean.includes("keo thoi") ||
    clean.includes("ho dan kho") ||
    clean.includes("ho kho") ||
    hasKeyword(clean, "thoi")
  ) {
    return "thỏi";
  }

  // 7. Bottle (chai / lọ / can) - Liquid glue, hand sanitizer, floor cleaner
  if (
    clean.includes("ho nuoc") ||
    clean.includes("keo sua") ||
    clean.includes("nuoc rua tay") ||
    clean.includes("nuoc lau san") ||
    clean.includes("sunlight") ||
    clean.includes("lifebuoy") ||
    clean.includes("dung dich") ||
    hasKeyword(clean, "chai") ||
    hasKeyword(clean, "lo") ||
    hasKeyword(clean, "can")
  ) {
    return "chai";
  }

  // 8. Bag / Pack (túi / gói) - Craft sticks, glue gun sticks, chenille stems, beads, balloons
  if (
    clean.includes("que kem") ||
    clean.includes("que de luoi") ||
    clean.includes("kem nhung") ||
    clean.includes("hat cuom") ||
    clean.includes("mat lac") ||
    clean.includes("bong bay") ||
    clean.includes("keo nen") ||
    hasKeyword(clean, "tui") ||
    hasKeyword(clean, "goi")
  ) {
    return "túi";
  }

  // 9. Individual items (cái) - Scissors, cutters, rulers, staplers, clipboards, sharpeners
  if (
    clean.includes("keo") ||
    clean.includes("dao") ||
    clean.includes("thuoc") ||
    clean.includes("bam kim") ||
    clean.includes("bia cong") ||
    clean.includes("sung ban keo") ||
    clean.includes("tay") ||
    clean.includes("gom") ||
    clean.includes("got")
  ) {
    return "cái";
  }

  return "cái";
}

// 19 Strict functional sub-categories
export const SUB_CATEGORIES: Record<string, { label: string; defaultUnit: string; keywords: string[] }> = {
  pencil_writing: {
    label: "Bút chì & Dụng cụ gọt tẩy",
    defaultUnit: "hộp",
    keywords: ["but chi", "chi 2b", "but chi 2b", "but chi go", "got but chi", "gom tay", "pencil"],
  },
  ballpoint_pen: {
    label: "Bút bi & Bút viết văn phòng",
    defaultUnit: "hộp",
    keywords: ["but bi", "but muc", "but gel", "but nuoc", "thien long", "ballpoint", "but viet", "tl 027", "tl 079", "b 01"],
  },
  tape_adhesive: {
    label: "Băng keo & Băng dính 2 mặt",
    defaultUnit: "cuộn",
    keywords: ["bang keo", "bang dinh", "2 mat", "hai mat", "xop 2 mat", "keo 2 mat", "bang keo trong", "bang dinh xop", "bang dinh giay", "washi", "keo hai mat"],
  },
  glue_paper: {
    label: "Hồ dán khô & Keo dán giấy",
    defaultUnit: "thỏi",
    keywords: ["ho dan", "keo thoi", "ho kho", "ho nuoc", "keo sua", "keo pva", "deli", "thien long g 015", "ho dan giay", "keo giay"],
  },
  glue_gun: {
    label: "Keo nến & Súng bắn keo",
    defaultUnit: "gói",
    keywords: ["keo nen", "sung ban keo", "keo cay", "silicon", "keo nen silicon"],
  },
  foam_board: {
    label: "Tấm Format / Formex làm mô hình thủ công",
    defaultUnit: "tấm",
    keywords: ["format", "formex", "fomex", "tam form", "tam format", "tam formex", "foam board", "bia mo hinh", "xop form", "foam"],
  },
  eva_foam: {
    label: "Xốp EVA & Kẽm nhung thủ công",
    defaultUnit: "tập",
    keywords: ["xop eva", "xop mau", "xop kim tuyen", "kem nhung", "day kem nhung", "xop bitis", "chenille"],
  },
  felt_cloth: {
    label: "Vải nỉ & Vải dạ thủ công mầm non",
    defaultUnit: "tập",
    keywords: ["vai ni", "vai da", "ni thu cong", "sach vai", "roi tay", "ni mau", "felt"],
  },
  wooden_sticks: {
    label: "Que kem gỗ & Que đè lưỡi",
    defaultUnit: "túi",
    keywords: ["que kem", "que de luoi", "que go", "que kem mau", "que handmade", "craft sticks"],
  },
  whiteboard_markers: {
    label: "Bút lông bảng & Bút dạ quang",
    defaultUnit: "hộp",
    keywords: ["but long bang", "but bang trang", "but da quang", "highlight", "but nho dong", "wb 03", "hl 03"],
  },
  coloring_markers: {
    label: "Bút dạ & Bút sáp tô màu cho bé",
    defaultUnit: "hộp",
    keywords: ["but da", "but long mau", "but mau da", "but sap", "sap mau", "sap dau", "crayons", "markers"],
  },
  paint_art: {
    label: "Màu nước & Hội họa",
    defaultUnit: "bộ",
    keywords: ["mau nuoc", "mau gouache", "mau acrylic", "co ve", "pha mau", "hoi hoa", "khay mau"],
  },
  food_coloring: {
    label: "Màu thực phẩm & Thí nghiệm",
    defaultUnit: "hộp",
    keywords: ["mau thuc pham", "pham mau", "food coloring", "mau banh", "mau thi nghiem", "mau huu co", "rayners"],
  },
  paper_a4: {
    label: "Giấy in & Giấy A4",
    defaultUnit: "ram",
    keywords: ["giay a4", "giay in", "double a", "ik plus", "paperone", "giay trang", "giay photo", "70gsm", "80gsm"],
  },
  paper_craft: {
    label: "Giấy màu & Bìa thủ công",
    defaultUnit: "tập",
    keywords: ["giay mau", "giay thu cong", "giay nhun", "giay decal", "giay bia", "bia a4", "bia cung", "origami", "bia thai"],
  },
  clay_dough: {
    label: "Đất nặn & Tạo hình",
    defaultUnit: "hộp",
    keywords: ["dat nan", "bot nan", "playdough", "dat set", "slime", "dat nan huu co"],
  },
  scissors_tools: {
    label: "Dụng cụ thủ công an toàn",
    defaultUnit: "cái",
    keywords: ["keo thu cong", "keo cat giay", "mui tron", "dao roc giay"],
  },
  files_folders: {
    label: "Bìa còng & Kẹp hồ sơ",
    defaultUnit: "cái",
    keywords: ["bia cong", "bia nut", "bia la", "bia lo", "kep buom", "kep giay", "file ho so"],
  },
  cleaning_hygiene: {
    label: "Vệ sinh & Nhu yếu phẩm",
    defaultUnit: "chai",
    keywords: ["nuoc rua tay", "lifebuoy", "khan uot", "khan giay", "nuoc lau san", "sunlight", "tui rac"],
  },
  decor_ribbon: {
    label: "Trang trí & Sự kiện",
    defaultUnit: "cuộn",
    keywords: ["ruy bang", "bong bay", "kim tuyen", "day no", "hoa gia", "hoa trang tri"],
  },
};

// Rich Knowledge Base of Real-World Specific Products
export const REAL_KINDERGARTEN_CATALOG: KindergartenSupplyCatalog[] = [
  // 1. Bút chì & Dụng cụ viết chì
  {
    name: "Bút chì 2B thân gỗ chuốt sẵn cho bé tập viết (Hộp 12 cây)",
    category: "hoc_tap",
    unit: "hộp",
    subCategory: "pencil_writing",
    keywords: ["but chi", "but chi 2b", "chi 2b", "but chi go", "tap viet", "chuot san", "12 cay"],
    description: "Bút chì gỗ 2B ruột chì mềm đậm, chuốt sẵn đầu chì, thân tam giác chống mỏi tay cho bé mầm non tập cầm bút.",
    sampleImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Pencils_hb.jpg/500px-Pencils_hb.jpg",
    badgeTag: "✏️ Bút chì 2B",
  },
  {
    name: "Bút chì định vị ngòi 2B chống mỏi tay cho trẻ mầm non (Hộp 12 cây)",
    category: "hoc_tap",
    unit: "hộp",
    subCategory: "pencil_writing",
    keywords: ["but chi dinh vi", "but chi mam non", "chong moi tay", "dinh vi ngon tay"],
    description: "Bút chì thiết kế có rãnh định vị ngón tay, giúp bé 4-5 tuổi rèn tư thế cầm bút chuẩn xác ngay từ đầu.",
    sampleImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Pencils_hb.jpg/500px-Pencils_hb.jpg",
    badgeTag: "✏️ Rèn tư thế cầm bút",
  },
  {
    name: "Gọt bút chì quay tay / cầm tay an toàn cho bé (Cái)",
    category: "hoc_tap",
    unit: "cái",
    subCategory: "pencil_writing",
    keywords: ["got but chi", "chuot but chi", "got chi", "an toan"],
    description: "Dụng cụ chuốt bút chì lưỡi thép sắc bén bọc kín trong hộp nhựa, bé tự chuốt dễ dàng không sợ đứt tay.",
    sampleImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Pencils_hb.jpg/500px-Pencils_hb.jpg",
    badgeTag: "✂️ Dụng cụ chuốt",
  },

  // 2. Bút bi & Bút viết văn phòng (Thiên Long)
  {
    name: "Bút bi Thiên Long TL-027 ngòi 0.5mm mực xanh (Hộp 20 cây)",
    category: "hoc_tap",
    unit: "hộp",
    subCategory: "ballpoint_pen",
    keywords: ["but bi", "thien long", "tl 027", "but bi thien long", "muc xanh", "0.5mm"],
    description: "Bút bi Thiên Long ngòi 0.5mm mực êm trơn, viết êm tay, giáo viên chuyên dùng ghi sổ bé ngoan và giáo án.",
    sampleImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Ballpoint-pen-parts.jpg/500px-Ballpoint-pen-parts.jpg",
    badgeTag: "✍️ Bút bi Thiên Long",
  },
  {
    name: "Bút bi Thiên Long TL-079 ngòi 0.7mm mực xanh (Hộp 20 cây)",
    category: "hoc_tap",
    unit: "hộp",
    subCategory: "ballpoint_pen",
    keywords: ["but bi", "thien long", "tl 079", "but bi thien long", "0.7mm", "but bi bam"],
    description: "Bút bi bấm Thiên Long TL-079 thiết kế thanh mảnh, mực xuống đều, nét chữ đậm rõ ràng.",
    sampleImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Ballpoint-pen-parts.jpg/500px-Ballpoint-pen-parts.jpg",
    badgeTag: "✍️ Bút bi Thiên Long",
  },

  // 3. Băng keo & Băng dính 2 mặt (Double-sided Tape)
  {
    name: "Băng dính 2 mặt xốp trắng siêu dính khổ 2.4cm (Cuộn 5m)",
    category: "ngoai_khoa",
    unit: "cuộn",
    subCategory: "tape_adhesive",
    keywords: ["bang keo 2 mat", "bang dinh 2 mat", "xop 2 mat", "keo 2 mat", "bang dinh xop", "2 mat trang"],
    description: "Băng dính xốp 2 mặt lớp keo siêu dính, dính chặt tranh ảnh, mô hình format và đồ chơi trang trí lên tường gạch.",
    sampleImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
    badgeTag: "📌 Băng dính xốp 2 mặt",
  },
  {
    name: "Băng dính 2 mặt giấy mỏng đa năng khổ 1.2cm (Cuộn 10m)",
    category: "hoc_tap",
    unit: "cuộn",
    subCategory: "tape_adhesive",
    keywords: ["bang keo 2 mat", "bang dinh 2 mat", "2 mat giay", "keo 2 mat mong", "dan giay 2 mat"],
    description: "Băng keo 2 mặt giấy mỏng độ bám tốt, xé bằng tay dễ dàng, chuyên dùng cho giờ học cắt dán và làm thiệp của bé.",
    sampleImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
    badgeTag: "📌 Băng keo 2 mặt giấy",
  },

  // 4. Tấm Format / Formex làm mô hình thủ công & trang trí
  {
    name: "Tấm Formex (Format) trắng 3mm làm mô hình & trang trí (Tấm 40x60cm)",
    category: "ngoai_khoa",
    unit: "tấm",
    subCategory: "foam_board",
    keywords: ["format", "formex", "fomex", "tam format", "tam formex", "tam form", "3mm", "trang tri", "mo hinh"],
    description: "Tấm formex (format) xốp PVC trắng 3mm bề mặt phẳng mịn, không thấm nước, dễ cắt uốn làm mô hình học tập, bảng tin và trang trí góc lớp.",
    sampleImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Foam_core_edges.jpg/500px-Foam_core_edges.jpg",
    badgeTag: "📐 Tấm Formex 3mm",
  },
  {
    name: "Tấm Formex (Format) trắng 5mm trang trí góc lớp mầm non (Tấm 40x60cm)",
    category: "ngoai_khoa",
    unit: "tấm",
    subCategory: "foam_board",
    keywords: ["format", "formex", "5mm", "tam format 5mm", "tam form 5mm", "day dan", "mo hinh 3d"],
    description: "Tấm format dày 5mm cứng cáp chịu lực tốt, dùng làm chân đế mô hình, bảng phân vai, kệ trưng bày sản phẩm tạo hình của bé.",
    sampleImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Foam_core_edges.jpg/500px-Foam_core_edges.jpg",
    badgeTag: "📐 Tấm Formex 5mm",
  },

  // 5. Hồ dán khô & Keo dán giấy
  {
    name: "Hồ dán khô dạng thỏi Deli 15g (Keo thỏi an toàn)",
    category: "hoc_tap",
    unit: "thỏi",
    subCategory: "glue_paper",
    keywords: ["ho dan kho", "keo thoi", "deli", "keo kho", "pva", "ho dan giay"],
    description: "Keo thỏi không độc hại, khô nhanh, dính chắc và không gây nhăn giấy hoặc dính bẩn tay trẻ.",
    sampleImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/AdhesivesForHouseUse002.jpg/500px-AdhesivesForHouseUse002.jpg",
    badgeTag: "✨ Keo khô sạch tay",
  },
  {
    name: "Hồ dán khô Thiên Long G-015 15g (Thỏi)",
    category: "hoc_tap",
    unit: "thỏi",
    subCategory: "glue_paper",
    keywords: ["ho dan thien long", "keo thoi thien long", "g 015", "ho kho thien long"],
    description: "Keo khô thỏi Thiên Long chính hãng độ dính tốt, nhỏ gọn cho bé mầm non tự dán bài tập thủ công.",
    sampleImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/AdhesivesForHouseUse002.jpg/500px-AdhesivesForHouseUse002.jpg",
    badgeTag: "✨ Keo khô Thiên Long",
  },

  // 6. Màu thực phẩm & Thí nghiệm
  {
    name: "Bộ màu thực phẩm hữu cơ an toàn cho bé (Hộp 6 màu)",
    category: "hoc_tap",
    unit: "hộp",
    subCategory: "food_coloring",
    keywords: ["mau thuc pham", "pham mau", "mau huu co", "thi nghiem", "pha mau", "an toan"],
    description: "Màu thực phẩm gốc tự nhiên không độc hại, chuyên dùng cho bé thực hành làm bánh, pha màu thí nghiệm khoa học và sensory play.",
    sampleImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Rainbow_of_food_natural_food_colors.jpg/500px-Rainbow_of_food_natural_food_colors.jpg",
    badgeTag: "🌿 An toàn mầm non",
  },

  // 7. Giấy in & Giấy A4
  {
    name: "Giấy in A4 trắng Double A 70gsm (Ram 500 tờ)",
    category: "hoc_tap",
    unit: "ram",
    subCategory: "paper_a4",
    keywords: ["giay a4 trang", "giay in a4", "double a", "70gsm", "giay photo", "giay trang"],
    description: "Giấy in trắng A4 cao cấp độ mịn cao, chuyên dùng in giáo án, tranh tô màu và bài tập tạo hình cho trẻ.",
    sampleImage: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=400&q=80",
    badgeTag: "📄 Giấy in Double A",
  },
  {
    name: "Giấy A4 màu thủ công (Tập 100 tờ đa sắc)",
    category: "hoc_tap",
    unit: "tập",
    subCategory: "paper_craft",
    keywords: ["giay a4 mau", "giay thu cong", "gap giay", "origami", "cat dan", "100 to"],
    description: "Giấy màu 10 sắc màu tươi sáng, mịn dai, phục vụ giờ học gấp giấy Origami và cắt dán sáng tạo.",
    sampleImage: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=400&q=80",
    badgeTag: "🎨 Cắt dán Origami",
  },
];

export interface StockItemLookup {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  availableQuantity: number;
}

export interface SimilarInStockResult {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  availableQuantity: number;
  reason: string;
}

export interface AiCatalogSuggestion {
  name: string;
  category: "hoc_tap" | "ngoai_khoa";
  unit: string;
  description: string;
  sampleImage: string;
  badgeTag: string;
  alreadyInStock: boolean;
  existingItemId?: string;
}

/**
 * Detect the exact functional sub-category with specific compound noun priority
 */
export function detectSubCategory(text: string): string | null {
  const clean = removeVietnameseTones(text);
  if (!clean) return null;

  // 1. Pencil (Bút chì - Highest priority among pens to avoid ballpoint/coloring mismatch)
  if (clean.includes("but chi") || clean.includes("chi 2b") || clean.includes("but chi go") || clean.includes("got but chi")) {
    return "pencil_writing";
  }

  // 2. Tape (Băng keo / Băng dính / 2 mặt)
  if (
    clean.includes("bang keo") ||
    clean.includes("bang dinh") ||
    clean.includes("2 mat") ||
    clean.includes("hai mat") ||
    clean.includes("xop 2 mat") ||
    clean.includes("keo 2 mat") ||
    clean.includes("keo hai mat")
  ) {
    return "tape_adhesive";
  }

  // 3. Glue Gun / Hot Glue (Keo nến / Súng bắn keo)
  if (clean.includes("keo nen") || clean.includes("sung ban keo") || clean.includes("keo cay")) {
    return "glue_gun";
  }

  // 4. Paper Glue & Glue Stick (Hồ dán / Keo thỏi / Keo sữa)
  if (
    clean.includes("ho dan") ||
    clean.includes("keo thoi") ||
    clean.includes("ho kho") ||
    clean.includes("ho nuoc") ||
    clean.includes("keo sua") ||
    clean.includes("keo pva") ||
    clean.includes("keo dan giay")
  ) {
    return "glue_paper";
  }

  // 5. Foam board / Format / Formex
  if (
    clean.includes("format") ||
    clean.includes("formex") ||
    clean.includes("fomex") ||
    clean.includes("tam form") ||
    clean.includes("tam format") ||
    clean.includes("tam formex") ||
    clean.includes("foam board") ||
    clean.includes("bia mo hinh")
  ) {
    return "foam_board";
  }

  // 6. EVA foam & Pipe cleaners
  if (clean.includes("xop eva") || clean.includes("xop mau") || clean.includes("kem nhung") || clean.includes("day kem")) {
    return "eva_foam";
  }

  // 7. Felt & Cloth
  if (clean.includes("vai ni") || clean.includes("vai da") || clean.includes("ni thu cong") || clean.includes("sach vai") || clean.includes("roi tay")) {
    return "felt_cloth";
  }

  // 8. Wooden Sticks
  if (clean.includes("que kem") || clean.includes("que de luoi") || clean.includes("que go")) {
    return "wooden_sticks";
  }

  // 9. Ballpoint pen
  if (clean.includes("but bi") || clean.includes("thien long") || clean.includes("but muc") || clean.includes("but gel") || clean.includes("tl 027") || clean.includes("tl 079") || clean.includes("b 01")) {
    return "ballpoint_pen";
  }

  // 10. Food coloring
  if (clean.includes("mau thuc pham") || clean.includes("pham mau") || clean.includes("food color") || clean.includes("mau banh")) {
    return "food_coloring";
  }

  // 11. Paper A4
  if (clean.includes("giay a4") || clean.includes("giay in") || clean.includes("double a") || clean.includes("ik plus") || clean.includes("paperone")) {
    return "paper_a4";
  }

  // 12. Paper craft
  if (clean.includes("giay mau") || clean.includes("giay thu cong") || clean.includes("giay nhun") || clean.includes("giay decal") || clean.includes("giay bia")) {
    return "paper_craft";
  }

  // 13. Markers & Crayons
  if (clean.includes("but da") || clean.includes("but sap") || clean.includes("sap mau") || clean.includes("but long mau")) {
    return "coloring_markers";
  }

  // 14. Water paint
  if (clean.includes("mau nuoc") || clean.includes("gouache") || clean.includes("acrylic") || clean.includes("co ve")) {
    return "paint_art";
  }

  // 15. Clay & Dough
  if (clean.includes("dat nan") || clean.includes("bot nan") || clean.includes("playdough") || clean.includes("dat set")) {
    return "clay_dough";
  }

  // 16. Generic fallback
  for (const [subCat, data] of Object.entries(SUB_CATEGORIES)) {
    if (data.keywords.some((kw) => clean.includes(kw))) {
      return subCat;
    }
  }

  return null;
}

/**
 * 1. Find Truly Similar Items in Warehouse Stock (Strict Functional Equivalence)
 */
export function findSimilarInStockItems(
  query: string,
  stockItems: StockItemLookup[]
): SimilarInStockResult[] {
  const cleanQuery = removeVietnameseTones(query);
  if (!cleanQuery || cleanQuery.length < 2) return [];

  const querySubCat = detectSubCategory(query);
  const results: SimilarInStockResult[] = [];

  for (const item of stockItems) {
    const cleanItemName = removeVietnameseTones(item.name);
    
    // Skip direct contains matches
    if (cleanItemName.includes(cleanQuery)) {
      continue;
    }

    const itemSubCat = detectSubCategory(item.name);

    if (querySubCat && itemSubCat) {
      if (querySubCat === itemSubCat) {
        let reason = "Mặt hàng cùng loại chức năng đang có sẵn trong kho";
        if (querySubCat === "pencil_writing") {
          reason = "Có sẵn bút chì/dụng cụ viết chì tương tự trong kho";
        } else if (querySubCat === "tape_adhesive") {
          reason = "Có sẵn loại băng keo/băng dính tương tự trong kho";
        } else if (querySubCat === "glue_paper") {
          reason = "Có sẵn hồ/keo dán giấy trong kho để dùng ngay";
        } else if (querySubCat === "glue_gun") {
          reason = "Có sẵn keo nến nhiệt trong kho";
        } else if (querySubCat === "foam_board") {
          reason = "Có sẵn tấm format/bìa mô hình trong kho để dùng thay thế";
        } else if (querySubCat === "paper_a4" || querySubCat === "paper_craft") {
          reason = "Có sẵn loại giấy tương tự trong kho để dùng thay thế";
        } else if (querySubCat === "ballpoint_pen") {
          reason = "Có sẵn bút viết tương tự trong kho";
        } else if (querySubCat === "coloring_markers") {
          reason = "Có sẵn dụng cụ tô màu tương tự trong kho";
        }

        results.push({
          id: item.id,
          name: item.name,
          category: item.category,
          unit: item.unit,
          quantity: item.quantity,
          availableQuantity: item.availableQuantity,
          reason,
        });
      }
    }
  }

  return results.slice(0, 3);
}

/**
 * 2. Get AI Smart Suggestions with Real Photographs & Accurate Specific Names
 */
export async function getAiSupplySuggestions(
  query: string,
  stockItems: StockItemLookup[]
): Promise<AiCatalogSuggestion[]> {
  const cleanQuery = removeVietnameseTones(query);
  if (!cleanQuery) return [];

  const querySubCat = detectSubCategory(query);
  const matchedSuggestions: AiCatalogSuggestion[] = [];

  // Match from curated catalog with strict subcategory preference
  for (const catalogItem of REAL_KINDERGARTEN_CATALOG) {
    const cleanCatalogName = removeVietnameseTones(catalogItem.name);
    let isMatch = false;

    if (querySubCat && catalogItem.subCategory === querySubCat) {
      isMatch = true;
    } else if (cleanCatalogName.includes(cleanQuery)) {
      isMatch = true;
    }

    if (isMatch) {
      const existing = stockItems.find(
        (si) => removeVietnameseTones(si.name) === cleanCatalogName
      );

      matchedSuggestions.push({
        name: catalogItem.name,
        category: catalogItem.category,
        unit: catalogItem.unit,
        description: catalogItem.description,
        sampleImage: catalogItem.sampleImage,
        badgeTag: catalogItem.badgeTag,
        alreadyInStock: Boolean(existing),
        existingItemId: existing?.id,
      });
    }
  }

  // Dynamic synthesizer for ANY query using universal unit inference
  if (matchedSuggestions.length === 0 && query.trim().length >= 2) {
    const cleanQ = query.trim();
    const capitalizedName = cleanQ.charAt(0).toUpperCase() + cleanQ.slice(1);
    const resolvedUnit = inferStationeryUnit(cleanQ);
    const category: "hoc_tap" | "ngoai_khoa" = "hoc_tap";
    let fallbackImage = "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=400&q=80";

    if (querySubCat === "pencil_writing" || cleanQuery.includes("but chi")) {
      fallbackImage = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Pencils_hb.jpg/500px-Pencils_hb.jpg";
    } else if (querySubCat === "foam_board") {
      fallbackImage = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Foam_core_edges.jpg/500px-Foam_core_edges.jpg";
    } else if (querySubCat === "tape_adhesive") {
      fallbackImage = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80";
    }

    matchedSuggestions.push({
      name: `${capitalizedName} (${resolvedUnit} chuẩn)`,
      category,
      unit: resolvedUnit,
      description: `Mặt hàng "${cleanQ}" chất lượng cao phục vụ nhu cầu hoạt động và giảng dạy của trường.`,
      sampleImage: fallbackImage,
      badgeTag: "⭐ Đề xuất chuẩn hóa",
      alreadyInStock: false,
    });
  }

  return matchedSuggestions.slice(0, 4);
}
