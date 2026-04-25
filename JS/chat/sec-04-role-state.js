/* === [SEC-04] 角色状态监控与心情日志 === */

function updateStatusMonitorTime() {
    const el = document.getElementById('status-monitor-time');
    if (!el) return;
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    el.innerText = month + '月' + day + '日 ' + hours + ':' + minutes;
}

function applyStatusBar(barId, textId, rawValue, suffix) {
    const bar = document.getElementById(barId);
    const text = document.getElementById(textId);
    if (!bar || !text) return;
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        bar.style.width = '0%';
        text.innerText = '--';
        return;
    }
    let num = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue);
    if (isNaN(num)) {
        bar.style.width = '0%';
        text.innerText = '--';
        return;
    }
    if (num < 0) num = 0;
    if (num > 100) num = 100;
    bar.style.width = num + '%';
    text.innerText = String(Math.round(num)) + (suffix || '');
}

function applyHeartRateBar(rawValue) {
    const bar = document.getElementById('status-heart-bar');
    const text = document.getElementById('status-heart-text');
    if (!bar || !text) return;
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        bar.style.width = '0%';
        text.innerText = '-- BPM';
        window.statusHeartBeatBase = null;
        return;
    }
    let num = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue);
    if (isNaN(num)) {
        bar.style.width = '0%';
        text.innerText = '-- BPM';
        window.statusHeartBeatBase = null;
        return;
    }
    if (num < 60) num = 60;
    if (num > 180) num = 180;
    const base = Math.max(0, Math.min(100, ((num - 60) / 120) * 100));
    bar.style.width = base + '%';
    text.innerText = String(Math.round(num)) + ' BPM';
    window.statusHeartBeatBase = base;
}

function getRoleStatusHistory(roleId) {
    var id = roleId || window.currentChatRole;
    if (!id) return [];
    var store = window.roleStatusHistory && typeof window.roleStatusHistory === 'object' ? window.roleStatusHistory : {};
    var list = store[id];
    if (!Array.isArray(list)) return [];
    return list.slice();
}

function renderStatusMonitorPanel(roleId) {
    const modal = document.getElementById('status-monitor-modal');
    if (!modal) return;
    const avatarEl = document.getElementById('status-monitor-avatar-img');
    const locationEl = document.getElementById('status-monitor-location');
    const moodEl = document.getElementById('status-mood-text');
    const fantasyEl = document.getElementById('status-fantasy-text');
    const thoughtEl = document.getElementById('status-thought-text');
    const placeholder = '正在同步生命体征...';
    if (avatarEl) {
        const roleIdNow = window.currentChatRole;
        const profiles = window.charProfiles || {};
        const profile = roleIdNow && profiles[roleIdNow] ? profiles[roleIdNow] : {};
        avatarEl.src = profile.avatar || 'assets/chushitouxiang.jpg';
    }
    const store = window.roleStatusStore && typeof window.roleStatusStore === 'object' ? window.roleStatusStore : {};
    const data = store[roleId] || null;
    if (data) {
        window.currentRoleStatus = data;
    }
    if (locationEl) {
        locationEl.innerText = data && data.location ? String(data.location) : placeholder;
    }
    if (moodEl) {
        moodEl.innerText = data && data.mood ? String(data.mood) : placeholder;
    }
    if (fantasyEl) {
        fantasyEl.innerText = data && data.fantasy ? String(data.fantasy) : placeholder;
    }
    applyStatusBar('status-favorability-bar', 'status-favorability-text', data ? data.favorability : null, '');
    applyStatusBar('status-jealousy-bar', 'status-jealousy-text', data ? data.jealousy : null, '');
    applyStatusBar('status-possessiveness-bar', 'status-possessiveness-text', data ? data.possessiveness : null, '');
    applyStatusBar('status-lust-bar', 'status-lust-text', data ? data.lust : null, '');
    applyHeartRateBar(data ? data.heart_rate : null);
    if (thoughtEl) {
        if (data && data.inner_monologue) {
            thoughtEl.innerText = String(data.inner_monologue);
        } else {
            thoughtEl.innerText = placeholder;
        }
    }
}

function openStatusMonitorPanel() {
    const roleId = window.currentChatRole;
    const modal = document.getElementById('status-monitor-modal');
    if (!roleId || !modal) return;
    const card = modal.querySelector('.status-monitor-card');
    if (card) {
        card.classList.remove('show-history');
    }
    renderStatusMonitorPanel(roleId);
    modal.style.display = 'flex';
    updateStatusMonitorTime();
    if (window.statusMonitorTimerId) {
        clearInterval(window.statusMonitorTimerId);
        window.statusMonitorTimerId = null;
    }
    window.statusMonitorTimerId = setInterval(function () {
        updateStatusMonitorTime();
        if (typeof window.statusHeartBeatBase === 'number') {
            const bar = document.getElementById('status-heart-bar');
            if (bar) {
                const jitter = (Math.random() * 16) - 8;
                let value = window.statusHeartBeatBase + jitter;
                if (value < 0) value = 0;
                if (value > 100) value = 100;
                bar.style.width = value + '%';
            }
        }
    }, 1000);
}

