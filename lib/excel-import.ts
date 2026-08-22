import ExcelJS from "exceljs";
import JSZip from "jszip";
import { normalizeVietnamese } from "./search";
import { resolveExternalThumbnail, inferPreschoolUnit } from "./external-search";

export interface ParsedImportItem {
  id?: string;
  name: string;
  unit: string;
  quantity: number;
  price: number | null;
  category: string;
  location?: string | null;
  minStock: number;
  imageUrl?: string | null;
  existingId?: string | null;
  isExisting?: boolean;
  isValid: boolean;
  errorReason?: string;
}

export interface ParseResult {
  fileType: "word" | "excel" | "csv" | "unknown";
  departmentOrPurpose?: string;
  targetCategory: string;
  items: ParsedImportItem[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

/**
 * Trích xuất số từ chuỗi text (xử lý 167,000, 167.000, " 167000 đ ", ...)
 */
function parseNumericString(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "object") {
    if (val.result !== undefined) return Number(val.result) || 0;
    if (val.formula) return Number(val.result) || 0;
  }
  const str = String(val).replace(/[^\d.-]/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function isNonMerchandiseText(rawName: string, normName: string, fullRowText: string = ""): boolean {
  if (!rawName || rawName.trim().length < 2) return true;
  if (!normName || normName.length < 2) return true;

  // 1. Kiểm tra rawName có chứa mẫu ngày tháng hoặc chữ ký placeholder:
  const rawLower = rawName.toLowerCase();
  if (
    /ngày\s*[\/._:]/i.test(rawName) ||
    /\/\s*\/\s*20/i.test(rawName) ||
    /\(\s*ngày/i.test(rawName) ||
    /ngày\s+\d+\s+tháng/i.test(rawName) ||
    /ngày\s*\/\s*\/\s*20/i.test(rawName) ||
    /ký[,\s]+ghi\s*rõ/i.test(rawName) ||
    /\(ký\s*tên\)/i.test(rawName) ||
    /chữ\s*ký/i.test(rawName) ||
    /họ\s*(và\s*)?tên/i.test(rawName) ||
    /\b(duyệt|phê\s*duyệt|xác\s*nhận|ý\s*kiến)\b/i.test(rawName)
  ) {
    return true;
  }

  // 2. Kiểm tra nếu chỉ toàn số, ngày tháng hoặc ký tự đặc biệt
  if (!/[a-z]/i.test(normName)) return true;
  if (/^\d+[\/.-]\d+[\/.-]\d+$/.test(rawName.trim())) return true;

  // 3. Danh sách từ khóa chức danh & ký duyệt
  const roleKeywords = [
    "quan ly bo phan",
    "quan ly",
    "truong bo phan",
    "truong phong",
    "pho phong",
    "giam doc",
    "pho giam doc",
    "hieu truong",
    "hieu pho",
    "ban giam hieu",
    "bgh",
    "to truong",
    "to pho",
    "nguoi lap bieu",
    "nguoi lap phieu",
    "nguoi lap",
    "nguoi de nghi",
    "nguoi yeu cau",
    "nguoi mua",
    "nguoi giao",
    "nguoi nhan",
    "ben giao",
    "ben nhan",
    "ke toan truong",
    "ke toan",
    "thu quy",
    "chu ky",
    "ky ten",
    "phe duyet",
    "xac nhan",
    "y kien",
    "bo phan",
  ];

  for (const keyword of roleKeywords) {
    if (
      normName === keyword ||
      normName.startsWith(keyword + " ") ||
      normName.endsWith(" " + keyword) ||
      normName.includes(" " + keyword + " ")
    ) {
      return true;
    }
  }

  // 4. Danh sách từ khóa tổng kết & tiêu đề hành chính (chỉ match khi trùng khớp hoặc bắt đầu bằng)
  const exactOrPrefixKeywords = [
    "tong cong",
    "tong so tien",
    "tong tien",
    "cong tien",
    "cong",
    "bang chu",
    "thue vat",
    "vat",
    "thanh tien",
    "don gia",
    "cong hoa xa hoi",
    "doc lap tu do",
    "yeu cau mua sam",
    "ma so",
    "hieu luc",
    "don vi yeu cau",
    "noi dung yeu cau",
    "thoi gian dap ung",
    "ngay thang nam",
    "stt",
    "so thu tu",
    "ten tai san",
    "ten hang hoa",
    "ten do dung",
    "ten mat hang",
    "ten san pham",
    "don vi tinh",
    "ghi chu",
    "luu y",
    "kinh gui",
    "can cu",
    "muc dich",
  ];

  for (const keyword of exactOrPrefixKeywords) {
    if (normName === keyword || normName.startsWith(keyword + " ") || normName.startsWith(keyword + ":")) {
      return true;
    }
  }

  // 4. Kiểm tra full row text nếu toàn bộ dòng là khối chữ ký
  if (fullRowText) {
    const normRow = normalizeVietnamese(fullRowText);
    if (
      (normRow.includes("quan ly") || normRow.includes("nguoi lap") || normRow.includes("hieu truong") || normRow.includes("ke toan") || normRow.includes("thu kho")) &&
      (normRow.includes("ngay") || normRow.includes("ky") || normRow.includes("20") || normRow.includes("bo phan"))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Hàm phân tích chung từ mảng 2 chiều string[][] (dùng cho cả Word .docx, Excel .xlsx và CSV)
 */
export function parseRowsIntoInventoryItems(
  rawRows: (string | any)[][],
  contextText: string = ""
): ParseResult {
  let departmentOrPurpose = contextText.trim();
  let targetCategory = "hoc_tap";

  const normContext = normalizeVietnamese(contextText);
  if (normContext.includes("ngoai khoa")) {
    targetCategory = "ngoai_khoa";
  } else if (normContext.includes("hoc tap")) {
    targetCategory = "hoc_tap";
  }

  // 1. Tìm Header Row
  let headerRowIndex = -1;
  const colIndices = {
    stt: -1,
    name: -1,
    unit: -1,
    stockQty: -1,
    needQty: -1,
    buyQty: -1,
    price: -1,
    total: -1,
    category: -1,
    location: -1,
  };

  for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
    const row = rawRows[r] || [];
    const cellTexts: { index: number; text: string; norm: string }[] = [];

    row.forEach((cellVal, colIdx) => {
      const text = String(cellVal || "").trim();
      if (text) {
        cellTexts.push({
          index: colIdx,
          text,
          norm: normalizeVietnamese(text),
        });
      }
    });

    const hasNameCol = cellTexts.some(
      (c) =>
        c.norm.includes("ten tai san") ||
        c.norm.includes("ten hang hoa") ||
        c.norm.includes("ten do dung") ||
        c.norm.includes("ten mat hang") ||
        c.norm.includes("ten san pham") ||
        c.norm === "ten" ||
        c.norm === "ten hang" ||
        c.norm.includes("item name")
    );

    const hasUnitCol = cellTexts.some(
      (c) =>
        c.norm === "dvt" ||
        c.norm.includes("don vi tinh") ||
        c.norm.includes("don vi") ||
        c.norm === "unit"
    );

    const hasQtyCol = cellTexts.some(
      (c) =>
        c.norm.includes("sl can") ||
        c.norm.includes("sl mua moi") ||
        c.norm.includes("sl ton") ||
        c.norm.includes("so luong") ||
        c.norm === "sl" ||
        c.norm === "qty"
    );

    const hasSttCol = cellTexts.some((c) => c.norm === "stt" || c.norm.includes("so thu tu"));

    if (hasNameCol && (hasUnitCol || hasQtyCol || hasSttCol)) {
      headerRowIndex = r;

      cellTexts.forEach((c) => {
        if (c.norm === "stt" || c.norm.includes("so thu tu")) {
          colIndices.stt = c.index;
        } else if (
          c.norm.includes("ten tai san") ||
          c.norm.includes("ten hang hoa") ||
          c.norm.includes("ten do dung") ||
          c.norm.includes("ten mat hang") ||
          c.norm.includes("ten san pham") ||
          c.norm === "ten" ||
          c.norm === "ten hang" ||
          c.norm.includes("item name")
        ) {
          colIndices.name = c.index;
        } else if (
          c.norm === "dvt" ||
          c.norm.includes("don vi tinh") ||
          c.norm.includes("don vi") ||
          c.norm === "unit"
        ) {
          colIndices.unit = c.index;
        } else if (c.norm.includes("sl ton") || c.norm.includes("ton kho")) {
          colIndices.stockQty = c.index;
        } else if (c.norm.includes("sl can") || c.norm.includes("so luong can")) {
          colIndices.needQty = c.index;
        } else if (c.norm.includes("sl mua moi") || c.norm.includes("mua moi") || c.norm.includes("nhap")) {
          colIndices.buyQty = c.index;
        } else if (c.norm === "sl" || c.norm.includes("so luong") || c.norm === "qty") {
          if (colIndices.needQty === -1) colIndices.needQty = c.index;
        } else if (c.norm.includes("don gia") || c.norm === "gia" || c.norm.includes("price")) {
          colIndices.price = c.index;
        } else if (c.norm.includes("thanh tien")) {
          colIndices.total = c.index;
        } else if (c.norm.includes("phan loai") || c.norm.includes("danh muc") || c.norm.includes("loai")) {
          colIndices.category = c.index;
        } else if (c.norm.includes("vi tri") || c.norm.includes("ke") || c.norm.includes("tu")) {
          colIndices.location = c.index;
        }
      });

      break;
    }
  }

  // 2. Quét các dòng trước headerRowIndex để lấy ngữ cảnh phòng ban
  if (headerRowIndex > 0) {
    for (let r = 0; r < headerRowIndex; r++) {
      const row = rawRows[r] || [];
      const rowText = row.map((c) => String(c || "").trim()).filter(Boolean).join(" ");
      const norm = normalizeVietnamese(rowText);

      if (norm.includes("don vi yeu cau") || norm.includes("ngoai khoa") || norm.includes("hoc tap")) {
        departmentOrPurpose = rowText;
        if (norm.includes("ngoai khoa")) targetCategory = "ngoai_khoa";
        else if (norm.includes("hoc tap")) targetCategory = "hoc_tap";
      }
    }
  }

  // Fallback
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    colIndices.stt = 0;
    colIndices.name = 1;
    colIndices.unit = 2;
    colIndices.stockQty = 3;
    colIndices.needQty = 4;
    colIndices.buyQty = 5;
    colIndices.price = 6;
  }

  const items: ParsedImportItem[] = [];

  // 3. Đọc dữ liệu từ headerRowIndex + 1
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r] || [];
    const fullRowText = row.map((c) => String(c || "").trim()).filter(Boolean).join(" ");
    const rawName = colIndices.name >= 0 ? String(row[colIndices.name] || "").trim() : "";
    if (!rawName || rawName.length < 2) continue;

    const normName = normalizeVietnamese(rawName);
    if (isNonMerchandiseText(rawName, normName, fullRowText)) {
      continue;
    }

    const rawUnit = colIndices.unit >= 0 ? String(row[colIndices.unit] || "").trim() : "";
    const unit = rawUnit ? rawUnit.toLowerCase() : inferPreschoolUnit(rawName, "");

    let qty = 0;
    if (colIndices.needQty >= 0) {
      qty = parseNumericString(row[colIndices.needQty]);
    }
    if (qty === 0 && colIndices.buyQty >= 0) {
      qty = parseNumericString(row[colIndices.buyQty]);
    }
    if (qty === 0 && colIndices.stockQty >= 0) {
      qty = parseNumericString(row[colIndices.stockQty]);
    }
    if (qty < 0) qty = 0;

    const rawPrice = colIndices.price >= 0 ? parseNumericString(row[colIndices.price]) : 0;
    const price = rawPrice > 0 ? rawPrice : null;

    let itemCat = targetCategory;
    if (colIndices.category >= 0) {
      const catText = normalizeVietnamese(String(row[colIndices.category] || ""));
      if (catText.includes("ngoai khoa") || catText.includes("trang tri")) {
        itemCat = "ngoai_khoa";
      } else if (catText.includes("hoc tap") || catText.includes("giao cu")) {
        itemCat = "hoc_tap";
      }
    }

    const location = colIndices.location >= 0 ? String(row[colIndices.location] || "").trim() || null : null;
    const imgUrl = resolveExternalThumbnail(rawName, rawName, null);
    const isValid = rawName.trim().length >= 2;

    items.push({
      name: rawName.trim(),
      unit: unit || "cái",
      quantity: Math.round(qty),
      price,
      category: itemCat,
      location,
      minStock: 5,
      imageUrl: imgUrl,
      isValid,
      errorReason: isValid ? undefined : "Tên món hàng quá ngắn hoặc không hợp lệ",
    });
  }

  const validRows = items.filter((i) => i.isValid).length;
  const invalidRows = items.length - validRows;

  return {
    fileType: "unknown",
    departmentOrPurpose,
    targetCategory,
    items,
    totalRows: items.length,
    validRows,
    invalidRows,
  };
}

/**
 * Phân tích file Word (.docx) chứa bảng biểu
 */
export async function parseDocxInventoryBuffer(buffer: ArrayBuffer | Buffer): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(buffer);
  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("Không tìm thấy nội dung văn bản trong file Word (.docx).");
  }

  const docXml = await docXmlFile.async("string");

  // 1. Quét thông tin ngữ cảnh ngoài bảng
  let contextText = "";
  const paragraphMatches = docXml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g);
  for (const pMatch of paragraphMatches) {
    const pXml = pMatch[1];
    const textMatches = Array.from(pXml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)).map((m) => m[1]);
    const pText = textMatches.join("").trim();
    if (pText) {
      const norm = normalizeVietnamese(pText);
      if (norm.includes("don vi yeu cau") || norm.includes("ngoai khoa") || norm.includes("hoc tap")) {
        contextText += " " + pText;
      }
    }
  }

  // 2. Bóc tách các bảng <w:tbl> trong file Word
  const tableMatches = Array.from(docXml.matchAll(/<w:tbl(?:\s[^>]*)?>([\s\S]*?)<\/w:tbl>/g));
  if (tableMatches.length === 0) {
    throw new Error("File Word không chứa bảng dữ liệu nào.");
  }

  const rawRows: string[][] = [];

  for (const tblMatch of tableMatches) {
    const tblXml = tblMatch[1];
    const rowMatches = Array.from(tblXml.matchAll(/<w:tr(?:\s[^>]*)?>([\s\S]*?)<\/w:tr>/g));

    for (const rMatch of rowMatches) {
      const rXml = rMatch[1];
      const cellMatches = Array.from(rXml.matchAll(/<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/g));

      const rowCells: string[] = [];
      for (const cMatch of cellMatches) {
        const cXml = cMatch[1];
        const textNodes = Array.from(cXml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)).map((m) => m[1]);
        rowCells.push(textNodes.join("").trim());
      }

      if (rowCells.some((c) => c.length > 0)) {
        rawRows.push(rowCells);
      }
    }
  }

  const result = parseRowsIntoInventoryItems(rawRows, contextText);
  result.fileType = "word";
  return result;
}

