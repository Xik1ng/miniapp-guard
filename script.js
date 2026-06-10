const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const initData = tg.initData;
const initDataUnsafe = tg.initDataUnsafe;
const userId = initDataUnsafe.user?.id;

let isProcessing = false;

const API_BASE = "ДОМЕН";

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

async function refreshStatus() {
    try {
        const data = await callAPI('subscription/status');
        
        if (data.has_subscription) {
            updateStatusUI(true, data.expiry_date);
        } else {
            updateStatusUI(false);
        }
    } catch (error) {
        console.error('Error fetching status:', error);
        document.getElementById('statusBadge').innerHTML = '❌ Ошибка загрузки';
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
    btn.innerHTML = '<span class="loader"></span> Обработка...';
    btn.style.opacity = '0.7';
    
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
        btn.innerHTML = originalText;
        btn.style.opacity = '1';
        isProcessing = false;
    }
}

async function getConfig() {
    if (isProcessing) return;
    isProcessing = true;
    
    const btn = document.getElementById('configBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loader"></span> Загрузка...';
    btn.disabled = true;
    
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
        btn.innerHTML = originalText;
        btn.disabled = false;
        isProcessing = false;
    }
}

function showInstruction() {
    tg.showPopup({
        title: '📖 Инструкция',
        message: '1. Скачай Happ (Android/iOS) или v2rayNG (Android)\n2. Нажми «Добавить подписку»\n3. Вставь ссылку из бота\n4. Подключись!',
        buttons: [{id: 'ok', type: 'ok', text: 'Понятно'}]
    });
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
    showInstruction();
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