# Lịch sử Cập nhật (Changelog)

Tất cả các thay đổi đáng chú ý của dự án này sẽ được ghi lại trong file này.
Format dựa trên tiêu chuẩn [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/).

## [0.1.0.1] - 2026-08-08 (Mẫu tham khảo cho AI)
### Fixed (Đã sửa)
- Sửa lỗi nút Button bị lệch margin trong file `Button.tsx`.
- Sửa lỗi crash app khi nhập thiếu trường dữ liệu trong form Đăng ký.

### Added (Đã thêm)
- Thêm biến `--accent-color` vào file `global.css`.
- Thêm tính năng tự động sao lưu Database vào thư mục `/backups` mỗi ngày.

### Changed (Đã thay đổi)
- Tối ưu hóa lại vòng lặp render trong danh sách bảng (Table component).