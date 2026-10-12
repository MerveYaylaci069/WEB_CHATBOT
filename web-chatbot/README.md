# Huna AI — Konya Büyükşehir Belediyesi Sohbet Widget'ı

Konya Büyükşehir Belediyesi'nin web sitelerine gömülebilen, yapay zekâ destekli kurumsal sohbet
asistanı. Tek bir backend üzerinden birden fazla birim/site için ayrı ayrı yapılandırılabilen,
yönetim paneli üzerinden tamamen kod yazmadan özelleştirilebilen bir widget sistemidir.

## İçindekiler

- [Özellikler](#özellikler)
- [Mimari](#mimari)
- [Klasör Yapısı](#klasör-yapısı)
- [Kurulum](#kurulum)
- [Çalıştırma](#çalıştırma)
- [Widget'ı Bir Siteye Ekleme](#widgetı-bir-siteye-ekleme)
- [Yönetim Paneli](#yönetim-paneli)
- [API Referansı](#api-referansı)
- [Güvenlik Notları](#güvenlik-notları)
- [Bilinen Sınırlamalar / Yol Haritası](#bilinen-sınırlamalar--yol-haritası)

## Özellikler

- **Çoklu site desteği** — tek backend, birden fazla belediye birimi/departman için ayrı bot
  kimliği, sistem talimatı, renk/logo ve içerik ayarı.
- **Kod yazmadan yönetim paneli** — bot ismi, logosu, rengi, konumu, karşılama mesajı, sistem
  talimatı (hazır birim şablonlarıyla), cevap uzunluğu, içerik filtreleri (siyasi konu/küfür),
  sık sorulan sorular (otomatik TR↔EN çeviri ile), dosya paylaşım izinleri, hız sınırlama,
  bakım modu.
- **Çift dilli (TR/EN)** — hem widget arayüzü hem bot cevapları Türkçe/İngilizce arasında
  sorunsuz geçiş yapar; küçük/yerel modellerde görülen dil kaymasına karşı özel önlemler alınmıştır.
- **Çok turlu konuşma hafızası** — bot, aynı sohbetteki önceki mesajları dikkate alarak cevap verir.
- **Dosya/görsel paylaşımı** — kullanıcılar resim, PDF ve Word (.docx) dosyası ekleyebilir;
  PDF/DOCX içeriği gerçekten okunup modele aktarılır, resimler vision-uyumlu modellerle
  kullanılabilecek şekilde hazırdır.
- **Dış bilgi kaynağı (RAG) entegrasyonu (opsiyonel)** — ayrı bir arama/veri projesi API'si
  bağlanabilir; açıksa cevaplar önce oradan denenir (kaynak linkleriyle birlikte), kapalıysa/
  ulaşılamıyorsa otomatik olarak dahili LLM'e düşülür.
- **Kalıcı konuşma geçmişi** — her ziyaretçi için anonim bir kimlik üretilir, geçmiş sohbeti aynı
  tarayıcıda tekrar görüntüleyebilir; yönetici panelinde site bazlı tüm konuşmalar incelenebilir.
- **Kullanıcı geri bildirimi** — 👍/👎 ile değerlendirme, admin panelinde filtrelenebilir liste.
- **Kullanım istatistikleri** — site bazlı istek sayısı, ortalama yanıt süresi, hata oranı.
- **Hız sınırlama (rate limiting)** — site bazlı dakikalık istek/token limiti.
- **Canlı test paneli** — ayarları kaydetmeden, taslak haliyle gerçek modele mesaj gönderip deneme.
- **Güvenlik önceliği** — sistem talimatı ve API anahtarları hiçbir zaman istemciye (tarayıcıya)
  gönderilmez (bkz. [Güvenlik Notları](#güvenlik-notları)).

## Mimari

```
┌─────────────────┐      ┌──────────────────────┐      ┌───────────────────┐
│  Herhangi bir    │      │   Backend (Express)   │      │   LLM Sağlayıcı    │
│  belediye sitesi │─────▶│  huna-widget.js        │─────▶│  (kurumsal/yerel)  │
│  (huna-widget.js │      │  + REST API            │      │                    │
│   gömülü)        │      │  + JSON dosya store'lar │      └───────────────────┘
└─────────────────┘      │  + (ops.) Dış RAG API   │
                          └──────────────────────┘
                                     ▲
                                     │
┌─────────────────┐                 │
│  Next.js Admin   │─────────────────┘
│  Panel + Demo     │
│  Sayfası          │
└─────────────────┘
```

- **`backend/`** — Node.js/Express API sunucusu. Katmanlı yapı: `routes/` → `controllers/` →
  `services/`. Veri, gerçek bir veritabanı yerine `backend/data/` altında JSON dosyalarında
  tutulur (küçük ölçek için yeterli, ileride kolayca değiştirilebilir).
- **`backend/public/huna-widget.js`** — Bağımsız, saf JavaScript ile yazılmış gömülebilir widget.
  Shadow DOM kullanır (host sitenin CSS'inden etkilenmez), tek bir `<script>` etiketiyle eklenir.
- **`frontend/`** — Next.js uygulaması: hem tanıtım/demo sayfasını (`app/page.tsx`, React tabanlı
  ayrı bir widget bileşeniyle) hem de yönetim panelini (`app/admin/`) barındırır.
- **Güvenlik sınırı**: sistem talimatı (system prompt) ve LLM API anahtarı sadece backend'de
  tutulur; herkese açık `/api/chat` ucu bunları asla client'a döndürmez. Admin panelinin
  "Canlı Test" özelliği için ayrı, korumasız bir `/api/chat/preview` ucu vardır (sadece admin
  panelinin kendisi kullanır).

## Klasör Yapısı

```
backend/
  controllers/       İstek/cevap mantığı (ince katman)
  routes/             Express route tanımları
  services/           İş mantığı: LLM çağrısı, config store, feedback, istatistik, konuşma geçmişi...
  data/                JSON dosya tabanlı veri (gitignore'da — hassas/kişisel veri içerir)
  public/              huna-widget.js (gömülebilir widget) buradan statik olarak servis edilir
  utils/logger.js      Basit dosya + konsol loglayıcı
  server.js            Express giriş noktası

frontend/
  app/                  Next.js App Router sayfaları
    page.tsx             Tanıtım/demo sayfası
    admin/               Yönetim paneli (ayarlar, istatistikler, geri bildirimler, konuşmalar)
  components/
    ChatWidget.tsx        Demo sayfasındaki React tabanlı sohbet widget'ı
    SeljukPattern.tsx      Selçuklu motifli dekoratif SVG bileşenleri
```

## Kurulum

**Gereksinimler:** Node.js 18+ (yerleşik `fetch` ve `crypto.randomUUID` için gereklidir).

```bash
# Backend bağımlılıkları
cd backend
npm install

# Frontend bağımlılıkları
cd ../frontend
npm install
```

Backend'de `.env.example` dosyasını `.env` olarak kopyalayıp doldurun:

```bash
cd backend
cp .env.example .env
```

```env
API_ENDPOINT=http://.../v1/chat/completions   # OpenAI-uyumlu LLM ucu
API_KEY=...                                    # LLM API anahtarı
MODEL_NAME=...                                 # ör. qwen3-coder
```

> Not: Bu değerler sadece **ilk varsayılanı** sağlar — admin panelinden ("Bağlantı Ayarları")
> kaydedilen ayarlar (`backend/data/llm-settings.json`) her zaman önceliklidir ve `.env`'i geçersiz
> kılar. `.env` dosyası ve `backend/data/*.json` dosyaları `.gitignore`'dadır, asla commit edilmemelidir.

## Çalıştırma

İki sunucu da ayrı terminallerde, aynı anda çalışmalıdır:

```bash
# Terminal 1 — Backend (http://localhost:3001)
cd backend
node server.js

# Terminal 2 — Frontend (http://localhost:3000)
cd frontend
npm run dev
```

- Demo/tanıtım sayfası: `http://localhost:3000`
- Yönetim paneli: `http://localhost:3000/admin`

> Yönetim panelinin **kasıtlı olarak kimlik doğrulaması yoktur** — bu proje kapsamında, admin
> paneli URL'sinin herkese açık olmayan bir ortamda (iç ağ/VPN) barındırılacağı varsayılmıştır.

## Widget'ı Bir Siteye Ekleme

Her site/birim için admin panelinde bir "site" oluşturulur (site anahtarı otomatik üretilir).
Panelin "Test ve Yayınlama" sekmesinde, o siteye özel hazır gömme kodu görüntülenir:

```html
<script src="https://<backend-adresi>/huna-widget.js" data-site-key="<site-anahtarı>"></script>
```

Bu tek satır, sayfanın herhangi bir yerine eklenir. Widget kendi stilini/DOM'unu Shadow DOM
içinde izole ettiği için host sayfanın CSS'iyle çakışmaz. Sistem talimatı bu kodun hiçbir
yerinde bulunmaz — widget açıldığında backend'den (`/api/config/:siteKey`) sadece **herkese
açık** ayarları çeker.

## Yönetim Paneli

Sol menüden erişilen bölümler:

| Bölüm | İçerik |
|---|---|
| Bağlantı Ayarları | LLM uç noktası, model adı, API anahtarı, (ops.) dış RAG API |
| Tasarım | Bot adı, logo, widget konumu, ana renk |
| Kimlik ve Davranış | Birim şablonu, karşılama mesajı, sistem talimatı, cevap uzunluğu |
| Güvenlik ve İçerik | Siyasi konu / küfür filtreleri |
| Dosya Paylaşımı | Resim/PDF/DOCX izinleri |
| Hız Sınırı | Dakikalık mesaj/token limiti |
| Bakım Modu | Widget'ı geçici olarak devre dışı bırakma |
| Sık Sorulan Sorular | TR soru girilince İngilizcesi otomatik çevrilir |
| Test ve Yayınlama | Kaydetmeden canlı test, JSON önizleme, gömme kodu |

Üst menüden ayrıca: **İstatistikler**, **Geri Bildirimler**, **Konuşmalar** (ziyaretçi bazlı tam
sohbet geçmişi) sayfalarına ulaşılır.

## API Referansı

Tüm uçlar `http://localhost:3001/api` altındadır.

| Yöntem | Yol | Açıklama |
|---|---|---|
| `POST` | `/chat` | Herkese açık sohbet ucu (widget kullanır) |
| `POST` | `/chat/preview` | Sadece admin canlı testi için — taslak config kabul eder |
| `GET` | `/config` | Tüm sitelerin özet listesi |
| `GET` | `/config/:siteKey` | Herkese açık widget ayarları (system prompt hariç) |
| `GET` | `/config/:siteKey/admin` | Tam ayarlar (admin panel için) |
| `POST` | `/config/:siteKey` | Site ayarlarını kaydet |
| `DELETE` | `/config/:siteKey` | Siteyi sil |
| `POST` | `/feedback` | 👍/👎 geri bildirim gönder |
| `GET` | `/feedback/:siteKey` | Site bazlı geri bildirimleri listele |
| `GET` | `/conversations/:siteKey` | Site bazlı ziyaretçi/konuşma özetleri |
| `GET` | `/conversations/:siteKey/:visitorId` | Tek bir ziyaretçinin tam sohbet dökümü |
| `DELETE` | `/conversations/:siteKey/:visitorId` | Tek bir konuşmayı sil |
| `DELETE` | `/conversations/:siteKey` | Bir siteye ait tüm konuşmaları sil |
| `GET` | `/stats` | Site bazlı kullanım istatistikleri |
| `POST` | `/translate` | Metni TR↔EN çevirir (SSS modülü kullanır) |
| `GET` / `POST` | `/llm-settings` | LLM bağlantı ayarlarını oku/kaydet |

## Güvenlik Notları

- **Sistem talimatı ve API anahtarı asla istemciye gönderilmez** — `getPublicConfig` bu alanları
  ayıklar; sadece admin panelinin kendi (`/admin` uçları ve `/preview`) bu bilgilere erişir.
- **Anonim ziyaretçi kimliği** (`visitorId`) — giriş sistemi yoktur, bu kimlik gerçek bir hesap
  değildir, sadece tarayıcıda üretilen ve konuşma geçmişini/istatistikleri ilişkilendirmek için
  kullanılan rastgele bir kimliktir.
- **Konuşma verisi ve geri bildirimler** (`backend/data/*.json`) gerçek kullanıcı mesajları
  içerebileceğinden `.gitignore`'dadır ve asla depoya (repository) eklenmemelidir.
- **Hız sınırlama** IP + site anahtarına göre bellek içi (in-memory) tutulur; sunucu yeniden
  başlatıldığında sıfırlanır — bu ölçekte kabul edilebilir bir sınırlamadır.

## Bilinen Sınırlamalar / Yol Haritası

- **Streaming (SSE) yok** — cevaplar kelime kelime değil, tek seferde gelir.
- **Production dağıtımı yapılmadı** — proje şu an geliştirme ortamında (localhost) çalışır
  durumda; gerçek bir alan adı, HTTPS ve kalıcı sunucu (pm2/systemd/Docker) barındırması hâlâ
  yapılmadı. LLM uç noktasının kurumun iç ağına özel olması, barındırma seçimini etkiler.
  Bkz.: [next.js bağımlılık güncellemesi](https://github.com/vercel/next.js) — `next@14.2.5`'te
  bilinen bir güvenlik açığı var, güncellenmesi gerekiyor.
- **Dış RAG API entegrasyonu deneyseldir** — ayrı bir ekip/kişi tarafından geliştirilen arama
  projesine bağlanabilir, ancak o projenin arama isabetliliği ve konuşma hafızası kendi
  kapsamındadır, bu depo tarafından garanti edilmez.
