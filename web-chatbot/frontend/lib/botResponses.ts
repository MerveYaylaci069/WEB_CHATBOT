export type QuickAction = {
  id: string;
  label: string;
  prompt: string;
};

export const quickActions: QuickAction[] = [
  { id: "su", label: "Su faturası", prompt: "Su faturamı nasıl ödeyebilirim?" },
  { id: "konyakart", label: "Konyakart bakiye", prompt: "Konyakart bakiyemi nasıl sorgularım?" },
  { id: "nikah", label: "Nikah randevusu", prompt: "Nikah randevusu nasıl alınır?" },
  { id: "zabita", label: "Zabıta şikayeti", prompt: "Zabıtaya nasıl şikayette bulunurum?" },
  { id: "imar", label: "İmar durumu", prompt: "Bir parselin imar durumunu nereden öğrenebilirim?" },
  { id: "etkinlik", label: "Kültür-sanat etkinlikleri", prompt: "Bu hafta hangi kültür etkinlikleri var?" },
];

type RuleEntry = {
  keywords: string[];
  reply: string;
};

const rules: RuleEntry[] = [
  {
    keywords: ["su fatura", "su borc", "su borç", "abone"],
    reply:
      "Su faturanızı KOSKİ'nin e-Belediye portalından, Konyakart uygulamasından ya da anlaşmalı bankalardan ödeyebilirsiniz. Abone numaranızı yazarsanız güncel bakiyenizi birlikte kontrol edelim.",
  },
  {
    keywords: ["konyakart", "kart bakiye", "toplu ulasim", "toplu ulaşım", "otobüs", "otobus"],
    reply:
      "Konyakart bakiyenizi kart üzerindeki numarayla e-Belediye'den veya duraklardaki dolum noktalarından sorgulayabilirsiniz. Hat ve sefer saatleri için 'KonyaUlaşım' uygulamasını da önerebilirim.",
  },
  {
    keywords: ["nikah", "nikâh", "evlilik"],
    reply:
      "Nikah randevusu için e-Nikah sisteminden veya Nikah Sarayı'nı arayarak başvurabilirsiniz. Başvuru için nüfus cüzdanı, fotoğraf ve sağlık raporu gerekiyor. İlçenizi belirtirseniz size en yakın nikah salonunu söyleyeyim.",
  },
  {
    keywords: ["zabita", "zabıta", "sikayet", "şikayet"],
    reply:
      "Zabıta şikayetlerinizi 153 Çözüm Merkezi hattından veya mobil uygulama üzerinden 7/24 iletebilirsiniz. Şikayet konusunu ve adresini yazarsanız kayıt için gereken bilgileri birlikte hazırlayalım.",
  },
  {
    keywords: ["imar", "parsel", "ada", "yapi ruhsati", "yapı ruhsatı"],
    reply:
      "İmar durumu sorgulaması için İmar ve Şehircilik Dairesi'nin e-İmar portalına ada/parsel numarasıyla giriş yapabilirsiniz. Randevulu başvuru için Kule 1 hizmet binası da tercih edilebilir.",
  },
  {
    keywords: ["etkinlik", "kultur", "kültür", "sanat", "mevlana", "konser", "tiyatro"],
    reply:
      "Bu hafta Mevlana Kültür Merkezi ve Kültürpark'ta çeşitli konser, sergi ve tiyatro etkinlikleri yer alıyor. Güncel program için Kültür ve Sosyal İşler Dairesi'nin etkinlik takvimine bakabiliriz; hangi tür etkinlikle ilgilendiğinizi söylerseniz daraltalım.",
  },
  {
    keywords: ["tesekkur", "teşekkür", "sagol", "sağol"],
    reply: "Rica ederim. Başka bir konuda yardımcı olmamı ister misiniz?",
  },
  {
    keywords: ["merhaba", "selam", "iyi gunler", "iyi günler"],
    reply:
      "Merhaba, ben Huna AI. Su faturası, Konyakart, nikah işlemleri, zabıta, imar ve kültür-sanat etkinlikleri gibi konularda size yardımcı olabilirim. Nasıl yardımcı olabilirim?",
  },
];

const fallback =
  "Bu konuda net bir bilgi bulamadım. Talebinizi 153 Çözüm Merkezi'ne yönlendirebilir ya da sorunuzu biraz daha ayrıntılandırırsanız tekrar deneyebilirim.";

function normalize(text: string) {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9şçğüöi\s]/gi, "");
}

export function getBotReply(userText: string): string {
  const normalized = normalize(userText);
  for (const rule of rules) {
    if (rule.keywords.some((kw) => normalized.includes(normalize(kw)))) {
      return rule.reply;
    }
  }
  return fallback;
}
