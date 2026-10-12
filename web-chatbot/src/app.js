const toggleBtn = document.getElementById('huna-toggle-btn');
const closeBtn = document.getElementById('huna-close-btn');
const chatPanel = document.getElementById('huna-chat-panel');
const sendBtn = document.getElementById('huna-send-btn');
const userInput = document.getElementById('huna-user-input');
const chatBody = document.querySelector('.huna-chat-body');
const chatHeader = document.getElementById('huna-chat-header');
const subtitle = document.getElementById('huna-subtitle');

const sidebar = document.getElementById('huna-sidebar');
const sidebarToggle = document.getElementById('huna-sidebar-toggle');
const sidebarClose = document.getElementById('huna-sidebar-close');
const sidebarMenu = document.querySelector('.sidebar-menu');

const langTr = document.getElementById('lang-tr');
const langEn = document.getElementById('lang-en');

let adminConfig = window.HunaWidgetConfig || {};
const savedAdminData = localStorage.getItem('hunaDatabaseSim');
if (savedAdminData) {
    try {
        const parsedData = JSON.parse(savedAdminData);
        adminConfig.color = parsedData.color || adminConfig.color;
        adminConfig.subtitle = parsedData.subtitle || adminConfig.subtitle;
        adminConfig.welcomeMessage = parsedData.welcomeMessage || adminConfig.welcomeMessage;
        adminConfig.systemPrompt = parsedData.systemPrompt || adminConfig.systemPrompt;
    } catch(e) {
        console.error("Admin ayarları okunamadı.");
    }
}

const widgetSettings = {
    primaryColor: adminConfig.color || '#fbc115',
    subtitleText: adminConfig.subtitle || 'KBB Dijital Asistanı',
    welcomeMessage: adminConfig.welcomeMessage || 'Merhaba! Size nasıl yardımcı olabilirim? 🌟',
    systemPrompt: adminConfig.systemPrompt || "You are Huna, the official AI assistant of Konya Büyükşehir Belediyesi. Always respond in Turkish."
};

let conversationHistory = [{ role: "system", content: widgetSettings.systemPrompt }];

function switchLanguage(lang) {
    if (!langTr || !langEn) return;
    
    if (lang === 'EN') {
        langEn.classList.add('active');
        langTr.classList.remove('active');
        if(userInput) userInput.placeholder = "Type your message...";
        
        conversationHistory = [{ 
            role: "system", 
            content: widgetSettings.systemPrompt + " IMPORTANT: The user switched the language to English. You MUST reply completely in English from now on." 
        }];
        
        if (chatBody) {
            chatBody.innerHTML = '';
            appendMessage("Hello! I am Huna, the digital assistant. How can I help you today?", 'bot');
        }
        
    } else {
        langTr.classList.add('active');
        langEn.classList.remove('active');
        if(userInput) userInput.placeholder = "Mesajınızı yazın...";
        
        conversationHistory = [{ 
            role: "system", 
            content: widgetSettings.systemPrompt 
        }];
        
        if (chatBody) {
            chatBody.innerHTML = '';
            appendMessage(widgetSettings.welcomeMessage, 'bot');
        }
    }
}

if (langTr) langTr.addEventListener('click', (e) => { e.stopPropagation(); switchLanguage('TR'); });
if (langEn) langEn.addEventListener('click', (e) => { e.stopPropagation(); switchLanguage('EN'); });

