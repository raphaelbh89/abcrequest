# KẾ HOẠCH TRIỂN KHAI: Hệ thống Quản lý Đồ dùng Học tập & Ngoại khóa Trường Mầm non

> Tài liệu này chia nhỏ dự án thành các module độc lập, mỗi module kèm theo **"Lệnh giao cho AI Agent"** — bạn có thể copy nguyên khối lệnh đó dán vào Claude Code (hoặc agent code khác) để agent triển khai từng bước, theo đúng thứ tự.

---

## 1. Tổng quan hệ thống

**Tên gợi ý:** Kho Mầm Non / KMN-System

**Mục tiêu:** Số hoá việc quản lý đồ dùng học tập và đồ dùng ngoại khóa/trang trí của trường mầm non, trong đó:
- Giáo viên gửi **yêu cầu đồ dùng** khi cần trang trí theo chủ đề hoặc tổ chức hoạt động ngoại khóa.
- Hệ thống **tự động ưu tiên trừ vào tồn kho hiện có**, phần còn thiếu sẽ **tự động chuyển thành đề xuất mua**.
- Quản lý kho duyệt yêu cầu, theo dõi tồn kho, xuất file đề xuất mua để trình mua sắm.

**Vai trò người dùng:**
| Vai trò | Quyền hạn |
|---|---|
| **Giáo viên** | Gửi yêu cầu đồ dùng, xem trạng thái yêu cầu của mình, xuất phiếu yêu cầu, xem tồn kho (chỉ đọc) |
| **Quản lý kho / Admin** | Toàn quyền: quản lý kho, duyệt/từ chối yêu cầu, quản lý đề xuất mua, xuất báo cáo, quản lý tài khoản |

---

## 2. Kiến trúc & công nghệ đề xuất

| Thành phần | Lựa chọn khuyến nghị | Ghi chú |
|---|---|---|
| Frontend | React (Next.js) + TailwindCSS | SSR tốt cho form, dễ deploy |
| Backend | Next.js API Routes (hoặc Node.js/Express riêng) | Gộp chung 1 repo cho gọn |
| Database | PostgreSQL | Nếu triển khai nội bộ 1 trường, quy mô nhỏ → **SQLite** cũng đủ dùng |
| ORM | Prisma | Migration rõ ràng, dễ đọc schema |
| Auth | JWT (access token) lưu trong httpOnly cookie + bcrypt hash mật khẩu | Không lưu plaintext password |
| Export file | `exceljs` (Excel) hoặc `papaparse`/CSV thuần, `pdf-lib` nếu cần PDF | Excel dễ dùng cho phòng mua sắm hơn CSV |
| Deploy | Vercel (nếu dùng Postgres cloud như Neon/Supabase) hoặc VPS nội bộ trường | Tuỳ hạ tầng trường có sẵn |

> **Lựa chọn đơn giản hơn:** nếu chỉ cần dùng nội bộ 1 trường, không cần nhiều người truy cập đồng thời, có thể thay Postgres bằng SQLite và bỏ qua deploy cloud — chạy trên 1 máy tính/server nội bộ của trường.

---

## 3. Lược đồ cơ sở dữ liệu (Database Schema)

```
users
  id            PK
  username      unique
  password_hash
  full_name
  role          enum('admin','teacher')
  created_at

items                        -- Kho tồn
  id            PK
  name
  category      enum('hoc_tap','ngoai_khoa')
  unit          string        -- cái, hộp, cuộn, gói, mét, ram, bộ...
  quantity      int           -- tồn kho hiện tại (số thật)
  min_stock     int           -- ngưỡng cảnh báo sắp hết
  price         decimal null  -- đơn giá tham khảo
  location      string null
  created_at / updated_at

requests                      -- Yêu cầu / đề xuất đồ dùng
  id            PK
  requester_id  FK users
  purpose       string        -- chủ đề / hoạt động, vd "Trang trí góc Mùa xuân"
  needed_date   date
  note          text null
  status        enum('pending','approved','rejected')
  created_at
  decided_at    null
  decided_by    FK users null
  reject_reason text null

request_items                 -- Chi tiết từng dòng trong 1 yêu cầu
  id            PK
  request_id    FK requests
  item_id       FK items
  requested_qty int           -- số lượng giáo viên xin
  allocated_qty int           -- số được cấp từ kho (tính ngay khi tạo yêu cầu)
  shortfall_qty int           -- số còn thiếu = requested_qty - allocated_qty

purchase_proposals            -- Đề xuất mua (sinh ra từ shortfall khi yêu cầu được duyệt)
  id             PK
  item_id        FK items
  qty            int
  source_request_id FK requests
  status         enum('can_mua','da_dat_mua','da_nhap_kho')
  created_at
  received_qty   int default 0
  resolved_at    null

stock_transactions            -- Lịch sử nhập/xuất kho — audit trail (đề xuất thêm để truy vết)
  id             PK
  item_id        FK items
  type           enum('nhap_kho','xuat_kho_duyet_yc','dieu_chinh')
  quantity_change int         -- có thể âm hoặc dương
  reference_id   string null  -- request_id hoặc purchase_proposal_id liên quan
  performed_by   FK users
  created_at
  note           text null
```