/**
 * Phân tích file Excel (.xlsx, .xls)
 */
export async function parseExcelInventoryBuffer(buffer: ArrayBuffer | Buffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  // @ts-ignore
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("File Excel không chứa bất kỳ sheet dữ liệu nào.");
  }

  const rawRows: (string | number)[][] = [];

  for (let r = 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const cells: (string | number)[] = [];
    const maxCol = Math.max(row.cellCount, 12);

    for (let c = 1; c <= maxCol; c++) {
      const cell = row.getCell(c);
      let val: any = cell.value;
      if (val !== null && typeof val === "object") {
        if (val.text) val = val.text;
        else if (val.result !== undefined) val = val.result;
        else if (Array.isArray(val.richText)) {
          val = val.richText.map((t: any) => t.text || "").join("");
        }
      }
      cells.push(val !== null && val !== undefined ? val : "");
    }

    if (cells.some((c) => String(c).trim().length > 0)) {
      rawRows.push(cells);
    }
  }

  const result = parseRowsIntoInventoryItems(rawRows, "");
  result.fileType = "excel";
  return result;
}

/**
 * Phân tích file CSV
 */
export function parseCsvInventoryString(csvContent: string): ParseResult {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rawRows: string[][] = lines.map((line) => {
    // Basic CSV splitting handling quotes
    const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
    const cells: string[] = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      cells.push((match[1] || match[2] || "").trim());
    }
    return cells;
  });

  const result = parseRowsIntoInventoryItems(rawRows, "");
  result.fileType = "csv";
  return result;
}

