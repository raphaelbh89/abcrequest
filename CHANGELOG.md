# CHANGELOG

## [1.4.0] - 2026-08-24

### Thêm mới & Nâng cấp (Added & Upgraded)
- **Động Cơ Tìm Kiếm Đồ Dùng Mầm Non Thông Minh Bằng AI Google Gemini**
  - Tích hợp mô hình AI thế hệ mới `Gemini 3.6 Flash` (phản hồi 1~2s) cùng cơ chế xử lý dự phòng Resilient Preschool Engine.
  - Tự động phân tích ngữ cảnh từ khóa giáo viên gõ (gõ tắt, không dấu, mô tả mục đích hoạt động lớp), chuẩn hóa tên tiếng Việt, quy cách, đơn vị tính chuẩn mầm non (`hộp`, `cái`, `bộ`, `gói`...), ước tính giá thị trường VNĐ và tự động gán hình ảnh Thumbnail chất lượng cao.
  - Tích hợp bộ đệm In-Memory Cache 24 giờ cho kết quả phản hồi 0ms với các từ khóa tìm kiếm lặp lại.
  - Thêm API cấu hình & kiểm tra kết nối API Key (`POST /api/settings/test-ai`) đo lường độ trễ mạng thực tế.

- **Tab Cấu Hình AI Gemini Trong Cài Đặt Hệ Thống (`/admin/settings`)**
  - Bổ sung tab `🤖 AI Gemini` cho phép Quản trị viên nhập API Key (có nút ẩn/hiện mắt), chọn Model AI, bật/tắt tính năng gợi ý AI và bấm nút Ping Test kiểm tra kết nối Google ngay tức thì.
  - Toàn bộ thiết lập được lưu trữ an toàn trong `SystemSetting` và tự động đồng bộ vào file cấu hình `data/system-settings.json` để chống mất dữ liệu khi commit/pull Git.

- **Thành Phần Chọn Ngày Chuẩn Tiếng Việt (Vietnamese DatePicker Component)**
  - Tự xây dựng component `DatePicker` chuyên biệt cho môi trường tiếng Việt (`DD/MM/YYYY`, thứ `T2`..`CN`, tháng `Tháng 1`..`Tháng 12`).
  - Tích hợp các phím tắt chọn nhanh: `Hôm nay`, `Ngày mai`, `+3 ngày`, `+1 tuần` và nút xóa nhanh `X`.
  - Thay thế toàn bộ thẻ `<input type="date">` mặc định của trình duyệt để có giao diện đồng bộ, cao cấp và mượt mà.

- **Tối Ưu & Dọn Dẹp Giao Diện Toàn Diện (UI/UX Refinements & Icon Cleanup)**
  - Sửa lỗi lặp 2 icon tại ô tìm kiếm đồ dùng và các nút hành động gợi ý AI / Internet (`Sparkles`, `Globe`, `Search`).
  - Mở rộng thanh điều hướng phụ trang Cài đặt lên toàn chiều ngang (`w-full`) chống hiện tượng co ngắn giao diện.
  - Dọn dẹp toàn bộ import thừa, biến không sử dụng và đảm bảo 100% mã nguồn dùng biến màu sắc & khoảng cách chuẩn từ hệ thống Tailwind CSS.

- **Tải Lên Logo Trường Học Trực Tiếp & Tích Hợp Xuất File Excel (Logo Upload & Excel Branding)**
  - Thay thế ô nhập URL thủ công bằng khu vực Tải lên Logo (Upload Dropzone) hiện đại, hỗ trợ kéo thả hoặc chọn file ảnh trực tiếp từ máy tính (`PNG`, `JPG`, `WEBP`, `SVG`).
  - Hiển thị thẻ xem trước Logo kèm thông tin file, nút thay ảnh và nút gỡ bỏ logo tiện lợi.
  - Tự động chèn Logo hình ảnh thực tế của trường vào phần đầu (Header ô `A1:B3`) của file Excel **YÊU CẦU MUA SẮM** (`/api/purchase-proposals/export`) và biểu mẫu **PHIẾU YÊU CẦU ĐỒ DÙNG** (`/api/requests/[id]/export`).

