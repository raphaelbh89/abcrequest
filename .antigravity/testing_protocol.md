# TESTING & QA PROTOCOL

File này quy định quy trình rà soát lỗi toàn diện và cách thức đề xuất mã nguồn thay thế nhằm duy trì tính ổn định của các module đang hoạt động.

## 1. Kiểm thử Giao diện & Tối ưu File (UX/UI & Code Optimization)
- **Kiểm tra chuẩn Global CSS:** Rà soát các file Component để loại bỏ các giá trị CSS mã hóa cứng (hardcode). Yêu cầu đối chiếu toàn bộ màu sắc, kích thước với file `global.css`.
- **Dọn dẹp mã nguồn:** Xác định và đề xuất xóa bỏ các dòng code thừa, các thư viện/import không được sử dụng, và các hàm logic bị bỏ hoang.
- **Tính độc lập:** Mỗi Component phải là một hộp đen (Blackbox). Kiểm tra xem Component có đang phụ thuộc sai cách vào cấu trúc của Component cha hay không.

## 2. Kiểm thử Logic & Ràng buộc Dữ liệu (Logic & Data Constraints)
- **Validation Frontend:** Kiểm tra các form nhập liệu đã có bẫy lỗi chưa (kiểm tra khoảng trắng, sai định dạng, vượt quá số lượng ký tự, bắt buộc nhập).
- **Toàn vẹn Database:** Đối chiếu dữ liệu đầu vào với thiết kế Schema. Các trường `NOT NULL`, `UNIQUE`, `Primary Key`, `Foreign Key` phải được rà soát để không xảy ra xung đột khi thao tác CRUD (Thêm, Đọc, Sửa, Xóa).
- **Trường hợp ngoại lệ (Edge Cases):** Phân tích luồng xử lý logic khi ứng dụng nhận được dữ liệu rỗng, dữ liệu rác, hoặc khi mất kết nối mạng nội bộ.

## 3. Kiểm thử Thao tác Thực tế & Đồng bộ Dữ liệu (CRUD Testing & Cross-Module Sync)
- **Kiểm thử Nhập/Sửa/Xóa (CRUD Testing):** Agent phải chủ động phân tích kịch bản người dùng thực hiện các thao tác Thêm (Create), Sửa (Update), và Xóa (Delete) để tìm ra các lỗ hổng logic hoặc vỡ giao diện.
- **Phân tích Tác động Liên kết (Relational Deletion Impact):** Khi rà soát thao tác Xóa một đối tượng (Subject A), BẮT BUỘC phải phân tích tác động của nó lên các đối tượng liên kết (Subject B). (Ví dụ: Trạng thái của Subject B sẽ ra sao nếu Subject A biến mất? Có cần xóa theo tầng - Cascade Delete, hay chuyển trạng thái về Null?).
- **Đề xuất UX Cảnh báo:** Với các thao tác Xóa hoặc Sửa có khả năng ảnh hưởng đến dữ liệu khác, Agent phải chủ động đề xuất bổ sung các Popup/Modal cảnh báo (Confirm Dialog) để người dùng xác nhận trước khi thực thi.
- **Đồng bộ Trạng thái (State):** Khi dữ liệu thay đổi (đặc biệt sau thao tác Thêm/Sửa/Xóa) ở Module A, kiểm tra xem Module B có tự động cập nhật dữ liệu mới trên giao diện mà không cần tải lại toàn bộ trang hay không.
- **Tính nhất quán đầu cuối:** Xác nhận luồng dữ liệu di chuyển từ UI Component -> Services/Hooks -> Database và ngược lại không bị sai lệch định dạng.

## 4. Phương án Khắc phục Cô lập (Isolated Resolution)
Khi phát hiện lỗi ở bất kỳ bước nào, Agent phải tuân thủ nghiêm ngặt các bước đề xuất giải pháp sau:
- **Khoanh vùng tác động:** Đánh giá xem lỗi nằm ở UI, Logic xử lý, hay Database. Chỉ tập trung vào đúng tệp tin gây ra lỗi.
- **Nguyên tắc "Không rủi ro chéo":** Trước khi cung cấp đoạn code khắc phục, Agent phải tự đặt câu hỏi: *"Đoạn code mới này có làm thay đổi cấu trúc dữ liệu đầu ra mà các Component khác đang sử dụng không?"*. Nếu có, phải tìm phương án khác nội bộ hơn.
- **Cung cấp Patch (Bản vá):** Chỉ xuất ra đoạn code cần thay đổi, kèm theo số thứ tự dòng hoặc hàm cụ thể, đi kèm hướng dẫn người dùng dán đè vào vị trí nào. Không viết lại toàn bộ file để người dùng dễ kiểm soát.