function setupSidebarEvents() {
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            sidebar.classList.remove('hidden');
        });
    }
    if (sidebarClose && sidebar) {
        sidebarClose.addEventListener('click', (e) => {
            e.preventDefault();
            sidebar.classList.add('hidden');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupSidebarEvents();
    document.documentElement.style.setProperty('--huna-primary', widgetSettings.primaryColor);
    if (subtitle) subtitle.innerText = widgetSettings.subtitleText;

    if (chatBody) {
        chatBody.innerHTML = ''; 
        appendMessage(widgetSettings.welcomeMessage, 'bot');
    }

    if (adminConfig.menuItems && sidebarMenu) {
        sidebarMenu.innerHTML = ''; 
        adminConfig.menuItems.forEach((item, index) => {
            const btn = document.createElement('button');
            btn.classList.add('sidebar-item');
            if (index === 0) btn.classList.add('active');
            
            btn.innerHTML = `<i class="${item.icon || 'fas fa-chevron-right'}"></i> ${item.title}`;
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const activeItem = sidebarMenu.querySelector('.sidebar-item.active');
                if (activeItem) activeItem.classList.remove('active');
                btn.classList.add('active');
            
                if (subtitle) subtitle.innerText = item.subtitle || widgetSettings.subtitleText;
                
                chatBody.innerHTML = '';
                appendMessage(item.welcomeMessage || widgetSettings.welcomeMessage, 'bot');
                conversationHistory = [{ role: "system", content: item.systemPrompt || widgetSettings.systemPrompt }];
                
                if (langTr && langEn) {
                    langTr.classList.add('active');
                    langEn.classList.remove('active');
                    if(userInput) userInput.placeholder = "Mesajınızı yazın...";
                }
                
                if (userInput) userInput.disabled = false;
                if (sendBtn) sendBtn.disabled = false;
                if (userInput) userInput.value = '';
                if (sidebar) sidebar.classList.add('hidden');
            });
            sidebarMenu.appendChild(btn);
        });
    }
});

if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        chatPanel.classList.toggle('hidden');
        if (!chatPanel.classList.contains('hidden') && userInput) userInput.focus();
    });
}
if (closeBtn) {
    closeBtn.addEventListener('click', () => chatPanel.classList.add('hidden'));
}

function appendMessage(text, sender) {
    if (!chatBody) return null;
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('msg-bubble');
    bubbleDiv.innerText = text;
    messageDiv.appendChild(bubbleDiv);
    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
    return bubbleDiv;
}

async function fetchHunaResponse(userMessage) {
    conversationHistory.push({ role: "user", content: userMessage });
    const botBubble = appendMessage("...", 'bot');

    try {
        const configResponse = await fetch('huna-config.json');
        const config = await configResponse.json();

        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.modelName,
                messages: conversationHistory,
                temperature: 0.1,
                stream: true
            })
        });

        if (!response.ok) throw new Error("API hatası " + response.status);
        if (userInput) userInput.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
        botBubble.innerText = "";

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullBotResponse = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6).trim();
                    if (jsonStr === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(jsonStr);
                        const token = parsed.choices[0].delta.content;
                        if (token) {
                            fullBotResponse += token;
                            botBubble.innerText = fullBotResponse;
                            if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
                        }
                    } catch (e) {}
                }
            }
        }
        conversationHistory.push({ role: "assistant", content: fullBotResponse });
    } catch (error) {
        console.error("HUNA API HATASI DETAYI:", error); 
        if (botBubble) botBubble.innerText = "Huna LLM servisine şu an ulaşılamıyor.";
    } finally {
        if (userInput) userInput.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        if (userInput) userInput.focus();
    }
}

function handleSend() {
    if (!userInput) return;
    const text = userInput.value.trim();
    if (text === '') return;
    appendMessage(text, 'user');
    userInput.value = '';
    fetchHunaResponse(text);
}

if (sendBtn) sendBtn.addEventListener('click', handleSend);
if (userInput) userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

if (chatHeader && chatPanel) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
    chatHeader.style.cursor = 'move';
    
    chatHeader.addEventListener('mousedown', (e) => {
        // Dil butonlarına veya kapatma butonuna tıklanırsa sürüklemeyi iptal et
        if (e.target.closest('.huna-header-actions')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = chatPanel.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        e.preventDefault(); 
        chatPanel.style.left = `${initialX}px`;
        chatPanel.style.top = `${initialY}px`;
        chatPanel.style.right = 'auto';
        chatPanel.style.bottom = 'auto';
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    });
    
    function mouseMoveHandler(e) {
        if (!isDragging) return;
        let newLeft = initialX + (e.clientX - startX);
        let newTop = initialY + (e.clientY - startY);
        const panelWidth = chatPanel.offsetWidth;
        const panelHeight = chatPanel.offsetHeight;
        if (newLeft < 0) newLeft = 0;
        if (newLeft + panelWidth > window.innerWidth) newLeft = window.innerWidth - panelWidth;
        if (newTop < 0) newTop = 0;
        if (newTop + panelHeight > window.innerHeight) newTop = window.innerHeight - panelHeight;
        chatPanel.style.left = `${newLeft}px`;
        chatPanel.style.top = `${newTop}px`;
    }
    
    function mouseUpHandler() {
        isDragging = false;
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
    }
}