**Vì sao có bảng `stock_transactions`:** đây là phần "phát triển thêm logic vận hành hiệu quả" — nếu không có bảng này, khi có sai lệch tồn kho sẽ không biết vì sao (ai xuất, ai nhập, lúc nào). Với 1 hệ thống dùng thật (không phải demo), audit trail là bắt buộc.

---

## 4. Logic nghiệp vụ cốt lõi — "bộ não" của hệ thống

Đây là phần quan trọng nhất, agent phải cài đặt **chính xác** theo đúng thứ tự dưới đây.

### 4.1. Khi giáo viên tạo yêu cầu (POST /api/requests)

Với **mỗi dòng đồ dùng** trong yêu cầu:

```
available = item.quantity − SUM(allocated_qty của các request_items
            thuộc request đang ở trạng thái 'pending' cho cùng item_id)

allocated_qty = MIN(requested_qty, MAX(available, 0))
shortfall_qty = requested_qty − allocated_qty
```

→ Lưu `request_items` với 2 giá trị này. **Chưa trừ kho thật ở bước này** — đây chỉ là "giữ chỗ" tạm thời để tránh 2 giáo viên cùng xin trùng 1 món khi cả hai yêu cầu đều đang chờ duyệt. Request có `status = 'pending'`.

### 4.2. Khi admin duyệt yêu cầu (PATCH /api/requests/:id/approve)

Với mỗi `request_item`:
1. Trừ thật vào kho: `item.quantity -= allocated_qty` → ghi 1 dòng `stock_transactions` (`type='xuat_kho_duyet_yc'`)
2. Nếu `shortfall_qty > 0` → tạo 1 bản ghi `purchase_proposals` (status = `can_mua`)

Sau đó set `request.status = 'approved'`.

### 4.3. Khi admin từ chối (PATCH /api/requests/:id/reject)

Chỉ đổi `status = 'rejected'` + lưu `reject_reason`. **Không đụng vào kho** vì bước 4.1 chưa trừ thật — số "giữ chỗ" tự động được giải phóng vì công thức ở 4.1 chỉ tính trên các request có status = `pending`.

### 4.4. Khi nhận hàng từ đề xuất mua (PATCH /api/purchase-proposals/:id/receive)

```
item.quantity += received_qty
purchase_proposal.status = 'da_nhap_kho'
```
→ ghi `stock_transactions` (`type='nhap_kho'`)

### 4.5. Sơ đồ luồng tổng quát

```
Giáo viên tạo yêu cầu
        │
        ▼
Hệ thống tự tính: Đủ kho? ──► Có ──► allocated = số cần, shortfall = 0
        │
        └──► Thiếu ──► allocated = số còn trong kho, shortfall = phần thiếu
        │
        ▼
   Trạng thái: Chờ duyệt
        │
   Admin duyệt? ──► Từ chối ──► Kết thúc, không đổi kho
        │
       Duyệt
        │
        ▼
Trừ kho thật (allocated_qty) + Sinh đề xuất mua (nếu shortfall > 0)
        │
        ▼
Đề xuất mua → Đã đặt mua → Đã nhập kho (cộng lại vào tồn kho)
```

---

## 5. Chia Module chi tiết

### Module 0 — Khởi tạo dự án

**Chức năng:** Setup Next.js + TailwindCSS + Prisma + kết nối DB + cấu trúc thư mục.

