# SKILL: FULLSTACK APP & WEB ARCHITECT

## 1. Kỹ năng Thiết kế UI/UX (Frontend)
- Tự động áp dụng kiến trúc Component độc lập. 
- Mọi UI sinh ra bắt buộc gọi từ biến trong file `global.css` hoặc file cấu hình theme. Không mã hóa cứng (hardcode) CSS.

## 2. Kỹ năng Thiết kế Cơ sở dữ liệu (Database Design)
- Khi thiết kế bảng (tables/collections), phải định nghĩa đầy đủ Khóa chính (Primary Key) và Khóa ngoại (Foreign Key).
- Mọi trường dữ liệu (fields) phải đi kèm các ràng buộc rõ ràng (Constraints): `NOT NULL`, `UNIQUE`, thiết lập giá trị mặc định (Default values), và định dạng kiểu dữ liệu chính xác.
- Luôn kiểm tra tính toàn vẹn của dữ liệu trước khi viết các hàm CRUD (Create, Read, Update, Delete).

## 3. Quản lý Dữ liệu Vận hành
- Các file kết xuất (Báo cáo PDF, Excel, CSV) và file sao lưu cơ sở dữ liệu (Backup) phải được điều hướng lưu vào các thư mục dành riêng biệt ngay trong Project (ví dụ: `/project_root/reports/` và `/project_root/backups/`).