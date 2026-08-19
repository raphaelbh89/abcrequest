# 🏫 Kho Mầm Non - Hệ Thống Quản Lý Đồ Dùng Học Tập & Ngoại Khóa

Hệ thống quản lý kho tồn đồ dùng mầm non, xử lý quy trình gửi yêu cầu đồ dùng theo chủ đề/hoạt động, tự động tính toán phân bổ kho khả dụng real-time, duyệt yêu cầu, tự động sinh đề xuất mua cho phần thiếu hụt, và xuất báo cáo Excel chuẩn hóa.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend & Backend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + Magic UI (Lucide Icons, Framer Motion)
- **Database**: SQLite (file `dev.db` phát triển cục bộ)
- **ORM**: Prisma ORM (Migration & Seed)
- **Xác thực & Phân quyền**: JWT (lưu HTTP-only Cookie với `jose`) + Hash mật khẩu `bcryptjs`
- **Xuất Báo cáo**: `exceljs` (.xlsx chuẩn UTF-8 tiếng Việt)
- **Kiểm thử (QA)**: Node.js Test Runner + `tsx` (`npx tsx --test`)

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án Từ Đầu

### 1. Yêu cầu Tiền đề (Prerequisites)
- **Node.js**: Phiên bản `>= 18.0.0` (khuyên dùng Node.js 20 hoặc 24)
- **npm**: Phiên bản `>= 9.0.0`

### 2. Cài đặt Thư viện Phụ thuộc
Mở terminal tại thư mục gốc của dự án và chạy:
```bash
npm install
```

### 3. Cấu hình Biến Môi trường
Tạo file `.env` từ file mẫu `.env.example`:
```bash
cp .env.example .env
```
Nội dung mặc định file `.env`:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="kho-mam-non-secret-key-2026-secure-jwt"
```

### 4. Khởi tạo Cơ sở dữ liệu (Prisma Migration)
Chạy migration để khởi tạo các bảng và file cơ sở dữ liệu SQLite `dev.db`:
```bash
npx prisma migrate dev
```

### 5. Seed Dữ Liệu Mẫu & Sinh Tài Khoản
Chạy lệnh seed để khởi tạo tài khoản mẫu và các đồ dùng kho học tập/ngoại khóa ban đầu:
```bash
npx prisma db seed
```
> **Lưu ý:** Mật khẩu đăng nhập sẽ được sinh ngẫu nhiên và in trực tiếp ra màn hình console khi chạy seed.

Tài khoản mặc định:
| Username | Role | Mô tả |
|---|---|---|
| **`quanly`** | `admin` | Quản lý kho (Toàn quyền CRUD, Duyệt/Từ chối, Nhập kho, Quản lý User) |
| **`giaovien`** | `teacher` | Giáo viên (Gửi yêu cầu đồ dùng, Xem kho khả dụng, Xuất phiếu) |

---

## 💻 Chạy Ứng Dụng

### Chế độ Phát triển (Development)
```bash
npm run dev
```
Truy cập trình duyệt tại địa chỉ: [http://localhost:3000](http://localhost:3000)

### Chế độ Biên dịch Sản phẩm (Production)
```bash
npm run build
npm start
```

---

## 🧪 Chạy Bộ Kiểm Thử (Unit & Integration Tests)

Dự án tích hợp bộ kiểm thử tự động cho thuật toán phân bổ kho và luồng nghiệp vụ tạo -> duyệt -> trừ kho -> sinh đề xuất mua.

Chạy toàn bộ test suite bằng lệnh:
```bash
npm test
```

### Kết quả các kịch bản kiểm thử:
- ✅ **Unit Test 1**: Tồn kho đủ -> Phân bổ đủ 100%, shortfall = 0.
- ✅ **Unit Test 2**: Tồn kho thiếu một phần -> Phân bổ phần hiện có, shortfall = phần còn lại.
- ✅ **Unit Test 3**: Tồn kho = 0 -> Allocated = 0, shortfall = số lượng xin.
- ✅ **Unit Test 4**: Hai yêu cầu pending cùng xin 1 món -> Tổng số lượng giữ chỗ không vượt quá tồn kho thật.
- ✅ **Integration Test**: Luồng hoàn chỉnh Tạo yêu cầu -> Duyệt yêu cầu -> Kiểm tra tồn kho giảm đúng, sinh dòng `stock_transactions`, và sinh bản ghi `purchase_proposals`.

---

## 📋 Danh Sách Module Đã Hoàn Thành

- [x] **Module 0**: Setup Next.js App Router + TypeScript + TailwindCSS + Prisma SQLite.
- [x] **Module 1**: Đăng nhập & Phân quyền (bcrypt hash, JWT httpOnly cookie, route middleware).
- [x] **Module 2**: Quản lý Kho tồn (CRUD đồ dùng, lọc sắp hết, nhập kho thủ công, audit trail).
- [x] **Module 3**: Gửi Yêu cầu Đồ dùng (Kiểm tra tồn kho khả dụng real-time, thuật toán phân bổ kho tạm thời).
- [x] **Module 4**: Duyệt Yêu cầu (Duyệt/Từ chối trong DB Transaction, trừ kho thật, sinh đề xuất mua).
- [x] **Module 5**: Đề xuất Mua (Gom nhóm theo món đồ dùng, chuyển trạng thái "Đã đặt mua" & "Đã nhập kho").
- [x] **Module 6**: Xuất File Excel (Xuất phiếu yêu cầu & bảng tổng hợp đề xuất mua chuẩn `.xlsx`).
- [x] **Module 7**: Dashboard Tổng quan (4 thẻ chỉ số thời gian thực, 2 bảng top 5 rút gọn).
- [x] **Module 8**: Quản lý Người dùng (Thêm user băm bcrypt, chặn tự xóa chính mình, chặn xóa admin cuối cùng).
- [x] **Module 9**: Kiểm thử Unit/Integration & Tài liệu Triển khai.
