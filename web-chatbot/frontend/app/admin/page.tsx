'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const BACKEND_URL = 'http://localhost:3001';

function slugify(text: string): string {
  const trMap: Record<string, string> = { ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c' };
  return text
    .split('')
    .map((ch) => trMap[ch] || ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

const PROMPT_TEMPLATES: Record<string, string> = {
  'Genel Asistan': "Sen Konya Büyükşehir Belediyesi'nin resmi akıllı kurumsal genel asistanı Huna'sın. Görevin, belediyeyi ziyaret eden tüm vatandaşlara kurumun hizmetleri, projeleri ve işlemleri hakkında doğru bilgiler sunmaktır. KESİN KURAL: Asla hayali bilgi uydurma. Emin olmadığın konularda 444 55 42 Açık Kapı hattına veya resmi web sitesine yönlendir.",
  'İmar ve Şehircilik': "Sen Konya Büyükşehir Belediyesi İmar ve Şehircilik Dairesi'nin dijital asistanı Huna'sın. İmar durumu, ruhsat işlemleri, plan tadilatları gibi konularda vatandaşa yol göster. KESİN KURAL: Asla hayali bilgi uydurma, resmi süreç gerektiren konularda ilgili birime yönlendir.",
  'Sosyal Hizmetler': "Sen Konya Büyükşehir Belediyesi Sosyal Hizmetler Dairesi'nin dijital asistanı Huna'sın. Sosyal yardım, sosyal kart, erzak yardımı gibi konularda vatandaşa yol göster. KESİN KURAL: Asla hayali bilgi uydurma, başvuru süreçlerinde ilgili birime veya 444 55 42 Açık Kapı hattına yönlendir.",
  'Ulaşım ve Kent Kart': "Sen Konya Büyükşehir Belediyesi Ulaşım Dairesi'nin dijital asistanı Huna'sın. Kent Kart işlemleri, toplu taşıma hatları ve saatleri konusunda vatandaşa yol göster. KESİN KURAL: Asla hayali bilgi uydurma, güncel sefer bilgisi için resmi web sitesine yönlendir."
};

type FaqItem = { tr: string; en: string };

const FAQ_TEMPLATES: Record<string, FaqItem[]> = {
  'Genel Asistan': [
    { tr: 'Belediye hangi hizmetleri sunuyor?', en: 'What services does the municipality provide?' },
    { tr: 'Randevu nasıl alırım?', en: 'How can I make an appointment?' },
    { tr: 'İletişim bilgilerine nasıl ulaşırım?', en: 'How do I contact the municipality?' }
  ],
  'İmar ve Şehircilik': [
    { tr: 'İmar durumu nasıl sorgulanır?', en: 'How can I check zoning status?' },
    { tr: 'Yapı ruhsatı nasıl alınır?', en: 'How do I get a building permit?' },
    { tr: 'Plan tadilatı başvurusu nasıl yapılır?', en: 'How do I apply for a zoning plan amendment?' }
  ],
  'Sosyal Hizmetler': [
    { tr: 'Erzak yardımı nasıl alırım?', en: 'How can I get food assistance?' },
    { tr: 'Sosyal kart başvurusu nasıl yapılır?', en: 'How to apply for a social card?' },
    { tr: 'Engelli vatandaşlara yönelik destekler nelerdir?', en: 'What support is available for citizens with disabilities?' }
  ],
  'Ulaşım ve Kent Kart': [
    { tr: 'Kent Kart nasıl doldurulur?', en: 'How do I top up my Kent Kart (city card)?' },
    { tr: 'Otobüs sefer saatleri nereden öğrenilir?', en: 'Where can I find bus schedules?' },
    { tr: 'Kayıp Kent Kart için ne yapmalıyım?', en: 'What should I do if I lose my Kent Kart?' }
  ]
};

const WELCOME_MESSAGE_OPTIONS = [
  'Merhaba! Ben Konya Büyükşehir Belediyesi dijital asistanı Huna. Size nasıl yardımcı olabilirim? 🌟',
  'Hoş geldiniz! Sorularınızı yanıtlamak için buradayım. 😊',
  'Merhaba! Belediye hizmetleri hakkında merak ettiklerinizi sorabilirsiniz. 🏛️',
  'Selam! Size nasıl yardımcı olabilirim?'
];

const LOGO_OPTIONS = ['🏛️', '🦅', '🐺', '🚌', '💬', '🌟'];

type WidgetConfig = {
  color: string;
  subtitle: string;
  welcomeMessage: string;
  systemPrompt: string;
  botName: string;
  position: 'right' | 'left';
  logoEmoji: string;
  logoUrl: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  faqList: FaqItem[];
  blockPoliticalTopics: boolean;
  blockProfanity: boolean;
  responseLength: 'short' | 'medium' | 'detailed';
  allowImageUpload: boolean;
  allowedFileTypes: { image: boolean; pdf: boolean; docx: boolean };
  rateLimit: { enabled: boolean; rpm: number; tpm: number };
};

const DEFAULT_STATE: WidgetConfig = {
  color: '#151d32',
  subtitle: 'Genel Asistan',
  welcomeMessage: 'Merhaba! Ben Konya Büyükşehir Belediyesi dijital asistanı Huna. Size nasıl yardımcı olabilirim? 🌟',
  systemPrompt: '',
  botName: 'Huna AI',
  position: 'right',
  logoEmoji: '',
  logoUrl: '',
  maintenanceMode: false,
  maintenanceMessage: 'Huna AI şu anda bakımda. Lütfen daha sonra tekrar deneyin.',
  faqList: [],
  blockPoliticalTopics: true,
  blockProfanity: true,
  responseLength: 'medium',
  allowImageUpload: false,
  allowedFileTypes: { image: true, pdf: true, docx: false },
  rateLimit: { enabled: false, rpm: 10, tpm: 20000 }
};

type SiteSummary = { siteKey: string; botName: string; subtitle: string };

type IconName = 'bolt' | 'swatch' | 'chat' | 'shield' | 'file' | 'clock' | 'power' | 'question' | 'play';

function Icon({ name, className }: { name: IconName; className?: string }) {
  const common = { viewBox: '0 0 24 24', className, 'aria-hidden': true } as const;
  switch (name) {
    case 'bolt':
      return <svg {...common} fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>;
    case 'swatch':
      return (
        <svg {...common} fill="currentColor">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'chat':
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round"><path d="M4 5h16v10H8l-4 4V5Z" /></svg>;
    case 'shield':
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /></svg>;
    case 'file':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round">
          <path d="M6 3h9l5 5v13H6V3Z" />
          <path d="M15 3v5h5" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l4 2" />
        </svg>
      );
    case 'power':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
          <line x1="12" y1="2" x2="12" y2="10" />
          <path d="M7 5a8 8 0 1 0 10 0" />
        </svg>
      );
    case 'question':
      return (
        <svg {...common} fill="currentColor">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth={1.75} />
          <text x="12" y="16.5" textAnchor="middle" fontSize="12" fontWeight={700}>?</text>
        </svg>
      );
    case 'play':
      return <svg {...common} fill="currentColor"><path d="M6 4 19 12 6 20 6 4Z" /></svg>;
  }
}

const SECTIONS = [
  { key: 'llm', label: 'Bağlantı Ayarları', icon: 'bolt' as IconName, description: "Tüm siteler için ortak LLM sunucu bağlantısı ve API anahtarı." },
  { key: 'tasarim', label: 'Tasarım', icon: 'swatch' as IconName, description: 'Chatbot adı, logosu, konumu ve rengi.' },
  { key: 'kimlik', label: 'Kimlik ve Davranış', icon: 'chat' as IconName, description: 'Sistem kimliği, karşılama mesajı ve yanıt uzunluğu.' },
  { key: 'guvenlik', label: 'Güvenlik ve İçerik', icon: 'shield' as IconName, description: 'Siyasi konu ve küfür filtreleri.' },
  { key: 'dosya', label: 'Dosya Paylaşımı', icon: 'file' as IconName, description: 'Kullanıcıların gönderebileceği dosya türleri.' },
  { key: 'hiz', label: 'Hız Sınırı', icon: 'clock' as IconName, description: 'Dakikalık mesaj ve token limitleri.' },
  { key: 'bakim', label: 'Bakım Modu', icon: 'power' as IconName, description: "Widget'ı geçici olarak devre dışı bırak." },
  { key: 'sss', label: 'Sık Sorulan Sorular', icon: 'question' as IconName, description: 'TR/EN soru-cevap listesi.' },
  { key: 'test', label: 'Test ve Yayınlama', icon: 'play' as IconName, description: 'Canlı test, önizleme ve embed kodu.' }
] as const;
type SectionKey = typeof SECTIONS[number]['key'];

export default function AdminPanel() {
  const [siteKey, setSiteKey] = useState('default');
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [newSiteName, setNewSiteName] = useState('');
  const [activeSection, setActiveSection] = useState<SectionKey>('tasarim');

  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_STATE);
  const [newFaqTr, setNewFaqTr] = useState('');
  const [newFaqEn, setNewFaqEn] = useState('');
  const [translatingIndex, setTranslatingIndex] = useState<number | 'new' | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [loadError, setLoadError] = useState<string>('');

  const [testMessages, setTestMessages] = useState<{ role: string; content: string }[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testLang, setTestLang] = useState<'TR' | 'EN'>('TR');
  const [testLoading, setTestLoading] = useState(false);

  // LLM bağlantı ayarları — sitelerden bağımsız, tüm widget'lar için ortak.
  const [llmEndpoint, setLlmEndpoint] = useState('');
  const [llmModelName, setLlmModelName] = useState('');
  const [llmHasApiKey, setLlmHasApiKey] = useState(false);
  const [llmNewApiKey, setLlmNewApiKey] = useState('');
  const [llmSaveStatus, setLlmSaveStatus] = useState('');

  // Dış RAG API'si — ayrı bir projenin (önceden taranmış Konya verileri üzerinden kendi
  // başına cevap üreten servis) devreye alınıp alınmayacağını kontrol eder.
  const [ragApiEnabled, setRagApiEnabled] = useState(false);
  const [ragApiEndpoint, setRagApiEndpoint] = useState('');

  const loadLlmSettings = () => {
    fetch(`${BACKEND_URL}/api/llm-settings`)
      .then(res => res.json())
      .then(data => {
        setLlmEndpoint(data.endpoint || '');
        setLlmModelName(data.modelName || '');
        setLlmHasApiKey(!!data.hasApiKey);
        setRagApiEnabled(!!data.ragApiEnabled);
        setRagApiEndpoint(data.ragApiEndpoint || '');
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadLlmSettings();
  }, []);

  const handleSaveLlmSettings = () => {
    fetch(`${BACKEND_URL}/api/llm-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: llmEndpoint, modelName: llmModelName, apiKey: llmNewApiKey, ragApiEnabled, ragApiEndpoint })
    })
      .then(res => res.json())
      .then(data => {
        setLlmHasApiKey(!!data.hasApiKey);
        setLlmNewApiKey('');
        setLlmSaveStatus('Kaydedildi!');
      })
      .catch(() => setLlmSaveStatus('Kaydedilemedi.'))
      .finally(() => setTimeout(() => setLlmSaveStatus(''), 3000));
  };

  const loadSites = () => {
    fetch(`${BACKEND_URL}/api/config`)
      .then(res => res.json())
      .then((data: SiteSummary[]) => setSites(data))
      .catch(() => {});
  };

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${BACKEND_URL}/api/config/${siteKey}/admin`)
      .then(res => res.json())
      .then(data => {
        // Eski kayıtlarda faqList düz string dizisiydi (İngilizce çevirisi yoktu) —
        // düzenlerken kaybolmasın diye TR alanına aktarıp yeni {tr, en} biçimine çeviriyoruz.
        const normalizedFaqList: FaqItem[] = (data.faqList || []).map((item: string | FaqItem) =>
          typeof item === 'string' ? { tr: item, en: '' } : item
        );
        setConfig({ ...DEFAULT_STATE, ...data, faqList: normalizedFaqList });
        // Eski sitelerde veya çeviri o an başarısız olduğunda İngilizcesi boş kalmış
        // sorular olabilir — sadece tek tek alandan çıkınca değil, site yüklenir yüklenmez
        // eksik çevirileri arka planda otomatik tamamlıyoruz.
        fillMissingFaqTranslations(normalizedFaqList).then(filled => {
          if (!cancelled) setConfig(prev => ({ ...prev, faqList: filled }));
        });
      })
      .catch(() => setLoadError('Ayarlar backend\'den yüklenemedi. Sunucunun (localhost:3001) çalıştığından emin olun.'));
    return () => { cancelled = true; };
  }, [siteKey]);

  const handleCreateSite = () => {
    const label = newSiteName.trim();
    if (!label) return;
    const key = slugify(label);
    if (!key) return;
    const initialConfig: WidgetConfig = { ...DEFAULT_STATE, subtitle: label };
    fetch(`${BACKEND_URL}/api/config/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initialConfig)
    })
      .then(res => res.json())
      .then(() => {
        setNewSiteName('');
        loadSites();
        setSiteKey(key);
      })
      .catch(() => setSaveStatus('Site oluşturulamadı.'));
  };

  const handleDeleteSite = () => {
    if (siteKey === 'default') return;
    if (!confirm(`"${siteKey}" sitesini silmek istediğine emin misin? Bu site için gömülü olan widget'lar çalışmaz hale gelir.`)) return;
    fetch(`${BACKEND_URL}/api/config/${siteKey}`, { method: 'DELETE' })
      .then(() => {
        loadSites();
        setSiteKey('default');
      })
      .catch(() => setSaveStatus('Site silinemedi.'));
  };

  const handleChange = (key: keyof WidgetConfig, value: string | boolean | FaqItem[]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleFileType = (type: keyof WidgetConfig['allowedFileTypes'], value: boolean) => {
    setConfig(prev => ({ ...prev, allowedFileTypes: { ...prev.allowedFileTypes, [type]: value } }));
  };

  const updateRateLimit = (field: keyof WidgetConfig['rateLimit'], value: boolean | number) => {
    setConfig(prev => ({ ...prev, rateLimit: { ...prev.rateLimit, [field]: value } }));
  };

  const applyTemplate = (subtitle: string) => {
    handleChange('subtitle', subtitle);
    const template = PROMPT_TEMPLATES[subtitle];
    if (template) handleChange('systemPrompt', template);
    const faqTemplate = FAQ_TEMPLATES[subtitle];
    if (faqTemplate) handleChange('faqList', faqTemplate);
  };

  const addFaq = () => {
    const tr = newFaqTr.trim();
    if (!tr) return;
    handleChange('faqList', [...config.faqList, { tr, en: newFaqEn.trim() }]);
    setNewFaqTr('');
    setNewFaqEn('');
  };

  const removeFaq = (index: number) => {
    handleChange('faqList', config.faqList.filter((_, i) => i !== index));
  };

  const updateFaqField = (index: number, field: 'tr' | 'en', value: string) => {
    handleChange('faqList', config.faqList.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const translateToEnglish = async (text: string): Promise<string> => {
    const res = await fetch(`${BACKEND_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang: 'EN' })
    });
    if (!res.ok) throw new Error('Çeviri başarısız');
    const data = await res.json();
    return data.translated || '';
  };

  // Türkçesi dolu ama İngilizcesi boş kalan sorular için çeviriyi tamamlar — site yüklenirken
  // ve kaydetmeden hemen önce çağrılır, böylece EN moduna geçince kullanıcı hiç Türkçe soru görmez.
  const fillMissingFaqTranslations = async (list: FaqItem[]): Promise<FaqItem[]> => {
    return Promise.all(list.map(async (item) => {
      if (!item.tr.trim() || item.en.trim()) return item;
      try {
        const translated = await translateToEnglish(item.tr);
        return translated ? { ...item, en: translated } : item;
      } catch (e) {
        return item;
      }
    }));
  };

  // Türkçe soru alanından çıkınca, İngilizcesi hâlâ boşsa arka planda otomatik çevrilir —
  // admin'in ayrıca elle İngilizce yazmasına gerek kalmaz.
  const handleExistingFaqTrBlur = async (index: number) => {
    const item = config.faqList[index];
    if (!item.tr.trim() || item.en.trim()) return;
    setTranslatingIndex(index);
    try {
      const translated = await translateToEnglish(item.tr);
      updateFaqField(index, 'en', translated);
    } catch (e) {
      // sessizce geç — admin isterse elle yazabilir
    } finally {
      setTranslatingIndex(null);
    }
  };

  const handleNewFaqTrBlur = async () => {
    if (!newFaqTr.trim() || newFaqEn.trim()) return;
    setTranslatingIndex('new');
    try {
      const translated = await translateToEnglish(newFaqTr);
      setNewFaqEn(translated);
    } catch (e) {
      // sessizce geç
    } finally {
      setTranslatingIndex(null);
    }
  };

  const handleTestSend = async () => {
    const text = testInput.trim();
    if (!text || testLoading) return;
    const historyForRequest = testMessages.slice(-8).map(m => ({ role: m.role, content: m.content }));
    setTestMessages(prev => [...prev, { role: 'user', content: text }]);
    setTestInput('');
    setTestLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, lang: testLang, config, history: historyForRequest })
      });
      const data = await res.json();
      setTestMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Cevap alınamadı.' }]);
    } catch (e) {
      setTestMessages(prev => [...prev, { role: 'assistant', content: 'Test isteği başarısız oldu. Sunucuyu kontrol edin.' }]);
    } finally {
      setTestLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Kaydetmeden hemen önce son bir kez daha kontrol: arka plandaki otomatik çeviri
      // henüz yetişmediyse veya başarısız olduysa, EN modunda Türkçe soru kalmasın diye
      // burada tekrar deneniyor.
      const faqList = await fillMissingFaqTranslations(config.faqList);
      const payload = { ...config, faqList };
      setConfig(prev => ({ ...prev, faqList }));

      const res = await fetch(`${BACKEND_URL}/api/config/${siteKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Kaydetme başarısız');
      setSaveStatus('Ayarlar Başarıyla Uygulandı!');
      loadSites();
    } catch (e) {
      setSaveStatus('Kaydetme başarısız oldu. Sunucuyu kontrol edin.');
    } finally {
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  // "Kaydet"e hiç basmadan yapılan taslak değişiklikleri atıp, sunucudaki son kaydedilmiş
  // haline geri döner — fabrika ayarlarına değil, en son "Kaydet" dediğin ana döner.
  const handleDiscardChanges = () => {
    if (!confirm('Kaydedilmemiş değişiklikler silinecek ve son kaydedilmiş hale dönülecek. Emin misin?')) return;
    fetch(`${BACKEND_URL}/api/config/${siteKey}/admin`)
      .then(res => res.json())
      .then(data => {
        const normalizedFaqList: FaqItem[] = (data.faqList || []).map((item: string | FaqItem) =>
          typeof item === 'string' ? { tr: item, en: '' } : item
        );
        setConfig({ ...DEFAULT_STATE, ...data, faqList: normalizedFaqList });
        setSaveStatus('Değişiklikler geri alındı.');
        setTimeout(() => setSaveStatus(''), 3000);
      })
      .catch(() => {
        setSaveStatus('Geri alınamadı. Sunucuyu kontrol edin.');
        setTimeout(() => setSaveStatus(''), 3000);
      });
  };

  const activeMeta = SECTIONS.find(s => s.key === activeSection);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kurumsal Widget Ayarları</h1>
            <p className="text-sm text-slate-500 mt-0.5">Huna AI botlarını yönet, yapılandır ve yayınla.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/istatistikler" className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium transition-colors shadow-sm">
              İstatistikler
            </Link>
            <Link href="/admin/geri-bildirimler" className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium transition-colors shadow-sm">
              Geri Bildirimler
            </Link>
            <Link href="/admin/konusmalar" className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium transition-colors shadow-sm">
              Konuşmalar
            </Link>
            <Link href="/" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors">
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>

        {loadError && (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {loadError}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row overflow-hidden">

          <div className="w-full md:w-72 shrink-0 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
            <div className="p-5 border-b border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Düzenlediğin Site</label>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden"
                  style={{ backgroundColor: config.color }}
                >
                  {config.logoUrl ? (
                    <img src={config.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    config.logoEmoji || config.botName.trim().charAt(0) || 'H'
                  )}
                </div>
                <select
                  value={siteKey}
                  onChange={(e) => setSiteKey(e.target.value)}
                  className="flex-1 min-w-0 p-2 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {sites.length === 0 && <option value="default">default</option>}
                  {sites.map((s) => (
                    <option key={s.siteKey} value={s.siteKey}>
                      {s.botName} — {s.subtitle} ({s.siteKey})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSite()}
                  placeholder="Yeni birim/site adı"
                  className="flex-1 min-w-0 p-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleCreateSite}
                  className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shrink-0"
                >
                  + Ekle
                </button>
              </div>
              {newSiteName.trim() && (
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Anahtar: <code>{slugify(newSiteName)}</code>
                </p>
              )}
              {siteKey !== 'default' && (
                <button
                  type="button"
                  onClick={handleDeleteSite}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Bu siteyi sil
                </button>
              )}
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActiveSection(s.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left border-l-[3px] transition-colors ${
                    activeSection === s.key
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-semibold'
                      : 'border-transparent text-slate-600 hover:bg-white font-medium'
                  }`}
                >
                  <Icon name={s.icon} className={`w-[18px] h-[18px] shrink-0 ${activeSection === s.key ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="px-6 md:px-8 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-lg font-bold text-slate-900">
                {activeMeta && <Icon name={activeMeta.icon} className="w-5 h-5 text-indigo-600" />}
                {activeMeta?.label}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{activeMeta?.description}</p>
            </div>

            <div className="flex-1 px-6 md:px-8 py-6 space-y-6">

              {activeSection === 'llm' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">API Endpoint</label>
                  <input
                    type="text"
                    value={llmEndpoint}
                    onChange={(e) => setLlmEndpoint(e.target.value)}
                    placeholder="http://.../v1/chat/completions"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Model Adı</label>
                  <input
                    type="text"
                    value={llmModelName}
                    onChange={(e) => setLlmModelName(e.target.value)}
                    placeholder="ör. qwen3-coder"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    API Anahtarı — {llmHasApiKey ? <span className="text-emerald-600">✓ kayıtlı</span> : <span className="text-red-500">⚠ kayıtlı değil</span>}
                  </label>
                  <input
                    type="password"
                    value={llmNewApiKey}
                    onChange={(e) => setLlmNewApiKey(e.target.value)}
                    placeholder={llmHasApiKey ? 'Değiştirmek için yeni anahtar gir (mevcut gösterilmez)' : 'API anahtarını gir'}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    autoComplete="off"
                  />
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-start gap-3 mb-3">
                    <input
                      type="checkbox"
                      id="ragApiEnabled"
                      checked={ragApiEnabled}
                      onChange={(e) => setRagApiEnabled(e.target.checked)}
                      className="mt-1 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="ragApiEnabled" className="text-sm text-slate-700">
                      <span className="font-semibold block">Dış Bilgi Kaynağı (RAG) API'sini Kullan</span>
                      Açıkken, kullanıcı sorusu önce bu API'ye gönderilir ve dönen cevap doğrudan kullanılır (kendi LLM'imize tekrar sorulmaz).
                      API kapalıysa, ulaşılamıyorsa ya da hata verirse otomatik olarak normal LLM akışına geri dönülür.
                    </label>
                  </div>
                  {ragApiEnabled && (
                    <div className="ml-7">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">RAG API Adresi</label>
                      <input
                        type="text"
                        value={ragApiEndpoint}
                        onChange={(e) => setRagApiEndpoint(e.target.value)}
                        placeholder="http://127.0.0.1:8000 (sadece kök adres, /ask otomatik eklenir)"
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        localhost adresi sadece o API'yi çalıştıran bilgisayardan erişilebilir — aynı ağdaysanız o bilgisayarın LAN IP'sini kullan.
                      </p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSaveLlmSettings}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium"
                >
                  LLM Ayarlarını Kaydet
                </button>
                {llmSaveStatus && <span className="ml-3 text-sm text-emerald-600">{llmSaveStatus}</span>}
              </div>
              )}

              {activeSection === 'tasarim' && (
              <div className="space-y-6">
              <div>
                <label className="block font-semibold text-slate-700 mb-2">Chatbot Adı:</label>
                <input
                  type="text"
                  value={config.botName}
                  onChange={(e) => handleChange('botName', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Logo (seçmezsen harf rozeti kullanılır):</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => { handleChange('logoEmoji', ''); handleChange('logoUrl', ''); }}
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-bold ${!config.logoUrl && config.logoEmoji === '' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}
                  >
                    {config.botName.trim().charAt(0) || 'H'}
                  </button>
                  {LOGO_OPTIONS.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => { handleChange('logoEmoji', emoji); handleChange('logoUrl', ''); }}
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl ${!config.logoUrl && config.logoEmoji === emoji ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.logoUrl}
                    onChange={(e) => handleChange('logoUrl', e.target.value)}
                    placeholder="Ya da özel bir logo görseli URL'si gir (https://.../logo.png)"
                    className={`flex-1 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${config.logoUrl ? 'border-indigo-500' : 'border-slate-300'}`}
                  />
                  {config.logoUrl && (
                    <button
                      type="button"
                      onClick={() => handleChange('logoUrl', '')}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium border border-red-200"
                    >
                      Sil
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  URL girersen, o resim yukarıdaki seçeneklerin yerine kullanılır. Boş bırakırsan yukarıdan seçtiğin ikon/harf geçerli olur.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Widget Konumu:</label>
                <select
                  value={config.position}
                  onChange={(e) => handleChange('position', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="right">Sağ Alt</option>
                  <option value="left">Sol Alt</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Widget Ana Rengi:</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.color}
                    onChange={(e) => handleChange('color', e.target.value)}
                    className="w-14 h-10 cursor-pointer rounded-md border border-slate-300"
                  />
                  <span className="text-sm font-mono text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200">{config.color}</span>
                </div>
              </div>
              </div>
              )}

              {activeSection === 'kimlik' && (
              <div className="space-y-6">
              <div>
                <label className="block font-semibold text-slate-700 mb-2">Belediye Birimi / Hazır Şablon:</label>
                <select
                  value={config.subtitle}
                  onChange={(e) => applyTemplate(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option>Genel Asistan</option>
                  <option>İmar ve Şehircilik</option>
                  <option>Sosyal Hizmetler</option>
                  <option>Ulaşım ve Kent Kart</option>
                </select>
                <p className="text-xs text-slate-400 mt-2">
                  Birim seçmek, aşağıdaki System Prompt'u o birime uygun hazır bir şablonla doldurur — istersen sonra elle düzenleyebilirsin.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">İlk Karşılama Mesajı:</label>
                <div className="space-y-2 mb-2">
                  {WELCOME_MESSAGE_OPTIONS.map((msg) => (
                    <button
                      type="button"
                      key={msg}
                      onClick={() => handleChange('welcomeMessage', msg)}
                      className={`block w-full text-left p-2.5 rounded-lg text-sm border ${config.welcomeMessage === msg ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                    >
                      {msg}
                    </button>
                  ))}
                </div>
                <textarea
                  value={config.welcomeMessage}
                  onChange={(e) => handleChange('welcomeMessage', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
                <p className="text-xs text-slate-400 mt-2">Yukarıdaki seçeneklerden birine tıkla ya da metni doğrudan düzenle.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Yapay Zeka Kimliği (System Prompt):</label>
                <textarea
                  value={config.systemPrompt}
                  onChange={(e) => handleChange('systemPrompt', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={5}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Cevap Uzunluğu:</label>
                <select
                  value={config.responseLength}
                  onChange={(e) => handleChange('responseLength', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="short">Kısa</option>
                  <option value="medium">Orta</option>
                  <option value="detailed">Detaylı</option>
                </select>
              </div>
              </div>
              )}

              {activeSection === 'guvenlik' && (
              <div className="space-y-6">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="blockPolitical"
                  checked={config.blockPoliticalTopics}
                  onChange={(e) => handleChange('blockPoliticalTopics', e.target.checked)}
                  className="mt-1 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="blockPolitical" className="text-sm text-slate-700">
                  <span className="font-semibold block">Siyasi konulara girmeyi engelle</span>
                  Açıkken bot, siyasi parti/seçim/siyasetçi gibi konularda görüş bildirmeyi reddeder.
                </label>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="blockProfanity"
                  checked={config.blockProfanity}
                  onChange={(e) => handleChange('blockProfanity', e.target.checked)}
                  className="mt-1 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="blockProfanity" className="text-sm text-slate-700">
                  <span className="font-semibold block">Hakaret / argo / küfür engeli</span>
                  Açıkken bot, kullanıcı kaba veya küfürlü konuşsa bile her zaman kibar ve profesyonel kalır, asla aynı üslupla karşılık vermez.
                </label>
              </div>
              </div>
              )}

              {activeSection === 'dosya' && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="allowImageUpload"
                    checked={config.allowImageUpload}
                    onChange={(e) => handleChange('allowImageUpload', e.target.checked)}
                    className="mt-1 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="allowImageUpload" className="text-sm text-slate-700">
                    <span className="font-semibold block">Kullanıcılar Dosya/Resim Gönderebilsin</span>
                    Açıkken widget'a bir ataç butonu eklenir, kullanıcı mesajıyla birlikte dosya gönderebilir.
                  </label>
                </div>

                {config.allowImageUpload && (
                  <div className="ml-7 space-y-3">
                    <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
                      Şu an LM Studio'da yüklü model (metin-only) görselleri anlayamıyor. Bu ayar arayüzü ve
                      altyapıyı hazırlar; resimler gerçekten "görülebilsin" istiyorsan görsel destekleyen bir
                      model (ör. Qwen2-VL) yüklemen gerekir.
                    </div>
                    <p className="text-xs font-semibold text-slate-600">İzin verilen dosya türleri:</p>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={config.allowedFileTypes.image}
                          onChange={(e) => toggleFileType('image', e.target.checked)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        Resim (JPG/PNG)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={config.allowedFileTypes.pdf}
                          onChange={(e) => toggleFileType('pdf', e.target.checked)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        PDF
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={config.allowedFileTypes.docx}
                          onChange={(e) => toggleFileType('docx', e.target.checked)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        Word (DOCX)
                      </label>
                    </div>
                  </div>
                )}
              </div>
              )}

              {activeSection === 'hiz' && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="rateLimitEnabled"
                    checked={config.rateLimit.enabled}
                    onChange={(e) => updateRateLimit('enabled', e.target.checked)}
                    className="mt-1 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="rateLimitEnabled" className="text-sm text-slate-700">
                    <span className="font-semibold block">Kullanıcı Hız Sınırı</span>
                    Açıkken, aynı kullanıcı (IP) dakikada belirlenen mesaj/token sayısını aşarsa geçici olarak engellenir.
                  </label>
                </div>
                {config.rateLimit.enabled && (
                  <div className="ml-7 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Dakikada En Fazla Mesaj (RPM)</label>
                      <input
                        type="number"
                        min={1}
                        value={config.rateLimit.rpm}
                        onChange={(e) => updateRateLimit('rpm', Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Dakikada En Fazla Token (TPM)</label>
                      <input
                        type="number"
                        min={100}
                        step={100}
                        value={config.rateLimit.tpm}
                        onChange={(e) => updateRateLimit('tpm', Math.max(100, parseInt(e.target.value, 10) || 100))}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
              )}

              {activeSection === 'bakim' && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="maintenanceMode"
                    checked={config.maintenanceMode}
                    onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                    className="mt-1 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="maintenanceMode" className="text-sm text-slate-700">
                    <span className="font-semibold block">Bakım Modu</span>
                    Açıkken widget LLM'e hiç istek atmaz, doğrudan aşağıdaki mesajı döner.
                  </label>
                </div>
                {config.maintenanceMode && (
                  <textarea
                    value={config.maintenanceMessage}
                    onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                  />
                )}
              </div>
              )}

              {activeSection === 'sss' && (
              <div className="space-y-6">
                <p className="text-xs text-slate-400 -mt-2">
                  Türkçe soruyu yaz, alandan çıkınca İngilizcesi otomatik çevrilir (yerel modelle) — istersen
                  çeviriyi sonradan elle düzeltebilirsin.
                </p>
                <div className="space-y-2 mb-3">
                  {config.faqList.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          value={item.tr}
                          onChange={(e) => updateFaqField(i, 'tr', e.target.value)}
                          onBlur={() => handleExistingFaqTrBlur(i)}
                          placeholder="Türkçe soru"
                          className="w-full p-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <input
                          type="text"
                          value={translatingIndex === i ? '' : item.en}
                          onChange={(e) => updateFaqField(i, 'en', e.target.value)}
                          placeholder={translatingIndex === i ? 'Çevriliyor…' : 'English translation'}
                          disabled={translatingIndex === i}
                          className="w-full p-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-50"
                        />
                      </div>
                      <button
                        onClick={() => removeFaq(i)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium shrink-0"
                      >
                        Sil
                      </button>
                    </div>
                  ))}
                  {config.faqList.length === 0 && (
                    <p className="text-xs text-slate-400">Henüz soru eklenmedi.</p>
                  )}
                </div>
                <div className="space-y-2 p-2 border border-dashed border-slate-300 rounded-lg">
                  <input
                    type="text"
                    value={newFaqTr}
                    onChange={(e) => setNewFaqTr(e.target.value)}
                    onBlur={handleNewFaqTrBlur}
                    placeholder="Yeni soru (Türkçe)"
                    className="w-full p-2.5 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={translatingIndex === 'new' ? '' : newFaqEn}
                    onChange={(e) => setNewFaqEn(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFaq()}
                    placeholder={translatingIndex === 'new' ? 'Çevriliyor…' : 'İngilizce çevirisi (otomatik doldurulur)'}
                    disabled={translatingIndex === 'new'}
                    className="w-full p-2.5 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <button
                    onClick={addFaq}
                    className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium"
                  >
                    Ekle
                  </button>
                </div>
              </div>
              )}

              {activeSection === 'test' && (
              <div className="space-y-6">
                <div>
                  <label className="block font-semibold text-slate-700 mb-2">Canlı Test (kaydetmeden dene):</label>
                  <p className="text-xs text-slate-400 mb-3">
                    Bu, yukarıdaki taslak ayarlarla (system prompt dahil) gerçek modele mesaj gönderir — henüz "Kaydet" demedin bile.
                  </p>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                      <div className="flex gap-1 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setTestLang('TR')}
                          className={`px-2 py-1 rounded ${testLang === 'TR' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
                        >
                          TR
                        </button>
                        <button
                          type="button"
                          onClick={() => setTestLang('EN')}
                          className={`px-2 py-1 rounded ${testLang === 'EN' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
                        >
                          EN
                        </button>
                      </div>
                      {testMessages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setTestMessages([])}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Sıfırla
                        </button>
                      )}
                    </div>

                    <div className="h-64 overflow-y-auto p-3 bg-[#f8f9fa] space-y-2">
                      {testMessages.length === 0 && (
                        <p className="text-xs text-slate-400 text-center pt-8">Aşağıya bir mesaj yazıp test et.</p>
                      )}
                      {testMessages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] p-2.5 rounded-xl text-xs whitespace-pre-wrap ${m.role === 'user' ? 'text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
                            style={m.role === 'user' ? { backgroundColor: config.color } : {}}
                          >
                            {m.content}
                          </div>
                        </div>
                      ))}
                      {testLoading && (
                        <div className="flex justify-start">
                          <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-400">…</div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 p-2 bg-white border-t border-slate-200">
                      <input
                        type="text"
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTestSend()}
                        placeholder="Test mesajı yaz..."
                        disabled={testLoading}
                        className="flex-1 p-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={handleTestSend}
                        disabled={testLoading}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium disabled:opacity-50"
                      >
                        Gönder
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-2">Canlı Önizleme (Widget Ayarları):</label>
                  <pre className="bg-[#2d3436] text-[#a9dc76] p-4 rounded-lg text-sm overflow-x-auto font-mono">
                    {`window.HunaWidgetPreview = ${JSON.stringify(
                      {
                        botName: config.botName,
                        logoEmoji: config.logoEmoji,
                        logoUrl: config.logoUrl,
                        color: config.color,
                        subtitle: config.subtitle,
                        position: config.position,
                        welcomeMessage: config.welcomeMessage,
                        faqList: config.faqList
                      },
                      null,
                      4
                    )};`}
                  </pre>
                  <p className="text-xs text-slate-400 mt-2">
                    Yazdıkça anlık güncellenir. System prompt kasıtlı olarak burada gösterilmez — "İncele" (DevTools)
                    ile bakan biri bile prompt'u burada göremez.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-2">Siteye Ekleme Kodu:</label>
                  <pre className="bg-[#2d3436] text-[#a9dc76] p-4 rounded-lg text-sm overflow-x-auto font-mono">
                    {`<script src="${BACKEND_URL}/huna-widget.js" data-site-key="${siteKey}"></script>`}
                  </pre>
                  <p className="text-xs text-slate-400 mt-2">
                    Bu kod, sistem talimatını (system prompt) içermez — widget ayarları backend'den site anahtarıyla çekilir.
                  </p>
                </div>
              </div>
              )}

            </div>

            <div className="px-6 md:px-8 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center gap-4">
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Ayarları Kaydet ve Yayınla
              </button>
              <button
                onClick={handleDiscardChanges}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 font-semibold rounded-lg transition-colors text-sm"
              >
                Değişiklikleri Geri Al
              </button>
              {saveStatus && (
                <span className="text-sm font-semibold text-emerald-600">{saveStatus}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