**Lệnh giao cho AI Agent:**
> Khởi tạo dự án Next.js (App Router) với TypeScript và TailwindCSS. Cài đặt Prisma, kết nối tới SQLite (file `dev.db`) cho môi trường phát triển. Tạo cấu trúc thư mục: `/app`, `/app/api`, `/components`, `/lib`, `/prisma`. Tạo file `prisma/schema.prisma` theo đúng lược đồ trong tài liệu "Lược đồ cơ sở dữ liệu" (6 bảng: users, items, requests, request_items, purchase_proposals, stock_transactions). Chạy migration đầu tiên.

**DoD:** `npm run dev` chạy được, kết nối DB thành công, Prisma Studio xem được 6 bảng rỗng.

---

### Module 1 — Đăng nhập & Phân quyền (Login)

**Chức năng:**
- Trang đăng nhập username/password.
- Mật khẩu **băm bằng bcrypt**, không lưu plaintext.
- Sau đăng nhập, cấp JWT lưu trong httpOnly cookie.
- Middleware kiểm tra quyền: route `/admin/*` và API quản trị chỉ `role='admin'` mới gọi được.
- Seed sẵn 2 tài khoản mẫu: 1 admin, 1 giáo viên (dùng script seed, **không hardcode trong code**).

**API:**
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/login` | Đăng nhập, trả JWT qua cookie |
| POST | `/api/auth/logout` | Xoá cookie |
| GET | `/api/auth/me` | Lấy thông tin user đang đăng nhập |

**Lệnh giao cho AI Agent:**
> Xây dựng module đăng nhập cho hệ thống. Yêu cầu: mật khẩu phải hash bằng bcrypt trước khi lưu DB; đăng nhập thành công trả về JWT lưu trong cookie httpOnly, secure; viết middleware `requireAuth` và `requireRole('admin')` để bảo vệ route; viết script `prisma/seed.ts` tạo 1 tài khoản admin (username: quanly) và 1 tài khoản giáo viên (username: giaovien) với mật khẩu ngẫu nhiên in ra console khi seed. Trang login redirect theo role sau khi đăng nhập thành công.

**DoD:** Đăng nhập sai báo lỗi rõ ràng; đăng nhập đúng vào được dashboard; gọi API admin bằng token giáo viên bị chặn 403.

---

### Module 2 — Quản lý Kho tồn (Inventory)

**Chức năng:**
- CRUD đồ dùng: tên, loại (học tập / ngoại khóa), đơn vị tính, tồn kho, ngưỡng cảnh báo tối thiểu, đơn giá, vị trí lưu kho.
- Nhập kho thủ công (nhập số lượng, tự ghi `stock_transactions`).
- Cảnh báo trực quan các món **dưới ngưỡng tối thiểu**.
- Chỉ admin được sửa/xoá/nhập kho; giáo viên chỉ xem.
- Không cho xoá món đang nằm trong yêu cầu ở trạng thái `pending`.

**API:**
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/items` | Danh sách (lọc theo loại, tìm kiếm, chỉ hàng sắp hết) |
| POST | `/api/items` | Thêm mới (admin) |
| PATCH | `/api/items/:id` | Sửa (admin) |
| DELETE | `/api/items/:id` | Xoá — chặn nếu đang bị giữ trong yêu cầu pending |
| POST | `/api/items/:id/stock-in` | Nhập kho thủ công (admin) |

**Lệnh giao cho AI Agent:**
> Xây dựng module quản lý kho tồn. Trang danh sách có ô tìm kiếm theo tên, bộ lọc theo loại (học tập/ngoại khóa), công tắc "chỉ hiện hàng sắp hết" (quantity < min_stock). Chỉ tài khoản role=admin mới thấy nút thêm/sửa/xoá/nhập kho. Mọi thay đổi số lượng tồn kho đều phải ghi 1 dòng vào bảng `stock_transactions`. Khi xoá 1 món, kiểm tra trước: nếu món này đang xuất hiện trong `request_items` của 1 request có status='pending' thì chặn xoá và báo lỗi rõ ràng.

**DoD:** Thêm/sửa/xoá hoạt động đúng; nhập kho cộng đúng số; cảnh báo sắp hết hiển thị đúng món dưới ngưỡng; giáo viên không thấy nút sửa/xoá.

---

### Module 3 — Gửi Yêu cầu Đồ dùng (đề xuất theo chủ đề/ngoại khóa)

