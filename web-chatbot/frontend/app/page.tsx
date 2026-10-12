"use client";

import Script from "next/script";
import { useState, useEffect } from "react";
import {
  SeljukEagleIcon,
  SeljukPatternBackground,
  SeljukDivider,
} from "@/components/SeljukPattern";

export default function Home() {
  // 1. Ayarları Admin Panelinden Çekmek İçin Hafıza Oluşturuyoruz
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Sayfa açıldığında Python sunucusundan ayarları oku
    fetch("http://localhost:8000/admin/settings")
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(e => console.error("Ayarlar çekilemedi:", e));
  }, []);

  // 2. Dinamik Değişkenler (Eğer panelden henüz bir şey kaydedilmediyse orijinal tasarımdaki yazılar kullanılır)
  const title = config?.cmsTitle || "KURUMSAL RAG";
  
  // Sloganı estetik olarak iki renge ayırmak için virgül kontrolü
  const subtitle = config?.cmsSubtitle || "Kurumsal zekânız, bir sohbet uzağında.";
  const subtitleParts = subtitle.split(',');
  const subtitleFirstPart = subtitleParts[0] ? subtitleParts[0] + (subtitleParts.length > 1 ? ',' : '') : subtitle;
  const subtitleSecondPart = subtitleParts.length > 1 ? subtitleParts.slice(1).join(',') : '';

  const description = config?.cmsDescription || "Bu sayfa, sağ alt köşede yer alan Akıllı Sohbet Widget'ının kurumun web sitesine nasıl entegre olacağını göstermek amacıyla hazırlanmıştır. Sorduğunuz sorular doğrudan güvenli Python sunucunuza iletilir.";
  const badge = config?.cmsBadge || "KURUMSAL RAG DEMO ORTAMI";
  const showMotif = config?.cmsMotif !== false; 
  const hideAdminBtn = config?.cmsHideAdminBtn === true; 

  const FEATURES = [
    {
      icon: "🔒",
      title: config?.cmsCard1 || "Güvenli",
      desc: "Kendi belgeleriniz dışarıya sızmaz, sadece kurumsal dokümanlarda arama yapar.",
    },
    {
      icon: "🌐",
      title: config?.cmsCard2 || "Çoklu Site Desteği",
      desc: "KOSKİ, KOMEK veya Haberler gibi çoklu siteleri tek sunucudan izole yönetir.",
    },
    {
      icon: "⚡",
      title: config?.cmsCard3 || "Anında Yanıt",
      desc: "Belediye hizmetleri hakkında RAG altyapısıyla saniyeler içinde cevap verir.",
    },
  ];

  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-paper/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink">
              <SeljukEagleIcon size={20} />
            </div>
            <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
              Konya Büyükşehir Belediyesi
            </span>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-gold/30 bg-gold-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-gold-dim sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            {badge}
          </span>
        </div>
      </header>

      <section className="relative overflow-hidden">
        {/* Motif Aç/Kapat Özelliği Eklendi */}
        {showMotif && <SeljukPatternBackground className="pointer-events-none absolute inset-0 text-ink/[0.035]" />}
        
        <div
          className="pointer-events-none absolute -top-32 right-[-80px] h-[440px] w-[440px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(201,162,75,0.16), transparent 70%)" }}
        />

        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-28">
          <div className="animate-fadeUp">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-gold-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              CANLI DEMO
            </span>

            {/* Dinamik Başlık ve Slogan */}
            <p className="mt-6 font-sans text-5xl font-extrabold tracking-widest bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent uppercase">
              {title}
            </p>
            <h1 className="mt-3 max-w-xl font-display text-[32px] font-semibold leading-tight text-ink md:text-[40px]">
              {subtitleFirstPart}
              {subtitleSecondPart && <span className="text-[#876B13]">{subtitleSecondPart}</span>}
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">
              {description}
            </p>

            {/* Admin Butonunu Gizleme Şalteri Eklendi */}
            {!hideAdminBtn && (
              <div className="mt-10 flex flex-wrap items-center gap-5">
                <a
                  href="http://localhost:5173"
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-xl border border-ink/20 px-6 py-3 font-semibold text-ink transition-all duration-300 hover:border-ink hover:bg-ink/5"
                >
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  Admin Paneline Git
                </a>
              </div>
            )}
          </div>

          <SeljukDivider className="mt-20 text-ink/10" />

          {/* Dinamik Özellik Kartları */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-ink/10 bg-white/70 p-5 shadow-soft">
                <div className="text-2xl">{f.icon}</div>
                <div className="mt-2 font-display text-sm font-semibold text-ink">{f.title}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/10 px-6 py-6 text-center text-xs text-ink-soft">
        © {new Date().getFullYear()} Konya Büyükşehir Belediyesi — {badge}
      </footer>

      <Script src="/widget.js" strategy="lazyOnload" data-site-key="kurumsal-ana-sayfa" />
    </main>
  );
}