/**
 * Phân tích file Word dạng HTML Table (thường gặp khi xuất file Word từ các phần mềm quản lý với đuôi .doc)
 */
export function parseHtmlWordTable(htmlContent: string): ParseResult | null {
  try {
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tableMatch = tableRegex.exec(htmlContent);
    if (!tableMatch) return null;

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rawRows: string[][] = [];
    let rMatch;

    while ((rMatch = rowRegex.exec(htmlContent)) !== null) {
      const rowHtml = rMatch[1];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      const cells: string[] = [];
      let cMatch;

      while ((cMatch = cellRegex.exec(rowHtml)) !== null) {
        // Strip HTML tags and entities
        const cellText = cMatch[1]
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/gi, " ")
          .replace(/&amp;/gi, "&")
          .replace(/&lt;/gi, "<")
          .replace(/&gt;/gi, ">")
          .replace(/&quot;/gi, '"')
          .replace(/\s+/g, " ")
          .trim();
        cells.push(cellText);
      }

      if (cells.some((c) => c.length > 0)) {
        rawRows.push(cells);
      }
    }

    if (rawRows.length === 0) return null;

    const result = parseRowsIntoInventoryItems(rawRows, htmlContent);
    result.fileType = "word";
    return result;
  } catch {
    return null;
  }
}