**Chức năng:**
- Giáo viên tạo yêu cầu: nhập **chủ đề/hoạt động**, ngày cần dùng, ghi chú, chọn nhiều đồ dùng kèm số lượng.
- **Khi tạo, hệ thống áp dụng logic ở Mục 4.1** — tính ngay `allocated_qty` / `shortfall_qty` cho từng dòng và hiển thị preview cho giáo viên biết ngay: "Lấy từ kho: X — Cần mua thêm: Y" **trước khi** giáo viên bấm gửi.
- Giáo viên xem danh sách yêu cầu của mình + trạng thái.
- Giáo viên có thể **huỷ** yêu cầu đang ở trạng thái `pending`.

**API:**
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/items/availability` | Trả về tồn kho khả dụng thực tế (đã trừ phần đang giữ chỗ) — dùng để preview khi giáo viên đang nhập số lượng |
| POST | `/api/requests` | Tạo yêu cầu (áp dụng logic 4.1) |
| GET | `/api/requests?mine=true` | Danh sách yêu cầu của tôi |
| PATCH | `/api/requests/:id/cancel` | Giáo viên tự huỷ yêu cầu pending của mình |

**Lệnh giao cho AI Agent:**
> Xây dựng module tạo yêu cầu đồ dùng cho giáo viên. Form gồm: chủ đề/hoạt động (bắt buộc), ngày cần dùng, ghi chú, và bộ chọn nhiều đồ dùng (tìm kiếm + thêm vào danh sách, nhập số lượng từng món). Khi giáo viên nhập số lượng, gọi API availability để hiển thị real-time "Còn trong kho khả dụng: N" cho từng món (khả dụng = tồn kho − tổng đã giữ chỗ bởi các yêu cầu pending khác). Khi bấm Gửi, backend áp dụng đúng công thức phân bổ ở mục 4.1 của tài liệu kế hoạch, lưu allocated_qty/shortfall_qty vào request_items, KHÔNG trừ kho thật ở bước này. Sau khi gửi, hiển thị bảng kết quả rõ ràng: món nào đủ, món nào thiếu bao nhiêu.

**DoD:** Tạo yêu cầu với 1 món đủ kho → allocated = requested, shortfall = 0. Tạo yêu cầu với món không đủ kho → allocated = tồn kho hiện có, shortfall = phần còn lại, đúng công thức. 2 giáo viên cùng xin 1 món cùng lúc (2 request pending) không bị cấp phát trùng vượt quá tồn kho thật.

---

### Module 4 — Duyệt Yêu cầu (Approval Workflow)

**Chức năng:**
- Admin xem danh sách yêu cầu (lọc theo trạng thái), xem chi tiết từng dòng.
- Duyệt → áp dụng logic 4.2 (trừ kho thật + sinh đề xuất mua cho phần thiếu).
- Từ chối → áp dụng logic 4.3, bắt buộc nhập lý do.

**API:**
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/requests` | Toàn bộ yêu cầu (admin), có filter status |
| PATCH | `/api/requests/:id/approve` | Duyệt — chạy logic 4.2 |
| PATCH | `/api/requests/:id/reject` | Từ chối — yêu cầu reason |

**Lệnh giao cho AI Agent:**
> Xây dựng trang duyệt yêu cầu cho admin. Danh sách có tab lọc: Chờ duyệt / Đã duyệt / Từ chối. Mỗi yêu cầu xem được chi tiết từng dòng đồ dùng (SL xin, SL từ kho, SL thiếu). Nút "Duyệt" gọi API approve — API này phải chạy trong 1 transaction DB: trừ item.quantity theo allocated_qty của từng dòng, ghi stock_transactions, và với các dòng có shortfall_qty > 0 thì insert vào purchase_proposals (status='can_mua'). Nút "Từ chối" mở modal bắt nhập lý do, không được để trống.

**DoD:** Duyệt 1 yêu cầu có thiếu hàng → tồn kho giảm đúng phần allocated, đề xuất mua xuất hiện đúng số lượng thiếu, gắn đúng nguồn (request nào, giáo viên nào, chủ đề gì). Từ chối không làm thay đổi tồn kho.

---

### Module 5 — Đề xuất Mua (Purchase Proposals)

**Chức năng:**
- Admin xem danh sách đề xuất mua, **gộp theo món đồ dùng** (nhiều yêu cầu khác nhau cùng thiếu 1 món → cộng dồn số lượng cần mua).
- Xem được món này thiếu do yêu cầu/chủ đề nào, giáo viên nào.
- Cập nhật trạng thái: Cần mua → Đã đặt mua → Đã nhập kho (khi nhập kho, cộng số lượng thực nhận vào tồn kho — logic 4.4).