function closeStatusMonitorPanel() {
    const modal = document.getElementById('status-monitor-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    if (window.statusMonitorTimerId) {
        clearInterval(window.statusMonitorTimerId);
        window.statusMonitorTimerId = null;
    }
}

function handleStatusMonitorMaskClick(e) {
    const modal = document.getElementById('status-monitor-modal');
    if (!modal) return;
    if (e && e.target === modal) {
        closeStatusMonitorPanel();
    }
}

function formatStatusHistoryTime(timestamp) {
    if (!timestamp) return '';
    var date = new Date(timestamp);
    var hours = String(date.getHours()).padStart(2, '0');
    var minutes = String(date.getMinutes()).padStart(2, '0');
    return hours + ':' + minutes;
}

function toggleStatusHistoryView() {
    const modal = document.getElementById('status-monitor-modal');
    if (!modal) return;
    const card = modal.querySelector('.status-monitor-card');
    if (!card) return;
    const isShowing = card.classList.contains('show-history');
    if (isShowing) {
        card.classList.remove('show-history');
    } else {
        card.classList.add('show-history');
        const roleId = window.currentChatRole;
        if (roleId) {
            renderStatusHistory(roleId);
        }
    }
}

function renderStatusHistory(roleId) {
    const listEl = document.getElementById('status-history-list');
    if (!listEl) return;
    const id = roleId || window.currentChatRole;
    if (!id) {
        listEl.innerHTML = '';
        return;
    }
    const history = getRoleStatusHistory(id);
    listEl.innerHTML = '';
    if (!Array.isArray(history) || history.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'status-history-empty';
        empty.innerText = '暂无状态日志';
        listEl.appendChild(empty);
        return;
    }
    const sorted = history.slice().sort(function (a, b) {
        const ta = a && (a.timestamp || a.updatedAt || 0);
        const tb = b && (b.timestamp || b.updatedAt || 0);
        return tb - ta;
    });
    sorted.forEach(function (item) {
        if (!item) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'status-history-item';
        const metaRow = document.createElement('div');
        metaRow.className = 'status-history-meta';
        const timeEl = document.createElement('div');
        timeEl.className = 'status-history-time';
        timeEl.innerText = formatStatusHistoryTime(item.timestamp || item.updatedAt);
        const metricsEl = document.createElement('div');
        metricsEl.className = 'status-history-metrics';
        const moodText = item.mood ? String(item.mood) : '';
        const heartText = typeof item.heart_rate === 'number' || (typeof item.heart_rate === 'string' && item.heart_rate)
            ? '💓 ' + String(item.heart_rate)
            : '';
        const lustText = typeof item.lust === 'number' || (typeof item.lust === 'string' && item.lust)
            ? '性欲: ' + String(item.lust)
            : '';
        const parts = [];
        if (moodText) parts.push('心情: ' + moodText);
        if (heartText) parts.push(heartText);
        if (lustText) parts.push(lustText);
        metricsEl.innerText = parts.join(' | ');
        metaRow.appendChild(timeEl);
        metaRow.appendChild(metricsEl);
        wrapper.appendChild(metaRow);
        if (item.inner_monologue) {
            const monoEl = document.createElement('div');
            monoEl.className = 'status-history-monologue';
            monoEl.innerText = String(item.inner_monologue);
            wrapper.appendChild(monoEl);
        }
        let pressTimer = null;
        function clearPressTimer() {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        }
        function handleDelete() {
            clearPressTimer();
            const confirmed = window.confirm('删除这条状态记录？');
            if (!confirmed) return;
            const store = window.roleStatusHistory && typeof window.roleStatusHistory === 'object' ? window.roleStatusHistory : {};
            let list = store[id];
            if (!Array.isArray(list)) return;
            const targetTs = item.timestamp || item.updatedAt || 0;
            list = list.filter(function (entry) {
                const ts = entry && (entry.timestamp || entry.updatedAt || 0);
                return ts !== targetTs;
            });
            store[id] = list;
            window.roleStatusHistory = store;
            try {
                localStorage.setItem('wechat_roleStatusHistory', JSON.stringify(store));
            } catch (e) { }
            renderStatusHistory(id);
        }
        function startPress(e) {
            clearPressTimer();
            pressTimer = setTimeout(function () {
                handleDelete();
            }, 600);
        }
        function cancelPress() {
            clearPressTimer();
        }
        wrapper.addEventListener('mousedown', startPress);
        wrapper.addEventListener('touchstart', startPress);
        wrapper.addEventListener('mouseup', cancelPress);
        wrapper.addEventListener('mouseleave', cancelPress);
        wrapper.addEventListener('touchend', cancelPress);
        wrapper.addEventListener('touchmove', cancelPress);
        wrapper.addEventListener('contextmenu', function (e) {
            if (e && typeof e.preventDefault === 'function') {
                e.preventDefault();
            }
            handleDelete();
        });
        listEl.appendChild(wrapper);
    });
}