/**
 * Tự động phát hiện và phân tích file theo đuôi tệp hoặc nội dung (Word .docx, .doc, Excel .xlsx, CSV)
 */
export async function parseUniversalInventoryBuffer(
  buffer: ArrayBuffer | Buffer,
  fileName: string = ""
): Promise<ParseResult> {
  const lowerName = fileName.toLowerCase();

  // 1. Nếu là file Word (.docx hoặc .doc)
  if (lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
    // Thử giải mã dạng DOCX (Zip XML)
    try {
      return await parseDocxInventoryBuffer(buffer);
    } catch (docxErr: any) {
      // Fallback 1: Kiểm tra xem có phải file HTML lưu dưới đuôi .doc / .docx không
      try {
        const textDecoder = new TextDecoder("utf-8");
        const str = textDecoder.decode(buffer);
        if (str.includes("<table") || str.includes("<TABLE") || str.includes("<html") || str.includes("<HTML")) {
          const htmlRes = parseHtmlWordTable(str);
          if (htmlRes && htmlRes.items.length > 0) {
            return htmlRes;
          }
        }
      } catch {
        // Ignore fallback error
      }

      // Fallback 2: Thử đọc dạng Excel nếu người dùng đổi tên từ file excel sang .doc
      try {
        return await parseExcelInventoryBuffer(buffer);
      } catch {
        // Ignore fallback error
      }

      // Kiểm tra xem có phải binary .doc (Word 97-2003 OLE format)
      const uint8 = new Uint8Array(buffer instanceof Buffer ? buffer : buffer);
      if (uint8.length >= 8 && uint8[0] === 0xd0 && uint8[1] === 0xcf && uint8[2] === 0x11 && uint8[3] === 0xe0) {
        throw new Error(
          "File thuộc định dạng Word cũ (.doc - Word 97-2003). Vui lòng mở file bằng Microsoft Word / Google Docs và chọn 'Save As' sang định dạng .docx hoặc .xlsx để hệ thống bóc tách chính xác 100%."
        );
      }

      throw new Error(
        `Không thể đọc nội dung file Word: ${docxErr?.message || "Vui lòng kiểm tra lại file .docx có chứa bảng biểu hợp lệ."}`
      );
    }
  }

  // 2. Nếu là file CSV
  if (lowerName.endsWith(".csv")) {
    const textDecoder = new TextDecoder("utf-8");
    const content = textDecoder.decode(buffer);
    return parseCsvInventoryString(content);
  }

  // 3. Mặc định hoặc .xlsx / .xls
  try {
    return await parseExcelInventoryBuffer(buffer);
  } catch (excelErr: any) {
    // Thử fallback sang docx nếu file bị đổi đuôi
    try {
      return await parseDocxInventoryBuffer(buffer);
    } catch {
      throw new Error(
        `Không thể đọc file: ${excelErr?.message || "Vui lòng chọn file Word (.docx) hoặc Excel (.xlsx, .xls, .csv) hợp lệ."}`
      );
    }
  }
}