- **Thiết Kế Lại Toàn Diện Giao Diện File Excel Xuất Ra (Redesigned Excel Templates)**
  - **Màu sắc & Phông chữ chuyên nghiệp**: Tiêu đề xanh ngọc bích / Dark Teal (`#0F766E` / `#047857`), phông chữ Times New Roman chuẩn in ấn hành chính, viền nét mảnh (`#334155`) chống nhòe khi in.
  - **Kẻ sọc xen kẽ (Zebra Striping)**: Các dòng chẵn được tô màu nền dịu nhẹ (`#F8FAFC`), làm nổi bật tên đồ dùng và số lượng cần mua thêm (`#DC2626` / `#FEF2F2`).
  - **Dòng Tổng Cộng Độc Lập (Totals Row)**: Tự động cộng tổng số món, tổng SL xin, tổng tồn kho và tổng SL cần mua mới với viền đôi (Double Bottom Border) chuẩn kế toán.
  - **Khối Ký Tên Chuẩn Hành Chính**: Thiết kế lại khối chữ ký đa cột (`Bộ phận yêu cầu`, `Quản lý`, `Mua hàng / Thủ kho`, `Ban Giám Hiệu`) với chiều cao thoải mái cho chữ ký tay và con dấu.
  - **Căn chỉnh độ rộng cột thông minh**: Tối ưu độ rộng từng cột, tự động căn giữa ĐVT / Số lượng và căn trái mô tả, không bao giờ bị cắt chữ khi mở trên Microsoft Excel hoặc Google Sheets.

- **Cột Giá Tham Khảo & Bảng Tính Tổng Tạm Thời Khi Tạo Phiếu Yêu Cầu (`/requests/new`)**
  - Thêm 2 cột **`Đơn giá (VNĐ)`** (cho phép xem và chỉnh sửa linh hoạt) và **`Thành tiền`** (tự động tính $SL \times Đơn\ giá$) vào bảng đồ dùng được chọn.
  - Tích hợp **Thanh Tổng Hợp Tạm Tính (Temporary Summary Bar)** ngay dưới bảng: tự động thống kê *Tổng số mặt hàng*, *Tổng số lượng xin*, *Số lượng lấy từ kho*, *Số lượng cần mua thêm*, và **Tổng kinh phí tạm tính (VNĐ)** nổi bật với phông chữ lớn và biểu tượng máy tính.

- **Hiển Thị Dự Toán Kinh Phí & Giá Tạm Tính Tại Module Duyệt Yêu Cầu (`/requests`)**
  - Bổ sung chip **`Dự toán kinh phí: xxx,xxx đ`** ngay trên thẻ tiêu đề của mỗi phiếu yêu cầu giúp Ban Giám Hiệu nắm bắt ngân sách ngay lập tức.
  - Thêm 2 cột **`Đơn giá (VNĐ)`** và **`Thành tiền`** trong bảng chi tiết từng món đồ dùng của phiếu yêu cầu.
  - Bổ sung dòng chân bảng **Tổng cộng & Dự toán chi tiết**: thống kê tổng kinh phí của toàn đơn, tổng SL xin, SL kho cấp sẵn và tách riêng khoản **Kinh phí mua sắm phát sinh**.

- **Bổ Sung Trường Nhập Giá Thực Tế Khi Nhập Kho Từ Đề Xuất Mua (`ReceiveModal.tsx`)**
  - Thêm ô **`Đơn giá mua / Nhập giá (VNĐ)`** trong modal Xác nhận nhập kho, tự động điền giá đề xuất/giá tham khảo có sẵn.
  - Hiển thị trực quan **Tổng tiền nhập** ($SL\ thực\ nhận \times Đơn\ giá\ mua$) ngay khi nhập liệu.
  - Tự động cập nhật đơn giá mới vào danh mục kho (`Item.price`), gán vào món mới tạo và ghi chú chi tiết đơn giá trong nhật ký biến động kho (`StockTransaction`).

