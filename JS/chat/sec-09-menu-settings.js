/* === [SEC-09] 菜单、角色与用户设置 === */

function getAITransferModalElements() {
    let modal = document.getElementById('ai-transfer-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ai-transfer-modal';
        modal.className = 'transfer-modal-mask';
        modal.innerHTML = `
            <div class="transfer-modal-container">
                <div class="transfer-modal-header">微信转账</div>
                <div class="transfer-modal-body">
                    <div class="transfer-modal-amount">¥0.00</div>
                    <div class="transfer-modal-note"></div>
                </div>
                <div class="transfer-modal-footer">
                    <button class="transfer-modal-btn transfer-modal-btn-accept">收下转账</button>
                    <button class="transfer-modal-btn transfer-modal-btn-return">退回</button>
                    <button class="transfer-modal-btn transfer-modal-btn-cancel">取消</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const amountEl = modal.querySelector('.transfer-modal-amount');
    const noteEl = modal.querySelector('.transfer-modal-note');
    const acceptBtn = modal.querySelector('.transfer-modal-btn-accept');
    const returnBtn = modal.querySelector('.transfer-modal-btn-return');
    const cancelBtn = modal.querySelector('.transfer-modal-btn-cancel');
    return {
        modal,
        amountEl,
        noteEl,
        acceptBtn,
        returnBtn,
        cancelBtn
    };
}

function closeAITransferModal() {
    const els = getAITransferModalElements();
    if (els.modal) {
        els.modal.style.display = 'none';
    }
}

function bindAITransferModalEvents() {
    const els = getAITransferModalElements();
    const modal = els.modal;
    if (!modal) return;
    if (modal.dataset.bound === '1') return;
    modal.dataset.bound = '1';

    if (els.acceptBtn) {
        els.acceptBtn.addEventListener('click', function () {
            if (!currentAITransferContext) {
                closeAITransferModal();
                return;
            }
            const roleId = window.currentChatRole;
            const msg = currentAITransferContext.msg;
            const row = currentAITransferContext.row;
            if (!msg || !row || !roleId) {
                closeAITransferModal();
                return;
            }
            if (msg.status === 'accepted') {
                closeAITransferModal();
                return;
            }
            msg.status = 'accepted';

            // --- Wallet Integration: Add Income ---
            if (window.Wallet && typeof window.Wallet.addTransaction === 'function') {
                const p = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
                const peerName = (p.remark || p.nickName || p.name || '对方').toString();
                window.Wallet.addTransaction('income', `收到${peerName}的转账`, msg.amount, 'transfer', { peerName, peerRoleId: roleId, kind: 'transfer' });
            }
            // --------------------------------------

            const bubble = row.querySelector('.transfer-bubble');
            if (bubble) {
                bubble.classList.add('transfer-bubble-accepted');
                const footer = bubble.querySelector('.transfer-footer');
                if (footer) {
                    footer.innerText = '已收钱';
                }
            }
            saveData();
            if (typeof sendAITransferSystemNotice === 'function') {
                sendAITransferSystemNotice(roleId, 'accepted');
            }
            closeAITransferModal();
        });
    }

    if (els.returnBtn) {
        els.returnBtn.addEventListener('click', function () {
            if (!currentAITransferContext) {
                closeAITransferModal();
                return;
            }
            const roleId = window.currentChatRole;
            const msg = currentAITransferContext.msg;
            const row = currentAITransferContext.row;
            if (!msg || !row || !roleId) {
                closeAITransferModal();
                return;
            }
            if (msg.status === 'returned') {
                closeAITransferModal();
                return;
            }
            msg.status = 'returned';
            const bubble = row.querySelector('.transfer-bubble');
            if (bubble) {
                bubble.classList.add('transfer-bubble-accepted');
                const footer = bubble.querySelector('.transfer-footer');
                if (footer) {
                    footer.innerText = '已退回';
                }
            }
            saveData();
            if (typeof sendAITransferSystemNotice === 'function') {
                sendAITransferSystemNotice(roleId, 'returned');
            }
            closeAITransferModal();
        });
    }

    if (els.cancelBtn) {
        els.cancelBtn.addEventListener('click', function () {
            closeAITransferModal();
        });
    }

    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeAITransferModal();
        }
    });
}

function openAITransferModal(context) {
    if (!context || !context.msg || !context.row) return;
    const els = getAITransferModalElements();
    const msg = context.msg;
    const amount = msg.amount || '';
    const note = msg.note || '';
    if (els.amountEl) {
        els.amountEl.innerText = '¥' + amount;
    }
    if (els.noteEl) {
        els.noteEl.innerText = note ? note : '无备注';
    }
    currentAITransferContext = {
        msg: msg,
        row: context.row
    };
    bindAITransferModalEvents();
    if (els.modal) {
        els.modal.style.display = 'flex';
    }
}

let currentFamilyCardAcceptContext = null;

function getFamilyCardAcceptModalElements() {
    let modal = document.getElementById('family-card-accept-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'family-card-accept-modal';
        modal.className = 'family-card-accept-mask';
        modal.innerHTML = `
            <div class="family-card-accept-panel" role="dialog" aria-modal="true">
                <div class="family-card-accept-icon"></div>
                <div class="family-card-accept-sender"></div>
                <div class="family-card-accept-amount"></div>
                <div class="family-card-accept-actions">
                    <button type="button" class="family-card-accept-btn family-card-accept-btn--decline">暂不</button>
                    <button type="button" class="family-card-accept-btn family-card-accept-btn--accept">接受</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const panel = modal.querySelector('.family-card-accept-panel');
    const senderEl = modal.querySelector('.family-card-accept-sender');
    const amountEl = modal.querySelector('.family-card-accept-amount');
    const declineBtn = modal.querySelector('.family-card-accept-btn--decline');
    const acceptBtn = modal.querySelector('.family-card-accept-btn--accept');
    return { modal, panel, senderEl, amountEl, declineBtn, acceptBtn };
}

function closeFamilyCardAcceptModal() {
    const els = getFamilyCardAcceptModalElements();
    currentFamilyCardAcceptContext = null;
    if (els && els.modal) {
        els.modal.style.display = 'none';
    }
}

function insertSystemRowAfter(anchorRow, text) {
    const historyBox = document.getElementById('chat-history');
    if (!historyBox || !anchorRow) return;
    const sysRow = document.createElement('div');
    sysRow.className = 'sys-msg-row';
    sysRow.setAttribute('data-timestamp', String(Date.now()));
    const span = document.createElement('span');
    span.className = 'sys-msg-text';
    span.textContent = String(text || '');
    sysRow.appendChild(span);
    if (anchorRow.nextSibling) {
        historyBox.insertBefore(sysRow, anchorRow.nextSibling);
    } else {
        historyBox.appendChild(sysRow);
    }
    historyBox.scrollTop = historyBox.scrollHeight;
}

function bindFamilyCardAcceptModalEvents() {
    const els = getFamilyCardAcceptModalElements();
    if (!els || !els.modal) return;
    if (els.modal.__familyCardAcceptBound) return;
    els.modal.__familyCardAcceptBound = true;

    if (els.declineBtn) {
        els.declineBtn.addEventListener('click', function () {
            closeFamilyCardAcceptModal();
        });
    }

    if (els.acceptBtn) {
        els.acceptBtn.addEventListener('click', function () {
            const ctx = currentFamilyCardAcceptContext;
            if (!ctx || !ctx.msg || !ctx.row) {
                closeFamilyCardAcceptModal();
                return;
            }
            const roleId = String(ctx.roleId || '').trim();
            const msg = ctx.msg;
            const row = ctx.row;
            closeFamilyCardAcceptModal();

            if (msg.status === 'accepted') return;
            msg.status = 'accepted';

            const bubble = row.querySelector('.family-card-bubble');
            if (bubble) {
                bubble.setAttribute('data-status', 'accepted');
                const subtitleEl = bubble.querySelector('.family-card-subtitle');
                if (subtitleEl) {
                    subtitleEl.textContent = '已领取';
                }
            }

            if (roleId) {
                const state = ensureFamilyCardState();
                const list = Array.isArray(state.receivedCards) ? state.receivedCards : [];
                const exists = list.some(function (c) {
                    if (!c || typeof c !== 'object') return false;
                    const fromId = typeof c.fromRoleId === 'string' ? c.fromRoleId.trim() : '';
                    const ts = typeof c.timestamp === 'number' ? c.timestamp : 0;
                    const amt = typeof c.amount === 'string' || typeof c.amount === 'number' ? String(c.amount) : '';
                    return fromId === roleId && ts === msg.timestamp && amt === String(msg.amount || '');
                });
                if (!exists) {
                    addReceivedFamilyCard(roleId, msg.amount, msg.timestamp);
                }

                if (!window.chatData || typeof window.chatData !== 'object') window.chatData = {};
                if (!Array.isArray(window.chatData[roleId])) window.chatData[roleId] = [];
                const messages = window.chatData[roleId];
                let idx = -1;
                for (let i = messages.length - 1; i >= 0; i--) {
                    const m = messages[i];
                    if (!m) continue;
                    if (m.timestamp === msg.timestamp && m.role === msg.role && (m.type || 'text') === (msg.type || 'text')) {
                        m.status = 'accepted';
                        idx = i;
                        break;
                    }
                }
                const sysText = '你已领取 ' + resolveFamilyCardRoleName(roleId) + ' 的亲属卡';
                const sysMsg = { role: 'system', type: 'system_event', content: sysText, timestamp: Date.now() };
                const insertAt = idx >= 0 ? idx + 1 : messages.length;
                messages.splice(insertAt, 0, sysMsg);
                insertSystemRowAfter(row, sysText);
            }

            saveData();
        });
    }

    els.modal.addEventListener('click', function (e) {
        if (e && e.target === els.modal) {
            closeFamilyCardAcceptModal();
        }
    });
}

function openFamilyCardAcceptModal(context) {
    if (!context || !context.msg || !context.row) return;
    const roleId = String(context.roleId || '').trim();
    const msg = context.msg;
    const st = msg && typeof msg.status === 'string' ? msg.status : 'pending';
    if (st !== 'pending') return;
    const els = getFamilyCardAcceptModalElements();
    if (els.senderEl) {
        els.senderEl.textContent = (resolveFamilyCardRoleName(roleId) || '对方') + ' 送你一张亲属卡';
    }
    if (els.amountEl) {
        els.amountEl.textContent = '¥ ' + String(msg.amount || '');
    }
    currentFamilyCardAcceptContext = {
        msg: msg,
        row: context.row,
        roleId: roleId
    };
    bindFamilyCardAcceptModalEvents();
    if (els.modal) {
        els.modal.style.display = 'flex';
    }
}

function getRedpacketModalElements() {
    let modal = document.getElementById('redpacket-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'redpacket-modal';
        modal.className = 'redpacket-modal-mask';
        modal.innerHTML = `
            <div class="redpacket-modal-panel redpacket-closed-panel">
                <div class="redpacket-card">
                    <div class="redpacket-card-top">
                        <div class="redpacket-card-avatar-wrap">
                            <img class="redpacket-card-avatar" src="assets/chushitouxiang.jpg">
                        </div>
                        <div class="redpacket-card-title">
                            <span class="redpacket-card-sender-name"></span> 的红包
                        </div>
                        <div class="redpacket-card-bless">恭喜发财，大吉大利</div>
                    </div>
                    <div class="redpacket-card-bottom">
                        <div class="redpacket-open-btn-wrap">
                            <button class="redpacket-open-btn">開</button>
                        </div>
                    </div>
                </div>
                <div class="redpacket-close-area">
                    <div class="redpacket-close-icon">×</div>
                </div>
            </div>
            <div class="redpacket-modal-panel redpacket-open-panel">
                <div class="redpacket-open-header">
                    <div class="redpacket-open-back">←</div>
                    <div class="redpacket-open-header-inner">
                        <div class="redpacket-open-avatar-wrap">
                            <img class="redpacket-open-avatar" src="assets/chushitouxiang.jpg">
                        </div>
                        <div class="redpacket-open-sender-name">Ta 的红包</div>
                        <div class="redpacket-open-note">恭喜发财，大吉大利</div>
                    </div>
                </div>
                <div class="redpacket-open-content">
                    <div class="redpacket-open-amount-row">
                        <div class="redpacket-open-amount">0.00</div>
                        <div class="redpacket-open-unit">元</div>
                    </div>
                    <div class="redpacket-open-tip">已存入零钱，可直接转账</div>
                    <div class="redpacket-open-list">
                        <div class="redpacket-open-list-title">领取详情</div>
                        <div class="redpacket-open-list-item">
                            <div class="redpacket-open-list-left">
                                <div class="redpacket-open-list-avatar-wrap">
                                    <img class="redpacket-open-list-avatar" src="assets/chushitouxiang.jpg">
                                </div>
                                <div class="redpacket-open-list-name">我</div>
                            </div>
                            <div class="redpacket-open-list-right">
                                <div class="redpacket-open-list-amount">0.00元</div>
                                <div class="redpacket-open-list-time"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const closedPanel = modal.querySelector('.redpacket-closed-panel');
    const openPanel = modal.querySelector('.redpacket-open-panel');
    const openBtn = modal.querySelector('.redpacket-open-btn');
    const closeBtn = modal.querySelector('.redpacket-close-icon');
    const closedAvatar = modal.querySelector('.redpacket-card-avatar');
    const closedSenderName = modal.querySelector('.redpacket-card-sender-name');
    const closedBless = modal.querySelector('.redpacket-card-bless');
    const openAvatar = modal.querySelector('.redpacket-open-avatar');
    const openSenderName = modal.querySelector('.redpacket-open-sender-name');
    const openNote = modal.querySelector('.redpacket-open-note');
    const amountMain = modal.querySelector('.redpacket-open-amount');
    const amountUnit = modal.querySelector('.redpacket-open-unit');
    const backBtn = modal.querySelector('.redpacket-open-back');
    const listAvatar = modal.querySelector('.redpacket-open-list-avatar');
    const listName = modal.querySelector('.redpacket-open-list-name');
    const listAmount = modal.querySelector('.redpacket-open-list-amount');
    const listTime = modal.querySelector('.redpacket-open-list-time');
    return {
        modal,
        closedPanel,
        openPanel,
        openBtn,
        closeBtn,
        closedAvatar,
        closedSenderName,
        closedBless,
        openAvatar,
        openSenderName,
        openNote,
        amountMain,
        amountUnit,
        backBtn,
        listAvatar,
        listName,
        listAmount,
        listTime
    };
}

function setRedpacketModalState(els, state) {
    if (!els) return;
    if (els.closedPanel) {
        if (state === 'closed') {
            els.closedPanel.classList.add('active');
        } else {
            els.closedPanel.classList.remove('active');
        }
    }
    if (els.openPanel) {
        if (state === 'opened') {
            els.openPanel.classList.add('active');
        } else {
            els.openPanel.classList.remove('active');
        }
    }
}

function closeRedpacketModal() {
    const els = getRedpacketModalElements();
    if (els.modal) {
        els.modal.style.display = 'none';
    }
}

function updateRedpacketBubbleView(context) {
    if (!context || !context.msg || !context.row) return;
    const msg = context.msg;
    const row = context.row;
    const bubble = row.querySelector('.redpacket-bubble');
    if (!bubble) return;
    const status = msg.status || 'unopened';
    bubble.setAttribute('data-status', status);
    const statusEl = bubble.querySelector('.redpacket-status-text');
    if (statusEl) {
        statusEl.innerText = status === 'opened' ? '红包已领取' : '领取红包';
    }
    const mainEl = bubble.querySelector('.redpacket-main');
    if (mainEl && msg.amount && status === 'opened') {
        let amountEl = bubble.querySelector('.redpacket-amount');
        if (!amountEl) {
            amountEl = document.createElement('div');
            amountEl.className = 'redpacket-amount';
            mainEl.appendChild(amountEl);
        }
        amountEl.innerText = '¥' + msg.amount;
    }
}

function bindRedpacketModalEvents() {
    const els = getRedpacketModalElements();
    const modal = els.modal;
    if (!modal) return;
    if (modal.dataset.redpacketBound === '1') return;
    modal.dataset.redpacketBound = '1';

    function handleRedpacketCloseFromUser() {
        const context = currentRedpacketContext;
        const roleId = window.currentChatRole;
        if (context && context.msg && context.msg.role === 'ai' && context.msg.status !== 'opened') {
            if (roleId && typeof sendAIRedpacketSystemNotice === 'function') {
                const amountVal = context.msg.amount || '';
                sendAIRedpacketSystemNotice(roleId, 'declined', amountVal);
            }
        }
        closeRedpacketModal();
    }

    if (els.closeBtn) {
        els.closeBtn.addEventListener('click', function () {
            handleRedpacketCloseFromUser();
        });
    }

    if (els.backBtn) {
        els.backBtn.addEventListener('click', function () {
            handleRedpacketCloseFromUser();
        });
    }

    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            handleRedpacketCloseFromUser();
        }
    });

    if (els.openBtn) {
        els.openBtn.addEventListener('click', function () {
            if (!els.openBtn) return;
            if (els.openBtn.classList.contains('redpacket-open-btn-spin')) {
                return;
            }
            els.openBtn.classList.add('redpacket-open-btn-spin');
            const btn = els.openBtn;
            const handler = function (ev) {
                if (ev && ev.animationName && ev.animationName !== 'redpacketCoinFlip') {
                    return;
                }
                btn.classList.remove('redpacket-open-btn-spin');
                btn.removeEventListener('animationend', handler);
                const context = currentRedpacketContext;
                if (context && context.msg) {
                    if (context.msg.status !== 'opened') {
                        context.msg.status = 'opened';
                        
                        // --- Wallet Integration: Add Income ---
                        if (window.Wallet && typeof window.Wallet.addTransaction === 'function') {
                            const roleId = window.currentChatRole;
                            const p = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
                            const peerName = (p.remark || p.nickName || p.name || '对方').toString();
                            window.Wallet.addTransaction('income', `收到${peerName}的红包`, context.msg.amount, 'transfer', { peerName, peerRoleId: roleId, kind: 'redpacket' });
                        }
                        // --------------------------------------

                        updateRedpacketBubbleView(context);
                        try {
                            saveData();
                        } catch (err) { }
                        const roleId = window.currentChatRole;
                        if (roleId && typeof sendAIRedpacketSystemNotice === 'function') {
                            const amountVal = context.msg.amount || '';
                            sendAIRedpacketSystemNotice(roleId, 'accepted', amountVal);
                        }
                    }
                }
                setRedpacketModalState(els, 'opened');
            };
            btn.addEventListener('animationend', handler);
        });
    }
}

function openRedpacketModal(context) {
    if (!context || !context.msg || !context.row) return;
    const els = getRedpacketModalElements();
    const msg = context.msg;
    const roleId = window.currentChatRole;
    const profile = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
    const userPersona = window.userPersonas && window.userPersonas[roleId] ? window.userPersonas[roleId] : {};
    const aiName = profile.nickName || profile.name || '';
    const aiAvatar = profile.avatar || 'assets/chushitouxiang.jpg';
    const userName = userPersona.name || '';
    const userAvatar = userPersona.avatar || 'assets/chushitouxiang.jpg';
    const blessing = msg.note && String(msg.note).trim() ? String(msg.note).trim() : '恭喜发财，大吉大利';
    const amount = msg.amount != null ? String(msg.amount) : '';
    const amountDisplay = amount || '0.00';
    const timeText = msg.timestamp ? formatChatTime(msg.timestamp) : '';

    if (els.closedAvatar) {
        els.closedAvatar.src = aiAvatar;
    }
    if (els.closedSenderName) {
        els.closedSenderName.innerText = aiName;
    }
    if (els.closedBless) {
        els.closedBless.innerText = blessing;
    }
    if (els.openAvatar) {
        els.openAvatar.src = aiAvatar;
    }
    if (els.openSenderName) {
        els.openSenderName.innerText = aiName ? aiName + ' 的红包' : '红包';
    }
    if (els.openNote) {
        els.openNote.innerText = blessing;
    }
    if (els.amountMain) {
        els.amountMain.innerText = amountDisplay;
    }
    if (els.amountUnit) {
        els.amountUnit.innerText = '元';
    }
    if (els.listAvatar) {
        els.listAvatar.src = userAvatar;
    }
    if (els.listName) {
        els.listName.innerText = userName || '我';
    }
    if (els.listAmount) {
        els.listAmount.innerText = amountDisplay + '元';
    }
    if (els.listTime) {
        els.listTime.innerText = timeText;
    }

    currentRedpacketContext = {
        msg: msg,
        row: context.row
    };

    bindRedpacketModalEvents();

    const currentStatus = msg.status || 'unopened';
    if (currentStatus === 'opened') {
        setRedpacketModalState(els, 'opened');
    } else {
        setRedpacketModalState(els, 'closed');
    }

    if (els.modal) {
        els.modal.style.display = 'flex';
    }
}

// =========================================================
// 🔥 增强版：系统消息智能识别函数（支持动作描写）
// =========================================================
function detectSystemMessage(msg, content) {
    if (content == null) {
        content = '';
    } else if (typeof content !== 'string') {
        if (typeof content === 'object') {
            if (content.message != null) {
                content = String(content.message);
            } else if (content.content != null) {
                content = String(content.content);
            } else if (content.text != null) {
                content = String(content.text);
            } else {
                try {
                    content = JSON.stringify(content);
                } catch (e) {
                    content = String(content);
                }
            }
        } else {
            content = String(content);
        }
    }

    // 1. 如果是图片类型，直接排除
    if (msg.type === 'image') return false;

    // 2. 如果是转账类型，直接排除
    if (msg.type === 'transfer') return false;

    // 3. 如果是聊天记录类型，直接排除
    if (msg.type === 'history') return false;

    // 4. 如果是语音类型，直接排除
    if (msg.type === 'voice') return false;

    // 5. 如果内容包含表情包标记，排除
    if (content.includes('[STICKER:')) return false;

    // 6. 如果是 http 开头的链接（表情包URL），排除
    if (content.startsWith('http://') || content.startsWith('https://')) return false;

    // 7. 如果是 data:image 开头（base64图片），排除
    if (content.startsWith('data:image')) return false;

    // 8. 判断是否为方括号系统提示 [xxx]
    const systemPatterns = [
        /^\[系统[：:]/,           // [系统：xxx]
        /^\[系统\]/,              // [系统] xxx
        /^\[对方/,                // [对方开启了勿扰模式]
        /^\[.*?(开启|关闭|设置)/,  // [开启了xxx] [关闭了xxx]
    ];
    for (let pattern of systemPatterns) {
        if (pattern.test(content)) return true;
    }

    // 8. 特殊处理：括号包裹的内容 (xxx) 或 （xxx）
    if ((content.startsWith('(') && content.endsWith(')')) ||
        (content.startsWith('（') && content.endsWith('）'))) {

        const inner = content.slice(1, -1).trim();

        // 8.1 排除颜文字（包含特殊符号）
        const emoticonSymbols = /[°□╯︵┻━┳ಠ_▽´｀ω・＾><]/;
        if (emoticonSymbols.test(inner)) {
            return false; // 是颜文字，不是系统提示
        }

        // 8.2 识别动作描写 - 多重特征判断

        // 特征1：长度>5 且包含中文标点（描述性句子）
        if (inner.length > 5 && /[，。、；：]/.test(inner)) {
            return true; // "(看着手机屏幕，无奈地按了按眉心)" ✅
        }

        // 特征2：包含动作/状态动词（即使较短也识别）
        const actionVerbs = [
            // 状态动词
            '正在', '已', '正', '刚', '刚刚', '马上', '即将',
            // 动作动词（常见）
            '看着', '听着', '想着', '说着', '走着', '坐着', '躺着', '站着',
            '笑着', '哭着', '叹', '揉', '按', '摸', '拿', '握', '捏',
            '放下', '拿起', '抬头', '低头', '转身', '起身', '回头',
            '躺', '站', '坐', '靠', '靠着', '倚', '趴', '蹲',
            // 表情动作
            '无奈', '轻笑', '皱眉', '挑眉', '扬眉', '眨眼', '翻白眼',
            '笑', '哭', '叹气', '打哈欠', '伸懒腰', '挠头',
            // 其他常见动作
            '点头', '摇头', '挥手', '摆手', '耸肩', '叹息'
        ];

        for (let verb of actionVerbs) {
            if (inner.includes(verb)) {
                return true; // 包含动作动词 ✅
            }
        }

        // 特征3：如果没有匹配到动词，但长度>3且全是中文（可能是简短动作）
        if (inner.length > 3 && /^[\u4e00-\u9fa5]+$/.test(inner)) {
            return true; // "(轻声叹息)" "(若有所思)" ✅
        }
    }

    // 9. 其他包含"系统："关键字的
    if (/系统[：:]/.test(content)) return true;

    return false;
}

function sanitizeStickerDisplayName(rawName, rawUrl) {
    let name = String(rawName || '').trim();
    const url = String(rawUrl || '').trim();
    if (!name) return '';
    if (url && name === url) return '';
    name = name.replace(/\s+/g, ' ').trim();
    name = name.replace(/\s*[：:]\s*https?:\/\/\S+$/i, '').trim();
    const urlIndex = name.search(/\s*https?:\/\/\S+/i);
    if (urlIndex > 0) {
        name = name.slice(0, urlIndex).trim();
    }
    return name.replace(/[：:]\s*$/, '').trim();
}

function normalizeStickerImportUrl(rawUrl) {
    let url = String(rawUrl || '').trim();
    if (!url) return '';
    if (typeof window.normalizeImageUrlCandidate === 'function') {
        url = window.normalizeImageUrlCandidate(url);
    } else {
        if (url.length >= 2 && ((url.startsWith('`') && url.endsWith('`')) || (url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'")))) {
            url = url.slice(1, url.length - 1).trim();
        }
        const stickerMatch = url.match(/^\[STICKER:\s*([^\]]+)\]$/i);
        if (stickerMatch && stickerMatch[1]) {
            url = String(stickerMatch[1]).trim();
        }
    }
    if (url.startsWith('//')) {
        url = 'https:' + url;
    }
    return url;
}

function parseStickerImportLine(rawLine) {
    const line = String(rawLine || '').trim();
    if (!line) return null;

    if (/^(https?:)?\/\//i.test(line) || /^\[STICKER:/i.test(line)) {
        const directUrl = normalizeStickerImportUrl(line);
        if (!directUrl) return null;
        return {
            name: '',
            url: directUrl
        };
    }

    const urlMatch = line.match(/(https?:\/\/\S+|\[STICKER:[^\]]+\])\s*$/i);
    let rawUrl = '';
    let rawName = '';
    if (urlMatch) {
        rawUrl = normalizeStickerImportUrl(urlMatch[1]);
        rawName = String(line.slice(0, urlMatch.index || 0)).trim();
    } else {
        const match = line.match(/^(.+?)[：:]\s*(.+)$/);
        if (!match) return null;
        rawName = String(match[1] || '').trim();
        rawUrl = normalizeStickerImportUrl(match[2]);
    }
    const cleanName = sanitizeStickerDisplayName(rawName, rawUrl);
    if (!rawUrl) return null;
    return {
        name: cleanName,
        url: rawUrl
    };
}


document.addEventListener('DOMContentLoaded', function () {
    const moreBtn = document.getElementById('more-btn');
    const panel = document.getElementById('chat-more-panel');
    const historyBox = document.getElementById('chat-history');
    const msgInput = document.getElementById('msg-input');
    const pagesContainer = document.getElementById('chat-more-pages');
    const dotsContainer = document.getElementById('chat-more-dots');
    const stickerPanel = document.getElementById('chat-sticker-panel');
    const stickerGrid = document.getElementById('sticker-grid');
    const stickerCategoryBar = document.getElementById('sticker-category-bar');
    const stickerAddBtn = document.getElementById('sticker-add-btn');
    const stickerManageBar = document.getElementById('sticker-manage-bar');
    const stickerManageAssignBtn = document.getElementById('sticker-manage-assign-btn');
    const stickerManageSelectAllBtn = document.getElementById('sticker-manage-select-all-btn');
    const stickerManageDeleteBtn = document.getElementById('sticker-manage-delete-btn');
    const stickerManageDoneBtn = document.getElementById('sticker-manage-done-btn');
    const stickerImportModal = document.getElementById('sticker-import-modal');
    const stickerImportText = document.getElementById('sticker-import-text');
    const stickerImportCategory = document.getElementById('sticker-import-category');
    const stickerImportCancelBtn = document.getElementById('sticker-import-cancel-btn');
    const stickerImportConfirmBtn = document.getElementById('sticker-import-confirm-btn');
    const panelHeight = 250;
    const baseHeight = 'calc(100% - 140px)';
    const openHeight = `calc(100% - 140px - ${panelHeight}px)`;
    const features = [
        { action: 'transfer', label: '转账', iconClass: 'bx bx-transfer' },
        { action: 'redpacket', label: '红包', iconClass: 'bx bx-envelope' },
        { action: 'voicecall', label: '语音通话', iconClass: 'bx bx-phone-call' },
        { action: 'videocall', label: '视频通话', iconClass: 'bx bx-video' },
        { action: 'album', label: '相册', iconClass: 'bx bx-image' },
        { action: 'camera', label: '拍照', iconClass: 'bx bx-camera' },
        { action: 'location', label: '位置', iconClass: 'bx bx-map' },
        { action: 'voice', label: '语音', iconClass: 'bx bx-microphone' },
        { action: 'reroll', label: '一键重Roll', iconClass: 'bx bx-refresh' },
        { action: 'offline_novel', label: '长叙事模式', iconClass: 'bx bx-book' },
        { action: 'card', label: '抽卡', iconClass: 'bx bx-id-card' },
        { action: 'dice', label: '骰子', iconClass: 'bx bx-dice-1' }
    ];
    let currentStickerCategory = 'mine';
    let currentStickerFilter = 'all';
    let stickerManageMode = false;
    const selectedStickerIds = new Set();
    let stickerLongPressTimer = null;
    let suppressStickerClickUntil = 0;

    function syncStickerPanelState() {
        window.__chatStickerPanelState = {
            currentTab: currentStickerCategory,
            currentFilter: currentStickerFilter,
            manageMode: stickerManageMode
        };
    }
    function getStickerRoleId() {
        return String(window.currentChatRole || '').trim() || '__default__';
    }
    function getStickerScope() {
        if (typeof window.getStickerScopeForRole === 'function') {
            return window.getStickerScopeForRole(getStickerRoleId());
        }
        const data = window.stickerData && typeof window.stickerData === 'object' ? window.stickerData : {};
        return {
            categories: [{ id: 'default', name: '默认' }],
            tabs: data.tabs && typeof data.tabs === 'object'
                ? data.tabs
                : {
                    mine: Array.isArray(data.mine) ? data.mine : [],
                    his: Array.isArray(data.his) ? data.his : [],
                    general: Array.isArray(data.general) ? data.general : []
                }
        };
    }
    function getStickerTabList() {
        const scope = getStickerScope();
        if (!scope.tabs[currentStickerCategory]) {
            scope.tabs[currentStickerCategory] = [];
        }
        return scope.tabs[currentStickerCategory];
    }
    function getStickerCategoryList() {
        const scope = getStickerScope();
        return Array.isArray(scope.categories) ? scope.categories : [];
    }
    function getStickerFilterLabel() {
        if (currentStickerFilter === 'all') return '全部';
        const categories = getStickerCategoryList();
        for (let i = 0; i < categories.length; i++) {
            const item = categories[i];
            if (item && item.id === currentStickerFilter) {
                return String(item.name || '').trim() || '分类';
            }
        }
        return '分类';
    }
    function getVisibleStickerItems() {
        const list = getStickerTabList();
        if (currentStickerFilter === 'all') return list.slice();
        return list.filter(function (item) {
            return item && String(item.categoryId || 'default') === currentStickerFilter;
        });
    }
    function ensureStickerFilterValid() {
        if (currentStickerFilter === 'all') return;
        const categories = getStickerCategoryList();
        const exists = categories.some(function (item) {
            return item && item.id === currentStickerFilter;
        });
        if (!exists) {
            currentStickerFilter = 'all';
        }
    }
    function updateStickerManageBar() {
        if (!stickerPanel) return;
        stickerPanel.classList.toggle('manage-mode', stickerManageMode);
        if (stickerManageAssignBtn) {
            stickerManageAssignBtn.textContent = currentStickerFilter === 'all'
                ? '选分类'
                : ('移到' + getStickerFilterLabel());
        }
        if (stickerManageSelectAllBtn) {
            const visible = getVisibleStickerItems();
            const allVisibleSelected = visible.length > 0 && visible.every(function (item) {
                return item && selectedStickerIds.has(String(item.id || ''));
            });
            stickerManageSelectAllBtn.textContent = allVisibleSelected ? '取消全选' : '全选';
        }
    }
    async function renameStickerCategoryWithPrompt(categoryId) {
        const id = String(categoryId || '').trim();
        if (!id || id === 'all' || id === '__add__') return;
        const categories = getStickerCategoryList();
        let current = null;
        for (let i = 0; i < categories.length; i++) {
            const item = categories[i];
            if (item && item.id === id) {
                current = item;
                break;
            }
        }
        if (!current) return;
        const oldName = String(current.name || '').trim() || '分类';
        const nextName = await chatUiPrompt('请输入新的分组名称', oldName, { title: '重命名分组', placeholder: '分组名称' });
        if (nextName === null) return;
        const cleanName = String(nextName || '').trim();
        if (!cleanName) {
            if (typeof showCenterToast === 'function') showCenterToast('分组名称不能为空');
            return;
        }
        if (cleanName === oldName) return;
        let renamed = null;
        if (typeof window.renameStickerCategory === 'function') {
            renamed = window.renameStickerCategory(getStickerRoleId(), id, cleanName);
        } else {
            current.name = cleanName;
            if (typeof window.persistStickerData === 'function') {
                window.persistStickerData();
            }
            renamed = current;
        }
        if (!renamed) {
            if (typeof showCenterToast === 'function') showCenterToast('重命名失败');
            return;
        }
        renderStickerPanel();
        if (typeof showCenterToast === 'function') {
            showCenterToast('已改名为 ' + cleanName);
        }
    }
    function bindStickerCategoryChipPress(chip, categoryId) {
        if (!chip) return;
        const id = String(categoryId || '').trim();
        if (!id || id === 'all' || id === '__add__') return;
        let pressTimer = null;
        let pressTriggered = false;
        let startX = 0;
        let startY = 0;
        const clearPressTimer = function () {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };
        const startPress = function (e) {
            const point = e && typeof e.clientX === 'number' && typeof e.clientY === 'number' ? e : null;
            startX = point ? point.clientX : 0;
            startY = point ? point.clientY : 0;
            clearPressTimer();
            pressTriggered = false;
            pressTimer = setTimeout(async function () {
                pressTimer = null;
                pressTriggered = true;
                chip.__stickerCategoryRenameSuppressed = true;
                setTimeout(function () {
                    chip.__stickerCategoryRenameSuppressed = false;
                }, 800);
                await renameStickerCategoryWithPrompt(id);
            }, 550);
        };
        const endPress = function () {
            clearPressTimer();
        };
        const movePress = function (e) {
            if (!pressTimer) return;
            if (!e || typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return;
            const dx = Math.abs(e.clientX - startX);
            const dy = Math.abs(e.clientY - startY);
            if (dx > 10 || dy > 10) {
                clearPressTimer();
            }
        };
        chip.addEventListener('pointerdown', startPress);
        chip.addEventListener('pointerup', endPress);
        chip.addEventListener('pointercancel', endPress);
        chip.addEventListener('pointerleave', endPress);
        chip.addEventListener('pointermove', movePress);
        chip.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            e.stopPropagation();
            chip.__stickerCategoryRenameSuppressed = true;
            setTimeout(function () {
                chip.__stickerCategoryRenameSuppressed = false;
            }, 800);
            renameStickerCategoryWithPrompt(id);
        });
        chip.addEventListener('click', function (e) {
            if (chip.__stickerCategoryRenameSuppressed || pressTriggered) {
                e.preventDefault();
                e.stopPropagation();
                chip.__stickerCategoryRenameSuppressed = false;
                pressTriggered = false;
            }
        });
    }
    function renderStickerCategories() {
        if (!stickerCategoryBar) return;
        const categories = getStickerCategoryList();
        stickerCategoryBar.innerHTML = '';

        function appendChip(id, label, extraClass) {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'sticker-category-chip' + (extraClass ? ' ' + extraClass : '');
            if (id === currentStickerFilter) {
                chip.classList.add('active');
            }
            chip.setAttribute('data-category-id', id);
            chip.textContent = label;
            if (extraClass !== 'add') {
                bindStickerCategoryChipPress(chip, id);
            }
            stickerCategoryBar.appendChild(chip);
        }

        appendChip('all', '全部');
        categories.forEach(function (item) {
            if (!item || !item.id) return;
            appendChip(item.id, item.name || '分类');
        });
        appendChip('__add__', '+新建', 'add');
    }
    function renderStickerGrid() {
        if (!stickerGrid) return;
        const list = getVisibleStickerItems();
        stickerGrid.innerHTML = '';
        if (!list.length) {
            const empty = document.createElement('div');
            empty.className = 'sticker-empty';
            empty.textContent = currentStickerFilter === 'all' ? '这个分组里还没有表情包' : '这个分类里还没有表情包';
            stickerGrid.appendChild(empty);
            updateStickerManageBar();
            syncStickerPanelState();
            return;
        }
        list.forEach(function (sticker) {
            if (!sticker) return;
            const url = normalizeStickerImportUrl(sticker.src || sticker.url || sticker.href || '');
            if (!url) return;
            const name = sanitizeStickerDisplayName(sticker.name, url);
            const item = document.createElement('div');
            item.className = 'sticker-item';
            item.dataset.id = String(sticker.id || '');
            item.dataset.url = url;
            item.dataset.categoryId = String(sticker.categoryId || 'default');
            item.dataset.name = name;
            item.title = name || '未命名表情';
            if (selectedStickerIds.has(String(sticker.id || ''))) {
                item.classList.add('selected');
            }
            if (!name) {
                item.classList.add('no-name');
            }

            const thumb = document.createElement('div');
            thumb.className = 'sticker-thumb';

            const img = document.createElement('img');
            img.src = url;
            img.alt = name || '表情包';
            img.loading = 'lazy';
            thumb.appendChild(img);

            const label = document.createElement('div');
            label.className = 'sticker-name';
            label.textContent = name || '未命名表情';

            item.appendChild(thumb);
            item.appendChild(label);
            stickerGrid.appendChild(item);
        });
        updateStickerManageBar();
        syncStickerPanelState();
    }
    function renderStickerPanel() {
        ensureStickerFilterValid();
        renderStickerCategories();
        renderStickerGrid();
    }
    function enterStickerManageMode(initialStickerId) {
        stickerManageMode = true;
        if (initialStickerId) {
            selectedStickerIds.add(String(initialStickerId));
        }
        renderStickerPanel();
    }
    function exitStickerManageMode() {
        stickerManageMode = false;
        selectedStickerIds.clear();
        renderStickerPanel();
    }
    function toggleStickerSelection(id) {
        const key = String(id || '').trim();
        if (!key) return;
        if (selectedStickerIds.has(key)) {
            selectedStickerIds.delete(key);
        } else {
            selectedStickerIds.add(key);
        }
        renderStickers();
    }
    function toggleStickerSelectAll() {
        const visible = getVisibleStickerItems();
        if (!visible.length) {
            if (typeof showCenterToast === 'function') showCenterToast('当前没有可选表情');
            return;
        }
        const allVisibleSelected = visible.every(function (item) {
            return item && selectedStickerIds.has(String(item.id || ''));
        });
        visible.forEach(function (item) {
            if (!item || !item.id) return;
            if (allVisibleSelected) {
                selectedStickerIds.delete(String(item.id));
            } else {
                selectedStickerIds.add(String(item.id));
            }
        });
        renderStickers();
    }
    async function createStickerCategoryWithPrompt() {
        const name = await chatUiPrompt('请输入新分类名称', '', { title: '新建分类', placeholder: '分类名称' });
        if (name === null) return null;
        const cleanName = String(name || '').trim();
        if (!cleanName) {
            if (typeof showCenterToast === 'function') showCenterToast('分类名称不能为空');
            return null;
        }
        const category = typeof window.ensureStickerCategory === 'function'
            ? window.ensureStickerCategory(getStickerRoleId(), cleanName)
            : null;
        if (!category) {
            if (typeof showCenterToast === 'function') showCenterToast('分类创建失败');
            return null;
        }
        currentStickerFilter = String(category.id || 'all');
        renderStickerPanel();
        return category;
    }
    function assignSelectedStickersToCurrentCategory() {
        if (!selectedStickerIds.size) {
            if (typeof showCenterToast === 'function') showCenterToast('请先选择表情');
            return;
        }
        if (currentStickerFilter === 'all') {
            if (typeof showCenterToast === 'function') showCenterToast('先在下方选择一个分类');
            return;
        }
        const list = getStickerTabList();
        let changed = 0;
        list.forEach(function (item) {
            if (!item || !item.id) return;
            if (!selectedStickerIds.has(String(item.id))) return;
            item.categoryId = currentStickerFilter;
            changed++;
        });
        if (!changed) {
            if (typeof showCenterToast === 'function') showCenterToast('没有可分类的表情');
            return;
        }
        if (typeof window.persistStickerData === 'function') {
            window.persistStickerData();
        }
        selectedStickerIds.clear();
        renderStickerPanel();
        if (typeof showCenterToast === 'function') {
            showCenterToast('已移动到 ' + getStickerFilterLabel());
        }
    }
    async function deleteSelectedStickers() {
        if (!selectedStickerIds.size) {
            if (typeof showCenterToast === 'function') showCenterToast('请先选择表情');
            return;
        }
        if (!(await chatUiConfirm('确定删除选中的表情包吗？', { title: '删除表情包' }))) return;
        const list = getStickerTabList();
        const next = list.filter(function (item) {
            return !(item && item.id && selectedStickerIds.has(String(item.id)));
        });
        const scope = getStickerScope();
        scope.tabs[currentStickerCategory] = next;
        selectedStickerIds.clear();
        if (typeof window.persistStickerData === 'function') {
            window.persistStickerData();
        }
        renderStickerPanel();
        if (typeof showCenterToast === 'function') showCenterToast('删除成功');
    }
    function refocusChatInput(delayMs) {
        if (!msgInput) return;
        if (typeof window.focusChatInputSafely === 'function') {
            window.focusChatInputSafely(msgInput, delayMs);
            return;
        }
        setTimeout(function () {
            try { msgInput.focus(); } catch (e) { }
        }, Number(delayMs) || 0);
    }
    function updateHistoryHeight(isOpen, options) {
        if (!historyBox) return;
        const opts = options && typeof options === 'object' ? options : {};
        const prevBottomGap = Math.max(0, historyBox.scrollHeight - historyBox.clientHeight - historyBox.scrollTop);
        historyBox.style.height = isOpen ? openHeight : baseHeight;
        if (opts.preserveScroll) {
            const targetTop = historyBox.scrollHeight - historyBox.clientHeight - prevBottomGap;
            historyBox.scrollTop = Math.max(0, targetTop);
            try {
                if (typeof window.syncChatViewportLayout === 'function') {
                    window.syncChatViewportLayout();
                }
            } catch (e) { }
            return;
        }
        if (opts.keepBottom === true || prevBottomGap <= 64) {
            historyBox.scrollTop = historyBox.scrollHeight;
        }
        try {
            if (typeof window.syncChatViewportLayout === 'function') {
                window.syncChatViewportLayout();
            }
        } catch (e) { }
    }
    function renderMorePanel() {
        if (!pagesContainer || !dotsContainer) return;
        pagesContainer.innerHTML = '';
        dotsContainer.innerHTML = '';
        const pageSize = 8;
        const pageCount = Math.max(1, Math.ceil(features.length / pageSize));
        for (let p = 0; p < pageCount; p++) {
            const pageEl = document.createElement('div');
            pageEl.className = 'more-page';
            const grid = document.createElement('div');
            grid.className = 'more-grid';
            const start = p * pageSize;
            const slice = features.slice(start, start + pageSize);
            slice.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'more-item';
                itemEl.setAttribute('data-action', item.action);
                const iconHtml = item.iconClass ? `<i class="${item.iconClass}"></i>` : '';
                itemEl.innerHTML = `
                    <div class="more-icon">${iconHtml}</div>
                    <div class="more-text">${item.label}</div>
                `;
                grid.appendChild(itemEl);
            });
            pageEl.appendChild(grid);
            pagesContainer.appendChild(pageEl);
            const dot = document.createElement('span');
            dot.className = 'chat-more-dot' + (p === 0 ? ' active' : '');
            dot.dataset.index = p;
            dotsContainer.appendChild(dot);
        }
    }
    function renderStickers() {
        renderStickerPanel();
    }
    function setActiveStickerTab(type) {
        if (!stickerPanel) return;
        const tabs = stickerPanel.querySelectorAll('.sticker-tab');
        tabs.forEach(tab => {
            const tabType = tab.getAttribute('data-type');
            if (tabType === type) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        currentStickerCategory = type;
        exitStickerManageMode();
        renderStickers();
    }
    function openStickerPanel() {
        if (!stickerPanel) return;
        if (typeof window.ensureStickerStore === 'function') {
            window.ensureStickerStore(false);
        }
        if (!stickerPanel.classList.contains('show')) {
            setActiveStickerTab(currentStickerCategory || 'mine');
            stickerPanel.classList.add('show');
        }
    }
    function closeStickerPanel() {
        if (!stickerPanel) return;
        exitStickerManageMode();
        stickerPanel.classList.remove('show');
    }
    function sendSticker(url, name) {
        const roleId = window.currentChatRole;
        const cleanUrl = normalizeStickerImportUrl(url);
        if (!roleId || !cleanUrl) return;
        const now = Date.now();
        if (!window.chatData[roleId]) window.chatData[roleId] = [];
        const cleanName = sanitizeStickerDisplayName(name, cleanUrl);
        const msg = {
            role: 'me',
            content: `[STICKER:${cleanUrl}]`,
            type: 'sticker',
            timestamp: now,
            status: 'sent',
            stickerUrl: cleanUrl,
            stickerName: cleanName
        };
        window.chatData[roleId].push(msg);
        appendMessageToDOM(msg);
        saveData();
        refocusChatInput(10);
    }
    function chatUiAlert(message, opts) {
        if (typeof window.uiAlert === 'function') return window.uiAlert(message, opts);
        if (window.GlobalModal && typeof window.GlobalModal.showError === 'function') {
            window.GlobalModal.showError(String(message || ''));
            return Promise.resolve();
        }
        alert(message);
        return Promise.resolve();
    }
    function chatUiPrompt(message, defaultValue, opts) {
        if (typeof window.uiPrompt === 'function') return window.uiPrompt(message, defaultValue, opts);
        return Promise.resolve(window.prompt(String(message || ''), defaultValue));
    }
    function chatUiConfirm(message, opts) {
        if (typeof window.uiConfirm === 'function') return window.uiConfirm(message, opts);
        return Promise.resolve(window.confirm(String(message || '')));
    }
    function updateDotsByScroll() {
        if (!pagesContainer || !dotsContainer) return;
        const width = pagesContainer.clientWidth;
        if (!width) return;
        const index = Math.round(pagesContainer.scrollLeft / width);
        const dots = dotsContainer.querySelectorAll('.chat-more-dot');
        dots.forEach((dot, i) => {
            if (i === index) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    async function handleMoreAction(action) {
        if (!action) return;
        if (action === 'voicecall') {
            startVoiceCall();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            return;
        }
        if (action === 'videocall') {
            startVideoCall();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            return;
        }
        if (action === 'offline_novel') {
            try {
                if (panel) {
                    panel.classList.remove('show');
                    updateHistoryHeight(false);
                }
                closeStickerPanel();
            } catch (e) { }
            if (typeof window.openOfflineModeConfirm === 'function') {
                window.openOfflineModeConfirm().catch(function (err) {
                    console.warn('[OfflineMode] 打开长叙事确认框失败', err);
                });
            }
            return;
        }
        if (action === 'card') {
            try {
                if (panel) {
                    panel.classList.remove('show');
                    updateHistoryHeight(false);
                }
                closeStickerPanel();
            } catch (e) { }
            if (typeof window.openGiftPoolPage === 'function') {
                window.openGiftPoolPage(window.currentChatRole || window.currentCharacterId || '');
            } else if (window.Wallet && typeof window.Wallet.open === 'function') {
                window.Wallet.open();
                if (typeof setWalletTab === 'function') setWalletTab('records');
            }
            return;
        }
        if (action === 'location') {
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            if (typeof window.showLocationSelectSheet === 'function') {
                window.showLocationSelectSheet();
            } else if (typeof showLocationSelectSheet === 'function') {
                showLocationSelectSheet();
            } else {
                await chatUiAlert('位置功能未初始化，请刷新页面后重试');
            }
            return;
        }
        if (action === 'album') {
            const uploader = document.getElementById('chat-image-uploader');
            if (uploader) uploader.click();
            closeStickerPanel();
            return;
        }
        if (action === 'camera') {
            const roleId = window.currentChatRole;
            if (!roleId) return;
            const inputText = await chatUiPrompt('请输入照片内容的描述', '', { title: '发送照片', placeholder: '这张照片里是什么' });
            if (inputText === null) return;
            const desc = inputText.trim();
            if (!desc) return;
            const now = Date.now();
            if (!window.chatData[roleId]) window.chatData[roleId] = [];
            const msg = {
                role: 'me',
                type: 'image',
                content: window.virtualPhotoImagePath,
                description: desc,
                timestamp: now,
                status: 'sent'
            };
            window.chatData[roleId].push(msg);
            appendMessageToDOM(msg);
            saveData();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            if (msgInput) {
                refocusChatInput(10);
            }
            return;
        }
        if (action === 'transfer') {
            const roleId = window.currentChatRole;
            if (!roleId) return;
            
            // 🛑 新增：校验余额
            const walletData = window.Wallet ? window.Wallet.getData() : { totalAssets: 0 };
            const balance = walletData.totalAssets || 0;

            const amountInput = await chatUiPrompt(`请输入转账金额（当前余额：¥${balance.toFixed(2)}）`, '88.00', { title: '发送转账', placeholder: '88.00' });
            if (amountInput === null) return;
            const amountNum = parseFloat(amountInput.trim());
            if (isNaN(amountNum) || amountNum <= 0) {
                await chatUiAlert('请输入有效的转账金额');
                return;
            }

            if (amountNum > balance) {
                await chatUiAlert(`余额不足！你当前只有 ¥${balance.toFixed(2)}，无法发送 ¥${amountNum.toFixed(2)} 的转账。`);
                return;
            }

            const amount = amountNum.toFixed(2);
            const noteInput = await chatUiPrompt('请输入转账备注', '恭喜发财', { title: '转账备注', placeholder: '恭喜发财' });
            if (noteInput === null) return;
            const note = noteInput.trim();
            const now = Date.now();

            // 🛑 新增：立即扣费
            if (window.Wallet && typeof window.Wallet.addTransaction === 'function') {
                const p = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
                const peerName = (p.remark || p.nickName || p.name || '对方').toString();
                window.Wallet.addTransaction('expense', `转账给${peerName}`, amount, 'transfer', { peerName, peerRoleId: roleId, kind: 'transfer' });
            }

            if (!window.chatData[roleId]) window.chatData[roleId] = [];
            const msg = { role: 'me', type: 'transfer', amount: amount, note: note, timestamp: now, status: 'sent' };
            window.chatData[roleId].push(msg);
            appendMessageToDOM(msg);
            saveData();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            if (msgInput) {
                refocusChatInput(10);
            }
            return;
        }
        if (action === 'reroll') {
            const roleId = window.currentChatRole;
            if (!roleId) return;
            const list = window.chatData[roleId] || [];
            if (list.length === 0) {
                await chatUiAlert('当前没有可以重置的内容');
                return;
            }
            const last = list[list.length - 1];
            if (!last || last.role !== 'ai') {
                await chatUiAlert('无法重置，最后一条不是AI的回复');
                return;
            }

            // 1. 连续弹出末尾所有 AI 消息
            const removedTimestamps = [];
            while (list.length > 0) {
                const tail = list[list.length - 1];
                if (!tail || tail.role !== 'ai') break;
                const ts = tail.timestamp;
                removedTimestamps.push(ts);
                list.pop();
            }

            // 2. 删除 DOM 中对应的气泡（按时间戳匹配）
            const chatBody = document.getElementById('chat-history');
            if (chatBody && removedTimestamps.length > 0) {
                const rows = Array.from(chatBody.querySelectorAll('.msg-row[data-role="ai"]'));
                rows.forEach(row => {
                    const tsAttr = row.getAttribute('data-timestamp');
                    if (!tsAttr) return;
                    const ts = parseInt(tsAttr, 10);
                    if (removedTimestamps.indexOf(ts) !== -1) {
                        row.remove();
                    }
                });
            }

            saveData();

            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();

            // 3. 重新触发 AI 回复（标记为重摇请求）
            if (typeof window !== 'undefined') {
                window.__chatRerollRequested = true;
            }
            triggerAI();
            return;
        }
        if (action === 'voice') {
            const roleId = window.currentChatRole;
            if (!roleId) return;
            const textInput = await chatUiPrompt('请输入你想说的话（模拟语音内容）', '', { title: '发送语音', placeholder: '想说的话' });
            if (textInput === null) return;
            const contentText = textInput.trim();
            if (!contentText) return;
            const now = Date.now();
            const duration = calcVoiceDurationSeconds(contentText);
            if (!window.chatData[roleId]) window.chatData[roleId] = [];
            const msg = { role: 'me', type: 'voice', content: contentText, duration: duration, timestamp: now, status: 'sent' };
            window.chatData[roleId].push(msg);
            appendMessageToDOM(msg);
            saveData();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            if (msgInput) {
                refocusChatInput(10);
            }
            return;
        }
        if (action === 'redpacket') {
            const roleId = window.currentChatRole;
            if (!roleId) return;

            // 🛑 新增：校验余额
            const walletData = window.Wallet ? window.Wallet.getData() : { totalAssets: 0 };
            const balance = walletData.totalAssets || 0;

            const amountInput = await chatUiPrompt(`请输入红包金额（当前余额：¥${balance.toFixed(2)}）`, '88.00', { title: '发送红包', placeholder: '88.00' });
            if (amountInput === null) return;
            const amountNum = parseFloat(String(amountInput).trim());
            if (isNaN(amountNum) || amountNum <= 0) {
                await chatUiAlert('请输入有效的红包金额');
                return;
            }

            if (amountNum > balance) {
                await chatUiAlert(`余额不足！你当前只有 ¥${balance.toFixed(2)}，无法发送 ¥${amountNum.toFixed(2)} 的红包。`);
                return;
            }

            const amount = amountNum.toFixed(2);
            const noteInput = await chatUiPrompt('请输入红包祝福语', '恭喜发财，大吉大利', { title: '红包祝福语', placeholder: '恭喜发财，大吉大利' });
            if (noteInput === null) return;
            let note = String(noteInput).trim();
            if (!note) {
                note = '恭喜发财，大吉大利';
            }
            const now = Date.now();

            // 🛑 新增：立即扣费
            if (window.Wallet && typeof window.Wallet.addTransaction === 'function') {
                const p = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
                const peerName = (p.remark || p.nickName || p.name || '对方').toString();
                window.Wallet.addTransaction('expense', `发红包给${peerName}`, amount, 'transfer', { peerName, peerRoleId: roleId, kind: 'redpacket' });
            }

            if (!window.chatData[roleId]) window.chatData[roleId] = [];
            const msg = {
                role: 'me',
                type: 'redpacket',
                amount: amount,
                note: note,
                timestamp: now,
                status: 'unopened'
            };
            window.chatData[roleId].push(msg);
            appendMessageToDOM(msg);
            saveData();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            if (msgInput) {
                refocusChatInput(10);
            }
            return;
        }
        if (action === 'dice') {
            const roleId = window.currentChatRole;
            if (!roleId) return;
            const point = Math.floor(Math.random() * 6) + 1;
            const now = Date.now();
            if (!window.chatData[roleId]) window.chatData[roleId] = [];
            const msg = { role: 'me', type: 'dice', content: String(point), timestamp: now, status: 'sent' };
            window.chatData[roleId].push(msg);
            appendMessageToDOM(msg);
            saveData();
            if (panel) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
            }
            closeStickerPanel();
            if (msgInput) {
                refocusChatInput(10);
            }
            return;
        }
    }
    renderMorePanel();
    const quickEmojiBtn = document.getElementById('quick-emoji-btn');
    if (quickEmojiBtn) {
        quickEmojiBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!stickerPanel) return;
            if (stickerPanel.classList.contains('show')) {
                closeStickerPanel();
            } else {
                openStickerPanel();
                if (panel && !panel.classList.contains('show')) {
                    panel.classList.add('show');
                    updateHistoryHeight(true);
                }
            }
        });
    }

    if (pagesContainer) {
        pagesContainer.addEventListener('scroll', function () {
            updateDotsByScroll();
        });
        pagesContainer.addEventListener('click', function (e) {
            const item = e.target.closest('.more-item');
            if (!item) return;
            const action = item.getAttribute('data-action');
            handleMoreAction(action);
        });
    }
    if (dotsContainer && pagesContainer) {
        dotsContainer.addEventListener('click', function (e) {
            const dot = e.target.closest('.chat-more-dot');
            if (!dot) return;
            const index = parseInt(dot.dataset.index || '0', 10);
            const width = pagesContainer.clientWidth;
            pagesContainer.scrollTo({ left: index * width, behavior: 'smooth' });
        });
    }
    if (moreBtn && panel) {
        moreBtn.addEventListener('click', function () {
            const showing = panel.classList.contains('show');
            if (showing) {
                panel.classList.remove('show');
                updateHistoryHeight(false);
                closeStickerPanel();
            } else {
                panel.classList.add('show');
                updateHistoryHeight(true);
            }
        });
    }
    if (msgInput && panel) {
        msgInput.addEventListener('focus', function () {
            panel.classList.remove('show');
            // 修复：点击输入框时强制滚动到底部，类似微信效果
            updateHistoryHeight(false, { preserveScroll: false, keepBottom: true });
            closeStickerPanel();
            
            // 延迟一点再次滚动，确保软键盘完全弹出后滚动到底部
            setTimeout(function() {
                const historyBox = document.getElementById('chat-history');
                if (historyBox) historyBox.scrollTop = historyBox.scrollHeight;
            }, 300);
        });
        
        msgInput.addEventListener('click', function () {
            // 点击时也尝试滚动到底部
            setTimeout(function() {
                const historyBox = document.getElementById('chat-history');
                if (historyBox) historyBox.scrollTop = historyBox.scrollHeight;
            }, 100);
        });
    }
    if (historyBox && panel) {
        historyBox.addEventListener('click', function () {
            const panelWasOpen = panel.classList.contains('show');
            const stickerWasOpen = stickerPanel && stickerPanel.classList.contains('show');
            if (!panelWasOpen && !stickerWasOpen) return;
            panel.classList.remove('show');
            updateHistoryHeight(false, { preserveScroll: true, keepBottom: false });
            closeStickerPanel();
        });
    }
    const uploader = document.getElementById('chat-image-uploader');
    if (uploader) {
        try { uploader.multiple = true; } catch (e) { }
        uploader.addEventListener('change', async function () {
            const roleId = window.currentChatRole;
            const files = uploader.files ? Array.from(uploader.files) : [];
            if (!files.length) {
                uploader.value = '';
                return;
            }

            const input = document.getElementById('msg-input');
            const caption = input && input.value ? String(input.value).trim() : '';

            const images = [];
            for (let i = 0; i < files.length; i++) {
                const base64 = await compressImageFileToDataUrl(files[i], 1024);
                if (!base64) continue;
                images.push(base64);
                const now = Date.now();
                if (!window.chatData[roleId]) window.chatData[roleId] = [];
                const msg = { role: 'me', content: base64, type: 'image', timestamp: now, status: 'sent' };
                window.chatData[roleId].push(msg);
                appendMessageToDOM(msg);
            }

            if (images.length) saveData();
            if (input) refocusChatInput(10);
            uploader.value = '';
            const panel = document.getElementById('chat-more-panel');
            if (panel) panel.classList.remove('show');
            updateHistoryHeight(false, { preserveScroll: true, keepBottom: false });
        });
    }
    if (stickerPanel && stickerGrid) {
        stickerGrid.addEventListener('click', function (e) {
            const item = e.target.closest('.sticker-item');
            if (!item) return;
            if (Date.now() < suppressStickerClickUntil) return;
            const stickerId = item.dataset.id || '';
            if (stickerManageMode) {
                toggleStickerSelection(stickerId);
                return;
            }
            const url = item.dataset.url;
            if (!url) return;
            sendSticker(url, item.dataset.name || '');
        });
        stickerGrid.addEventListener('touchstart', function (e) {
            const item = e.target.closest('.sticker-item');
            if (!item || stickerManageMode) return;
            if (stickerLongPressTimer) {
                clearTimeout(stickerLongPressTimer);
                stickerLongPressTimer = null;
            }
            const stickerId = String(item.dataset.id || '').trim();
            if (!stickerId) return;
            stickerLongPressTimer = setTimeout(function () {
                suppressStickerClickUntil = Date.now() + 500;
                enterStickerManageMode(stickerId);
                stickerLongPressTimer = null;
            }, 450);
        }, { passive: true });
        stickerGrid.addEventListener('touchend', function () {
            if (stickerLongPressTimer) {
                clearTimeout(stickerLongPressTimer);
                stickerLongPressTimer = null;
            }
        });
        stickerGrid.addEventListener('touchmove', function () {
            if (stickerLongPressTimer) {
                clearTimeout(stickerLongPressTimer);
                stickerLongPressTimer = null;
            }
        });
        stickerGrid.addEventListener('touchcancel', function () {
            if (stickerLongPressTimer) {
                clearTimeout(stickerLongPressTimer);
                stickerLongPressTimer = null;
            }
        });
        stickerGrid.addEventListener('contextmenu', function (e) {
            const item = e.target.closest('.sticker-item');
            if (!item) return;
            e.preventDefault();
            const stickerId = String(item.dataset.id || '').trim();
            if (!stickerId) return;
            suppressStickerClickUntil = Date.now() + 500;
            enterStickerManageMode(stickerId);
        });
    }
    if (stickerPanel) {
        const tabs = stickerPanel.querySelectorAll('.sticker-tab');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                const type = tab.getAttribute('data-type');
                if (!type) return;
                setActiveStickerTab(type);
            });
        });
    }
    if (stickerAddBtn) {
        stickerAddBtn.addEventListener('click', function () {
            openStickerImportModal();
        });
    }
    if (stickerCategoryBar) {
        stickerCategoryBar.addEventListener('click', function (e) {
            const chip = e.target.closest('.sticker-category-chip');
            if (!chip) return;
            const id = chip.getAttribute('data-category-id') || '';
            if (id === '__add__') {
                createStickerCategoryWithPrompt();
                return;
            }
            currentStickerFilter = id || 'all';
            renderStickerPanel();
        });
    }
    if (stickerManageAssignBtn) {
        stickerManageAssignBtn.addEventListener('click', function () {
            assignSelectedStickersToCurrentCategory();
        });
    }
    if (stickerManageSelectAllBtn) {
        stickerManageSelectAllBtn.addEventListener('click', function () {
            toggleStickerSelectAll();
        });
    }
    if (stickerManageDeleteBtn) {
        stickerManageDeleteBtn.addEventListener('click', function () {
            deleteSelectedStickers();
        });
    }
    if (stickerManageDoneBtn) {
        stickerManageDoneBtn.addEventListener('click', function () {
            exitStickerManageMode();
        });
    }
    if (stickerImportCancelBtn) {
        stickerImportCancelBtn.addEventListener('click', function () {
            closeStickerImportModal();
        });
    }
    if (stickerImportConfirmBtn) {
        stickerImportConfirmBtn.addEventListener('click', function () {
            confirmStickerImport();
        });
    }
    window.refreshStickerPanel = renderStickerPanel;
    syncStickerPanelState();
});

function openStickerImportModal() {
    const modal = document.getElementById('sticker-import-modal');
    const textarea = document.getElementById('sticker-import-text');
    const select = document.getElementById('sticker-import-category');
    if (!modal || !textarea || !select) return;

    let defaultKey = 'mine';
    try {
        const panelState = window.__chatStickerPanelState && typeof window.__chatStickerPanelState === 'object'
            ? window.__chatStickerPanelState
            : {};
        const currentTab = String(panelState.currentTab || '').trim();
        if (currentTab === 'mine' || currentTab === 'his' || currentTab === 'general') {
            defaultKey = currentTab;
        }
    } catch (e) { }

    textarea.value = '';
    select.value = defaultKey;
    modal.style.display = 'flex';
}

function closeStickerImportModal() {
    const modal = document.getElementById('sticker-import-modal');
    if (!modal) return;
    modal.style.display = 'none';
}

function confirmStickerImport() {
    const modal = document.getElementById('sticker-import-modal');
    const textarea = document.getElementById('sticker-import-text');
    const select = document.getElementById('sticker-import-category');
    if (!modal || !textarea || !select) return;
    const raw = textarea.value || '';
    const lines = raw.split('\n');
    const key = select.value || 'mine';
    if (typeof window.ensureStickerStore === 'function') {
        window.ensureStickerStore(false);
    }
    const roleId = String(window.currentChatRole || '').trim() || '__default__';
    const scope = typeof window.getStickerScopeForRole === 'function'
        ? window.getStickerScopeForRole(roleId)
        : null;
    if (!scope || !scope.tabs) return;
    if (!Array.isArray(scope.tabs[key])) {
        scope.tabs[key] = [];
    }
    const panelState = window.__chatStickerPanelState && typeof window.__chatStickerPanelState === 'object'
        ? window.__chatStickerPanelState
        : {};
    let categoryId = String(panelState.currentFilter || 'all').trim() || 'all';
    if (categoryId === 'all') categoryId = 'default';
    const knownUrls = new Set();
    const makeDuplicateKey = typeof window.getStickerDuplicateUrlKey === 'function'
        ? window.getStickerDuplicateUrlKey
        : function (src) {
            return String(src || '').trim().replace(/\s+/g, '');
        };
    ['mine', 'his', 'general'].forEach(function (tabKey) {
        const list = Array.isArray(scope.tabs[tabKey]) ? scope.tabs[tabKey] : [];
        list.forEach(function (item) {
            const dupKey = makeDuplicateKey(item && item.src);
            if (dupKey) knownUrls.add(dupKey);
        });
    });
    for (let i = 0; i < lines.length; i++) {
        const parsed = parseStickerImportLine(lines[i]);
        if (!parsed || !parsed.url) continue;
        const namePart = sanitizeStickerDisplayName(parsed.name, parsed.url);
        const urlPart = parsed.url;
        if (typeof window.isValidImageUrlCandidate === 'function' && !window.isValidImageUrlCandidate(urlPart)) {
            continue;
        }
        const duplicateKey = makeDuplicateKey(urlPart);
        if (!duplicateKey || knownUrls.has(duplicateKey)) {
            continue;
        }
        knownUrls.add(duplicateKey);
        scope.tabs[key].push({
            id: 'stk_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
            name: namePart,
            src: urlPart,
            categoryId: categoryId
        });
    }
    if (typeof window.persistStickerData === 'function') {
        window.persistStickerData();
    } else {
        try {
            localStorage.setItem('stickerData', JSON.stringify(window.stickerData || {}));
        } catch (e0) { }
    }
    modal.style.display = 'none';
    if (typeof window.refreshStickerPanel === 'function') {
        window.refreshStickerPanel();
    }
}

window.openStickerImportModal = openStickerImportModal;
window.closeStickerImportModal = closeStickerImportModal;
window.confirmStickerImport = confirmStickerImport;

function openChatSettings() {
    const roleId = window.currentChatRole;
    const profiles = (window.charProfiles && typeof window.charProfiles === 'object') ? window.charProfiles : {};
    const profile = (roleId && profiles[roleId]) ? profiles[roleId] : {};

    const nameEl = document.getElementById('menu-role-name');
    const descEl = document.getElementById('menu-role-desc');
    const avatarEl = document.getElementById('menu-role-avatar');
    if (nameEl) nameEl.innerText = profile.remark || profile.nickName || roleId;
    if (descEl) descEl.innerText = profile.desc || "点击查看档案...";
    if (avatarEl) avatarEl.src = profile.avatar || "assets/chushitouxiang.jpg";

    const menu = document.getElementById('settings-menu-modal');
    if (!menu) return;
    if (menu.dataset) {
        // 绑定 roleId 到设置菜单模态框，供后续读取
        const roleIdStr = String(roleId || '').trim();
        menu.dataset.roleId = roleIdStr;
        const modal = document.getElementById('settings-menu-modal');
        if (modal) {
            modal.dataset.roleId = roleIdStr;
        }
    }
    menu.style.display = 'flex';
    if (typeof window.initChatSettingsUI === 'function') {
        window.initChatSettingsUI(roleId);
    }
}

function closeSettingsMenu() {
    document.getElementById('settings-menu-modal').style.display = 'none';
}

function renderEditVideoAlbum() {
    const list = document.getElementById('edit-video-album-list');
    if (!list) return;
    list.innerHTML = '';
    const data = Array.isArray(window.editVideoAlbumData) ? window.editVideoAlbumData : [];
    for (let i = 0; i < data.length; i++) {
        const url = data[i];
        if (!url) continue;
        const item = document.createElement('div');
        item.style.cssText = 'width:64px; height:64px; border-radius:6px; overflow:hidden; position:relative; background:#000;';
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
        const del = document.createElement('div');
        del.innerText = '×';
        del.style.cssText = 'position:absolute; top:0; right:0; width:18px; height:18px; line-height:18px; text-align:center; font-size:14px; color:#fff; background:rgba(0,0,0,0.6); cursor:pointer;';
        del.setAttribute('data-index', String(i));
        del.onclick = function () {
            const idx = parseInt(this.getAttribute('data-index') || '0', 10);
            if (Array.isArray(window.editVideoAlbumData)) {
                window.editVideoAlbumData.splice(idx, 1);
                renderEditVideoAlbum();
            }
        };
        item.appendChild(img);
        item.appendChild(del);
        list.appendChild(item);
    }
}

function handleEditVideoAlbumFile(input) {
    if (!input || !input.files || !input.files[0]) return;
    handleImageUpload(input, null, function (base64) {
        if (!Array.isArray(window.editVideoAlbumData)) {
            window.editVideoAlbumData = [];
        }
        window.editVideoAlbumData.push(base64);
        renderEditVideoAlbum();
    });
    input.value = '';
}

// --- A. 角色编辑器 ---
function openCharacterEditor() {
    const roleId = window.currentChatRole;
    const profile = window.charProfiles[roleId] || {};

    // 填充数据
    document.getElementById('edit-ai-name').value = profile.nickName || "";
    document.getElementById('edit-ai-remark').value = profile.remark || "";
    document.getElementById('edit-ai-personality').value = profile.desc || "";
    document.getElementById('edit-ai-style').value = profile.style || "";
    document.getElementById('edit-ai-schedule').value = profile.schedule || "";
    document.getElementById('edit-avatar-preview').src = profile.avatar || "assets/chushitouxiang.jpg";

    window.editVideoAlbumData = Array.isArray(profile.videoAlbum) ? profile.videoAlbum.slice() : [];
    renderEditVideoAlbum();

    // 🔥 新增：填充并回显选中的世界书 (支持多选)
    const container = document.getElementById('edit-ai-worldbook-container');
    if (container && window.getWorldBookCheckboxListHTML) {
        // profile.worldbookId 可能是数组，也可能是旧的单 ID 字符串
        let selectedIds = profile.worldbookId || [];
        if (typeof selectedIds === 'string') {
            selectedIds = selectedIds ? [selectedIds] : [];
        }
        container.innerHTML = window.getWorldBookCheckboxListHTML(selectedIds);
        if (typeof window.bindWorldBookCheckboxList === 'function') {
            window.bindWorldBookCheckboxList(container);
        }
    }
    if (typeof window.renderScheduleParsePanel === 'function') {
        const parsed = profile.scheduleParsed && typeof profile.scheduleParsed === 'object'
            ? profile.scheduleParsed
            : (typeof window.parseRoleSchedulePlan === 'function' && profile.schedule ? window.parseRoleSchedulePlan(profile.schedule) : null);
        window.renderScheduleParsePanel('editor', parsed, profile.schedule || '');
    }

    // 先把上一级菜单关掉
    document.getElementById('settings-menu-modal').style.display = 'none';

    // 打开编辑弹窗
    document.getElementById('editor-modal').style.display = 'flex';
}


// 关闭编辑窗口
function closeEditor() {
    document.getElementById('editor-modal').style.display = 'none';
}

// 保存编辑结果
function saveEditResult() {
    const roleId = window.currentChatRole;
    if (!roleId) return;

    // 读取输入框
    const newName = document.getElementById('edit-ai-name').value;
    const newRemark = (function () {
        const el = document.getElementById('edit-ai-remark');
        const raw = el ? el.value : '';
        return String(raw || '').trim();
    })();
    const newDesc = document.getElementById('edit-ai-personality').value;
    const newStyle = document.getElementById('edit-ai-style').value;
    const newSchedule = document.getElementById('edit-ai-schedule').value;
    const newAvatar = document.getElementById('edit-avatar-preview').src;

    // 🔥 新增：读取多选世界书
    const wbContainer = document.getElementById('edit-ai-worldbook-container');
    let newWorldBookId = [];
    if (wbContainer) {
        const checkboxes = wbContainer.querySelectorAll('input[name="wb-checkbox"]:checked');
        newWorldBookId = Array.from(checkboxes).map(cb => cb.value);
    }

    if (!newName) return alert("名字不能为空");

    // 更新数据
    if (!window.charProfiles[roleId]) window.charProfiles[roleId] = {};
    const p = window.charProfiles[roleId];
    const oldRemark = typeof p.remark === 'string' ? p.remark.trim() : '';
    p.nickName = newName;
    p.remark = newRemark;
    p.desc = newDesc;
    p.style = newStyle;
    p.schedule = newSchedule;
    const editorScheduleParsed = typeof window.collectScheduleParsePanelState === 'function'
        ? window.collectScheduleParsePanelState('editor')
        : null;
    const editorParsedPlan = editorScheduleParsed || (typeof window.parseRoleSchedulePlan === 'function' ? window.parseRoleSchedulePlan(newSchedule) : null);
    if (editorParsedPlan) {
        p.scheduleParsed = editorParsedPlan;
    } else {
        delete p.scheduleParsed;
    }
    p.avatar = newAvatar;
    p.worldbookId = newWorldBookId;
    p.videoAlbum = Array.isArray(window.editVideoAlbumData) ? window.editVideoAlbumData.slice() : [];

    saveData();

    // 刷新当前页面的标题
    const titleEl = document.getElementById('current-chat-name');
    if (titleEl) titleEl.innerText = (newRemark || newName);

    if (oldRemark !== newRemark) {
        const myPersona = window.userPersonas[roleId] || {};
        const userName = (myPersona && typeof myPersona.name === 'string' && myPersona.name.trim()) ? myPersona.name.trim() : '用户';
        const showRemark = newRemark || newName;
        const sysText = `${userName}已将你的备注改成${showRemark}`;
        if (!window.chatData[roleId]) window.chatData[roleId] = [];
        const sysMsg = {
            role: 'me',
            content: sysText,
            type: 'system_event',
            includeInAI: true,
            timestamp: Date.now()
        };
        window.chatData[roleId].push(sysMsg);
        appendMessageToDOM(sysMsg);
        saveData();
    }

    closeEditor();
    alert("修改已保存！");
}


// 编辑角色时的头像预览
function previewEditAvatar(input) {
    // 角色头像也压缩到 150px
    handleImageUpload(input, 'edit-avatar-preview', null, 150);
}

function closeCreator() {
    document.getElementById('creator-modal').style.display = 'none';
}

// --- B. 我的身份设置 (修复层级遮挡) ---

const USER_PERSONA_PRESET_STORAGE_KEY = 'user_persona_presets_v1';

function readUserPersonaPresets() {
    try {
        const raw = localStorage.getItem(USER_PERSONA_PRESET_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function writeUserPersonaPresets(list) {
    const safeList = Array.isArray(list) ? list : [];
    localStorage.setItem(USER_PERSONA_PRESET_STORAGE_KEY, JSON.stringify(safeList));
}

function getUserPersonaFormValueMap() {
    const nameInput = document.getElementById('user-settings-name');
    const settingInput = document.getElementById('user-persona-setting');
    const avatarImg = document.getElementById('user-settings-avatar');
    const genderSelect = document.getElementById('user-settings-gender');
    const birthdayTypeSelect = document.getElementById('user-birthday-type');
    const birthdaySolarInput = document.getElementById('user-settings-birthday-solar');
    const birthdayLunarInput = document.getElementById('user-settings-birthday-lunar');

    const birthdayType = birthdayTypeSelect ? String(birthdayTypeSelect.value || 'solar').trim() || 'solar' : 'solar';
    const birthday = birthdayType === 'lunar'
        ? (birthdayLunarInput ? birthdayLunarInput.value : '')
        : (birthdaySolarInput ? birthdaySolarInput.value : '');

    return {
        name: nameInput ? nameInput.value.trim() : '',
        setting: settingInput ? settingInput.value : '',
        avatar: avatarImg ? avatarImg.src : '',
        gender: genderSelect ? genderSelect.value : '',
        birthday: String(birthday || '').trim(),
        birthdayType: birthdayType
    };
}

function applyUserPersonaFormValueMap(persona) {
    const next = persona && typeof persona === 'object' ? persona : {};
    const nameInput = document.getElementById('user-settings-name');
    const settingInput = document.getElementById('user-persona-setting');
    const avatarImg = document.getElementById('user-settings-avatar');
    const genderSelect = document.getElementById('user-settings-gender');
    const birthdayTypeSelect = document.getElementById('user-birthday-type');
    const birthdaySolarInput = document.getElementById('user-settings-birthday-solar');
    const birthdayLunarInput = document.getElementById('user-settings-birthday-lunar');

    if (nameInput) nameInput.value = String(next.name || '').trim();
    if (settingInput) settingInput.value = String(next.setting || '');
    if (avatarImg) avatarImg.src = String(next.avatar || '').trim() || 'assets/chushitouxiang.jpg';
    if (genderSelect) genderSelect.value = String(next.gender || '').trim();
    if (birthdayTypeSelect) {
        birthdayTypeSelect.value = next.birthdayType === 'lunar' ? 'lunar' : 'solar';
    }
    if (birthdaySolarInput) {
        birthdaySolarInput.value = next.birthdayType === 'lunar' ? '' : String(next.birthday || '').trim();
    }
    if (birthdayLunarInput) {
        birthdayLunarInput.value = next.birthdayType === 'lunar' ? String(next.birthday || '').trim() : '';
    }
    if (typeof syncCalendarToggleUI === 'function') syncCalendarToggleUI();
}

function buildUserPersonaPresetRecord(source) {
    const persona = source && typeof source === 'object' ? source : {};
    return {
        id: 'preset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        name: String(persona.name || '').trim(),
        setting: String(persona.setting || ''),
        avatar: String(persona.avatar || '').trim() || 'assets/chushitouxiang.jpg',
        gender: String(persona.gender || '').trim(),
        birthday: String(persona.birthday || '').trim(),
        birthdayType: persona.birthdayType === 'lunar' ? 'lunar' : 'solar',
        savedAt: Date.now()
    };
}

function closeUserPersonaPresetSheet() {
    const sheet = document.getElementById('user-persona-preset-sheet');
    if (sheet) sheet.style.display = 'none';
}

function renderUserPersonaPresetList() {
    const listEl = document.getElementById('user-persona-preset-list');
    if (!listEl) return;
    const presets = readUserPersonaPresets();
    listEl.innerHTML = '';

    if (!presets.length) {
        const empty = document.createElement('div');
        empty.style.cssText = 'border:1px dashed rgba(0,0,0,0.2); background:#f9fafb; border-radius:24px; padding:24px 16px; text-align:center;';
        empty.innerHTML = '<div style="font-size:14px; font-weight:700; color:#111;">还没有保存过预设</div><div style="font-size:12px; color:#6b7280; margin-top:8px;">先点“保存为预设”，下次就能一键套用。</div>';
        listEl.appendChild(empty);
        return;
    }

    presets
        .slice()
        .sort(function (a, b) {
            return Number(b && b.savedAt || 0) - Number(a && a.savedAt || 0);
        })
        .forEach(function (preset) {
            if (!preset || !preset.id) return;
            const card = document.createElement('button');
            card.type = 'button';
            card.style.cssText = 'width:100%; text-align:left; border-radius:24px; border:1px solid #000; background:#fff; padding:16px; box-shadow:2px 2px 0 rgba(0,0,0,1);';
            const title = String(preset.name || '').trim() || '未命名预设';
            const meta = [];
            if (preset.gender) meta.push(String(preset.gender));
            if (preset.birthday) meta.push(String(preset.birthday) + (preset.birthdayType === 'lunar' ? ' 农历' : ' 阳历'));
            if (!meta.length) meta.push('含姓名、性别、生日、人设');
            const summary = String(preset.setting || '').trim();
            const preview = summary ? (summary.length > 42 ? summary.slice(0, 42) + '...' : summary) : '未填写人设';
            card.innerHTML = ''
                + '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">'
                + '<div style="min-width:0; flex:1;">'
                + '<div style="font-size:14px; font-weight:700; color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>'
                + '<div style="font-size:12px; color:#6b7280; margin-top:4px;">' + meta.join(' · ').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>'
                + '<div style="font-size:12px; color:#4b5563; margin-top:8px; line-height:1.7;">' + preview.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>'
                + '</div>'
                + '<div style="font-size:12px; font-weight:700; color:#111; padding-top:2px; flex-shrink:0;">应用</div>'
                + '</div>';
            card.addEventListener('click', function () {
                applyUserPersonaPreset(String(preset.id || ''));
            });
            listEl.appendChild(card);
        });
}

function openUserPersonaPresetSheet() {
    renderUserPersonaPresetList();
    const sheet = document.getElementById('user-persona-preset-sheet');
    if (sheet) sheet.style.display = 'block';
}

function finalizeUserPersonaApply(roleId, successText) {
    const modal = document.getElementById('user-persona-modal');
    const settingsMenu = document.getElementById('settings-menu-modal');
    if (modal) modal.style.display = 'none';
    if (settingsMenu) settingsMenu.style.display = 'none';
    closeUserPersonaPresetSheet();
    enableChatStatusBarInteraction();
    alert(successText || '身份设定已更新');
    enterChat(roleId);
}

function applyUserPersonaPreset(presetId) {
    const roleId = window.currentChatRole;
    const preset = readUserPersonaPresets().find(function (item) {
        return item && String(item.id || '') === String(presetId || '');
    });
    if (!roleId || !preset) {
        alert('未找到对应预设');
        return;
    }

    const nextPersona = {
        name: String(preset.name || '').trim(),
        setting: String(preset.setting || ''),
        avatar: String(preset.avatar || '').trim() || 'assets/chushitouxiang.jpg',
        gender: String(preset.gender || '').trim(),
        birthday: String(preset.birthday || '').trim(),
        birthdayType: preset.birthdayType === 'lunar' ? 'lunar' : 'solar'
    };

    if (!window.userPersonas || typeof window.userPersonas !== 'object') {
        window.userPersonas = {};
    }
    window.userPersonas[roleId] = nextPersona;
    applyUserPersonaFormValueMap(nextPersona);
    saveData();
    finalizeUserPersonaApply(roleId, '预设已应用');
}

function saveUserPersonaPreset() {
    const persona = getUserPersonaFormValueMap();
    if (!persona.name && !persona.setting) {
        alert('至少填写名字或设定，才能存为预设');
        return;
    }

    const presets = readUserPersonaPresets();
    presets.unshift(buildUserPersonaPresetRecord(persona));
    while (presets.length > 50) presets.pop();

    try {
        writeUserPersonaPresets(presets);
        renderUserPersonaPresetList();
        alert('已保存为预设');
    } catch (e) {
        alert('保存预设失败，请检查存储空间');
    }
}

function openUserPersonaModal() {
    document.getElementById('settings-menu-modal').style.display = 'none';

    disableChatStatusBarInteraction();

    const roleId = window.currentChatRole;
    const myPersona = window.userPersonas[roleId] || {};

    applyUserPersonaFormValueMap(myPersona);
    closeUserPersonaPresetSheet();
    document.getElementById('user-persona-modal').style.display = 'flex';
}

function saveUserPersona() {
    const roleId = window.currentChatRole;
    const formValueMap = getUserPersonaFormValueMap();
    if (!window.userPersonas || typeof window.userPersonas !== 'object') {
        window.userPersonas = {};
    }
    window.userPersonas[roleId] = {
        name: formValueMap.name,
        setting: formValueMap.setting,
        avatar: formValueMap.avatar || "assets/chushitouxiang.jpg",
        gender: formValueMap.gender,
        birthday: formValueMap.birthday,
        birthdayType: formValueMap.birthdayType
    };

    saveData();
    finalizeUserPersonaApply(roleId, '身份设定已更新');
}

// 预览并压缩【我的头像】
function previewUserAvatar(input) {
    // 这里的 150 是关键！把头像限制在 150px 宽，体积极小，存100个都没问题
    handleImageUpload(input, 'user-settings-avatar', null, 150);
}

// --- C. 背景设置 (修复层级遮挡) ---

function openBgSettingModal() {
    // 【核心修复】：先关闭上一级菜单，防止遮挡
    document.getElementById('settings-menu-modal').style.display = 'none';

    disableChatStatusBarInteraction();

    const roleId = window.currentChatRole;
    const roleBgUrl = window.chatBackgrounds[roleId];
    const globalBgUrl = typeof window.getGlobalChatWallpaper === 'function'
        ? window.getGlobalChatWallpaper()
        : String(window.globalChatWallpaper || '').trim();
    const bgUrl = roleBgUrl || globalBgUrl;
    const previewBox = document.getElementById('bg-preview-box');

    if (bgUrl) {
        previewBox.style.backgroundImage = `url('${bgUrl}')`;
        previewBox.innerText = roleBgUrl ? "" : "当前使用全局聊天壁纸";
    } else {
        previewBox.style.backgroundImage = "";
        previewBox.innerText = "当前使用默认背景";
    }
    previewBox.dataset.tempUrl = "";
    previewBox.dataset.usingGlobalBg = (!roleBgUrl && globalBgUrl) ? "1" : "0";

    document.getElementById('bg-setting-modal').style.display = 'flex';
}

function previewChatBg(input) {
    // 背景图按高清屏保留更多像素，避免上传后发糊。
    handleImageUpload(input, null, function (base64) {
        const previewBox = document.getElementById('bg-preview-box');
        previewBox.style.backgroundImage = `url('${base64}')`;
        previewBox.style.backgroundSize = 'cover';
        previewBox.innerText = "";
        previewBox.dataset.tempUrl = base64; // 暂存
        previewBox.dataset.usingGlobalBg = "0";
    }, { maxSize: 2160, quality: 0.96, preserveOriginal: true, preserveFormat: true });
}

function saveChatBg() {
    const roleId = window.currentChatRole;
    const previewBox = document.getElementById('bg-preview-box');

    // 优先取暂存的，没有就取当前的
    let newBg = previewBox.dataset.tempUrl;
    if (!newBg && previewBox.dataset.usingGlobalBg !== "1" && previewBox.style.backgroundImage) {
        newBg = previewBox.style.backgroundImage.slice(5, -2).replace(/"/g, "");
    }

    if (newBg) {
        window.chatBackgrounds[roleId] = newBg;
        applyChatBackground(roleId);
        saveData(); // 🔥 关键修复：保存到 localStorage
    }
    closeSubModal('bg-setting-modal');
}

function resetChatBg() {
    const roleId = window.currentChatRole;
    delete window.chatBackgrounds[roleId];
    applyChatBackground(roleId);
    saveData(); // 🔥 关键修复：保存到 localStorage
    const previewBox = document.getElementById('bg-preview-box');
    const globalBgUrl = typeof window.getGlobalChatWallpaper === 'function'
        ? window.getGlobalChatWallpaper()
        : String(window.globalChatWallpaper || '').trim();
    if (globalBgUrl) {
        previewBox.style.backgroundImage = `url('${globalBgUrl}')`;
        previewBox.innerText = "当前使用全局聊天壁纸";
    } else {
        previewBox.style.backgroundImage = "";
        previewBox.innerText = "默认";
    }
    previewBox.dataset.tempUrl = "";
    previewBox.dataset.usingGlobalBg = globalBgUrl ? "1" : "0";
}

// 应用背景
function getEffectiveChatBackground(roleId) {
    const rid = String(roleId || '').trim();
    const roleBg = rid && window.chatBackgrounds ? window.chatBackgrounds[rid] : '';
    if (roleBg) return roleBg;
    if (typeof window.getGlobalChatWallpaper === 'function') return window.getGlobalChatWallpaper();
    return String(window.globalChatWallpaper || '').trim();
}

function applyChatBackground(roleId) {
    const chatBody = document.getElementById('chat-history');
    const bgData = getEffectiveChatBackground(roleId);
    if (!chatBody) return;
    if (bgData) {
        chatBody.style.backgroundImage = `url('${bgData}')`;
        chatBody.style.backgroundSize = 'cover';
        chatBody.style.backgroundPosition = 'center';
    } else {
        chatBody.style.backgroundImage = '';
        chatBody.style.backgroundSize = '';
        chatBody.style.backgroundPosition = '';
    }
}

window.getEffectiveChatBackground = getEffectiveChatBackground;
window.applyChatBackground = applyChatBackground;

// =========================================================
// === 3. 闭环核心：返回首页 ===
// =========================================================

function goBackToHome() {
    saveData();
    // 设置暗号
    localStorage.setItem('autoOpenWechat', 'true');
    // 跳转
    window.location.href = 'index.html';
}

// =========================================================
// === 4. 工具函数：图片压缩与存储 ===
// =========================================================

function disableChatStatusBarInteraction() {
    const bar = document.querySelector('#chat-view .status-bar');
    if (bar) {
        bar.style.pointerEvents = 'none';
    }
}

function enableChatStatusBarInteraction() {
    const bar = document.querySelector('#chat-view .status-bar');
    if (bar) {
        bar.style.pointerEvents = '';
    }
}

function closeSubModal(id) {
    document.getElementById(id).style.display = 'none';

    enableChatStatusBarInteraction();

    // 🔥 关闭二级弹窗后，重新显示设置菜单（营造"返回上一级"的感觉）
    document.getElementById('settings-menu-modal').style.display = 'flex';
}

async function clearChatHistory() {
    const ok = typeof window.uiConfirm === 'function'
        ? await window.uiConfirm("确定清空聊天记录吗？", { title: '清空聊天记录' })
        : confirm("确定清空聊天记录吗？");
    if (!ok) return;
    const roleId = window.currentChatRole;
    window.chatData[roleId] = [];
    saveData();
    enterChat(roleId);
    closeSettingsMenu();
}

function escapePromptPreviewHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function stringifyPromptPreviewValue(value) {
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value, null, 2);
    } catch (err) {
        return String(value == null ? '' : value);
    }
}

function buildAIPromptPreviewSectionHtml(title, value, accentColor) {
    const text = stringifyPromptPreviewValue(value).trim();
    const safeTitle = escapePromptPreviewHtml(title || '');
    const safeText = escapePromptPreviewHtml(text || '暂无内容');
    const borderColor = accentColor || '#111';
    return ''
        + '<div style="background:#fff; border-radius:18px; padding:14px; margin-bottom:14px; box-shadow:0 6px 24px rgba(0,0,0,0.05); border-left:4px solid ' + borderColor + ';">'
        + '<div style="font-size:13px; font-weight:700; color:#111; margin-bottom:10px;">' + safeTitle + '</div>'
        + '<pre style="margin:0; white-space:pre-wrap; word-break:break-word; font-size:12px; line-height:1.65; color:#333; font-family:Consolas, Monaco, monospace;">' + safeText + '</pre>'
        + '</div>';
}

function getAIPromptPreviewSnapshot(roleId) {
    const groupApi = window.GroupChat;
    if (!roleId) {
        return {
            title: 'AI提示词预览',
            summary: '当前没有打开任何聊天。',
            sections: []
        };
    }
    if (!groupApi || typeof groupApi.isGroupChatRole !== 'function' || !groupApi.isGroupChatRole(roleId)) {
        return {
            title: 'AI提示词预览',
            summary: '当前聊天不是群聊，这里暂时只展示群聊请求预览。',
            sections: []
        };
    }

    const debugPayload = typeof groupApi.buildGroupRequestDebug === 'function'
        ? groupApi.buildGroupRequestDebug(roleId)
        : (function () {
            const mapped = typeof groupApi.buildGroupApiPayload === 'function'
                ? groupApi.buildGroupApiPayload(roleId)
                : { apiHistory: [], latestUserText: '' };
            const profile = typeof groupApi.getGroupProfile === 'function' ? (groupApi.getGroupProfile(roleId) || {}) : {};
            return {
                systemPrompt: typeof groupApi.getGroupPrompt === 'function' ? groupApi.getGroupPrompt(roleId) : '',
                apiHistory: mapped.apiHistory || [],
                userMessage: mapped.latestUserText || '请根据上下文继续群聊。',
                roleId: roleId,
                groupName: profile.nickName || profile.name || ''
            };
        })();

    const members = typeof groupApi.getGroupMembers === 'function' ? groupApi.getGroupMembers(roleId) : [];
    const memberText = Array.isArray(members) && members.length
        ? members.map(function (member, index) {
            const name = member && (member.name || member.originalName || member.roleId) || '未命名成员';
            const role = member && member.roleId ? ' [' + member.roleId + ']' : '';
            return (index + 1) + '. ' + name + role;
        }).join('\n')
        : '暂无成员';
    const historyCount = Array.isArray(debugPayload.apiHistory) ? debugPayload.apiHistory.length : 0;

    return {
        title: '群聊提示词预览',
        summary: '当前群聊：' + String(debugPayload.groupName || roleId) + ' ｜ 注入历史 ' + String(historyCount) + ' 条。',
        sections: [
            { title: '系统提示词', value: debugPayload.systemPrompt || '', accent: '#111' },
            { title: '群成员映射', value: memberText, accent: '#34c759' },
            { title: '历史消息载荷 apiHistory', value: debugPayload.apiHistory || [], accent: '#007aff' },
            { title: '本轮用户输入 userMessage', value: debugPayload.userMessage || '', accent: '#ff9500' }
        ]
    };
}

function openAIPromptPreviewModal() {
    const roleId = window.currentChatRole;
    let modal = document.getElementById('ai-prompt-preview-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ai-prompt-preview-modal';
        modal.className = 'modal-layer';
        modal.style.display = 'none';
        modal.style.background = '#f2f2f7';
        document.body.appendChild(modal);
    }

    const snapshot = getAIPromptPreviewSnapshot(roleId);
    const sectionsHtml = (snapshot.sections || []).map(function (section) {
        return buildAIPromptPreviewSectionHtml(section.title, section.value, section.accent);
    }).join('');

    modal.innerHTML = ''
        + '<div class="modal-header-bar">'
        + '<div class="modal-close-icon" onclick="closeAIPromptPreviewModal()">×</div>'
        + '<div class="modal-title">' + escapePromptPreviewHtml(snapshot.title || 'AI提示词预览') + '</div>'
        + '<div class="modal-placeholder"></div>'
        + '</div>'
        + '<div class="modal-content" style="padding:16px; overflow-y:auto; background:#f2f2f7;">'
        + '<div style="background:#fffbe6; color:#8a6d3b; border-radius:14px; padding:12px 14px; font-size:12px; line-height:1.7; margin-bottom:14px;">'
        + escapePromptPreviewHtml(snapshot.summary || '这里展示的是当前这一刻即将发给模型的群聊请求预览。')
        + '<br>这里展示的是你此刻打开预览时重新生成的一份请求快照。真正发送时，会按最新聊天记录再次生成。'
        + '</div>'
        + (sectionsHtml || '<div style="background:#fff; border-radius:18px; padding:18px; color:#666; font-size:13px; line-height:1.8;">暂无可展示的群聊提示词。</div>')
        + '</div>';

    const menu = document.getElementById('settings-menu-modal');
    if (menu) menu.style.display = 'none';

    disableChatStatusBarInteraction();
    modal.style.display = 'flex';
}

function closeAIPromptPreviewModal() {
    closeSubModal('ai-prompt-preview-modal');
}

window.openAIPromptPreviewModal = openAIPromptPreviewModal;
window.closeAIPromptPreviewModal = closeAIPromptPreviewModal;

function openCallLogModal() {
    const roleId = window.currentChatRole;
    if (!roleId) return;

    let modal = document.getElementById('call-log-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'call-log-modal';
        modal.className = 'modal-layer';
        modal.style.display = 'none';
        modal.style.background = '#f2f2f7';
        document.body.appendChild(modal);
    }

    const logsByRole = window.callLogs || {};
    const list = Array.isArray(logsByRole[roleId]) ? logsByRole[roleId] : [];

    let html = '';
    html += '<div class="modal-header-bar">';
    html += '<div class="modal-placeholder"></div>';
    html += '<div class="modal-title">通话记录</div>';
    html += '<div style="display:flex; align-items:center; gap:10px;">';
    html += '<div class="modal-close-icon" onclick="closeCallLogModal()">×</div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="call-log-body" style="flex:1; overflow-y:auto; padding:16px;">';

    if (!list.length) {
        html += '<div class="call-log-empty" style="margin-top:40px; text-align:center; color:#999; font-size:14px;">暂无通话记录</div>';
    } else {
        html += '<div class="call-log-list">';
        for (let i = list.length - 1; i >= 0; i--) {
            const item = list[i] || {};
            const index = i;
            const isVideo = item.type === 'video';
            const icon = isVideo ? '📹' : '📞';
            const date = item.date ? new Date(item.date) : null;
            const dateStr = date ? date.toLocaleString() : '';
            let durationText = '';
            if (typeof item.duration === 'number' && item.duration > 0) {
                durationText = formatCallDuration(item.duration);
            }
            let titleText = dateStr;
            if (durationText) {
                titleText += dateStr ? ' · 时长 ' + durationText : '时长 ' + durationText;
            }

            html += '<div class="call-log-item" data-index="' + index + '" style="background:#fff; border-radius:10px; padding:12px; margin-bottom:12px; cursor:pointer;">';
            html += '<div class="call-log-summary" style="display:flex; align-items:center; justify-content:space-between;">';
            html += '<div style="display:flex; align-items:center; gap:8px;">';
            html += '<span class="call-log-icon" style="font-size:18px;">' + icon + '</span>';
            html += '<span class="call-log-title" style="font-size:14px; color:#333;">' + titleText + '</span>';
            html += '</div>';
            html += '<div style="display:flex; align-items:center; gap:10px;">';
            html += '<button type="button" class="call-log-del-btn" data-index="' + index + '" style="border:none; background:rgba(255,59,48,0.10); color:#ff3b30; font-weight:900; border-radius:10px; padding:6px 10px; cursor:pointer;">删除</button>';
            html += '<span class="chevron">›</span>';
            html += '</div>';
            html += '</div>';

            const raw = item.content || '';
            const safe = String(raw)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>');
            html += '<div class="call-log-detail" style="display:none; margin-top:8px; font-size:13px; color:#555; white-space:pre-wrap;">' + safe + '</div>';

            html += '</div>';
        }
        html += '</div>';
    }

    html += '</div>';
    html += '<div id="call-log-batch-bar" style="display:none; gap:10px; align-items:center; padding:10px 16px 16px; background:#f2f2f7; border-top:1px solid rgba(0,0,0,0.06);">';
    html += '<button type="button" id="call-log-select-all-btn" style="border:none; background:#fff; color:#111; font-weight:900; border-radius:12px; padding:10px 12px; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.06);">全选</button>';
    html += '<button type="button" id="call-log-batch-delete-btn" style="flex:1; border:none; background:#ff3b30; color:#fff; font-weight:900; border-radius:12px; padding:10px 12px; cursor:pointer;">删除(0)</button>';
    html += '<button type="button" id="call-log-batch-cancel-btn" style="border:none; background:rgba(0,0,0,0.06); color:#111; font-weight:900; border-radius:12px; padding:10px 12px; cursor:pointer;">取消</button>';
    html += '</div>';
    modal.innerHTML = html;

    const menu = document.getElementById('settings-menu-modal');
    if (menu) menu.style.display = 'none';

    disableChatStatusBarInteraction();

    modal.style.display = 'flex';

    let selecting = false;
    let ignoreNextClick = false;
    const selected = new Set();
    const batchBar = modal.querySelector('#call-log-batch-bar');
    const selectAllBtn = modal.querySelector('#call-log-select-all-btn');
    const batchDeleteBtn = modal.querySelector('#call-log-batch-delete-btn');
    const batchCancelBtn = modal.querySelector('#call-log-batch-cancel-btn');

    const getAllItemEls = function () {
        return Array.from(modal.querySelectorAll('.call-log-item'));
    };

    const setSelecting = function (active) {
        selecting = !!active;
        if (!selecting) selected.clear();
        if (batchBar) batchBar.style.display = selecting ? 'flex' : 'none';
        syncSelectionUI();
    };

    const syncSelectionUI = function () {
        const items = getAllItemEls();
        items.forEach(function (itemEl) {
            const idx = String(itemEl.getAttribute('data-index') || '');
            const isSelected = idx && selected.has(idx);
            itemEl.style.outline = selecting && isSelected ? '2px solid rgba(255,59,48,0.35)' : '';
            itemEl.style.background = selecting && isSelected ? 'rgba(255,59,48,0.06)' : '#fff';
        });
        if (batchDeleteBtn) batchDeleteBtn.textContent = '删除(' + String(selected.size) + ')';
        if (selectAllBtn) {
            const allCount = items.length;
            selectAllBtn.textContent = selected.size && selected.size === allCount ? '取消全选' : '全选';
        }
    };

    const items = modal.querySelectorAll('.call-log-item');
    items.forEach(function (itemEl) {
        const idx = String(itemEl.getAttribute('data-index') || '');

        itemEl.addEventListener('click', function () {
            if (ignoreNextClick) {
                ignoreNextClick = false;
                return;
            }
            if (selecting) {
                if (!idx) return;
                if (selected.has(idx)) selected.delete(idx);
                else selected.add(idx);
                if (!selected.size) {
                    setSelecting(false);
                    return;
                }
                syncSelectionUI();
                return;
            }
            const detail = itemEl.querySelector('.call-log-detail');
            if (!detail) return;
            if (!detail.style.display || detail.style.display === 'none') {
                detail.style.display = 'block';
            } else {
                detail.style.display = 'none';
            }
        });

        let pressTimer = 0;
        let pressMoved = false;
        const clearPress = function () {
            if (pressTimer) window.clearTimeout(pressTimer);
            pressTimer = 0;
            pressMoved = false;
        };

        itemEl.addEventListener('touchstart', function () {
            clearPress();
            pressTimer = window.setTimeout(function () {
                ignoreNextClick = true;
                if (!idx) return;
                if (!selecting) setSelecting(true);
                selected.add(idx);
                syncSelectionUI();
            }, 520);
        }, { passive: true });

        itemEl.addEventListener('touchmove', function () {
            pressMoved = true;
            if (pressTimer) window.clearTimeout(pressTimer);
        }, { passive: true });

        itemEl.addEventListener('touchend', function () {
            if (pressMoved) clearPress();
            else if (pressTimer) window.clearTimeout(pressTimer);
            pressTimer = 0;
        }, { passive: true });

        itemEl.addEventListener('touchcancel', function () {
            clearPress();
        }, { passive: true });

        itemEl.addEventListener('contextmenu', function (e) {
            if (e) e.preventDefault();
            ignoreNextClick = true;
            if (!idx) return;
            if (!selecting) setSelecting(true);
            if (selected.has(idx)) selected.delete(idx);
            else selected.add(idx);
            if (!selected.size) {
                setSelecting(false);
                return;
            }
            syncSelectionUI();
        });
    });

    const delBtns = modal.querySelectorAll('.call-log-del-btn');
    delBtns.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            if (e) e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-index') || '0', 10);
            deleteCallLogItemForCurrentRole(idx);
        });
    });

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function () {
            const items = getAllItemEls();
            if (!items.length) return;
            const allSelected = selected.size && selected.size === items.length;
            selected.clear();
            if (!allSelected) {
                items.forEach(function (el) {
                    const idx = String(el.getAttribute('data-index') || '');
                    if (idx) selected.add(idx);
                });
                setSelecting(true);
            } else {
                setSelecting(false);
            }
            syncSelectionUI();
        });
    }

    if (batchCancelBtn) {
        batchCancelBtn.addEventListener('click', function () {
            setSelecting(false);
        });
    }

    if (batchDeleteBtn) {
        batchDeleteBtn.addEventListener('click', function () {
            if (!selected.size) return;
            const indices = Array.from(selected).map(v => parseInt(v, 10)).filter(n => Number.isFinite(n));
            if (!indices.length) return;
            deleteCallLogItemsForCurrentRole(indices);
        });
    }
}

function closeCallLogModal() {
    const modal = document.getElementById('call-log-modal');
    if (modal) modal.style.display = 'none';

    enableChatStatusBarInteraction();

    const menu = document.getElementById('settings-menu-modal');
    if (menu) menu.style.display = 'flex';
}

async function clearCallLogsForCurrentRole() {
    const roleId = window.currentChatRole;
    if (!roleId) return;
    const ok = typeof window.uiConfirm === 'function'
        ? await window.uiConfirm('确定清空该角色的全部通话记录吗？(不可恢复)', { title: '清空通话记录' })
        : confirm('确定清空该角色的全部通话记录吗？(不可恢复)');
    if (!ok) return;
    if (!window.callLogs) window.callLogs = {};
    window.callLogs[roleId] = [];
    saveData();
    openCallLogModal();
}

async function deleteCallLogItemForCurrentRole(index) {
    const roleId = window.currentChatRole;
    if (!roleId) return;
    const logsByRole = window.callLogs || {};
    const list = Array.isArray(logsByRole[roleId]) ? logsByRole[roleId] : [];
    const idx = typeof index === 'number' ? index : parseInt(String(index || '0'), 10);
    if (!(idx >= 0 && idx < list.length)) return;
    const ok = typeof window.uiConfirm === 'function'
        ? await window.uiConfirm('确定删除这条通话记录吗？(不可恢复)', { title: '删除通话记录' })
        : confirm('确定删除这条通话记录吗？(不可恢复)');
    if (!ok) return;
    list.splice(idx, 1);
    if (!window.callLogs) window.callLogs = {};
    window.callLogs[roleId] = list;
    saveData();
    openCallLogModal();
}

async function deleteCallLogItemsForCurrentRole(indices) {
    const roleId = window.currentChatRole;
    if (!roleId) return;
    const arr = Array.isArray(indices) ? indices.slice() : [];
    const unique = Array.from(new Set(arr.map(n => (typeof n === 'number' ? n : parseInt(String(n || ''), 10))).filter(n => Number.isFinite(n))));
    if (!unique.length) return;
    const ok = typeof window.uiConfirm === 'function'
        ? await window.uiConfirm('确定删除选中的 ' + unique.length + ' 条通话记录吗？(不可恢复)', { title: '批量删除通话记录' })
        : confirm('确定删除选中的 ' + unique.length + ' 条通话记录吗？(不可恢复)');
    if (!ok) return;
    const logsByRole = window.callLogs || {};
    const list = Array.isArray(logsByRole[roleId]) ? logsByRole[roleId] : [];
    unique.sort((a, b) => b - a).forEach(function (idx) {
        if (idx >= 0 && idx < list.length) list.splice(idx, 1);
    });
    if (!window.callLogs) window.callLogs = {};
    window.callLogs[roleId] = list;
    saveData();
    openCallLogModal();
}

// 新建角色时的头像预览
function previewAvatar(input) {
    // 角色头像也压缩到 150px
    handleImageUpload(input, 'avatar-preview', null, 150);
}

/**
 * 通用图片处理 (智能压缩版)
 * @param {HTMLInputElement} input - 文件输入框
 * @param {string} targetImgId - 要显示预览的图片标签ID (可选)
 * @param {function} callback - 处理完后的回调，返回 base64
 * @param {number|object} specificMaxSize - 指定最长边，或 { maxSize, quality }
 */
function handleImageUpload(input, targetImgId, callback, specificMaxSize) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                // === 智能压缩核心 ===
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const options = specificMaxSize && typeof specificMaxSize === 'object'
                    ? specificMaxSize
                    : { maxSize: specificMaxSize };
                const maxWidth = Number(options.maxSize || 1024) || 1024;
                const quality = Math.max(0.5, Math.min(0.95, Number(options.quality || (maxWidth >= 1200 ? 0.88 : 0.72))));
                const preserveOriginal = !!options.preserveOriginal;
                const preserveFormat = !!options.preserveFormat;
                const originalDataUrl = String(e.target.result || '');
                const originalMime = String(file.type || '').toLowerCase();
                let width = img.width;
                let height = img.height;
                const longestEdge = Math.max(width, height);
                const needsResize = longestEdge > maxWidth;

                if (preserveOriginal && !needsResize) {
                    if (targetImgId) {
                        const imgEl = document.getElementById(targetImgId);
                        if (imgEl) imgEl.src = originalDataUrl;
                    }
                    if (callback) callback(originalDataUrl);
                    return;
                }

                // 保持比例缩放
                if (needsResize) {
                    if (width > height) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    } else {
                        // 如果是竖图，限制最长边，避免背景图被过度压缩。
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = Math.max(1, Math.round(width));
                canvas.height = Math.max(1, Math.round(height));

                // 绘制并导出
                ctx.drawImage(img, 0, 0, width, height);
                let exportMime = 'image/jpeg';
                if (preserveFormat) {
                    if (originalMime === 'image/png') exportMime = 'image/png';
                    else if (originalMime === 'image/webp') exportMime = 'image/webp';
                    else if (originalMime === 'image/jpeg' || originalMime === 'image/jpg') exportMime = 'image/jpeg';
                }
                const compressedDataUrl = (exportMime === 'image/jpeg' || exportMime === 'image/webp')
                    ? canvas.toDataURL(exportMime, quality)
                    : canvas.toDataURL(exportMime);

                console.log(`原图大小: ${e.target.result.length}, 压缩后: ${compressedDataUrl.length}`);

                // 显示预览
                if (targetImgId) {
                    const imgEl = document.getElementById(targetImgId);
                    if (imgEl) imgEl.src = compressedDataUrl;
                }

                // 回调
                if (callback) callback(compressedDataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

/* =================================
   聊天应用导航系统
   ================================= */

// 【后退】从聊天室 -> 返回到微信列表 (App Window)

