<div align="center">

# QanPrism

**Trinh duyet nhe, ma nguon mo, tich hop AI cuc bo — va nen tang cho mang livestream phi tap trung, noi moi nguoi dung la mot node.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Self-contained](https://img.shields.io/badge/Node.js-bundled%20%C2%B7%20none%20required-brightgreen.svg)](https://nodejs.org/)
[![Tauri](https://img.shields.io/badge/Engine-Tauri%20%2B%20Rust-orange.svg)](https://tauri.app)

[![Windows](https://img.shields.io/badge/Windows-supported-blue.svg)](#supported-platforms)
[![macOS](https://img.shields.io/badge/macOS-supported-blue.svg)](#supported-platforms)
[![Linux](https://img.shields.io/badge/Linux-supported-blue.svg)](#supported-platforms)

<br>

**Nen tang livestream phi tap trung dang duoc xay dung** — khong may chu trung tam, khong bi gian doan, duoc van hanh boi cong dong.

<sub>[English](./README.md) · [Tieng Viet](./README_VI.md)</sub>

</div>

## Noi Dung

- [QanPrism la gi](#qanprism-la-gi)
- [Tam Nhin Lon Hon](#tam-nhin-lon-hon)
- [Tinh Nang](#tinh-nang)
- [Bat Dau](#bat-dau)
- [Giay Phep](#giay-phep)
- [Ho Tro](#ho-tro)

---

## QanPrism la gi

QanPrism la mot trinh duyet web nhe duoc xay dung tren Tauri va Rust. No su dung web engine co san cua he dieu hanh thay vi dong goi rieng, giam muc su dung RAM xuong khoang 30-80 MB — it hon khoang 90% so voi Chrome.

Trinh duyet di kem mot thanh AI tich hop co the ket noi voi cac mo hinh AI chay tren may cua ban (Ollama, LM Studio) hoac API dam may (DeepSeek, OpenAI). AI co the doc trang web ban dang xem va tra loi cau hoi, trich xuat du lieu tu bang, hoac ho tro nghien cuu.

Nhung QanPrism khong chi la mot trinh duyet.

## Tam Nhin Lon Hon

Muc tieu dai han la xay dung mot **mang livestream phi tap trung** tren nen tang trinh duyet nay. Moi nguoi chay QanPrism cung dong thoi dong gop nhu mot relay node trong mang P2P. Khong co cong ty nao kiem soat ha tang. Khong ai co the tat mot buoi livestream vi khong co may chu trung tam nao de dong.

Y tuong nay den tu viec theo doi nhung gi da xay ra trong cac buoi livestream cua ba Nguyen Phuong Hang tai Viet Nam — cac nen tang nhu Facebook, TikTok, va YouTube lien tuc ngat va chan luong phat song cua ba vi ho co quyen lam dieu do. Mot mang phi tap trung thuc su loai bo hoan toan diem yeu duy nhat do.

Khi ban livestream tren mang phi tap trung, khong ai co the tat ban. Khong co nut "report" nao co the lam sap luong phat song cua ban. Noi dung cua ban duoc phan phoi qua hang ngan node — va moi nguoi dung QanPrism la mot node.

Giai doan 1 la trinh duyet. Giai doan 2 la giao thuc phat song.

---

## Tinh Nang

### Trinh duyet
- Web engine go cua he dieu hanh (WebView2 tren Windows, WebKit tren macOS/Linux)
- RAM co ban: 30-80 MB
- Giao dien tuy chinh khong vien voi tab tich hop

### AI Cuc Bo
- Ho tro Ollama, LM Studio, va bat ky API tuong thich OpenAI
- Tu dong phat hien cac mo hinh da cai tren may
- Doc trang dang xem va dua ngu canh vao LLM
- Khong ton phi API khi chay mo hinh cuc bo

### Trich Xuat Du Lieu
- Xuat bang HTML sang CSV, JSON, hoac Parquet
- Phan tich bao cao SEC (10-K, 10-Q)
- So sanh du lieu xuyen tab

---

## Kien Truc

```text
       [ Mang P2P Phi Tap Trung ]
       (Video Streams / WebRTC / DHT / Peers)
                 |         |
                 +----+----+
                      |
QanPrism Node (Trinh Duyet Cuc Bo)
        |
   Tauri Core (Rust)
        |
   +----+----+
   |         |
 WebView   AI Router (Giao thuc OpenAI)
             |
        +----+----+
        |         |
   Local LLMs   Cloud APIs
  (Ollama/LM)   (DeepSeek/OpenAI)
```

---

## Bat Dau

### 1. Yeu cau
- [Node.js](https://nodejs.org/) v18 tro len
- [Rust](https://www.rust-lang.org/tools/install) stable toolchain
- [Ollama](https://ollama.com/) hoac [LM Studio](https://lmstudio.ai/) (tuy chon, cho AI cuc bo)

### 2. Phat trien

```bash
git clone https://github.com/Qanexra/QANPRISM.git
cd QANPRISM
npm install
npm run tauri dev
```

---

## Giay Phep

MIT License. Xem [LICENSE](LICENSE) de biet chi tiet.

---

## Ho Tro

QanPrism la ma nguon mo. Neu du an nay huu ich voi ban, hay can nhac tai tro qua [GitHub Sponsors](https://github.com/sponsors/Qanexra).

---

<div align="center">
  
**Phat trien boi Qanexra**
  
Lien he: raymond@qanexra.com
  
</div>
