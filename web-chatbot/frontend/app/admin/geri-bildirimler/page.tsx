'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const BACKEND_URL = 'http://localhost:3001';

type FeedbackEntry = {
  id: string;
  timestamp: string;
  lang: string;
  userMessage: string;
  botReply: string;
  rating: 'up' | 'down';
  userAgent?: string;
};

type SiteSummary = { siteKey: string; botName: string; subtitle: string };

export default function FeedbackPage() {
  const [siteKey, setSiteKey] = useState('default');
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [summary, setSummary] = useState({ total: 0, up: 0, down: 0 });
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'down' | 'up'>('down');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/config`)
      .then(res => res.json())
      .then((data: SiteSummary[]) => setSites(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/feedback/${siteKey}`)
      .then(res => res.json())
      .then(data => {
        setSummary(data.summary);
        setEntries(data.entries);
      })
      .catch(() => setLoadError('Geri bildirimler yüklenemedi. Sunucunun (localhost:3001) çalıştığından emin olun.'));
  }, [siteKey]);

  const visibleEntries = entries.filter(e => filter === 'all' || e.rating === filter);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Geri Bildirimler</h1>
          <Link href="/admin" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-medium transition-colors">
            Ayarlara Dön
          </Link>
        </div>

        {loadError && (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
            {loadError}
          </div>
        )}

        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3">
          <label className="text-sm font-bold text-gray-700">Site:</label>
          <select
            value={siteKey}
            onChange={(e) => setSiteKey(e.target.value)}
            className="p-2 border border-gray-300 rounded-md bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {sites.length === 0 && <option value="default">default</option>}
            {sites.map((s) => (
              <option key={s.siteKey} value={s.siteKey}>
                {s.botName} — {s.subtitle} ({s.siteKey})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-800">{summary.total}</div>
            <div className="text-xs text-gray-500 mt-1">Toplam Değerlendirme</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600">👍 {summary.up}</div>
            <div className="text-xs text-gray-500 mt-1">Faydalı Bulundu</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
            <div className="text-2xl font-bold text-red-600">👎 {summary.down}</div>
            <div className="text-xs text-gray-500 mt-1">Faydalı Bulunmadı</div>
          </div>
        </div>

        <div className="flex gap-2">
          {(['down', 'up', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${filter === f ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
            >
              {f === 'down' ? '👎 Kötü Cevaplar' : f === 'up' ? '👍 İyi Cevaplar' : 'Tümü'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {visibleEntries.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Bu filtrede henüz geri bildirim yok.</p>
          )}
          {visibleEntries.map(entry => (
            <div key={entry.id} className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{new Date(entry.timestamp).toLocaleString('tr-TR')} · {entry.lang}</span>
                <span>{entry.rating === 'up' ? '👍' : '👎'}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500">Kullanıcı:</span>
                <p className="text-sm text-gray-800">{entry.userMessage}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500">Huna:</span>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.botReply}</p>
              </div>
              {entry.userAgent && (
                <p className="text-xs text-gray-400 border-t border-gray-100 pt-2" title={entry.userAgent}>
                  🖥️ {entry.userAgent}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
