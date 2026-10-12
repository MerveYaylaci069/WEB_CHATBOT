'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const BACKEND_URL = 'http://localhost:3001';

type SiteSummary = { siteKey: string; botName: string; subtitle: string };

type ConversationSummary = {
  visitorId: string;
  messageCount: number;
  firstSeen: string;
  lastSeen: string;
  lastMessage: string;
};

type ConversationTurn = {
  id: string;
  timestamp: string;
  lang: string;
  userMessage: string;
  botReply: string;
};

export default function ConversationsPage() {
  const [siteKey, setSiteKey] = useState('default');
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [loadError, setLoadError] = useState('');
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/config`)
      .then(res => res.json())
      .then((data: SiteSummary[]) => setSites(data))
      .catch(() => {});
  }, []);

  const loadConversations = () => {
    fetch(`${BACKEND_URL}/api/conversations/${siteKey}`)
      .then(res => res.json())
      .then(data => setConversations(data.conversations || []))
      .catch(() => setLoadError('Konuşmalar yüklenemedi. Sunucunun (localhost:3001) çalıştığından emin olun.'));
  };

  useEffect(() => {
    setSelectedVisitor(null);
    setTranscript([]);
    loadConversations();
  }, [siteKey]);

  useEffect(() => {
    if (!selectedVisitor) return;
    setTranscriptLoading(true);
    fetch(`${BACKEND_URL}/api/conversations/${siteKey}/${selectedVisitor}`)
      .then(res => res.json())
      .then(data => setTranscript(data.entries || []))
      .catch(() => {})
      .finally(() => setTranscriptLoading(false));
  }, [selectedVisitor, siteKey]);

  const handleDeleteConversation = (visitorId: string) => {
    if (!confirm('Bu ziyaretçinin tüm konuşma geçmişini silmek istediğine emin misin?')) return;
    fetch(`${BACKEND_URL}/api/conversations/${siteKey}/${visitorId}`, { method: 'DELETE' })
      .then(() => {
        loadConversations();
        if (selectedVisitor === visitorId) {
          setSelectedVisitor(null);
          setTranscript([]);
        }
      })
      .catch(() => {});
  };

  const handleDeleteAll = () => {
    if (!confirm(`"${siteKey}" sitesine ait TÜM konuşma geçmişini silmek istediğine emin misin? Bu işlem geri alınamaz.`)) return;
    fetch(`${BACKEND_URL}/api/conversations/${siteKey}`, { method: 'DELETE' })
      .then(() => {
        setSelectedVisitor(null);
        setTranscript([]);
        loadConversations();
      })
      .catch(() => {});
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Konuşmalar</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Ziyaretçilerle yapılan tüm sohbetler — kimlik değil, tarayıcıda oluşan anonim bir ziyaretçi kimliğine göre gruplanır.
            </p>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium transition-colors shadow-sm">
            Ayarlara Dön
          </Link>
        </div>

        {loadError && (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {loadError}
          </div>
        )}

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700">Site:</label>
            <select
              value={siteKey}
              onChange={(e) => setSiteKey(e.target.value)}
              className="p-2 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {sites.length === 0 && <option value="default">default</option>}
              {sites.map((s) => (
                <option key={s.siteKey} value={s.siteKey}>
                  {s.botName} — {s.subtitle} ({s.siteKey})
                </option>
              ))}
            </select>
          </div>
          {conversations.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Bu siteye ait tüm konuşmaları sil
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row overflow-hidden min-h-[60vh]">

          <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto">
            {conversations.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-10 px-4">Bu sitede henüz kaydedilmiş bir konuşma yok.</p>
            )}
            {conversations.map((c) => (
              <button
                key={c.visitorId}
                onClick={() => setSelectedVisitor(c.visitorId)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 transition-colors ${selectedVisitor === c.visitorId ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800 font-mono">
                    #{c.visitorId.slice(0, 8)}
                  </span>
                  <span className="text-[11px] text-slate-400">{c.messageCount} mesaj</span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{c.lastMessage}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Son: {new Date(c.lastSeen).toLocaleString('tr-TR')}
                </p>
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            {!selectedVisitor && (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 p-8 text-center">
                Transkripti görmek için soldan bir ziyaretçi seç.
              </div>
            )}

            {selectedVisitor && (
              <>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-800 font-mono">#{selectedVisitor.slice(0, 8)}</div>
                    <div className="text-xs text-slate-400">{transcript.length} mesaj</div>
                  </div>
                  <button
                    onClick={() => handleDeleteConversation(selectedVisitor)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Bu konuşmayı sil
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {transcriptLoading && <p className="text-sm text-slate-400">Yükleniyor…</p>}
                  {!transcriptLoading && transcript.map((turn) => (
                    <div key={turn.id} className="space-y-2">
                      <div className="text-[11px] text-slate-400">
                        {new Date(turn.timestamp).toLocaleString('tr-TR')} · {turn.lang}
                      </div>
                      <div className="flex justify-end">
                        <div className="max-w-[80%] bg-slate-900 text-white text-sm rounded-2xl rounded-br-none px-4 py-2.5">
                          {turn.userMessage}
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="max-w-[80%] bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-2xl rounded-bl-none px-4 py-2.5 whitespace-pre-wrap">
                          {turn.botReply}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
