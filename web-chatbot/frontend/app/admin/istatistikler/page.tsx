'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const BACKEND_URL = 'http://localhost:3001';

type SiteStats = {
  siteKey: string;
  totalRequests: number;
  avgResponseMs: number | null;
  llmErrors: number;
  scriptDriftCount: number;
  last7Days: { date: string; count: number }[];
};

type SiteSummary = { siteKey: string; botName: string; subtitle: string };

const EMPTY_STATS: Omit<SiteStats, 'siteKey'> = {
  totalRequests: 0,
  avgResponseMs: null,
  llmErrors: 0,
  scriptDriftCount: 0,
  last7Days: []
};

export default function StatsPage() {
  const [statsBySite, setStatsBySite] = useState<SiteStats[]>([]);
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${BACKEND_URL}/api/stats`).then(res => res.json()),
      fetch(`${BACKEND_URL}/api/config`).then(res => res.json())
    ])
      .then(([statsData, sitesData]) => {
        setStatsBySite(statsData);
        setSites(sitesData);
      })
      .catch(() => setLoadError('İstatistikler yüklenemedi. Sunucunun (localhost:3001) çalıştığından emin olun.'));
  }, []);

  // Hiç mesaj almamış (log'da hiç görünmeyen) siteler de sıfır değerlerle listelensin diye,
  // site listesinden başlayıp istatistikleri üstüne eşliyoruz.
  const rows: (SiteSummary & Omit<SiteStats, 'siteKey'>)[] = sites.map((site) => {
    const found = statsBySite.find((s) => s.siteKey === site.siteKey);
    return { ...site, ...(found || EMPTY_STATS) };
  });

  // Config'te artık olmayan ama log'da izi kalan siteler varsa (silinmiş site) onları da göster.
  statsBySite.forEach((s) => {
    if (!rows.find((r) => r.siteKey === s.siteKey)) {
      rows.push({ ...s, botName: s.siteKey, subtitle: '(silinmiş site)' });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Kullanım İstatistikleri</h1>
          <Link href="/admin" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-medium transition-colors">
            Ayarlara Dön
          </Link>
        </div>

        {loadError && (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
            {loadError}
          </div>
        )}

        {rows.length === 0 && !loadError && (
          <p className="text-sm text-gray-400">Henüz hiç site yok.</p>
        )}

        {rows.map((row) => {
          const maxDayCount = Math.max(1, ...row.last7Days.map((d) => d.count));
          return (
            <div key={row.siteKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="font-bold text-gray-800">
                  {row.botName} — {row.subtitle}
                </h2>
                <p className="text-xs text-gray-400">site anahtarı: <code>{row.siteKey}</code></p>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-800">{row.totalRequests}</div>
                    <div className="text-xs text-gray-500 mt-1">Toplam Mesaj</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-800">{row.avgResponseMs !== null ? `${row.avgResponseMs} ms` : '—'}</div>
                    <div className="text-xs text-gray-500 mt-1">Ort. Yanıt Süresi</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold ${row.llmErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>{row.llmErrors}</div>
                    <div className="text-xs text-gray-500 mt-1">LLM Bağlantı Hatası</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold ${row.scriptDriftCount > 0 ? 'text-yellow-600' : 'text-gray-800'}`}>{row.scriptDriftCount}</div>
                    <div className="text-xs text-gray-500 mt-1">Dil Kayması</div>
                  </div>
                </div>

                {row.last7Days.length > 0 ? (
                  <div className="space-y-1.5 pt-2 border-t border-gray-100">
                    {row.last7Days.map((day) => (
                      <div key={day.date} className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-500 w-20 shrink-0">{day.date}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-[#0288d1] h-full rounded-full"
                            style={{ width: `${(day.count / maxDayCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-700 w-6 text-right">{day.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">Bu site için henüz mesaj kaydı yok.</p>
                )}
              </div>
            </div>
          );
        })}

        <p className="text-xs text-gray-400">
          Bu veriler <code>backend/logs/app.log</code> dosyasından hesaplanır — sunucu yeniden başlatıldığında silinmez, log dosyası büyüdükçe birikir.
        </p>
      </div>
    </div>
  );
}
