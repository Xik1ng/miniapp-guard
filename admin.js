const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let users = [];
let currentPage = 0;
const perPage = 10;

async function loadUsers() {
    try {
        const resp = await fetch('/api/admin/users', {
            headers: { 'X-Telegram-Init-Data': tg.initData }
        });
        const data = await resp.json();
        users = data.users || [];
        renderUsers();
        renderStats(data.stats);
    } catch (e) {
        console.error('Ошибка загрузки пользователей:', e);
    }
}

function renderStats(stats) {
    if (!stats) return;
    document.getElementById('totalUsers').textContent = stats.total || 0;
    document.getElementById('activeSubs').textContent = stats.active_subs || 0;
    document.getElementById('bannedUsers').textContent = stats.banned || 0;
    document.getElementById('totalRefs').textContent = stats.total_refs || 0;
}

function renderUsers() {
    const tbody = document.getElementById('usersTable');
    const start = currentPage * perPage;
    const chunk = users.slice(start, start + perPage);

    if (!chunk.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Пользователей пока нет</td></tr>`;
        document.getElementById('pageInfo').textContent = '0 / 0';
        return;
    }

    let html = '';
    chunk.forEach(u => {
        const status = u.is_banned ? 'banned' : (u.subscription_end !== 'Нет подписки' ? 'active' : 'inactive');
        const statusLabel = u.is_banned ? 'Заблокирован' : (u.subscription_end !== 'Нет подписки' ? 'Активен' : 'Неактивен');
        const username = u.username ? `@${u.username}` : `ID ${u.user_id}`;

        html += `
            <tr>
                <td><strong>${username}</strong><br><span style="font-size:12px;color:#888;">${u.user_id}</span></td>
                <td><span class="status-badge ${status}">${statusLabel}</span></td>
                <td>${u.subscription_end || 'Нет подписки'}</td>
                <td>
                    <button class="btn btn-sm" onclick="actionUser(${u.user_id}, 'give')">🎁</button>
                    <button class="btn btn-danger btn-sm" onclick="actionUser(${u.user_id}, 'remove')">✕</button>
                    <button class="btn btn-danger btn-sm" onclick="actionUser(${u.user_id}, 'ban')">🔨</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    document.getElementById('pageInfo').textContent = `${Math.min(start + perPage, users.length)} / ${users.length}`;
}

async function actionUser(userId, action) {
    const confirmMsg = {
        give: 'Выдать подписку на 30 дней?',
        remove: 'Отключить подписку?',
        ban: 'Заблокировать пользователя?'
    };

    if (!confirm(confirmMsg[action])) return;

    try {
        const resp = await fetch('/api/admin/action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData
            },
            body: JSON.stringify({ user_id: userId, action })
        });
        const result = await resp.json();
        if (result.ok) {
            tg.showAlert('✅ Действие выполнено!');
            loadUsers();
        } else {
            tg.showAlert('❌ Ошибка: ' + (result.error || 'неизвестная'));
        }
    } catch (e) {
        tg.showAlert('❌ Ошибка соединения');
    }
}

function searchUsers() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    if (!q) return loadUsers();

    const filtered = users.filter(u =>
        String(u.user_id).includes(q) ||
        (u.username && u.username.toLowerCase().includes(q))
    );
    users = filtered;
    currentPage = 0;
    renderUsers();
}

function prevPage() {
    if (currentPage > 0) { currentPage--; renderUsers(); }
}

function nextPage() {
    if ((currentPage + 1) * perPage < users.length) { currentPage++; renderUsers(); }
}

loadUsers();

function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
        document.body.classList.add('light-theme');
        const toggle = document.getElementById('themeToggle');
        if (toggle) toggle.checked = true;
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
}

initTheme();

tg.MainButton.setText("Закрыть");
tg.MainButton.onClick(() => tg.close());
tg.MainButton.show();