<div align="center">

# QanPrism

**Phát triển bởi Qanexra — đội ngũ phát triển từ Việt Nam**

Hỗ trợ Tiếng Việt và English / Supports Vietnamese and English

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Engine-Tauri%20%2B%20Rust-orange.svg)](https://tauri.app)

[![Windows](https://img.shields.io/badge/Windows-supported-blue.svg)](#)
[![macOS](https://img.shields.io/badge/macOS-supported-blue.svg)](#)
[![Linux](https://img.shields.io/badge/Linux-supported-blue.svg)](#)

</div>

---

# Tiếng Việt

## QanPrism là gì

QanPrism là một trình duyệt web nhẹ, mã nguồn mở, được xây dựng trên Tauri và Rust. Thay vì đóng gói web engine riêng như Chrome, nó sử dụng web engine có sẵn của hệ điều hành — giảm mức sử dụng RAM xuống khoảng 30-80 MB, ít hơn khoảng 90% so với Chrome.

Trình duyệt đi kèm một thanh AI tích hợp có thể kết nối với các mô hình AI chạy cục bộ trên máy của bạn (Ollama, LM Studio) hoặc API đám mây (DeepSeek, OpenAI). AI có thể đọc trang web bạn đang xem, trả lời câu hỏi, trích xuất dữ liệu từ bảng, hoặc hỗ trợ nghiên cứu.

Nhưng QanPrism không chỉ là một trình duyệt.

## Tầm Nhìn Lớn Hơn

Mục tiêu dài hạn là xây dựng một **mạng livestream phi tập trung** trên nền tảng trình duyệt này. Mỗi người chạy QanPrism cũng đồng thời đóng góp như một relay node trong mạng P2P. Không có công ty nào kiểm soát hạ tầng. Không ai có thể tắt một buổi livestream vì không có máy chủ trung tâm nào để đóng.

Ý tưởng này đến từ việc theo dõi những gì đã xảy ra trong các buổi livestream của bà Nguyễn Phương Hằng tại Việt Nam — các nền tảng như Facebook, TikTok, và YouTube liên tục ngắt và chặn luồng phát sóng của bà vì họ có quyền làm điều đó. Một mạng phi tập trung thực sự loại bỏ hoàn toàn điểm yếu duy nhất đó.

Khi bạn livestream trên mạng phi tập trung, không ai có thể tắt bạn. Không có nút "report" nào có thể làm sập luồng phát sóng của bạn. Nội dung của bạn được phân phối qua hàng ngàn node — và mỗi người dùng QanPrism là một node.

**Giai đoạn 1 là trình duyệt. Giai đoạn 2 là giao thức phát sóng (livestream platform).**

## Của Cộng Đồng, Do Cộng Đồng, Vì Cộng Đồng

QanPrism là mã nguồn mở 100%. Không có công ty nào đứng sau kiểm soát mạng lưới. Không có máy chủ trung tâm nào có quyền quyết định ai được phát sóng và ai không. Cộng đồng sở hữu hạ tầng, cộng đồng vận hành các node, và cộng đồng quyết định hướng phát triển.

Mỗi người chạy QanPrism đều đóng góp vào sức mạnh của mạng lưới. Bạn không phải là người dùng — bạn là một phần của hạ tầng. Đó là bản chất của phi tập trung.

Tất cả mã nguồn đều công khai, có thể kiểm tra, và mọi người đều có quyền đóng góp thông qua pull request và thảo luận trên GitHub.

> **Tuyên bố quan trọng:** Dự án này là một sản phẩm công nghệ mã nguồn mở, được xây dựng nhằm mục đích phát triển hạ tầng internet phi tập trung. **Đây không phải là công cụ phục vụ mục đích phản động hay chống phá chính quyền.** Chúng tôi không ủng hộ, khuyến khích, hoặc hỗ trợ bất kỳ hoạt động nào vi phạm pháp luật. QanPrism được tạo ra để giải quyết một vấn đề kỹ thuật thực tế: khi các nền tảng tập trung có quyền ngắt bất kỳ luồng phát sóng nào vào bất kỳ lúc nào, người dùng cần có một giải pháp thay thế mà không ai có thể kiểm soát đơn phương. Đây là về quyền sở hữu hạ tầng của cộng đồng, không phải chính trị.

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

## Giấy Phép

MIT License. Xem [LICENSE](LICENSE) để biết chi tiết.

## Hỗ Trợ

QanPrism là mã nguồn mở. Nếu dự án này hữu ích với bạn, hãy cân nhắc tài trợ qua [GitHub Sponsors](https://github.com/sponsors/Qanexra).

Liên hệ: raymond@qanexra.com

---

# English

## What is QanPrism

QanPrism is a lightweight, open-source web browser built on Tauri and Rust. It uses your operating system's native web engine instead of bundling its own, which drops the memory footprint to around 30-80 MB — roughly 90% less than Chrome.

It ships with a built-in AI sidebar that connects to local models running on your machine (Ollama, LM Studio) or cloud APIs (DeepSeek, OpenAI). The agent can read the page you are currently looking at and answer questions about it, extract data from tables, or help with research.

But QanPrism is not just a browser.

## The Bigger Picture

The long-term vision is to build a **decentralized livestreaming network** on top of the browser. Every person running QanPrism also contributes as a relay node in a peer-to-peer streaming mesh. No single company controls the infrastructure. No one can pull the plug on a livestream because there is no central server to shut down.

This idea came from watching what happened during Mrs. Hang's livestream sessions in Vietnam — platforms like Facebook, TikTok, and YouTube repeatedly interrupted and blocked her streams because they had the power to do so. A truly decentralized network removes that single point of failure entirely.

**Phase 1 is the browser. Phase 2 is the streaming protocol.**

## By the Community, For the Community

QanPrism is 100% open-source. There is no company behind the network pulling strings. There is no central server that decides who gets to stream and who does not. The community owns the infrastructure, the community operates the nodes, and the community decides the direction of development.

Every person running QanPrism contributes to the strength of the network. You are not a user — you are part of the infrastructure. That is the nature of decentralization.

All source code is public, auditable, and everyone is welcome to contribute through pull requests and GitHub discussions.

> **Important disclaimer:** This project is an open-source technology product, built for the purpose of developing decentralized internet infrastructure. **It is not a tool for political subversion or opposition to any government.** We do not support, encourage, or facilitate any illegal activity. QanPrism was created to solve a real technical problem: when centralized platforms have the power to shut down any stream at any time, users need an alternative that no single entity can control. This is about community ownership of infrastructure, not politics.

## Features

**Browser**
- Native web engine (WebView2 on Windows, WebKit on macOS/Linux)
- Baseline memory: 30-80 MB
- Custom frameless UI with integrated tabs

**Local AI Agent**
- Supports Ollama, LM Studio, and any OpenAI-compatible API
- Auto-discovers models installed on your machine
- Reads the active page and injects context into the LLM
- Zero API cost when running local models

**Data Extraction**
- Export HTML tables to CSV, JSON, or Parquet
- SEC filing parser (10-K, 10-Q)
- Cross-tab data comparison

## Architecture

Each QanPrism instance is both a browser and a network node.

```text
+----------------------------------------------------------+
|                    QanPrism Instance                      |
|                                                          |
|  +-------------------+  +-----------------------------+  |
|  |   Browser Engine  |  |   AI Engine                 |  |
|  |                   |  |                             |  |
|  |   WebView2 (Win)  |  |   Ollama / LM Studio       |  |
|  |   WebKit (macOS)  |  |   DeepSeek / OpenAI        |  |
|  |   WebKit (Linux)  |  |   Page Context Injection   |  |
|  +-------------------+  +-----------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |              Tauri Core (Rust)                      |  |
|  |              IPC / Window Mgmt / HTTP Bridge        |  |
|  +----------------------------------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |          P2P Node Engine  [Phase 2]                 |  |
|  |                                                     |  |
|  |          WebRTC Relay / DHT Discovery               |  |
|  |          Chunk Distribution / Stream Routing        |  |
|  +----------------------------------------------------+  |
|                                                          |
+----------------------------------------------------------+
        |                                    |
        v                                    v
   [ Other QanPrism Nodes ]     [ Other QanPrism Nodes ]
        |                                    |
        +----------------+------------------+
                         |
              Decentralized Mesh Network
              (No central server)
```

## Getting Started

**Prerequisites**
- [Node.js](https://nodejs.org/) v18 or later
- [Rust](https://www.rust-lang.org/tools/install) stable toolchain
- [Ollama](https://ollama.com/) or [LM Studio](https://lmstudio.ai/) (optional, for local AI)

**Development**

```bash
git clone https://github.com/Qanexra/QANPRISM.git
cd QANPRISM
npm install
npm run tauri dev
```

**Build for production**

```bash
npm run tauri build
```

## Documentation

| Document | Description |
|----------|-------------|
| [ROADMAP.md](./ROADMAP.md) | Development phases and long-term vision |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute |
| [SECURITY.md](./SECURITY.md) | Security policy |
| [CHANGELOG.md](./CHANGELOG.md) | Release history |

## License

MIT License. See [LICENSE](LICENSE) for details.

## Support

QanPrism is open-source. If this project is useful to you, consider sponsoring via [GitHub Sponsors](https://github.com/sponsors/Qanexra).

---

<div align="center">

**Developed by Qanexra from Vietnam**

raymond@qanexra.com

</div>