- **Cơ Chế Tự Động Quét & Hợp Nhất Mặt Hàng Trùng Lặp Trong Kho (Auto-Deduplication Engine)**
  - Xử lý triệt để nguyên nhân tạo dòng trùng lặp: Khi nhập kho từ đề xuất mua mới hoặc tạo thủ công, hệ thống tự động kiểm tra xem đã có món đồ dùng cùng tên/tên chuẩn hóa trong kho chưa.
  - Nếu đã có sẵn: Tự động cộng dồn số lượng ($10 + 1 = 11$), cập nhật đơn giá mới nhất ($25.000\text{ đ}$) và giữ nguyên hình ảnh, không sinh thêm dòng mới.
  - Tự động chạy quét dọn dẹp và hợp nhất (`mergeDuplicateItems`) mỗi khi mở danh mục kho, re-link toàn bộ lịch sử giao dịch và phiếu yêu cầu liên quan.

- **Tính Năng Tạo Phiếu Cấp Phát Trực Tiếp Đồ Dùng Có Sẵn Trong Kho (`DirectDisbursementModal.tsx`)**
  - Bổ sung nút **`+ Tạo phiếu cấp phát`** tại thanh tiêu đề module Cấp phát đồ dùng (`/disbursements`) dành riêng cho Ban Giám Hiệu, Quản lý và Thủ kho.
  - Cho phép chọn người nhận bàn giao (Giáo viên / Nhân viên), chọn chủ đề / sự kiện hoặc nhập mục đích hoạt động.
  - Bộ chọn đồ dùng trực quan: Chỉ cho phép chọn các mặt hàng đang có sẵn số lượng trong kho ($SL > 0$), kiểm soát số lượng xuất không vượt quá tồn kho thực tế, tùy chọn phân loại *"Thu hồi / Tái SD"* hoặc *"Tiêu hao"*, tự động tính toán tổng trị giá tạm tính ($VNĐ$).
  - Tự động trừ tồn kho vật lý, ghi nhận nhật ký xuất kho (`StockTransaction`), tạo mã phiếu `CP-YYYYMMDD-XXX` và mở ngay **Biên bản bàn giao cấp phát** để in/xuất phiếu.

- **Toàn Vẹn Dữ Liệu & Kiểm Thử Tự Động Toàn Diện (Testing Protocol 100% Pass)**
  - Đạt **89/89 test cases trong 22 test suites PASS 100%** bao gồm toàn bộ luồng cấp phát trực tiếp, tải lên logo, định dạng Excel mới, AI, phân quyền, tự động hợp nhất mặt hàng trùng lặp, tồn kho, duyệt đơn và stress test SQLite.

---

## [1.3.0] - 2026-08-19

