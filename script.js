const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const initData = tg.initData;
const initDataUnsafe = tg.initDataUnsafe;
const userId = initDataUnsafe.user?.id;

let isProcessing = false;

const API_BASE = "https://ТВОЙ_ДОМЕН/api";

async function callAPI(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData
    };
    
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${API_BASE}/${endpoint}`, options);
    return response.json();
}

function updateStatusUI(hasSubscription, expiryDate = null) {
    const badge = document.getElementById('statusBadge');
    const expiryText = document.getElementById('expiryText');
    const configBtn = document.getElementById('configBtn');
    
    if (hasSubscription) {
        badge.className = 'status-badge active';
        badge.innerHTML = '✅ Подписка активна';
        expiryText.innerHTML = `Действует до: <strong>${expiryDate}</strong>`;
        configBtn.style.display = 'block';
    } else {
        badge.className = 'status-badge inactive';
        badge.innerHTML = '❌ Нет активной подписки';
        expiryText.innerHTML = 'Купите подписку, чтобы пользоваться VPN';
        configBtn.style.display = 'none';
    }
}

function showLoading(btn, text) {
    const originalWidth = btn.offsetWidth;
    btn.style.width = originalWidth + 'px';
    btn.innerHTML = '<span class="loader-spinner"></span> ' + text;
    btn.disabled = true;
    btn.classList.add('btn-loading-active');
}

function hideLoading(btn, originalText) {
    btn.innerHTML = originalText;
    btn.disabled = false;
    btn.classList.remove('btn-loading-active');
    btn.style.width = '';
}

async function refreshStatus() {
    const refreshBtn = document.getElementById('refreshBtn');
    const originalText = refreshBtn.innerHTML;
    
    showLoading(refreshBtn, 'ОБНОВЛЕНИЕ...');
    
    try {
        const data = await callAPI('subscription/status');
        
        if (data.has_subscription) {
            updateStatusUI(true, data.expiry_date);
            tg.showAlert('✅ Статус обновлён! Подписка активна.');
        } else {
            updateStatusUI(false);
            tg.showAlert('🔄 Статус обновлён. Подписка неактивна.');
        }
    } catch (error) {
        console.error('Error fetching status:', error);
        document.getElementById('statusBadge').innerHTML = '❌ Ошибка загрузки';
        tg.showAlert('❌ Не удалось обновить статус. Попробуй позже.');
    } finally {
        setTimeout(() => {
            hideLoading(refreshBtn, originalText);
        }, 500);
    }
}

async function selectTariff(days, price) {
    if (isProcessing) return;
    isProcessing = true;
    
    const tariffCards = document.querySelectorAll('.tariff-card');
    let btn = null;
    
    for (let card of tariffCards) {
        if (card.getAttribute('data-days') == days) {
            btn = card;
            break;
        }
    }
    
    const originalText = btn.innerHTML;
    showLoading(btn, 'ОБРАБОТКА...');
    
    try {
        const data = await callAPI('payment/create', 'POST', { days: days, price: price });
        
        if (data.payment_url) {
            tg.openLink(data.payment_url);
        } else if (data.invoice_link) {
            tg.openInvoice(data.invoice_link, (status) => {
                if (status === 'paid') {
                    refreshStatus();
                    tg.showAlert('✅ Оплата прошла успешно! Подписка активирована.');
                }
            });
        } else {
            tg.showAlert('⚠️ Демо-режим: подписка активирована без оплаты');
            await callAPI('demo/activate', 'POST', { days: days });
            refreshStatus();
        }
    } catch (error) {
        console.error('Error creating payment:', error);
        tg.showAlert('❌ Ошибка! Попробуйте позже');
    } finally {
        setTimeout(() => {
            hideLoading(btn, originalText);
            isProcessing = false;
        }, 500);
    }
}

async function getConfig() {
    if (isProcessing) return;
    isProcessing = true;
    
    const btn = document.getElementById('configBtn');
    const originalText = btn.innerHTML;
    
    showLoading(btn, 'ЗАГРУЗКА...');
    
    try {
        const data = await callAPI('vpn/config');
        
        if (data.config_url || data.subscription_url) {
            const url = data.config_url || data.subscription_url;
            tg.showPopup({
                title: '🔗 Ссылка для подключения',
                message: 'Скопируй ссылку и вставь её в приложение Happ или v2rayNG',
                buttons: [
                    {id: 'copy', type: 'default', text: '📋 Копировать'},
                    {id: 'close', type: 'cancel', text: 'Закрыть'}
                ]
            }, (buttonId) => {
                if (buttonId === 'copy') {
                    tg.copyToClipboard(url);
                    tg.showAlert('✅ Ссылка скопирована!');
                }
            });
        } else {
            tg.showAlert('❌ Конфиг не найден. Возможно, подписка неактивна.');
        }
    } catch (error) {
        console.error('Error getting config:', error);
        tg.showAlert('❌ Ошибка при получении конфига');
    } finally {
        setTimeout(() => {
            hideLoading(btn, originalText);
            isProcessing = false;
        }, 500);
    }
}

function showInstruction() {
    window.location.href = 'instruction-ru.html';
}

document.querySelectorAll('.tariff-card').forEach(card => {
    card.addEventListener('click', () => {
        const days = parseInt(card.getAttribute('data-days'));
        const price = parseInt(card.getAttribute('data-price'));
        selectTariff(days, price);
    });
});

document.getElementById('configBtn').addEventListener('click', getConfig);
document.getElementById('refreshBtn').addEventListener('click', refreshStatus);
document.getElementById('instructionLink').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'instruction-ru.html';
});
document.getElementById('supportLink1').addEventListener('click', (e) => {
    e.preventDefault();
    tg.openTelegramLink('https://t.me/nuizac');
});
document.getElementById('supportLink2').addEventListener('click', (e) => {
    e.preventDefault();
    tg.openTelegramLink('https://t.me/Ecluzs');
});

tg.MainButton.setText("Закрыть");
tg.MainButton.onClick(() => tg.close());
tg.MainButton.show();

refreshStatus();

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.checked = true;
    }
}

function toggleTheme() {
    if (document.body.classList.contains('light-theme')) {
        document.body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
    }
}

function addThemeSwitch() {
    const header = document.querySelector('.header');
    if (header && !document.querySelector('.theme-switch-wrapper')) {
        const switchWrapper = document.createElement('div');
        switchWrapper.className = 'theme-switch-wrapper';
        switchWrapper.innerHTML = `
            <label class="theme-switch">
                <input type="checkbox" id="themeToggle" onchange="toggleTheme()">
                <span class="slider"></span>
            </label>
        `;
        header.insertBefore(switchWrapper, header.children[1]);
    }
}

initTheme();
addThemeSwitch();

function goToProfile() {
    window.location.href = 'profile.html';
}