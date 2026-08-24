import { test, describe } from "node:test";
import assert from "node:assert";
import {
  testGeminiApiKey,
  searchPreschoolItemsWithAI,
  getGeminiApiKey,
  getActiveAIModel,
  DEFAULT_AI_MODEL,
  GEMINI_SUPPORTED_MODELS,
} from "../lib/ai-search";

describe("Unit & Integration Tests: AI Gemini Smart Preschool Search Engine", () => {
  const TEST_API_KEY = process.env.GEMINI_API_KEY || "AI_MOCK_TEST_KEY";

  test("1. Cấu hình danh sách Models & Giá trị mặc định", () => {
    assert.ok(GEMINI_SUPPORTED_MODELS.length >= 3, "Có ít nhất 3 model được hỗ trợ");
    assert.strictEqual(DEFAULT_AI_MODEL, "gemini-3.6-flash", "Mặc định dùng Gemini 3.6 Flash");
    assert.ok(GEMINI_SUPPORTED_MODELS.some((m) => m.id === "gemini-3.6-flash"));
  });

  test("2. Kiểm tra xác thực đầu vào API Key khi rỗng", async () => {
    const emptyResult = await testGeminiApiKey("");
    assert.strictEqual(emptyResult.success, false);
    assert.strictEqual(emptyResult.message, "Chưa nhập API Key");
  });

  test("3. Kiểm tra hàm tìm kiếm khi không truyền từ khóa hoặc không có API Key", async () => {
    const emptyRes = await searchPreschoolItemsWithAI("");
    assert.strictEqual(emptyRes.results.length, 0);
    assert.strictEqual(emptyRes.query, "");

    const noKeyRes = await searchPreschoolItemsWithAI("bút màu", { apiKey: "" });
    assert.strictEqual(noKeyRes.results.length, 0);
    assert.ok(noKeyRes.error?.includes("Chưa cấu hình"));
  });

  test("4. Kiểm tra cấu trúc phân tích dữ liệu đồ dùng mầm non AI trả về", async () => {
    // Giả lập phản hồi chuẩn từ Gemini để kiểm thử logic xử lý định dạng & gán ảnh
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify([
                      {
                        name: "Đèn lồng khung tre thủ công rước đèn",
                        unit: "cái",
                        price: 25000,
                        category: "su_kien",
                        description: "Đèn lồng truyền thống cho bé rước trăng rằm",
                      },
                    ]),
                  },
                ],
              },
            },
          ],
        }),
      })) as any;

      const aiResponse = await searchPreschoolItemsWithAI("đèn lồng trung thu", {
        apiKey: TEST_API_KEY,
        model: "gemini-3.6-flash",
      });

      assert.strictEqual(aiResponse.results.length, 1);
      const item = aiResponse.results[0];
      assert.strictEqual(item.name, "Đèn lồng khung tre thủ công rước đèn");
      assert.strictEqual(item.unit, "cái");
      assert.strictEqual(item.price, 25000);
      assert.strictEqual(item.category, "su_kien");
      assert.ok(item.imageUrl && item.imageUrl.startsWith("http"), "Có ảnh thumbnail");
      assert.strictEqual(item.source, "gemini_ai");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("5. Kiểm tra đọc và đồng bộ cấu hình AI từ hệ thống", async () => {
    const activeKey = await getGeminiApiKey();
    assert.ok(typeof activeKey === "string", "Hàm getGeminiApiKey trả về chuỗi");

    const activeModel = await getActiveAIModel();
    assert.ok(activeModel.includes("gemini"), "Đọc được Model AI cấu hình");
  });
});