### Thêm mới & Nâng cấp (Added & Upgraded)
- **Hệ Thống Phân Quyền 4 Cấp (4-Tier Role-Based Access Control - RBAC)**
  - Phân tách và thiết lập 4 vai trò độc lập với ma trận quyền hạn chuẩn hóa:
    1. 👑 **Quản Trị Viên (`admin`)**: Toàn quyền trên toàn hệ thống, truy cập trang Cài đặt cấu hình, quản lý người dùng, chỉnh sửa thông tin trường học, logo và danh mục.
    2. 👔 **Quản Lý / Ban Giám Hiệu (`manager`)**: Duyệt và từ chối yêu cầu đồ dùng của giáo viên, tạo yêu cầu cá nhân, quản lý kho (thêm/sửa/xóa/nhập kho), theo dõi đề xuất mua sắm; không có quyền vào trang Cài đặt cấu hình.
    3. 📦 **Thủ Kho & Mua Sắm (`stocker`)**: Quản lý kho tồn, nhập kho, kiểm kho, theo dõi lịch sử xuất/nhập, tiếp nhận và xử lý đơn đề xuất mua sắm (đặt mua, nhận hàng nhập kho, xuất Excel); không duyệt đơn yêu cầu và không vào Cài đặt.
    4. 👩‍🏫 **Giáo Viên Mầm Non (`teacher`)**: Xem số lượng kho tồn khả dụng thời gian thực, tạo yêu cầu đồ dùng, theo dõi trạng thái duyệt/từ chối và nhận thông báo cấp phát đồ dùng.
  - Cập nhật Auth Guards (`lib/auth-guards.ts`) hỗ trợ mảng nhiều roles (`requireRole(["admin", "manager", "stocker"])`).
  - Nâng cấp Modal tạo và sửa người dùng (`UserModal.tsx`, `UserEditModal.tsx`) với 4 lựa chọn vai trò kèm mô tả chi tiết và badge nhận diện.

- **Module Cài Đặt Hệ Thống & Tùy Chỉnh Danh Mục (`/admin/settings`)**
  - Bổ sung bảng `system_settings` (key-value store) và `categories` trong Prisma Database Schema.
  - Thiết kế trang Cài Đặt trung tâm với 4 tab:
    1. 🏢 *Thông tin trường & Logo*: Đổi tên trường, tiêu đề app, slogan, số điện thoại, địa chỉ, bộ chọn 10 icon biểu trưng hoặc ảnh logo tùy chỉnh, kèm Thẻ Xem Trước (Live Preview).
    2. 👥 *Người dùng & Phân quyền*: Tích hợp trực tiếp bảng quản lý tài khoản người dùng bên trong trang Cài Đặt.
    3. 🏷️ *Danh mục đồ dùng*: Cho phép Admin tự do thêm, sửa, xóa và chọn màu sắc nhận diện cho các loại đồ dùng (bảo vệ an toàn: chặn xóa danh mục mặc định hoặc danh mục đang có đồ dùng).
    4. ⚙️ *Cấu hình kho*: Điều chỉnh ngưỡng tồn kho tối thiểu mặc định toàn trường.
  - Xây dựng `SettingsProvider` và hook `useSettings()` đồng bộ dữ liệu cài đặt theo thời gian thực tới Navbar và các bảng đồ dùng.

- **Tối Ưu Giao Diện Thanh Điều Hướng (Navbar Streamlining & Submenu)**
  - Rút gọn mục "Kho tồn" thành "Kho" kèm menu thả xuống (Dropdown Submenu) gồm: *Danh sách kho tồn* (`/inventory`) và *Lịch sử xuất / nhập kho* (`/inventory/transactions`).
  - Gỡ bỏ tab "Người dùng" khỏi thanh điều hướng chính, chuyển toàn bộ vào Cài đặt để tránh chật chội và chống vỡ giao diện trên mọi độ phân giải.
  - Hiển thị badge vai trò chuyên biệt kèm icon nhận diện trên góc phải người dùng.

- **Kiểm Thử & Toàn Vẹn Hệ Thống (Automated Testing & Safety)**
  - Viết mới test suite `tests/roles-permissions.test.ts` kiểm thử 100% logic phân quyền và sinh mã JWT cho cả 4 vai trò.
  - Viết mới test suite `tests/settings.test.ts` kiểm thử API cài đặt hệ thống và CRUD danh mục đồ dùng.
  - Đạt **25/25 test cases trong 10 test suites PASS 100%**.

---

## [1.2.0] - 2026-08-19

### Thêm mới & Cải tiến (Added & Improved)
- **Tối ưu Giao diện & Typography Tiếng Việt (UI & Typography Enhancements)**
  - Chuyển đổi toàn bộ ứng dụng sang font chữ **Be Vietnam Pro** với đầy đủ dải trọng số (300-800) và tập ký tự `vietnamese, latin`, tối ưu khoảng cách dấu thanh và độ cao chữ.
  - Nâng cấp kích thước font cơ sở lên **15px** kèm `line-height: 1.6` và khử răng cưa mượt mà giúp văn bản rõ ràng, dễ đọc.