**API:**
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/purchase-proposals?groupBy=item` | Danh sách gộp theo món |
| PATCH | `/api/purchase-proposals/:id/order` | Đánh dấu đã đặt mua |
| PATCH | `/api/purchase-proposals/:id/receive` | Đã nhập kho — cộng vào item.quantity |

**Lệnh giao cho AI Agent:**
> Xây dựng trang đề xuất mua. Hiển thị dạng nhóm theo món đồ dùng: mỗi nhóm hiện tổng số lượng cần mua, đơn vị, và danh sách các yêu cầu/chủ đề đóng góp vào con số đó (mở rộng xem chi tiết). Mỗi dòng đề xuất có 2 nút hành động: "Đã đặt mua" (chỉ đổi trạng thái) và "Đã nhập kho" (mở modal nhập số lượng thực nhận, mặc định = số cần mua, sau khi xác nhận cộng vào item.quantity và ghi stock_transactions type=nhap_kho).

**DoD:** Đề xuất mua gộp đúng khi 2 yêu cầu khác nhau cùng thiếu 1 món; nhập kho từ đề xuất mua cộng đúng số vào tồn kho thật; trạng thái chuyển đúng thứ tự.

---

### Module 6 — Xuất File

**Chức năng:**
1. **Xuất phiếu yêu cầu** (1 request cụ thể) — Excel/PDF, gồm thông tin người yêu cầu, chủ đề, ngày cần, bảng chi tiết (món, ĐV, SL xin, lấy từ kho, cần mua thêm).
2. **Xuất bảng tổng hợp đề xuất mua** — Excel, gộp theo món, kèm cột "chi tiết chủ đề liên quan" — dùng để trình phòng mua sắm/hiệu trưởng.

**API:**
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/requests/:id/export` | Xuất file phiếu yêu cầu |
| GET | `/api/purchase-proposals/export` | Xuất file tổng hợp đề xuất mua |

**Lệnh giao cho AI Agent:**
> Cài đặt export Excel bằng thư viện `exceljs`. Với `/api/requests/:id/export`: tạo file .xlsx có header thông tin yêu cầu và bảng chi tiết đồ dùng. Với `/api/purchase-proposals/export`: tạo file .xlsx bảng tổng hợp theo món (tên, đơn vị, tổng SL cần mua, số yêu cầu liên quan, danh sách chủ đề liên quan nối bằng dấu phẩy). Cả hai đều trả về file để trình duyệt tải xuống trực tiếp (Content-Disposition: attachment).

**DoD:** File tải về mở được bằng Excel, dữ liệu khớp với trạng thái hiện tại trên hệ thống, tiếng Việt có dấu hiển thị đúng (UTF-8/BOM).

---

### Module 7 — Dashboard Tổng quan

**Chức năng:** Trang tổng quan hiển thị: tổng số mặt hàng, số mặt hàng sắp hết, số yêu cầu chờ duyệt, số đề xuất mua chưa xử lý; danh sách rút gọn "sắp hết hàng" và "yêu cầu chờ duyệt gần đây".

**Lệnh giao cho AI Agent:**
> Xây dựng trang dashboard làm trang chủ sau đăng nhập. 4 thẻ số liệu: tổng mặt hàng, mặt hàng dưới ngưỡng tối thiểu, yêu cầu đang chờ duyệt, dòng đề xuất mua chưa xử lý (status != da_nhap_kho). Bên dưới: 2 danh sách rút gọn (5 dòng) — mặt hàng sắp hết và yêu cầu chờ duyệt mới nhất, mỗi dòng bấm vào điều hướng sang trang chi tiết tương ứng.

**DoD:** Số liệu khớp với dữ liệu thật trong DB, cập nhật đúng sau khi có thay đổi.

---

### Module 8 — Quản lý Người dùng (Admin)

**Chức năng:** Admin thêm/xoá tài khoản giáo viên, đổi mật khẩu, khoá tài khoản. Không cho xoá tài khoản admin cuối cùng hoặc tài khoản đang đăng nhập.

**Lệnh giao cho AI Agent:**
> Xây dựng trang quản lý người dùng cho admin: danh sách tài khoản (username, họ tên, vai trò), form thêm tài khoản mới (mật khẩu phải hash bằng bcrypt trước khi lưu), nút xoá có xác nhận — chặn xoá nếu là tài khoản đang đăng nhập hoặc là admin duy nhất còn lại trong hệ thống.

