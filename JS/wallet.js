
const Wallet = (function() {
    const STORAGE_KEY = 'wechat_wallet';
    
    // Default data structure
    const defaultData = {
        totalAssets: 0,
        transferIncome: 0,
        workIncome: 0,
        transactions: [] 
        // Transaction: { id, type: 'income'|'expense', title, amount, date }
    };

    let data = null;

    function loadData() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                data = JSON.parse(stored);
            }
        } catch (e) {
            console.error("Failed to load wallet data", e);
        }

        if (!data) {
            data = JSON.parse(JSON.stringify(defaultData));
        }
        
        // Ensure structure integrity
        if (typeof data.totalAssets !== 'number') data.totalAssets = 0;
        if (typeof data.transferIncome !== 'number') data.transferIncome = 0;
        if (typeof data.workIncome !== 'number') data.workIncome = 0;
        if (!Array.isArray(data.transactions)) data.transactions = [];
    }

    function saveData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Failed to save wallet data", e);
        }
    }

    // Initialize
    loadData();

    // --- Core Logic ---

    function addTransaction(type, title, amount, category = 'transfer', meta) {
        if (!data) loadData();

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum)) return;

        const extra = meta && typeof meta === 'object' ? meta : null;
        const tx = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            type: type, // 'income' | 'expense'
            title: title,
            amount: amountNum,
            date: Date.now(),
            category: category, // 'transfer' | 'work' | 'other'
            peerName: extra && typeof extra.peerName === 'string' ? extra.peerName : '',
            peerRoleId: extra && typeof extra.peerRoleId === 'string' ? extra.peerRoleId : '',
            kind: extra && typeof extra.kind === 'string' ? extra.kind : '' // 'transfer' | 'redpacket'
        };

        data.transactions.unshift(tx); // Add to beginning

        if (type === 'income') {
            data.totalAssets += amountNum;
            if (category === 'transfer') {
                data.transferIncome += amountNum;
            } else if (category === 'work') {
                data.workIncome += amountNum;
            }
        } else if (type === 'expense') {
            data.totalAssets -= amountNum;
        }

        saveData();
        render(); // Refresh UI if open
        return tx;
    }

    function getData() {
        if (!data) loadData();
        return data;
    }

    // --- UI Logic ---

    function formatMoney(num) {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(timestamp) {
        const d = new Date(timestamp);
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const h = d.getHours().toString().padStart(2, '0');
        const min = d.getMinutes().toString().padStart(2, '0');
        return `${m}-${day} ${h}:${min}`;
    }

    function render() {
        const view = document.getElementById('wallet-view');
        if (!view) return;

        // Update User Info
        if (window.MineProfile && typeof window.MineProfile.getProfile === 'function') {
            const profile = window.MineProfile.getProfile();
            const avatarEl = document.getElementById('wallet-user-avatar');
            const nameEl = document.getElementById('wallet-username');
            if (avatarEl && profile.avatar) avatarEl.src = profile.avatar;
            if (nameEl && profile.name) nameEl.innerText = profile.name;
        }

        // Update Assets
        const totalEl = document.getElementById('wallet-total-assets');
        const transferEl = document.getElementById('wallet-income-transfer');
        const workEl = document.getElementById('wallet-income-work');

        if (totalEl) totalEl.innerText = formatMoney(data.totalAssets);
        if (transferEl) transferEl.innerText = formatMoney(data.transferIncome);
        if (workEl) workEl.innerText = formatMoney(data.workIncome);

        // Update List
        renderTransactions();
    }

    let currentFilter = 'all'; // 'all', 'income', 'expense'

    function setFilter(filter) {
        currentFilter = filter;
        renderTransactions();
        
        // Update button styles
        const btnAll = document.getElementById('wallet-filter-all');
        const btnIncome = document.getElementById('wallet-filter-income');
        const btnExpense = document.getElementById('wallet-filter-expense');
        
        // Simple toggle class logic (can be refined in CSS)
        [btnAll, btnIncome, btnExpense].forEach(btn => {
            if(btn) btn.classList.remove('active');
        });
        
        if (filter === 'all' && btnAll) btnAll.classList.add('active');
        if (filter === 'income' && btnIncome) btnIncome.classList.add('active');
        if (filter === 'expense' && btnExpense) btnExpense.classList.add('active');
    }

    function renderTransactions() {
        const listContainer = document.getElementById('wallet-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        const filtered = data.transactions.filter(t => {
            if (currentFilter === 'all') return true;
            return t.type === currentFilter;
        });

        if (filtered.length === 0) {
            listContainer.innerHTML = '<div class="wallet-empty">暂无记录</div>';
            return;
        }

        filtered.forEach(t => {
            const item = document.createElement('div');
            item.className = 'wallet-item';
            
            const isIncome = t.type === 'income';
            const amountStr = (isIncome ? '+' : '-') + formatMoney(t.amount);
            const amountClass = isIncome ? 'wallet-amount-income' : 'wallet-amount-expense';

            const peerRoleId = (t && typeof t.peerRoleId === 'string' ? t.peerRoleId.trim() : '') || '';
            let persona = null;
            if (peerRoleId) {
                const profiles = window.charProfiles || {};
                persona = profiles[peerRoleId] || null;
                if (!persona) {
                    try {
                        const raw = localStorage.getItem('wechat_charProfiles') || '{}';
                        const parsed = JSON.parse(raw);
                        persona = parsed && typeof parsed === 'object' ? (parsed[peerRoleId] || null) : null;
                    } catch (e) { }
                }
            }

            const displayName = (persona && (persona.alias || persona.remarkName || persona.remark || persona.nickName || persona.name))
                ? String(persona.alias || persona.remarkName || persona.remark || persona.nickName || persona.name).trim()
                : ((t && typeof t.peerName === 'string' ? t.peerName.trim() : '') || '未知');

            const kind = (t && typeof t.kind === 'string' ? t.kind.trim() : '') || '';
            let subtitle = '';
            if (displayName && displayName !== '未知') {
                if (isIncome) {
                    subtitle = kind === 'redpacket' ? `来自 ${displayName} 的红包` : `来自 ${displayName}`;
                } else {
                    subtitle = kind === 'redpacket' ? `发给 ${displayName} 的红包` : `发送给 ${displayName}`;
                }
            }

            let title = String(t.title || '');
            if (String(t.category || '') === 'transfer') {
                if (isIncome) {
                    title = kind === 'redpacket' ? `收到 ${displayName} 的红包` : `收到 ${displayName} 的转账`;
                } else {
                    title = kind === 'redpacket' ? `发红包给 ${displayName}` : `转账给 ${displayName}`;
                }
            }

            item.innerHTML = `
                <div class="wallet-item-left">
                    <div class="wallet-item-title">${title}</div>
                    ${subtitle ? `<div class="wallet-item-subtitle">${subtitle}</div>` : ''}
                    <div class="wallet-item-date">${formatDate(t.date)}</div>
                </div>
                <div class="wallet-item-right">
                    <div class="${amountClass}">${amountStr}</div>
                </div>
            `;
            listContainer.appendChild(item);
        });
    }

    function open() {
        const view = document.getElementById('wallet-view');
        if (view) {
            view.style.display = 'flex';
            // Animation class?
            render();
        }
    }

    function close() {
        const view = document.getElementById('wallet-view');
        if (view) {
            view.style.display = 'none';
        }
    }

    return {
        init: loadData,
        addTransaction: addTransaction,
        getData: getData,
        open: open,
        close: close,
        render: render,
        setFilter: setFilter
    };
})();

window.Wallet = Wallet;
