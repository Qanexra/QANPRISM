<div align="center">

# QanPrism

**Trình duyệt nhẹ, mã nguồn mở, tích hợp AI cục bộ — và nền tảng cho mạng livestream phi tập trung, nơi mỗi người dùng là một node.**

**Phát triển bởi Qanexra — đội ngũ phát triển từ Việt Nam**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Engine-Tauri%20%2B%20Rust-orange.svg)](https://tauri.app)

[![Windows](https://img.shields.io/badge/Windows-supported-blue.svg)](#)
[![macOS](https://img.shields.io/badge/macOS-supported-blue.svg)](#)
[![Linux](https://img.shields.io/badge/Linux-supported-blue.svg)](#)

<br>

[Tiếng Việt](./README_VI.md) · [English](./README.md)

</div>

---

## QanPrism là gì

QanPrism là một trình duyệt web nhẹ, mã nguồn mở, được xây dựng trên Tauri và Rust. Thay vì đóng gói web engine riêng như Chrome, nó sử dụng web engine có sẵn của hệ điều hành — giảm mức sử dụng RAM xuống khoảng 30-80 MB, ít hơn khoảng 90% so với Chrome.

Trình duyệt đi kèm một thanh AI tích hợp có thể kết nối với các mô hình AI chạy cục bộ trên máy của bạn (Ollama, LM Studio) hoặc API đám mây (DeepSeek, OpenAI). AI có thể đọc trang web bạn đang xem, trả lời câu hỏi, trích xuất dữ liệu từ bảng, hoặc hỗ trợ nghiên cứu.

Nhưng QanPrism không chỉ là một trình duyệt.

## Tầm Nhìn Lớn Hơn

Mục tiêu dài hạn là xây dựng một **mạng livestream phi tập trung** trên nền tảng trình duyệt này. Mỗi người chạy QanPrism cũng đồng thời đóng góp như một relay node trong mạng P2P. Không có công ty nào kiểm soát hạ tầng. Không ai có thể tắt một buổi livestream vì không có máy chủ trung tâm nào để đóng.

Ý tưởng này đến từ việc theo dõi những gì đã xảy ra trong các buổi livestream của bà Nguyễn Phương Hằng tại Việt Nam — các nền tảng như Facebook, TikTok, và YouTube liên tục ngắt và chặn luồng phát sóng của bà vì họ có quyền làm điều đó. Một mạng phi tập trung thực sự loại bỏ hoàn toàn điểm yếu duy nhất đó.

Khi bạn livestream trên mạng phi tập trung, không ai có thể tắt bạn. Không có nút "report" nào có thể làm sập luồng phát sóng của bạn. Nội dung của bạn được phân phối qua hàng ngàn node — và mỗi người dùng QanPrism là một node.

**Giai đoạn 1 là trình duyệt. Giai đoạn 2 là giao thức phát sóng.**

---

## Tính Năng

**Trình duyệt**
- Web engine gốc của hệ điều hành (WebView2 trên Windows, WebKit trên macOS/Linux)
- RAM cơ bản: 30-80 MB
- Giao diện tuỳ chỉnh không viền với tab tích hợp

**AI Cục Bộ**
- Hỗ trợ Ollama, LM Studio, và bất kỳ API tương thích OpenAI
- Tự động phát hiện các mô hình đã cài trên máy
- Đọc trang đang xem và đưa ngữ cảnh vào LLM
- Không tốn phí API khi chạy mô hình cục bộ

**Trích Xuất Dữ Liệu**
- Xuất bảng HTML sang CSV, JSON, hoặc Parquet
- Phân tích báo cáo SEC (10-K, 10-Q)
- So sánh dữ liệu xuyên tab

---

## Kiến Trúc

Mỗi QanPrism vừa là trình duyệt, vừa là một node trong mạng.

```text
+----------------------------------------------------------+
|                    QanPrism Instance                      |
|                                                          |
|  +-------------------+  +-----------------------------+  |
|  |   Trình Duyệt    |  |   AI Engine                 |  |
|  |                   |  |                             |  |
|  |   WebView2 (Win)  |  |   Ollama / LM Studio       |  |
|  |   WebKit (macOS)  |  |   DeepSeek / OpenAI        |  |
|  |   WebKit (Linux)  |  |   Ngữ cảnh trang web       |  |
|  +-------------------+  +-----------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |              Tauri Core (Rust)                      |  |
|  |              IPC / Quản lý cửa sổ / HTTP Bridge    |  |
|  +----------------------------------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |          P2P Node Engine  [Giai đoạn 2]             |  |
|  |                                                     |  |
|  |          WebRTC Relay / DHT Discovery               |  |
|  |          Phân phối chunk / Định tuyến stream        |  |
|  +----------------------------------------------------+  |
|                                                          |
+----------------------------------------------------------+
        |                                    |
        v                                    v
   [ Các QanPrism Node khác ]   [ Các QanPrism Node khác ]
        |                                    |
        +----------------+------------------+
                         |
              Mạng Phi Tập Trung
              (Không máy chủ trung tâm)
```

---

## Bắt Đầu

**Yêu cầu**
- [Node.js](https://nodejs.org/) v18 trở lên
- [Rust](https://www.rust-lang.org/tools/install) stable toolchain
- [Ollama](https://ollama.com/) hoặc [LM Studio](https://lmstudio.ai/) (tuỳ chọn, cho AI cục bộ)

**Phát triển**

```bash
git clone https://github.com/Qanexra/QANPRISM.git
cd QANPRISM
npm install
npm run tauri dev
```

---

## Giấy Phép

MIT License. Xem [LICENSE](LICENSE) để biết chi tiết.

---

## Hỗ Trợ

QanPrism là mã nguồn mở. Nếu dự án này hữu ích với bạn, hãy cân nhắc tài trợ qua [GitHub Sponsors](https://github.com/sponsors/Qanexra).

---

<div align="center">

**Phát triển bởi Qanexra từ Việt Nam**

raymond@qanexra.com

</div>
