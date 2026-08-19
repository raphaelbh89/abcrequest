# WORKFLOW CHUẨN

## Bước 1: Khởi tạo Nền tảng (Foundation Setup)
- Đọc `agent_rules.md` và `developer_skill.md`.
- Khởi tạo cấu trúc thư mục phân tầng rõ ràng bên trong Project: `/components`, `/pages`, `/assets`, `/database`, `/reports`, `/backups`.
- Thiết lập file `global.css` chứa các biến giao diện.

## Bước 2: Xây dựng Cơ sở dữ liệu (Database First)
- Định nghĩa sơ đồ cơ sở dữ liệu với đầy đủ khóa và ràng buộc.
- Yêu cầu người dùng duyệt sơ đồ (Schema) trước khi tiến hành viết code Backend kết nối.

## Bước 3: Triển khai Giao diện bằng Subagents
- Gọi các Subagents độc lập để xây dựng từng file Component nhỏ, đảm bảo không nhồi nhét code vào file `main.tsx`.
- Gắn kết (Import) các Component đã hoàn thiện vào cấu trúc Layout chính.

## Bước 4: Tự động Kiểm thử Mô phỏng & Khắc phục Lỗi (Automated Mock Testing & Debugging)
- Khi phát hiện lỗi hoặc người dùng báo lỗi, Agent KHÔNG yêu cầu người dùng phải tự đọc hay đánh giá mã nguồn. Agent phải tự chịu trách nhiệm kiểm tra tính đúng đắn của giải pháp.
- **Quy trình Tự kiểm tra của Agent:**
  1. **Cô lập lỗi:** Truy cập và xác định đúng file/hàm gây lỗi. Không làm ảnh hưởng cấu trúc tổng thể.
  2. **Viết Mock Test:** Tự tạo ra dữ liệu giả (mock data) và tự phân tích luồng chạy của đoạn code vừa sửa trong bộ nhớ.
  3. **Kiểm tra chéo (Cross-check):** Áp dụng Mục 3 trong file `testing_protocol.md` để chắc chắn đoạn code mới không phá hỏng thao tác Xóa/Sửa của các Subject liên quan.
- **Cách thức giao file cho người dùng:** 
  - Chỉ cung cấp đoạn patch code đã được Agent tự tin là hoạt động 100%. 
  - Phải hướng dẫn CỰC KỲ CHI TIẾT cách người dùng thay thế đoạn code đó (Ví dụ: "Hãy xóa từ dòng 20 đến dòng 45 trong file `Button.tsx` và dán đoạn code sau vào").
  - Nếu logic phức tạp, Agent phải tự động bổ sung sẵn các lệnh `console.log()` hoặc các thông báo lỗi hiển thị rõ ràng trên giao diện UI để người dùng chỉ việc click chuột trên App thực tế và chụp màn hình lại nếu vẫn chưa chạy.

## Bước 5: Đóng gói, Ghi Log và Cập nhật Phiên bản (Build, Changelog & Versioning)
- Sau khi fix lỗi hoặc hoàn thành tính năng, BẮT BUỘC thực hiện trình tự 3 thao tác sau:
  1. **Cập nhật Version:** Tăng số phiên bản trong file cấu hình (`package.json`, v.v.). 
     - Lỗi nhỏ/fix UI: Tăng sub-patch (VD: `0.1.0.1` -> `0.1.0.2`).
     - Tính năng mới/thay đổi lớn: Tăng minor (VD: `0.1.1` -> `0.1.2`).
  2. **Cập nhật CHANGELOG.md:** Mở file `CHANGELOG.md` và thêm một block mới ở trên cùng cho phiên bản vừa tạo. Ghi chú ngắn gọn, gạch đầu dòng các lỗi đã fix hoặc tính năng đã thêm. Không giải thích dài dòng mã nguồn.
  3. **Build:** Chỉ tiến hành lệnh Build xuất bản ứng dụng cục bộ SAU KHI đã cập nhật version và ghi log thành công.