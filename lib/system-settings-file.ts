import fs from "fs";
import path from "path";

const CONFIG_FILE_PATH = path.resolve(process.cwd(), "data", "system-settings.json");

export const DEFAULT_SYSTEM_SETTINGS: Record<string, string> = {
  school_name: "Trường Mầm Non Họa Mi",
  app_title: "Kho Mầm Non",
  subtitle: "Quản lý đồ dùng & giáo cụ",
  logo_icon: "Boxes",
  logo_url: "",
  phone: "024 3852 1199",
  address: "Số 128 Đường Hoa Hồng, Quận Cầu Giấy, Hà Nội",
  default_min_stock: "5",
};

/**
 * Đọc cấu hình từ file data/system-settings.json được lưu cùng source code Git.
 * Giúp cài đặt không bị mất khi deploy hoặc git pull trên server.
 */
export function readSystemSettingsFromFile(): Record<string, string> {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const fileContent = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
      const parsed = JSON.parse(fileContent);
      if (parsed && typeof parsed === "object") {
        return { ...DEFAULT_SYSTEM_SETTINGS, ...parsed };
      }
    }
  } catch (error) {
    console.error("Lỗi khi đọc file data/system-settings.json:", error);
  }
  return { ...DEFAULT_SYSTEM_SETTINGS };
}

/**
 * Ghi cấu hình vào file data/system-settings.json để commit lên Git.
 */
export function writeSystemSettingsToFile(settings: Record<string, string>): void {
  try {
    const dir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(settings, null, 2), "utf-8");
  } catch (error) {
    console.error("Lỗi khi ghi file data/system-settings.json:", error);
  }
}
