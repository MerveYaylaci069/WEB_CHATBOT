'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const BACKEND_URL = 'http://localhost:3001';
const SITE_KEY = 'default';
const VISITOR_ID_KEY = 'huna_visitor_id';
const RAG_SESSION_KEY = 'huna_rag_session_id';

// Dış RAG API'si açıksa, o API'nin kendi oturum kimliğini (session_id) sohbetin devam etmesi
// için tarayıcıda tutar — bizim visitorId'den farklı, o API'ye özel bir kimliktir.
function getRagSessionId(): string | null {
  try {
    return localStorage.getItem(RAG_SESSION_KEY);
  } catch {
    return null;
  }
}
function setRagSessionId(id: string) {
  try {
    localStorage.setItem(RAG_SESSION_KEY, id);
  } catch {
    // localStorage yoksa sessizce geç
  }
}

// Giriş sistemi yok — bu, admin'in "kim kimle konuşmuş" görebilmesi ve kullanıcının eski
// sohbetinin geri gelmesi için tarayıcıda saklanan anonim bir kimlik. Gerçek bir hesap değildir.
function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<'TR' | 'EN'>('TR');
  const [input, setInput] = useState('');
  
  const [messages, setMessages] = useState<{role: string, content: string, isError?: boolean, originalText?: string, forUserMessage?: string, feedback?: 'up' | 'down'}[]>([]);
  const [isSssOpen, setIsSssOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  const [announcerText, setAnnouncerText] = useState('');
  
  const [config, setConfig] = useState({
    color: '#151d32',
    subtitle: 'Sosyal Hizmetler',
    welcomeMessage: 'Merhaba! Size nasıl yardımcı olabilirim? 🌟',
    botName: 'Huna AI',
    position: 'right' as 'right' | 'left',
    logoEmoji: '',
    logoUrl: '',
    faqList: [] as ({ tr: string; en: string } | string)[],
    allowImageUpload: false,
    allowedFileTypes: { image: true, pdf: true, docx: false }
  });

  const [attachment, setAttachment] = useState<{ dataUrl: string; isImage: boolean; fileName: string; fileType: string } | null>(null);
  const [attachmentError, setAttachmentError] = useState('');

  const constraintsRef = useRef(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Sıfırlama sırasında devam eden bir istek varsa (abort edilince), o isteğin "durduruldu"
  // mesajını artık boşalmış olan sohbete eklememesi için nesil sayacı kullanılıyor.
  const chatGenerationRef = useRef(0);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/config/${SITE_KEY}`)
      .then(res => res.json())
      .then(data => setConfig(prev => ({ ...prev, ...data })))
      .catch(() => console.error("Widget ayarları backend'den yüklenemedi."));
  }, []);

  // Bu tarayıcıda daha önce bu siteyle bir konuşma geçmişi varsa (sunucudan), sohbeti
  // baştan boş açmak yerine kaldığı yerden gösteriyoruz.
  useEffect(() => {
    const visitorId = getVisitorId();
    fetch(`${BACKEND_URL}/api/conversations/${SITE_KEY}/${visitorId}`)
      .then(res => res.json())
      .then((data: { entries?: { userMessage: string; botReply: string }[] }) => {
        if (!data.entries || data.entries.length === 0) return;
        const restored = data.entries.flatMap((e) => [
          { role: 'user', content: e.userMessage },
          { role: 'assistant', content: e.botReply, forUserMessage: e.userMessage }
        ]);
        setMessages(restored);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Eski kayıtlarda faqList düz string'ti (çevirisi yoktu); yeni kayıtlarda {tr, en} nesnesi.
  // İngilizcesi girilmemişse Türkçesini göstermek, hiç göstermemekten daha iyi bir yedek.
  const localizeFaq = (item: { tr: string; en: string } | string, targetLang: 'TR' | 'EN'): string => {
    if (typeof item === 'string') return item;
    return targetLang === 'EN' ? (item.en || item.tr) : item.tr;
  };

  const t = {
    TR: {
      placeholder: "Mesajınızı yazın...",
      sss: "SIKÇA SORULAN SORULAR",
      err: "Huna LLM servisine şu an ulaşılamıyor.",
      welcome: config.welcomeMessage,
      faqList: config.faqList.length > 0
        ? config.faqList.map(item => localizeFaq(item, 'TR'))
        : ['Erzak yardımı nasıl alırım?', 'Sosyal kart başvurusu nasıl yapılır?'],
      stop: "Durdur",
      stoppedMsg: "Yanıt durduruldu.",
      openChat: "Sohbeti aç",
      closeChat: "Sohbeti kapat",
      resetChat: "Sohbeti sıfırla",
      send: "Gönder",
      err500: "Sunucuda bir hata oluştu (Kod: 500). Lütfen birazdan tekrar deneyin.",
      errOffline: "İnternet bağlantınız koptu. Lütfen bağlantınızı kontrol edip tekrar deneyin.",
      errEmpty: "Sunucudan boş yanıt geldi. Lütfen tekrar deneyin.",
      retry: "Tekrar Dene",
      typing: "Huna yanıt yazıyor..."
    },
    EN: { 
      placeholder: "Type your message...", 
      sss: "FREQUENTLY ASKED QUESTIONS", 
      err: "Huna LLM service is unreachable.",
      welcome: "Hello! I am Huna, your digital assistant. How can I help you today? 🌟",
      faqList: config.faqList.length > 0
        ? config.faqList.map(item => localizeFaq(item, 'EN'))
        : ['What services does the municipality provide?', 'How can I make an appointment?', 'How do I contact the municipality?'],
      stop: "Stop",
      stoppedMsg: "Response stopped.",
      openChat: "Open chat",
      closeChat: "Close chat",
      resetChat: "Reset chat",
      send: "Send",
      err500: "A server error occurred (Code: 500). Please try again later.",
      errOffline: "You are offline. Please check your internet connection and try again.",
      errEmpty: "Received an empty response from the server. Please try again.",
      retry: "Retry",
      typing: "Huna is typing..."
    }
  };

  useEffect(() => {
    if (isOpen && !isLoading) {
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(focusTimer);
    }
  }, [isOpen, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const textFinal = textToSend || input;
    if (!textFinal.trim()) return;

    const userMsg = textFinal;
    const sentAttachment = textToSend ? null : attachment;
    // Bu turdan önceki mesajlar — modelin önceki konuşmayı "hatırlaması" için gönderilir.
    // Son 8 mesajla sınırlı (backend de ayrıca sınırlıyor, burada da gereksiz veri göndermemek için).
    const historyForRequest = messages
      .filter(m => !m.isError)
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: sentAttachment ? `${userMsg}\n\n📎 ${sentAttachment.fileName}` : userMsg }]);
    if (!textToSend) {
      setInput('');
      setAttachment(null);
      setAttachmentError('');
    }

    setIsLoading(true);
    setAnnouncerText(t[lang].typing);

    const generation = chatGenerationRef.current;
    abortControllerRef.current = new AbortController();

    try {
      if (!navigator.onLine) {
        throw new Error('OFFLINE');
      }

      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          lang: lang,
          siteKey: SITE_KEY,
          attachment: sentAttachment,
          visitorId: getVisitorId(),
          history: historyForRequest,
          ragSessionId: getRagSessionId()
        }),
        signal: abortControllerRef.current.signal
      });

      if (res.status === 500) {
        throw new Error('500_ERROR');
      }

      const data = await res.json();

      if (!data || !data.reply || data.reply.trim() === '') {
        throw new Error('EMPTY_RESPONSE');
      }

      if (data.ragSessionId) setRagSessionId(data.ragSessionId);

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, forUserMessage: userMsg }]);
      setAnnouncerText(`Yeni mesaj: ${data.reply}`);
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Sohbet, bu istek devam ederken sıfırlandıysa (nesil değiştiyse), "durduruldu"
        // mesajını artık boşalmış olan listeye eklememek gerekir.
        if (generation === chatGenerationRef.current) {
          setMessages(prev => [...prev, { role: 'assistant', content: t[lang].stoppedMsg }]);
        }
        return;
      }

      let errorMsg = t[lang].err; 
      if (err.message === 'OFFLINE' || err.message === 'Failed to fetch') errorMsg = t[lang].errOffline;
      else if (err.message === '500_ERROR') errorMsg = t[lang].err500;
      else if (err.message === 'EMPTY_RESPONSE') errorMsg = t[lang].errEmpty;

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: errorMsg, 
        isError: true, 
        originalText: userMsg 
      }]);
      setAnnouncerText(`Hata: ${errorMsg}`);
    } finally {
      setIsLoading(false); 
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const MAX_ATTACHMENT_MB = 5;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAttachmentError('');

    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      setAttachmentError(lang === 'TR' ? `Dosya çok büyük (en fazla ${MAX_ATTACHMENT_MB}MB).` : `File too large (max ${MAX_ATTACHMENT_MB}MB).`);
      return;
    }

    const isImage = file.type.startsWith('image/');
    const fileType = isImage ? 'image' : file.type.includes('pdf') ? 'pdf' : file.name.endsWith('.docx') ? 'docx' : '';

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({ dataUrl: reader.result as string, isImage, fileName: file.name, fileType });
    };
    reader.onerror = () => setAttachmentError(lang === 'TR' ? 'Dosya okunamadı.' : 'Could not read file.');
    reader.readAsDataURL(file);
  };

  const acceptAttr = [
    config.allowedFileTypes.image ? 'image/jpeg,image/png,image/webp' : '',
    config.allowedFileTypes.pdf ? 'application/pdf' : '',
    config.allowedFileTypes.docx ? '.docx' : ''
  ].filter(Boolean).join(',');

  const submitFeedback = (index: number, rating: 'up' | 'down') => {
    const msg = messages[index];
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, feedback: rating } : m));
    fetch(`${BACKEND_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteKey: SITE_KEY,
        lang,
        userMessage: msg.forUserMessage || '',
        botReply: msg.content,
        rating,
        userAgent: navigator.userAgent
      })
    }).catch(() => console.error('Geri bildirim gönderilemedi.'));
  };

  const handleFaqClick = (q: string) => {
    setIsSssOpen(false);
    handleSend(q);
  };

  const handleResetChat = () => {
    chatGenerationRef.current += 1;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setMessages([]);
    setAttachment(null);
    setAttachmentError('');
    setInput('');
  };

  return (
    <div ref={constraintsRef} className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      
      {/* GÖRME ENGELLİLER İÇİN GİZLİ EKRAN OKUYUCU (Axe hatası vermemesi için geri eklendi) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcerText}
      </div>

      {isOpen && (
        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={constraintsRef}
          className={`absolute bottom-24 ${config.position === 'left' ? 'left-6' : 'right-6'} w-[350px] h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto cursor-grab active:cursor-grabbing border border-gray-200`}
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between text-gray-900" style={{ backgroundColor: config.color }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center font-bold text-sm overflow-hidden">
                {config.logoUrl ? (
                  <img src={config.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  config.logoEmoji || config.botName.trim().charAt(0) || 'H'
                )}
              </div>
              <div>
                <h2 className="font-bold text-sm tracking-wide">{config.botName}</h2>
                <p className="text-[10px] opacity-80">{config.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-black/10 rounded-md p-0.5 text-[10px] font-bold">
                <button 
                  onClick={() => setLang('TR')} 
                  aria-pressed={lang === 'TR'}
                  className={`px-2 py-1 rounded focus:ring-2 focus:ring-gray-900 transition-colors ${lang === 'TR' ? 'bg-white text-black shadow-sm' : 'text-gray-800 hover:bg-black/10'}`}
                >
                  TR
                </button>
                <button 
                  onClick={() => setLang('EN')} 
                  aria-pressed={lang === 'EN'}
                  className={`px-2 py-1 rounded focus:ring-2 focus:ring-gray-900 transition-colors ${lang === 'EN' ? 'bg-white text-black shadow-sm' : 'text-gray-800 hover:bg-black/10'}`}
                >
                  EN
                </button>
              </div>
              <button
                onClick={handleResetChat}
                aria-label={t[lang].resetChat}
                title={t[lang].resetChat}
                className="text-sm opacity-80 hover:opacity-100 transition-opacity focus:ring-2 focus:ring-gray-900 rounded"
              >
                ↺
              </button>
              <button
                onClick={() => setIsOpen(false)}
                aria-label={t[lang].closeChat}
                className="text-lg opacity-80 hover:opacity-100 transition-opacity focus:ring-2 focus:ring-gray-900 rounded"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 p-4 bg-[#f8f9fa] overflow-y-auto space-y-3">
            <div className="flex justify-start">
              <div className="p-3 rounded-2xl text-xs max-w-[85%] shadow-sm bg-white border border-gray-100 text-gray-700 rounded-bl-none">
                {t[lang].welcome}
              </div>
            </div>

            {messages.map((msg, i) => (
  <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
    {/* Mesaj Balonu */}
    <div 
      className={`p-3 rounded-2xl text-xs max-w-[85%] shadow-sm ${msg.role === 'user' ? 'text-white rounded-br-none' : 'bg-white border text-gray-700 rounded-bl-none'} ${msg.isError ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-100'}`} 
      style={msg.role === 'user' ? { backgroundColor: config.color } : {}}
    >
    
        {React.createElement(ReactMarkdown as any, {}, msg.content)}
    </div>
                
                {/* Tekrar Dene Butonu */}
                {msg.isError && msg.originalText && (
                  <button
                    onClick={() => handleSend(msg.originalText)}
                    className="text-[10px] text-blue-600 font-medium hover:underline flex items-center gap-1 mt-0.5 ml-1 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
                  >
                    <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    {t[lang].retry}
                  </button>
                )}

                {/* Beğen / Beğenme */}
                {msg.role === 'assistant' && !msg.isError && (
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      onClick={() => submitFeedback(i, 'up')}
                      disabled={!!msg.feedback}
                      aria-label="Faydalı"
                      className={`text-xs px-1.5 py-0.5 rounded transition-colors ${msg.feedback === 'up' ? 'opacity-100' : 'opacity-40 hover:opacity-100'} disabled:cursor-default`}
                    >
                      👍
                    </button>
                    <button
                      onClick={() => submitFeedback(i, 'down')}
                      disabled={!!msg.feedback}
                      aria-label="Faydalı değil"
                      className={`text-xs px-1.5 py-0.5 rounded transition-colors ${msg.feedback === 'down' ? 'opacity-100' : 'opacity-40 hover:opacity-100'} disabled:cursor-default`}
                    >
                      👎
                    </button>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex flex-col items-start gap-2">
                <div className="flex justify-start">
                  <div className="p-4 rounded-2xl shadow-sm bg-white border border-gray-100 rounded-bl-none flex items-center gap-1.5">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  </div>
                </div>
                <button 
                  onClick={handleStop}
                  className="text-[10px] bg-red-50 text-red-500 border border-red-100 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-red-100 transition-colors ml-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path></svg>
                  {t[lang].stop}
                </button>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* SSS Sekmesi */}
          <div className="bg-white border-t border-gray-100">
            <button 
              onClick={() => setIsSssOpen(!isSssOpen)} 
              className="w-full p-3 text-[10px] font-bold text-gray-400 uppercase flex justify-between items-center px-4 hover:bg-gray-50 transition-colors"
            >
              {t[lang].sss} {isSssOpen ? '▲' : '▼'}
            </button>
            {isSssOpen && (
              <div className="p-2 border-t border-gray-100 text-xs bg-[#f8f9fa]">
                {[...t[lang].faqList]
                  .sort((a, b) => a.localeCompare(b, lang === 'TR' ? 'tr' : 'en'))
                  .map(q => (
                  <button 
                    key={q} 
                    onClick={() => handleFaqClick(q)} 
                    className="block w-full text-left p-2.5 text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all mb-1"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ek Dosya Önizleme */}
          {(attachment || attachmentError) && (
            <div className="px-3 pt-2 bg-white">
              {attachment && (
                <div className="flex items-center gap-2 text-[10px] bg-gray-100 rounded-lg px-2.5 py-1.5 w-fit">
                  <span>📎 {attachment.fileName}</span>
                  <button onClick={() => setAttachment(null)} aria-label="Eki kaldır" className="text-gray-500 hover:text-gray-800">✕</button>
                </div>
              )}
              {attachmentError && <p className="text-[10px] text-red-500 mt-1">{attachmentError}</p>}
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
            {config.allowImageUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptAttr}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  aria-label={lang === 'TR' ? 'Dosya ekle' : 'Attach file'}
                  className="w-9 h-9 shrink-0 rounded-xl text-gray-500 hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  📎
                </button>
              </>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              className="flex-1 p-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-gray-400 transition-colors bg-[#f8f9fa] disabled:opacity-50"
              placeholder={t[lang].placeholder}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading}
              aria-label={t[lang].send}
              className="w-10 h-10 rounded-xl text-white flex items-center justify-center transition-transform hover:scale-105 shadow-sm disabled:opacity-50 disabled:hover:scale-100"
              style={{ backgroundColor: config.color }}
            >
              <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
            </button>
          </div>
        </motion.div>
      )}

      {/* Fab Butonu */}
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? t[lang].closeChat : t[lang].openChat}
        aria-expanded={isOpen}
        className={`absolute bottom-6 ${config.position === 'left' ? 'left-6' : 'right-6'} w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white pointer-events-auto focus:ring-4 focus:ring-offset-2 focus:ring-blue-400 outline-none overflow-hidden`}
        style={{ backgroundColor: config.color }}
      >
        {isOpen ? (
          <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        ) : config.logoUrl ? (
          <img src={config.logoUrl} alt="" className="w-full h-full object-cover rounded-full" />
        ) : config.logoEmoji ? (
          <span className="text-2xl" aria-hidden="true">{config.logoEmoji}</span>
        ) : (
          <svg aria-hidden="true" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 14a8 8 0 0116 0" />
            <rect x="2" y="12" width="3" height="5" rx="1.5" fill="currentColor" />
            <rect x="19" y="12" width="3" height="5" rx="1.5" fill="currentColor" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.5 8.5 0 018.5 8.5v.5z" />
            <circle cx="9" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="15" cy="12" r="1" fill="currentColor" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}