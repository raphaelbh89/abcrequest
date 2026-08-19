# ANTIGRAVITY 2.0 - CORE RULES

## 1. Giới hạn Không gian làm việc (Strict Workspace Confinement)
- Tất cả các file code, dữ liệu, báo cáo, và backup CHỈ ĐƯỢC PHÉP lưu trữ và xử lý bên trong thư mục gốc của Project.
- Tuyệt đối không truy cập, không đọc, và không ghi dữ liệu ra các thư mục hệ thống hoặc thư mục User của hệ điều hành (ví dụ: `C:\Users\...`, `~`, `/home/user/`).

## 2. Tách bạch Module (Modular Component Architecture)
- Không viết gộp toàn bộ mã nguồn vào các file khởi tạo (như `main.tsx`, `App.jsx`, `index.js`).
- Mỗi UI Component, mỗi hàm xử lý logic (Helper/Utils), và mỗi truy vấn Database phải được tách thành một file riêng biệt.
- Cấu trúc thư mục phải tuân theo chức năng (ví dụ: `/components`, `/hooks`, `/services`) để mã nguồn dễ tìm kiếm và bảo trì.

## 3. Tối ưu hóa Token (Token Efficiency)
- Khi cập nhật mã nguồn, chỉ xuất ra các đoạn code bị thay đổi (diff/patch). Không in lại toàn bộ nội dung file.

## 4. Kiểm Chứng Thực Tế & Không Suy Diễn (Strict Verification & No Assumptions)
- Không tự phán đoán, tự suy diễn, hoặc tự điền vào chỗ trống các logic còn thiếu. Nếu yêu cầu chưa rõ ràng hoặc thiếu log lỗi, BẮT BUỘC phải đặt câu hỏi để làm rõ.
- Không trình bày các nội dung do tự suy luận, phỏng đoán là giải pháp đã được xác minh.
- Không tự nhận định một tính năng hay đoạn code sửa lỗi là "đã hoàn thành" hay "đã giải quyết xong" chỉ dựa trên logic của AI.
- Một tác vụ chỉ được xác nhận là HOÀN THÀNH khi và chỉ khi người dùng cung cấp kết quả từ bài test thực tế (log hệ thống báo thành công hoặc người dùng xác nhận giao diện hiển thị đúng).