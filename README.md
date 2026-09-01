# Hôm nay

Ứng dụng web học nhiều môn (tiếng Việt, mobile-first): bạn tự dựng **cây kỹ năng**, app xếp lịch Sáng / Chiều / Tối, tài liệu chỉ nằm trong **thư viện** (không bẻ PDF thành cây).

## Chạy local

```bash
npm install
npm run dev
```

Mở [http://127.0.0.1:43127](http://127.0.0.1:43127).

Lần đầu có dữ liệu mẫu Guitar + Lập trình. Trong tab Hôm nay: **Nạp dữ liệu mẫu** hoặc **Bắt đầu trống**.

```bash
npm test    # kiểm tra luật xếp lịch
npm run build
```

Dữ liệu lưu trên máy (localStorage + IndexedDB). Làm mới trang không mất cây, thư viện, hay kế hoạch.

## Ba tab

- **Hôm nay** — khung Sáng / Chiều / Tối (tắt khung = Không học). Bắt đầu luyện.
- **Lịch** — đọc kế hoạch tự xếp (tuần mặc định, tháng tuỳ chọn). Lọc theo môn. Không kéo thả sự kiện.
- **Cây kỹ năng** — tạo môn, ô, đầu mục. Ô sau khóa đến khi ô trước xong hết.

**Thư viện** (`/thu-vien`): lưu PDF, ghi chú, YouTube, ảnh — mở khi học, không bẻ thành cây.

Luyện tập toàn màn hình: **Xong** · **Chưa vững, hẹn ôn** · **Bỏ qua** (bỏ qua không tính đạt).
