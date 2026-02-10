
// ==UserScript==
// @name         QruxWare Heart-Strike V17 (STABLE FIX)
// @namespace    http://tampermonkey.net/
// @version      17.0
// @description  V15 Çekirdeği + Doğru Filtreleme (Avrupa/Amerika/TR Korumalı)
// @author       Özgür Çağan Demiröz / QruxWare
// @match        https://music.youtube.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- AYARLAR ---
    const CONFIG = {
        // İstenmeyen kelimeler (Spam)
        spam: ["Nhạc", "Bolero", "Dj Remix", "Remix Thai", "Arabic Remix"],

        // --- HEDEF ALFABELER (BLACKLIST) ---
        // Bu regex SADECE şu dilleri vurur:
        // Arapça (\u0600-\u06FF)
        // Hintçe/Devanagari (\u0900-\u097F)
        // Çince/Japonca/Korece (\u4E00-\u9FFF ve diğerleri)
        // Kiril/Rusça (\u0400-\u04FF)
        // Tayca (\u0E00-\u0E7F)
        targetRegex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0E00-\u0E7F]/,

        speed: 1000
    };

    let active = false;
    let count = 0;

    // --- STİL (V15'ten alındı - Çalışan Versiyon) ---
    const injectStyle = () => {
        const style = document.createElement('style');
        style.textContent = `
            #qrux-shell {
                position: fixed !important; top: 15px !important; right: 15px !important;
                width: 280px !important; background: #000 !important; border: 2px solid #00ff00 !important;
                color: #00ff00 !important; z-index: 9999999 !important; padding: 15px !important;
                font-family: 'Courier New', monospace !important; box-shadow: 0 0 20px #00ff00 !important; border-radius: 10px !important;
            }
            .q-btn {
                width: 100%; padding: 12px; background: #00ff00; color: #000;
                font-weight: bold; border: none; cursor: pointer; margin-top: 10px; text-transform: uppercase;
            }
            .q-log { font-size: 11px; color: #fff; margin-top: 8px; height: 35px; overflow: hidden; border-left: 2px solid #00ff00; padding-left: 5px; }
            #qrux-counter { color: #ff0000; font-weight: bold; font-size: 16px; }
        `;
        document.documentElement.appendChild(style);
    };

    // --- UI OLUŞTURMA ---
    const createUI = () => {
        if (document.getElementById('qrux-shell')) return;

        const shell = document.createElement('div');
        shell.id = 'qrux-shell';

        const header = document.createElement('div');
        header.style.textAlign = 'center';
        header.style.borderBottom = '1px solid #00ff00';
        header.style.paddingBottom = '8px';
        header.textContent = 'QRUXWARE V17 STABLE';

        const logDiv = document.createElement('div');
        logDiv.id = 'qrux-status';
        logDiv.className = 'q-log';
        logDiv.textContent = 'Sistem Hazır. (Avrupa/TR Korumalı)';

        const counterDiv = document.createElement('div');
        counterDiv.style.margin = '15px 0 5px 0';
        counterDiv.textContent = 'SİLİNEN: ';
        const counterSpan = document.createElement('span');
        counterSpan.id = 'qrux-counter';
        counterSpan.textContent = '0';
        counterDiv.appendChild(counterSpan);

        const btn = document.createElement('button');
        btn.id = 'qrux-trigger';
        btn.className = 'q-btn';
        btn.textContent = 'BAŞLAT';
        btn.onclick = toggle;

        shell.appendChild(header);
        shell.appendChild(logDiv);
        shell.appendChild(counterDiv);
        shell.appendChild(btn);

        document.documentElement.appendChild(shell);
    };

    const toggle = () => {
        active = !active;
        const btn = document.getElementById('qrux-trigger');
        btn.textContent = active ? "DURDUR" : "BAŞLAT";
        btn.style.background = active ? "#333" : "#00ff00";
        btn.style.color = active ? "#fff" : "#000";
        if(active) run();
    };

    // --- SHADOW DOM DELİCİ ---
    const findInShadow = (root, selector) => {
        let found = root.querySelector(selector);
        if (found) return found;
        const children = root.querySelectorAll('*');
        for (let child of children) {
            if (child.shadowRoot) {
                found = findInShadow(child.shadowRoot, selector);
                if (found) return found;
            }
        }
        return null;
    };

    // --- ANA OPERASYON ---
    const run = async () => {
        while (active) {
            const items = document.querySelectorAll('ytmusic-responsive-list-item-renderer:not([q-done])');

            if (items.length === 0) {
                window.scrollBy(0, 1000);
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }

            for (let item of items) {
                if (!active) break;
                item.setAttribute('q-done', 'true');

                const titleEl = item.querySelector('.title-column');
                if (!titleEl) continue;
                const title = titleEl.innerText.trim();

                // FİLTRE MANTIĞI:
                // Sadece yasaklı alfabeyi (Regex) veya Spam kelimeleri içeriyorsa TRUE döner.
                // Latin alfabesi (İngilizce/Türkçe/Avrupa) bu regex'e takılmaz.
                let kill = CONFIG.targetRegex.test(title) || CONFIG.spam.some(s => title.includes(s));

                if (kill) {
                    item.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    document.getElementById('qrux-status').textContent = "HEDEF: " + title.substring(0, 20);

                    const likeRenderer = item.querySelector('ytmusic-like-button-renderer');
                    if (likeRenderer) {
                        const status = likeRenderer.getAttribute('like-status');
                        if (status === 'LIKE') {
                            const btn = findInShadow(likeRenderer, 'button') || likeRenderer.querySelector('button');
                            if (btn) {
                                btn.click();
                                count++;
                                document.getElementById('qrux-counter').textContent = count;
                                item.style.backgroundColor = "rgba(255, 0, 0, 0.4)";
                                item.style.opacity = "0.2";
                                await new Promise(r => setTimeout(r, CONFIG.speed));
                            }
                        }
                    }
                } else {
                    // Güvenli Şarkı (Yeşil Çizgi)
                    item.style.borderLeft = "4px solid #00ff00";
                }
            }
            await new Promise(r => setTimeout(r, 100));
        }
    };

    // Başlatıcı
    const init = setInterval(() => {
        if (document.documentElement) {
            injectStyle();
            createUI();
            clearInterval(init);
        }
    }, 500);

})();
