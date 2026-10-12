# Huna AI — Konya Büyükşehir Belediyesi Chatbot Widget'ı

Next.js (App Router) + TypeScript + Tailwind CSS ile hazırlanmış, ekranın
sağ alt köşesinde açılıp kapanan, siyah/altın/gümüş temalı kurumsal chatbot
widget'ı.

## Tasarım kimliği

- **Renkler:** Onyx siyahı zemin, mat altın (`gold`) birincil vurgu, gümüş
  (`silver`) ikincil metin/çizgi rengi — teknolojik ve premium bir görünüm.
- **Tipografi:** Başlıklarda `Space Grotesk` (geometrik, teknolojik
  karakter), gövde metninde `Inter`, saat/etiket gibi teknik detaylarda
  `IBM Plex Mono`.
- **İmza öğe:** Selçuklu taş ve çini işçiliğindeki sekiz kollu yıldız
  (girih) motifinin altın çizgili yorumu — widget avatarında, açılış
  düğmesinde ve sohbet panelinin arka planında çok düşük opaklıkla
  kullanılıyor. Kurumsal kimlikle teknolojik görünümü birleştiren imza
  detayı budur.

## Widget davranışı

- Ekranın sağ alt köşesinde sabit bir açılış düğmesi (FAB) bulunur.
- İlk ziyarette düğmenin yanında "Huna AI ile sohbet edin" etiketi ve hafif
  bir nabız (breathe) animasyonu görünür; widget bir kez açıldığında bu
  teaser kaybolur.
- Düğmeye tıklandığında panel, düğmenin üzerinde açılır/kapanır şekilde
  belirir (`animate-panelIn`).
- **Sık Sorulan Sorular** bölümü panel içinde, mesaj alanı ile giriş kutusu
  arasında katlanır bir çekmece olarak yer alır; varsayılan olarak açık
  gelir, başlığa tıklanarak gizlenip tekrar gösterilebilir.

## Kurulum

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın; sağ alt köşedeki altın
yıldız simgesine tıklayarak widget'ı açın.

## Yapı

```
app/
  layout.tsx        Font yükleme, genel <html> iskeleti, Huna AI metadata
  page.tsx           Demo arka plan (kurumun kendi sitesi) + <ChatWidget />
  globals.css        Temel stiller, altın tonlu seçim/scrollbar
  api/chat/route.ts  Sohbet uç noktası (demo mantığı)
components/
  ChatWidget.tsx      Açılış düğmesi + panel + SSS çekmecesi (ana bileşen)
  ChatMessage.tsx     Tekil mesaj balonu (altın kullanıcı / onyx bot)
  SeljukPattern.tsx   İmza geometrik motif (ikon / arka plan deseni)
lib/
  botResponses.ts     Anahtar kelime tabanlı demo yanıt mantığı + SSS listesi
```

## Gerçek bir yapay zekâ servisine bağlama

`app/api/chat/route.ts` içindeki `getBotReply` çağrısını, kurumun bilgi
tabanına erişimi olan bir LLM servisiyle (ör. Anthropic Claude API) veya
mevcut bir CRM/İK sistemiyle değiştirerek üretime hazır hale getirebilirsiniz.

## Notlar

- Şu anki sohbet mantığı **demo amaçlıdır**; gerçek belediye verileriyle
  entegre değildir.
- Erişilebilirlik: klavye ile odaklanılabilir kontroller, görünür fokus
  halkası ve `prefers-reduced-motion` desteği mevcuttur.
- Widget'ı gerçek bir siteye eklemek için `app/page.tsx` içindeki demo
  arka planı kaldırıp `<ChatWidget />` bileşenini mevcut sitenizin kök
  layout'una eklemeniz yeterlidir.
