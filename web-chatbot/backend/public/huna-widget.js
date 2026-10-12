(function () {
    const scriptEl = document.currentScript;
    const SITE_KEY = (scriptEl && scriptEl.getAttribute('data-site-key')) || 'default';
    
    // 🔗 PYTHON SUNUCUSUNA DOĞRUDAN BAĞLANTI 
    const BACKEND_URL = 'http://127.0.0.1:8000';

    const CHAT_STORAGE_KEY = `huna_chat_session_${SITE_KEY}`;
    let conversationHistory = [];

    function getVisitorId() {
        try {
            let id = localStorage.getItem('huna_visitor_id');
            if (!id) {
                id = crypto.randomUUID();
                localStorage.setItem('huna_visitor_id', id);
            }
            return id;
        } catch (e) {
            return 'no-storage';
        }
    }

    function getRagSessionId() {
        try { return localStorage.getItem('huna_rag_session_id'); } catch (e) { return null; }
    }
    function setRagSessionId(id) {
        try { localStorage.setItem('huna_rag_session_id', id); } catch (e) {}
    }

    let currentLang = 'TR';
    let welcomeBubbleEl = null;
    let abortController = null;
    let chatGeneration = 0;

    const DEFAULT_CONFIG = {
        color: '#0B3D62',
        subtitle: 'Konya Büyükşehir Dijital Asistan',
        welcomeMessage: 'Merhaba! Size nasıl yardımcı olabilirim? 🌟',
        botName: 'Kurumsal RAG',
        position: 'right',
        logoEmoji: '🤖',
        logoUrl: '',
        faqList: [],
        allowImageUpload: true,
        allowedFileTypes: { image: true, pdf: true, docx: false }
    };

    const GENERIC_EN_FAQ = ['What services does the municipality provide?', 'How can I make an appointment?'];

    const TEXT = {
        TR: {
            placeholder: 'Mesajınızı yazın...',
            welcome: (cfg) => cfg.welcomeMessage,
            stop: 'Durdur',
            stoppedMsg: 'Yanıt durduruldu.',
            errOffline: 'İnternet bağlantınız koptu.',
            err500: 'Sunucuda bir hata oluştu.',
            errEmpty: 'Sunucudan boş yanıt geldi.',
            errGeneric: 'Python servisine şu an ulaşılamıyor.',
            retry: 'Tekrar Dene',
            sss: 'ÖRNEK SORULAR'
        },
        EN: {
            placeholder: 'Type your message...',
            welcome: () => 'Hello! I am your digital assistant.',
            stop: 'Stop',
            stoppedMsg: 'Response stopped.',
            errOffline: 'You are offline.',
            err500: 'Server error.',
            errEmpty: 'Empty response.',
            errGeneric: 'Service unreachable.',
            retry: 'Retry',
            sss: 'FAQ'
        }
    };

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const SAFE_LINK_SCHEME = /^(https?:|tel:|mailto:)/i;
    function renderMarkdownLite(text) {
        let html = escapeHtml(text);
        html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
            if (!SAFE_LINK_SCHEME.test(url)) return label;
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; font-weight: bold;">${label}</a>`;
        });
        html = html.replace(/(^|\n)[-*] (.+)/g, '$1<li>$2</li>');
        html = html.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    function buildAcceptAttr(widgetConfig) {
        const parts = [];
        if (widgetConfig.allowedFileTypes?.image) parts.push('image/jpeg', 'image/png', 'image/webp');
        if (widgetConfig.allowedFileTypes?.pdf) parts.push('application/pdf');
        return parts.join(',');
    }

    async function fetchPublicConfig() {
        try {
            // Admin Panelinden (Python'dan) Canlı Ayarları Çeker
            const res = await fetch(`${BACKEND_URL}/admin/settings`);
            if (!res.ok) throw new Error('config fetch failed');
            const data = await res.json();
            return { 
                ...DEFAULT_CONFIG, 
                color: data.accentColor || DEFAULT_CONFIG.color,
                botName: data.aiName || DEFAULT_CONFIG.botName,
                welcomeMessage: data.greetingText || DEFAULT_CONFIG.welcomeMessage,
                faqList: data.suggestedPrompts ? data.suggestedPrompts.split(',').map(s => s.trim()) : []
            };
        } catch (e) {
            return DEFAULT_CONFIG;
        }
    }

    function buildWidget(widgetConfig) {
        const isLeft = widgetConfig.position === 'left';
        const sideProp = isLeft ? 'left' : 'right';

        const hostElement = document.createElement('div');
        hostElement.id = 'huna-widget-host';
        hostElement.style.position = 'absolute';
        hostElement.style.zIndex = '2147483647';
        document.body.appendChild(hostElement);

        const shadow = hostElement.attachShadow({ mode: 'open' });

        const template = document.createElement('template');
        template.innerHTML = `
        <style>
            .msg-bubble p { margin: 0 0 8px 0; line-height: 1.5; }
            .msg-bubble ul { margin: 8px 0; padding-left: 20px; }
            .msg-bubble li { margin-bottom: 4px; }
            .msg-bubble strong { font-weight: 700; color: #111; }
            :host { --huna-primary: ${widgetConfig.color}; font-family: 'Segoe UI', Tahoma, sans-serif; }
            .huna-widget-container { position: fixed; bottom: 30px; ${sideProp}: 30px; z-index: 999999; pointer-events: none; }
            .huna-fab { width: 60px; height: 60px; border-radius: 50%; background: var(--huna-primary); color: white; border: none; font-size: 24px; cursor: pointer; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); transition: transform 0.2s ease; display: flex; align-items: center; justify-content: center; pointer-events: auto; }
            .huna-fab:hover { transform: scale(1.05); }
            .huna-panel { position: fixed; bottom: 110px; ${sideProp}: 30px; pointer-events: auto; width: 380px; height: 550px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); display: flex; flex-direction: column; overflow: hidden; transition: opacity 0.2s ease, transform 0.2s ease; }
            .huna-panel.hidden { opacity: 0; transform: scale(0.95); pointer-events: none; }
            #huna-chat-header { display: flex; justify-content: space-between; align-items: center; background-color: var(--huna-primary); color: white; padding: 15px 20px; cursor: move; }
            .header-profile { display: flex; align-items: center; gap: 12px; }
            .huna-avatar { width: 40px; height: 40px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 2px solid white; }
            .huna-sss-toggle { width: 100%; padding: 12px 16px; font-size: 10px; font-weight: bold; color: #999; text-transform: uppercase; background: white; border: none; border-top: 1px solid #f0f0f0; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
            .huna-sss-list { padding: 8px; border-top: 1px solid #f0f0f0; background: #f8f9fa; display: none; }
            .huna-sss-list.open { display: block; }
            .huna-sss-item { display: block; width: 100%; text-align: left; padding: 10px 12px; margin-bottom: 4px; background: none; border: none; border-radius: 8px; font-size: 13px; color: #555; cursor: pointer; }
            .huna-sss-item:hover { background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
            .header-info h3 { margin: 0; font-size: 16px; font-weight: 600; }
            .header-info p { margin: 2px 0 0 0; font-size: 12px; opacity: 0.9; }
            .huna-header-actions { display: flex; align-items: center; gap: 15px; }
            #huna-close-btn, #huna-reset-btn { background: transparent; border: none; color: white; font-size: 22px; cursor: pointer; opacity: 0.85; }
            #huna-close-btn:hover, #huna-reset-btn:hover { opacity: 1; }
            .huna-chat-body { flex: 1; padding: 20px; background-color: #f8f9fa; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
            .message { display: flex; width: 100%; }
            .message.bot { justify-content: flex-start; }
            .message.user { justify-content: flex-end; }
            .msg-bubble { max-width: 80%; padding: 12px 16px; border-radius: 14px; font-size: 14px; line-height: 1.4; word-wrap: break-word; }
            .message.bot .msg-bubble { background-color: #ffffff; color: #333; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-bottom-left-radius: 2px; }
            .message.user .msg-bubble { background-color: var(--huna-primary); color: white; border-bottom-right-radius: 2px; }
            .huna-feedback { display: flex; gap: 2px; margin-top: 5px; margin-left: 4px; }
            .huna-feedback button { background: rgba(0,0,0,0.05); border: none; font-size: 14px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: 0.2s; }
            .huna-feedback button:hover:not(:disabled) { background: rgba(0,0,0,0.1); transform: scale(1.1); }
            .huna-feedback button.active { background: var(--huna-primary); color: white; }
            .huna-input-area { padding: 15px; background-color: white; border-top: 1px solid #eee; display: flex; gap: 10px; }
            .huna-input-area input { flex: 1; border: 1px solid #ddd; padding: 12px; border-radius: 8px; outline: none; }
            .huna-input-area button { background-color: var(--huna-primary); color: white; border: none; width: 45px; height: 45px; border-radius: 8px; cursor: pointer; }
            .huna-attach-btn { background: none !important; color: #777 !important; font-size: 18px; }
            .huna-attachment-preview { padding: 8px 15px 0 15px; background: white; }
            .huna-attachment-chip { display: inline-flex; align-items: center; gap: 6px; background: #f0f0f0; border-radius: 10px; padding: 5px 10px; font-size: 11px; }
            .huna-attachment-chip button { background: none; border: none; color: #ef4444; cursor: pointer; }
        </style>

        <div class="huna-widget-container">
            <button id="huna-toggle-btn" class="huna-fab">${widgetConfig.logoEmoji}</button>
            <div id="huna-chat-panel" class="huna-panel hidden">
                <div id="huna-chat-header">
                    <div class="header-profile">
                        <div class="huna-avatar">${widgetConfig.logoEmoji}</div>
                        <div class="header-info">
                            <h3>${escapeHtml(widgetConfig.botName)}</h3>
                            <p>${escapeHtml(widgetConfig.subtitle)}</p>
                        </div>
                    </div>
                    <div class="huna-header-actions">
                        <button id="huna-reset-btn" title="Sıfırla">↺</button>
                        <button id="huna-close-btn">&times;</button>
                    </div>
                </div>
                <div class="huna-chat-body"></div>
                <button id="huna-sss-toggle" class="huna-sss-toggle" style="${widgetConfig.faqList.length ? '' : 'display:none;'}">
                    <span id="huna-sss-label">${t().sss} ▾</span>
                </button>
                <div id="huna-sss-list" class="huna-sss-list"></div>
                <div id="huna-attachment-preview" class="huna-attachment-preview"></div>
                <div class="huna-input-area">
                    <input type="file" id="huna-file-input" accept="${escapeHtml(buildAcceptAttr(widgetConfig))}" style="display:none">
                    <button id="huna-attach-btn" class="huna-attach-btn" type="button">📎</button>
                    <input type="text" id="huna-user-input" placeholder="Mesajınızı yazın..." autocomplete="off">
                    <button id="huna-send-btn">➤</button>
                </div>
            </div>
        </div>
        `;

        shadow.appendChild(template.content.cloneNode(true));

        const toggleBtn = shadow.getElementById('huna-toggle-btn');
        const closeBtn = shadow.getElementById('huna-close-btn');
        const resetBtn = shadow.getElementById('huna-reset-btn');
        const chatPanel = shadow.getElementById('huna-chat-panel');
        const sendBtn = shadow.getElementById('huna-send-btn');
        const userInput = shadow.getElementById('huna-user-input');
        const chatBody = shadow.querySelector('.huna-chat-body');
        const sssToggle = shadow.getElementById('huna-sss-toggle');
        const sssList = shadow.getElementById('huna-sss-list');
        const fileInput = shadow.getElementById('huna-file-input');
        const attachBtn = shadow.getElementById('huna-attach-btn');
        const attachmentPreview = shadow.getElementById('huna-attachment-preview');

        let currentAttachment = null;
        function t() { return TEXT[currentLang]; }

        function renderAttachmentPreview() {
            attachmentPreview.innerHTML = '';
            if (currentAttachment) {
                const chip = document.createElement('div');
                chip.className = 'huna-attachment-chip';
                chip.innerHTML = `<span>📎 ${currentAttachment.fileName}</span> <button>✕</button>`;
                chip.querySelector('button').onclick = () => { currentAttachment = null; renderAttachmentPreview(); };
                attachmentPreview.appendChild(chip);
            }
        }

        // ==========================================
        // YENİ GERİ BİLDİRİM (👍/👎) SİSTEMİ
        // ==========================================
        function sendFeedback(userMessage, botReply, rating) {
            fetch(`${BACKEND_URL}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    session_id: getRagSessionId() || getVisitorId(), 
                    soru: userMessage, 
                    cevap: botReply, 
                    puan: rating === 'up' ? 'like' : 'dislike'
                })
            }).then(res => {
                if(res.ok) console.log("✅ Geri bildirim Python sunucusuna ulaştı!");
            }).catch(() => console.error('❌ Geri bildirim gönderilemedi.'));
        }

        function appendMessage(text, sender, { isError = false, forUserMessage = null } = {}) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', sender);
            const bubbleDiv = document.createElement('div');
            bubbleDiv.classList.add('msg-bubble');
            if (isError) bubbleDiv.classList.add('error');
            bubbleDiv.innerHTML = renderMarkdownLite(text);
            messageDiv.appendChild(bubbleDiv);

            const wrap = document.createElement('div');
            wrap.style.display = 'flex';
            wrap.style.flexDirection = 'column';
            wrap.style.alignItems = sender === 'user' ? 'flex-end' : 'flex-start';
            wrap.appendChild(messageDiv);

            // Bot cevabıysa ve hata değilse Beğeni Butonlarını Çıkar
            if (sender === 'bot' && !isError && forUserMessage) {
                const feedbackDiv = document.createElement('div');
                feedbackDiv.className = 'huna-feedback';
                const upBtn = document.createElement('button'); upBtn.textContent = '👍';
                const downBtn = document.createElement('button'); downBtn.textContent = '👎';
                
                const rate = (rating, btn) => {
                    upBtn.disabled = true; downBtn.disabled = true;
                    btn.classList.add('active');
                    sendFeedback(forUserMessage, text, rating);
                };
                upBtn.onclick = () => rate('up', upBtn);
                downBtn.onclick = () => rate('down', downBtn);
                
                feedbackDiv.appendChild(upBtn);
                feedbackDiv.appendChild(downBtn);
                wrap.appendChild(feedbackDiv);
            }

            chatBody.appendChild(wrap);
            chatBody.scrollTop = chatBody.scrollHeight;
            return bubbleDiv;
        }

        function renderWelcomeMessage() {
            if (welcomeBubbleEl) return;
            welcomeBubbleEl = appendMessage(t().welcome(widgetConfig), 'bot');
        }

        function renderFaqList() {
            sssList.innerHTML = '';
            widgetConfig.faqList.forEach((q) => {
                const btn = document.createElement('button');
                btn.className = 'huna-sss-item';
                btn.textContent = q;
                btn.onclick = () => { sssList.classList.remove('open'); appendMessage(q, 'user'); sendMessage(q); };
                sssList.appendChild(btn);
            });
        }

        async function sendMessage(userMessage, attachment) {
            conversationHistory.push({ role: 'user', content: userMessage });
            userInput.disabled = true; sendBtn.disabled = true;

            const typingDiv = document.createElement('div');
            typingDiv.className = 'message bot';
            typingDiv.innerHTML = '<div class="msg-bubble">…</div>';
            chatBody.appendChild(typingDiv);
            chatBody.scrollTop = chatBody.scrollHeight;

            try {
                // 🔗 PYTHON'UN /ask UÇ NOKTASINA İSTEK AT
                const res = await fetch(`${BACKEND_URL}/ask`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        soru: userMessage, 
                        session_id: getRagSessionId() || getVisitorId(),
                        dosya_base64: attachment ? attachment.dataUrl : null
                    })
                });

                if (!res.ok) throw new Error('SERVER_ERROR');
                const data = await res.json();
                
                if (data.session_id) setRagSessionId(data.session_id);

                typingDiv.remove();
                userInput.disabled = false; sendBtn.disabled = false; userInput.focus();
                
                appendMessage(data.cevap, 'bot', { forUserMessage: userMessage });
                conversationHistory.push({ role: 'assistant', content: data.cevap });
            } catch (error) {
                typingDiv.remove();
                userInput.disabled = false; sendBtn.disabled = false;
                appendMessage("Python sunucusuna bağlanılamadı. Lütfen tekrar deneyin.", 'bot', { isError: true });
            }
        }

        function handleSend() {
            const text = userInput.value.trim();
            if (!text) return;
            const attachment = currentAttachment;
            appendMessage(attachment ? `${text}\n\n📎 ${attachment.fileName}` : text, 'user');
            userInput.value = '';
            currentAttachment = null;
            renderAttachmentPreview();
            sendMessage(text, attachment);
        }

        sendBtn.addEventListener('click', handleSend);
        userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

        if (attachBtn && fileInput) {
            attachBtn.onclick = () => fileInput.click();
            fileInput.onchange = () => {
                const file = fileInput.files[0];
                fileInput.value = '';
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => { currentAttachment = { dataUrl: reader.result, fileName: file.name }; renderAttachmentPreview(); };
                reader.readAsDataURL(file);
            };
        }

        toggleBtn.onclick = () => { chatPanel.classList.toggle('hidden'); if (!chatPanel.classList.contains('hidden')) userInput.focus(); };
        closeBtn.onclick = () => chatPanel.classList.add('hidden');
        resetBtn.onclick = () => { conversationHistory = []; chatBody.innerHTML = ''; welcomeBubbleEl = null; renderWelcomeMessage(); };
        sssToggle.onclick = () => sssList.classList.toggle('open');

        renderWelcomeMessage();
        renderFaqList();
    }

    fetchPublicConfig().then(buildWidget);
})();