**DoD:** Không thể tự xoá chính mình; không thể xoá hết admin; mật khẩu mới luôn được hash.

---

### Module 9 — Kiểm thử & Triển khai

**Chức năng:**
- Viết test cho logic phân bổ kho (Mục 4) — đây là phần quan trọng nhất, cần test kỹ các case: đủ kho, thiếu kho, hết sạch kho, 2 yêu cầu pending cùng lúc.
- Chuẩn bị script deploy, biến môi trường (.env.example), README hướng dẫn cài đặt.

**Lệnh giao cho AI Agent:**
> Viết unit test cho hàm tính allocated_qty/shortfall_qty với các trường hợp: (1) tồn kho đủ, (2) tồn kho thiếu một phần, (3) tồn kho = 0, (4) hai yêu cầu pending cùng xin 1 món vượt quá tồn kho thật — đảm bảo tổng allocated không bao giờ vượt quá item.quantity thực tế. Viết integration test cho luồng: tạo yêu cầu → duyệt → kiểm tra tồn kho và đề xuất mua sinh ra đúng. Tạo file `.env.example`, cập nhật `README.md` với hướng dẫn cài đặt, seed dữ liệu mẫu, và chạy dự án.

**DoD:** Toàn bộ test pass; README đủ để người khác tự cài đặt được từ đầu.

---

## 6. Thứ tự triển khai đề xuất (dependency order)

```
Module 0 (Setup)
   └─► Module 1 (Login/Auth)
          └─► Module 2 (Kho tồn)
                 └─► Module 3 (Gửi yêu cầu)
                        └─► Module 4 (Duyệt yêu cầu)
                               └─► Module 5 (Đề xuất mua)
                                      ├─► Module 6 (Xuất file)
                                      ├─► Module 7 (Dashboard)
                                      └─► Module 8 (Quản lý user)
                                             └─► Module 9 (Test & Deploy)
```

Mỗi module nên hoàn thành và test đạt DoD **trước khi** giao module tiếp theo cho agent — tránh việc agent xây trên nền chưa ổn định.

---

## 7. Cấu trúc thư mục đề xuất

```
/app
  /login
  /dashboard
  /inventory
  /requests
    /[id]
    /new
  /purchase-proposals
  /admin/users
  /api
    /auth
    /items
    /requests
    /purchase-proposals
/components
  ui/ (Button, Modal, Badge, Table...)
  inventory/
  requests/
/lib
  auth.ts (JWT, bcrypt helpers)
  allocation.ts (logic Mục 4 — tách riêng để dễ test)
  db.ts (Prisma client)
/prisma
  schema.prisma
  seed.ts
/tests
  allocation.test.ts
```

> Lưu ý quan trọng: logic phân bổ kho (Mục 4) nên được viết thành **hàm thuần** (pure function) trong `lib/allocation.ts`, tách khỏi API route — giúp agent viết unit test dễ dàng và tránh bug khi sửa sau này.

---

## 8. Ghi chú vận hành & bảo mật

- Mật khẩu **luôn** hash bằng bcrypt, không bao giờ lưu/log plaintext.
- Mọi API thay đổi dữ liệu (approve, reject, stock-in, receive) nên chạy trong **DB transaction** để tránh trường hợp lỗi giữa chừng làm sai lệch tồn kho.
- Bảng `stock_transactions` là nguồn "sự thật" để đối chiếu khi có tranh chấp số liệu — không xoá dữ liệu ở bảng này.
- Nên giới hạn: 1 giáo viên chỉ sửa/huỷ được yêu cầu của chính mình.

## 9. Hướng mở rộng trong tương lai (không bắt buộc ở bản đầu)

- Thông báo (email/Zalo OA) khi yêu cầu được duyệt/từ chối, hoặc khi hàng sắp hết.
- Quản lý nhà cung cấp + lịch sử giá để so sánh khi mua.
- Báo cáo chi phí theo học kỳ/theo chủ đề ngoại khóa.
- Ứng dụng mobile cho giáo viên gửi yêu cầu nhanh.

---

**Cách dùng tài liệu này:** đưa từng "Lệnh giao cho AI Agent" (bắt đầu từ Module 0) cho Claude Code hoặc agent code khác, chạy tuần tự theo Mục 6, kiểm tra DoD sau mỗi module rồi mới chuyển tiếp.
