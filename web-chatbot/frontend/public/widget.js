(function () {
    const currentScript = document.currentScript || (function() {
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
    })();
    const siteKey = currentScript.getAttribute('data-site-key') || 'genel';

    const WIDGET_URL = 'http://localhost:8000';
    let sessionId = "sess_" + Math.random().toString(36).substring(2, 10);
    
    const DEFAULT_CONFIG = {
        primaryColor: '#0B3D62',
        aiName: 'Kurumsal RAG',
        greetingText: 'Size nasıl yardımcı olabilirim?',
        inputPlaceholder: 'Sorunuzu yazın...',
        cmsProactiveChat: false
    };

    let widgetConfig = { ...DEFAULT_CONFIG };

    async function fetchConfig() {
        try {
            const res = await fetch(`${WIDGET_URL}/admin/settings`);
            if (res.ok) {
                const data = await res.json();
                widgetConfig.primaryColor = data.accentColor || widgetConfig.primaryColor;
                widgetConfig.aiName = data.aiName || widgetConfig.aiName;
                if (data.cmsProactiveChat !== undefined) widgetConfig.cmsProactiveChat = data.cmsProactiveChat;
                if (data.greetingText !== undefined) widgetConfig.greetingText = data.greetingText;
                if (data.inputPlaceholder !== undefined) widgetConfig.inputPlaceholder = data.inputPlaceholder;
            }
        } catch (e) { }
        buildWidget();
    }

    function parseTextAndFormatSources(text, accentColor, kaynaklar) {
        if (!text) return "";
        let html = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="_blank" style="color: ${accentColor}; text-decoration: underline; font-weight: 600;">$1</a>`);
        
        html = html.replace(/(?:\(|\[)Kaynak\s*([\d,\s]+)(?:\)|\])/gi, (match, numbersStr) => {
            const numbers = numbersStr.split(',').map(n => n.trim()).filter(n => n);
            let links = numbers.map(numStr => {
                const idx = parseInt(numStr, 10) - 1; 
                if (kaynaklar && kaynaklar[idx] && kaynaklar[idx].url) {
                    return `<a href="${kaynaklar[idx].url}" target="_blank" style="color: ${accentColor}; text-decoration: underline; font-weight:bold;">Kaynak ${numStr}</a>`;
                }
                return `Kaynak ${numStr}`; 
            });
            return `(${links.join(', ')})`;
        });
        
        return html;
    }

    function buildWidget() {
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
            #k-widget-host { position: fixed; bottom: 20px; right: 20px; z-index: 999999; font-family: system-ui, sans-serif; }
            .k-chat-btn { width: 60px; height: 60px; border-radius: 50%; background: ${widgetConfig.primaryColor}; color: white; display: flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.3s; font-size: 24px; }
            .k-chat-btn:hover { transform: scale(1.05); }
            .k-panel { display: none; width: 380px; height: 600px; background: white; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); flex-direction: column; overflow: hidden; position: absolute; bottom: 80px; right: 0; border: 1px solid #e5e7eb; }
            .k-panel.k-open { display: flex; animation: slideUp 0.3s ease; }
            .k-header { background: ${widgetConfig.primaryColor}; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
            .k-header h3 { margin: 0; font-size: 16px; }
            .k-close-btn { background: none; border: none; color: white; cursor: pointer; font-size: 20px; }
            .k-body { flex: 1; padding: 20px; overflow-y: auto; background: #f9fafb; display: flex; flex-direction: column; gap: 12px; }
            .k-msg { max-width: 85%; padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
            .k-msg.bot { background: white; border: 1px solid #e5e7eb; align-self: flex-start; border-bottom-left-radius: 2px; }
            .k-msg.user { background: ${widgetConfig.primaryColor}; color: white; align-self: flex-end; border-bottom-right-radius: 2px; }
            .k-footer { padding: 15px; background: white; border-top: 1px solid #e5e7eb; display: flex; gap: 10px; align-items: center; }
            .k-input { flex: 1; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; outline: none; }
            .k-send-btn { background: ${widgetConfig.primaryColor}; color: white; border: none; padding: 0 20px; border-radius: 8px; cursor: pointer; font-weight: bold; }
            .k-feedback { display: flex; gap: 8px; margin-top: 8px; }
            .k-fb-btn { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 12px; transition: 0.2s; }
            .k-fb-btn:hover { background: #e5e7eb; }
            .k-source-dot { display: inline-block; width: 22px; height: 22px; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border: 2px solid white; margin-left: -8px; position: relative; cursor: default; }
            .k-source-dot:first-child { margin-left: 0; }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `;
        document.head.appendChild(styleEl);

        const host = document.createElement('div');
        host.id = 'k-widget-host';

        host.innerHTML = `
            <div class="k-panel" id="k-panel">
                <div class="k-header">
                    <div>
                        <h3>${widgetConfig.aiName}</h3>
                        <div style="font-size:12px; opacity:0.8; margin-top:4px;">Dijital Asistan</div>
                    </div>
                    <button class="k-close-btn" id="k-close">✖</button>
                </div>
                <div class="k-body" id="k-body">
                    <div class="k-msg bot">${widgetConfig.greetingText}</div>
                </div>
                <div class="k-footer">
                    <input type="text" class="k-input" id="k-input" placeholder="${widgetConfig.inputPlaceholder}">
                    <button class="k-send-btn" id="k-send">Gönder</button>
                </div>
            </div>
            <div class="k-chat-btn" id="k-toggle">💬</div>
        `;
        document.body.appendChild(host);

        const toggleBtn = document.getElementById('k-toggle');
        const closeBtn = document.getElementById('k-close');
        const panel = document.getElementById('k-panel');
        const body = document.getElementById('k-body');
        const input = document.getElementById('k-input');
        const sendBtn = document.getElementById('k-send');

        toggleBtn.onclick = () => { panel.classList.toggle('k-open'); if(panel.classList.contains('k-open')) input.focus(); };
        closeBtn.onclick = () => panel.classList.remove('k-open');

        if (widgetConfig.cmsProactiveChat) {
            setTimeout(() => { panel.classList.add('k-open'); }, 3000);
        }

        function appendMsg(text, isUser) {
            const div = document.createElement('div');
            div.className = `k-msg ${isUser ? 'user' : 'bot'}`;
            div.innerHTML = text; 
            body.appendChild(div);
            body.scrollTop = body.scrollHeight;
            return div;
        }

        async function handleSend() {
            const text = input.value.trim();
            if(!text) return;
            
            appendMsg(text, true);
            input.value = '';
            
            const textLower = text.toLowerCase().replace(/[^a-z0-9ğüşöçiı]/gi, '');
            const greetings = ['selam', 'merhaba', 'merhabalar', 'selamlar', 'iyigunler', 'kolaygelsin'];
            if (greetings.includes(textLower)) {
                setTimeout(() => {
                    appendMsg("Merhaba! Size Konya Büyükşehir Belediyesi hizmetleri hakkında nasıl yardımcı olabilirim?", false);
                }, 400);
                return; 
            }
            
            const botDiv = appendMsg("...", false);
            
            try {
                const res = await fetch(`${WIDGET_URL}/ask`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: sessionId, soru: text, site_key: siteKey })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    const finalResponse = data.cevap || "Cevap alınamadı.";
                    const kaynaklar = data.kaynaklar || [];
                    
                    let cleanText = parseTextAndFormatSources(finalResponse, widgetConfig.primaryColor, kaynaklar);
                    let sourcesHtml = '';
                    if (kaynaklar.length > 0) {
                        const uniqueKaynaklar = [];
                        const seenUrls = new Set();
                        for (const k of kaynaklar) {
                            if (k.url && !seenUrls.has(k.url)) {
                                seenUrls.add(k.url);
                                uniqueKaynaklar.push(k);
                            }
                        }
                        
                        const displayKaynaklar = uniqueKaynaklar.slice(0, 3);
                        
                        if (displayKaynaklar.length > 0) {
                            sourcesHtml += '<div style="display: flex; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb; align-items: center;">';
                            sourcesHtml += '<div style="display: flex; padding-left: 5px;">'; 
                            
                            displayKaynaklar.forEach((k) => {
                                let bgColor = '#9ca3af'; 
                                const urlLower = (k.url || '').toLowerCase();
                                const baslikLower = (k.baslik || '').toLowerCase();
                                
                                if (urlLower.includes('koski') || baslikLower.includes('koski')) bgColor = '#3b82f6'; 
                                else if (urlLower.includes('komek') || baslikLower.includes('komek')) bgColor = '#f59e0b'; 
                                else if (urlLower.includes('konyakart') || baslikLower.includes('konyakart') || urlLower.includes('elkart')) bgColor = '#10b981'; 
                                else if (urlLower.includes('konya') || baslikLower.includes('belediye')) bgColor = '#ef4444'; 
                                
                                sourcesHtml += `<div class="k-source-dot" style="background-color: ${bgColor};"></div>`;
                            });
                            
                            sourcesHtml += '</div></div>';
                        }
                    }
                    
                    botDiv.innerHTML = cleanText + sourcesHtml;
                    
                    const fbDiv = document.createElement('div');
                    fbDiv.className = 'k-feedback';
                    fbDiv.innerHTML = `<button class="k-fb-btn" data-like="1">👍</button><button class="k-fb-btn" data-like="0">👎</button>`;
                    
                    fbDiv.querySelectorAll('button').forEach(btn => {
                        btn.onclick = async () => {
                            fbDiv.innerHTML = `<span style="font-size:12px; color:gray;">Geri bildirim kaydedildi ✓</span>`;
                            await fetch(`${WIDGET_URL}/feedback`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ session_id: sessionId, soru: text, cevap: cleanText, puan: btn.getAttribute('data-like') === "1" ? "like" : "dislike" })
                            });
                        };
                    });
                    body.appendChild(fbDiv);
                    body.scrollTop = body.scrollHeight;

                } else { botDiv.innerText = "Bağlantı hatası."; }
            } catch (e) { botDiv.innerText = "Sunucuya ulaşılamıyor."; }
        }

        sendBtn.onclick = handleSend;
        input.onkeypress = (e) => { if(e.key === 'Enter') handleSend(); };
    }

    fetchConfig();
})();