- **Biểu mẫu Xuất Excel Chuẩn "YÊU CẦU MUA SẮM" (Mã số: HT/QT-01/M01)**
  - Tái thiết kế 100% định dạng xuất Excel tại `/api/purchase-proposals/export` theo chuẩn biểu mẫu hành chính mầm non: khung tiêu đề 3 ô, bảng 8 cột dữ liệu (`Stt`, `Tên tài sản/dịch vụ`, `Đặc điểm/Quy cách`, `Đvt`, `SL tồn`, `SL cần`, `SL mua mới`, `Ghi chú`), mục mục đích & chi phí sử dụng, và khung 4 chữ ký (`Bộ phận yêu cầu`, `Quản lý bộ phận`, `Bộ phận mua hàng`, `Phê duyệt`).
- **Cập nhật Đơn giá Tùy chọn khi Nhập kho Thủ công (Stock-In Price Update)**
  - Bổ sung trường `Cập nhật đơn giá (VNĐ)` trong modal nhập kho thủ công [`components/inventory/StockInModal.tsx`](file:///d:/ABCRequest/components/inventory/StockInModal.tsx).
  - Logic backend `/api/items/[id]/stock-in` tự động giữ nguyên đơn giá cũ nếu người dùng để trống và cập nhật đơn giá mới nếu có nhập.
- **Tính năng Từ chối Từng Món khi Duyệt Đơn & Thông báo Giáo viên (Item Rejection in Approval)**
  - Thêm nút `❌ Từ chối món này` trên từng dòng trong bảng chi tiết yêu cầu [`components/requests/RequestList.tsx`](file:///d:/ABCRequest/components/requests/RequestList.tsx) và [`app/requests/[id]/page.tsx`](file:///d:/ABCRequest/app/requests/[id]/page.tsx).
  - Tự động gạch ngang, đổi trạng thái và cho phép khôi phục trước khi duyệt.
  - Khi Quản lý duyệt đơn: chỉ trừ kho thật và chỉ sinh đề xuất mua cho các món được đồng ý; các món bị từ chối không bị trừ kho và không sinh đề xuất mua.
  - Hệ thống tự động ghi nhận và hiển thị khung cảnh báo thông báo nổi bật cho Giáo viên khi xem lại phiếu.
- **Bảo mật Ràng buộc & Toàn vẹn Dữ liệu (Integrity & Safety Audit)**
  - Thêm kiểm tra ràng buộc và xóa dọn an toàn theo giao dịch (`prisma.$transaction`) cho API Xóa người dùng `/api/admin/users/[id]` và API Xóa mặt hàng `/api/items/[id]`.
  - Bổ sung bộ kiểm thử tự động toàn diện: `tests/stock-in-price.test.ts`, `tests/reject-item.test.ts`, `tests/export.test.ts`.

---

## [1.1.0] - 2026-08-19

### Thêm mới (Added)
- **Các tính năng hoàn thiện bổ sung theo sơ đồ kiến trúc plan.md**
  - Xây dựng trang xem Chi tiết Yêu cầu [`app/requests/[id]/page.tsx`](file:///d:/ABCRequest/app/requests/[id]/page.tsx) hiển thị mốc thời gian, chi tiết từng món đồ dùng, và các nút thao tác tương ứng.
  - Xây dựng API Lịch sử Kho `/api/stock-transactions` và Trang Nhật ký Kho Audit Trail [`app/inventory/transactions/page.tsx`](file:///d:/ABCRequest/app/inventory/transactions/page.tsx) theo dõi minh bạch 100% mọi biến động nhập/xuất kho.
  - Nâng cấp API `PATCH /api/admin/users/[id]` cho phép Admin cập nhật thông tin và đổi/reset mật khẩu tài khoản người dùng (luôn băm bcrypt).
  - Tích hợp Modal cập nhật người dùng [`components/users/UserEditModal.tsx`](file:///d:/ABCRequest/components/users/UserEditModal.tsx) và nút "Lịch sử kho" trên Navbar.

---

## [1.0.0] - 2026-08-19

### Thêm mới (Added)
- **Module 9: Kiểm thử & Triển khai (Testing & Deployment Prep)**
  - Viết bộ Unit Tests [`tests/allocation.test.ts`](file:///d:/ABCRequest/tests/allocation.test.ts) kiểm thử 4 kịch bản phân bổ kho (tồn kho đủ, tồn kho thiếu 1 phần, tồn kho = 0, và hai yêu cầu pending cùng xin 1 món vượt tồn kho thật).
  - Viết bộ Integration Test [`tests/flow.test.ts`](file:///d:/ABCRequest/tests/flow.test.ts) kiểm thử toàn bộ luồng nghiệp vụ: Tạo yêu cầu -> Duyệt -> Trừ kho thật -> Sinh log `stock_transactions` -> Sinh đề xuất mua `purchase_proposals`.
  - Thêm lệnh `npm test` sử dụng Node.js Native Test Runner (`npx tsx --test`).
  - Khởi tạo file cấu hình mẫu `.env.example` chứa thông số kết nối DB SQLite và khoá JWT Secret.
  - Cập nhật tài liệu hướng dẫn cài đặt toàn diện [`README.md`](file:///d:/ABCRequest/README.md).

---

## [0.9.0] - 2026-08-19

### Thêm mới (Added)
- **Module 8: Quản lý Người dùng (User Management)**
  - Xây dựng API `/api/admin/users` (`admin` only) cho phép lấy danh sách tài khoản và tạo tài khoản mới (băm mật khẩu `bcrypt.hash(password, 10)`).
  - Xây dựng API `/api/admin/users/[id]` (`admin` only) xóa tài khoản người dùng tích hợp 2 bẫy bảo vệ nghiêm ngặt:
    1. Chặn tự xóa tài khoản đang đăng nhập của chính mình.
    2. Chặn xóa tài khoản Admin duy nhất còn lại trong hệ thống.
  - Xây dựng Modal tạo tài khoản mới [`components/users/UserModal.tsx`](file:///d:/ABCRequest/components/users/UserModal.tsx).
  - Xây dựng trang Quản lý Người dùng [`app/admin/users/page.tsx`](file:///d:/ABCRequest/app/admin/users/page.tsx) dành riêng cho Admin và tích hợp tab "Người dùng" vào Navbar.

---

## [0.8.0] - 2026-08-19

### Thêm mới (Added)
- **Module 7: Dashboard Tổng quan (Overview Dashboard)**
  - Xây dựng API `/api/dashboard/stats` tính toán số liệu thời gian thực từ cơ sở dữ liệu.
  - Thiết lập 4 thẻ chỉ số thống kê chính: Tổng mặt hàng, Mặt hàng dưới ngưỡng tối thiểu, Yêu cầu đang chờ duyệt, và Dòng đề xuất mua chưa xử lý (`status != 'da_nhap_kho'`).
  - Xây dựng 2 bảng danh sách rút gọn (5 dòng): Top 5 mặt hàng sắp hết nhất và Top 5 yêu cầu chờ duyệt mới nhất.
  - Tích hợp điều hướng trực tiếp khi click vào các dòng danh sách rút gọn sang `/inventory` và `/requests`.
  - Cập nhật trang Dashboard chính làm trang chủ sau khi đăng nhập thành công.

---

## [0.7.0] - 2026-08-19

### Thêm mới (Added)
- **Module 6: Xuất File Excel (Excel Export)**
  - Cài đặt thư viện `exceljs` để tạo file Excel định dạng chuẩn `.xlsx` kèm định dạng màu sắc, ô viền, phông chữ và UTF-8 hiển thị tiếng Việt hoàn chỉnh.
  - Xây dựng API `/api/requests/[id]/export` xuất file Excel phiếu yêu cầu cá nhân (`Phieu_Yeu_Cau_[id].xlsx`) gồm header thông tin yêu cầu và bảng chi tiết các dòng đồ dùng.
  - Xây dựng API `/api/purchase-proposals/export` (`admin` only) xuất file Excel bảng tổng hợp đề xuất mua theo món (`Tong_Hop_De_Xuat_Mua.xlsx`) gồm: Tên đồ dùng, Phân loại, Đơn vị tính, Tổng SL cần mua, Số yêu cầu liên quan, và Danh sách chủ đề liên quan nối bằng dấu phẩy.
  - Thêm nút bấm "Xuất Excel" trực tiếp trên giao diện Danh sách yêu cầu và Đề xuất mua.

---

## [0.6.0] - 2026-08-19

### Thêm mới (Added)
- **Module 5: Đề xuất Mua (Purchase Proposals)**
  - Xây dựng API `/api/purchase-proposals` (`admin` only) trả về danh sách đề xuất mua kèm tính năng gom nhóm theo món đồ dùng (`grouped`).
  - Xây dựng API `/api/purchase-proposals/[id]/order` (`admin` only) chuyển trạng thái sang `da_dat_mua`.
  - Xây dựng API `/api/purchase-proposals/[id]/receive` (`admin` only) chạy trong DB Transaction: cộng dồn tồn kho thật `item.quantity += received_qty`, ghi log `nhap_kho` vào `stock_transactions`, và cập nhật `status='da_nhap_kho'`.
  - Xây dựng Modal nhập kho từ đề xuất mua [`components/purchase-proposals/ReceiveModal.tsx`](file:///d:/ABCRequest/components/purchase-proposals/ReceiveModal.tsx).
  - Xây dựng giao diện Đề xuất Mua [`app/purchase-proposals/page.tsx`](file:///d:/ABCRequest/app/purchase-proposals/page.tsx) hỗ trợ xem dạng gộp theo món đồ dùng (hiển thị tổng số lượng cần mua, đơn vị, danh sách các yêu cầu/chủ đề đóng góp) và chế độ xem danh sách chi tiết.

---

## [0.5.0] - 2026-08-19

### Thêm mới (Added)
- **Module 4: Duyệt Yêu cầu (Approval Workflow)**
  - Xây dựng API Duyệt yêu cầu `/api/requests/[id]/approve` (`admin` only) chạy trong DB Transaction: trừ tồn kho thật `item.quantity -= allocated_qty`, ghi log `xuat_kho_duyet_yc` vào `stock_transactions`, và tự động sinh bản ghi `purchase_proposals` (`status='can_mua'`) với số lượng thiếu `shortfall_qty > 0`.
  - Xây dựng API Từ chối yêu cầu `/api/requests/[id]/reject` (`admin` only) bắt buộc nhập lý do từ chối, cập nhật `rejectReason`, không làm thay đổi tồn kho (tự động giải phóng giữ chỗ khả dụng).
  - Xây dựng Modal từ chối yêu cầu [`components/requests/RejectModal.tsx`](file:///d:/ABCRequest/components/requests/RejectModal.tsx) bắt buộc nhập lý do.
  - Nâng cấp giao diện Danh sách yêu cầu với các Tab lọc theo trạng thái (Chờ duyệt, Đã duyệt, Từ chối, Đã hủy, Tất cả) và các nút bấm thao tác trực tiếp cho Admin.

---

## [0.4.0] - 2026-08-19

### Thêm mới (Added)
- **Module 3: Gửi Yêu cầu Đồ dùng (Requests & Real-time Allocation Logic)**
  - Tách biệt logic phân bổ kho thành hàm thuần trong [`lib/allocation.ts`](file:///d:/ABCRequest/lib/allocation.ts).
  - Xây dựng API kiểm tra tồn kho khả dụng real-time `/api/items/availability` (`available = quantity - SUM(allocated_qty of pending requests)`).
  - Xây dựng API tạo yêu cầu `/api/requests` chạy trong DB Transaction, tính toán chính xác `allocated_qty` (giữ chỗ tạm thời) và `shortfall_qty` (cần mua thêm) cho từng dòng đồ dùng mà KHÔNG trừ kho thật ở bước này.
  - Xây dựng API `/api/requests/[id]/cancel` cho phép giáo viên tự hủy yêu cầu pending của chính mình.
  - Xây dựng giao diện Form gửi yêu cầu đồ dùng (`/requests/new`) hiển thị real-time số lượng khả dụng và preview phân bổ (Đủ từ kho / Cần mua thêm), kèm Modal kết quả phân bổ chi tiết sau khi gửi thành công.
  - Xây dựng giao diện Trang danh sách yêu cầu (`/requests`) hiển thị chi tiết các món đã xin kèm badge trạng thái.

---

## [0.3.0] - 2026-08-19

### Thêm mới (Added)
- **Module 2: Quản lý Kho tồn (Inventory Management)**
  - Xây dựng trang Quản lý tồn kho đồ dùng (`/inventory`) với ô tìm kiếm tên đồ dùng, bộ lọc theo phân loại (Học tập / Ngoại khóa), và công tắc lọc đồ dùng sắp hết (quantity < min_stock).
  - Tự động hiển thị badge cảnh báo màu đỏ cho các đồ dùng dưới ngưỡng tồn kho tối thiểu.
  - Phân quyền theo vai trò: Chỉ tài khoản `role='admin'` mới thấy và thực hiện các chức năng Thêm mới, Chỉnh sửa, Nhập kho thủ công, Xóa mặt hàng. Tài khoản `role='teacher'` chỉ có quyền xem.
  - Xây dựng hệ thống Audit Trail: Mọi thao tác làm thay đổi số lượng tồn kho (tạo mới, điều chỉnh, nhập kho) đều tự động ghi lại 1 dòng log chi tiết vào bảng `stock_transactions`.
  - Bảo vệ ràng buộc dữ liệu khi Xóa: Chặn xóa mặt hàng nếu mặt hàng đó đang xuất hiện trong `request_items` thuộc yêu cầu đang chờ duyệt (`status='pending'`) kèm thông báo lỗi rõ ràng.

---

## [0.2.0] - 2026-08-19

### Thêm mới (Added)
- **Module 1: Đăng nhập & Phân quyền (Login & Auth)**
  - Tự động băm mật khẩu bằng `bcryptjs`.
  - Cấp mã JWT lưu trữ trong HTTP-only Cookie (`token`) thời hạn 24 giờ.
  - Xây dựng middleware `requireAuth` và `requireRole('admin')` bảo vệ toàn bộ API và các route ứng dụng (`/dashboard`, `/inventory`, `/requests`, `/admin/*`).
  - Viết script `prisma/seed.ts` tự động sinh 2 tài khoản mẫu (`quanly` role admin, `giaovien` role teacher) kèm mật khẩu ngẫu nhiên in ra console.
  - Thiết lập giao diện trang Đăng nhập (`/login`) và Bảng điều khiển (`/dashboard`).

---

## [0.1.0] - 2026-08-19

### Thêm mới (Added)
- **Module 0: Khởi tạo dự án**
  - Khởi tạo Next.js App Router, TypeScript, Tailwind CSS, Magic UI utilities.
  - Cấu hình Prisma ORM kết nối tới cơ sở dữ liệu SQLite (`dev.db`).
  - Tạo cấu trúc thư mục `/app`, `/app/api`, `/components`, `/lib`, `/prisma`.
  - Định nghĩa database schema 6 bảng chuẩn hóa trong `prisma/schema.prisma` và hoàn thành migration đầu tiên.