/**
 * Sinh file Excel mẫu (.xlsx) theo chuẩn biểu mẫu "YÊU CẦU MUA SẮM"
 */
export async function generateInventoryImportTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kho Mầm Non ABC";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("YÊU CẦU MUA SẮM", {
    views: [{ showGridLines: true }],
  });

  // Header Title
  worksheet.mergeCells("A1:I1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "YÊU CẦU MUA SẮM & NHẬP KHO ĐỒ DÙNG MẦM NON";
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF065F46" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 30;

  // Subtitle / Department
  worksheet.mergeCells("A2:I2");
  const subCell = worksheet.getCell("A2");
  subCell.value = "1. Đơn vị yêu cầu: Ngoại khoá    |    Thời gian đáp ứng: 16/01/2026";
  subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(2).height = 20;

  worksheet.getRow(3).height = 10;

  // Table Header Row (Dòng 4)
  const headerRow = worksheet.getRow(4);
  headerRow.values = [
    "Stt",
    "Tên tài sản/dịch vụ",
    "Đvt",
    "SL tồn",
    "SL cần",
    "SL mua mới",
    "Đơn giá",
    "Thành tiền",
    "Phân loại",
  ];
  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF059669" }, // Emerald 600
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF047857" } },
      left: { style: "thin", color: { argb: "FF047857" } },
      bottom: { style: "medium", color: { argb: "FF047857" } },
      right: { style: "thin", color: { argb: "FF047857" } },
    };
  });

  // Dữ liệu mẫu (Sample Rows theo đúng hình của người dùng)
  const sampleData = [
    [1, "Xe ba gác di chuyển", "Chuyến", 0, 5, 5, 167000, 835000, "Ngoại khóa & Trang trí"],
    [2, "Giấy bìa A4 cứng trắng", "Xấp", 0, 3, 3, 60000, 180000, "Ngoại khóa & Trang trí"],
    [3, "Giấy in ảnh chất lượng cao", "Xấp", 0, 3, 3, 65000, 195000, "Ngoại khóa & Trang trí"],
    [4, "Bìa ép nhiệt trong suốt", "Xấp", 0, 1, 1, 130000, 130000, "Ngoại khóa & Trang trí"],
    [5, "Giấy bìa màu đỏ A4", "Xấp", 0, 2, 2, 110000, 220000, "Ngoại khóa & Trang trí"],
    [6, "Giấy bìa màu vàng", "Xấp", 0, 2, 2, 110000, 220000, "Ngoại khóa & Trang trí"],
    [7, "Giấy A0 màu vàng đồng", "Tờ", 0, 3, 3, 30000, 90000, "Ngoại khóa & Trang trí"],
    [8, "Giấy A0 màu trắng", "Tờ", 0, 3, 3, 10000, 30000, "Học tập & Giáo cụ"],
    [9, "Giấy A0 màu đỏ", "Tờ", 0, 5, 5, 30000, 150000, "Ngoại khóa & Trang trí"],
    [10, "Bút sáp màu hữu cơ 12 màu", "Hộp", 0, 20, 20, 35000, 700000, "Học tập & Giáo cụ"],
  ];

  sampleData.forEach((row, idx) => {
    const dataRow = worksheet.getRow(5 + idx);
    dataRow.values = row;
    dataRow.height = 22;

    dataRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10, color: { argb: "FF1E293B" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (colNumber === 1 || colNumber === 3) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 2 || colNumber === 9) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else if (colNumber >= 4 && colNumber <= 6) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.numFmt = "#,##0";
      } else if (colNumber >= 7 && colNumber <= 8) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = "#,##0";
      }

      if (idx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    });
  });

  worksheet.getColumn(1).width = 8;
  worksheet.getColumn(2).width = 36;
  worksheet.getColumn(3).width = 14;
  worksheet.getColumn(4).width = 14;
  worksheet.getColumn(5).width = 14;
  worksheet.getColumn(6).width = 14;
  worksheet.getColumn(7).width = 18;
  worksheet.getColumn(8).width = 20;
  worksheet.getColumn(9).width = 24;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
