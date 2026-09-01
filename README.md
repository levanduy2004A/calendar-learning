# Hôm nay

Ứng dụng web học nhiều môn (tiếng Việt, mobile-first): bạn tự dựng **cây kỹ năng**, **gán lịch môn** theo ngày, tài liệu chỉ nằm trong **thư viện** (không bẻ PDF thành cây).

## Chạy local

```bash
npm install
npm run dev
```

Mở [http://127.0.0.1:43127](http://127.0.0.1:43127).

Lần đầu có dữ liệu mẫu Guitar + Lập trình (đã gán lịch mẫu). Trong tab Hôm nay: **Nạp dữ liệu mẫu** hoặc **Bắt đầu trống**.

```bash
npm test    # kiểm tra lịch lặp + chỉ môn đã gán
npm run build
```

Dữ liệu lưu trên máy (localStorage + IndexedDB). Làm mới trang không mất cây, thư viện, hay lịch.

## Ba tab

- **Hôm nay** — chỉ hiện môn bạn đã gán vào ngày đó. Khung Sáng / Chiều / Tối bật tắt như cũ. Trống nếu chưa gán môn.
- **Lịch** — tuần (mặc định) hoặc tháng: chấm màu môn, chạm ngày xem kế hoạch. Không kéo thả sự kiện.
- **Cây kỹ năng** — tạo môn, ô, đầu mục. Sau khi tạo môn → **Lịch học** (Lặp hoặc Chọn ngày).

**Thư viện** (`/thu-vien`): PDF, ghi chú, YouTube, ảnh — không bẻ thành cây.

**Lịch môn** (`/cay/[id]/lich`): lặp (mỗi ngày / các thứ / tháng / năm + phạm vi) hoặc chọn ngày thủ công. Sửa / tắt / xóa lịch không xóa cây hay tài liệu.

Luyện tập toàn màn hình: **Xong** · **Chưa vững, hẹn ôn** · **Bỏ qua**.
