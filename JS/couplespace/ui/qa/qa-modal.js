(function () {
    'use strict';

    const service = window.CoupleQaService;
    let revealUnlockPending = false;
    let revealUnlockTimer = null;
    let editingMyAnswer = false;
    let partnerRegeneratePending = false;
    let qaConfirmHandler = null;
    let expandedHistoryKeys = new Set();

    function clearRevealUnlockTimer() {
        if (revealUnlockTimer) {
            clearTimeout(revealUnlockTimer);
            revealUnlockTimer = null;
        }
    }

    function resetRevealUnlockState() {
        clearRevealUnlockTimer();
        revealUnlockPending = false;
    }

    function startPartnerReveal() {
        clearRevealUnlockTimer();
        revealUnlockPending = true;
        render();
        revealUnlockTimer = setTimeout(function () {
            revealUnlockPending = false;
            revealUnlockTimer = null;
            render();
        }, 80);
    }

    function getDisplayInfo() {
        const userNameEl = document.getElementById('name-user');
        const roleNameEl = document.getElementById('name-role');
        const userAvatarImg = document.getElementById('avatar-user');
        const roleAvatarImg = document.getElementById('avatar-role');
        const fallbackUserName = String(localStorage.getItem('user_name') || '').trim() || '我';
        return {
            userName: userNameEl ? String(userNameEl.textContent || '').trim() || fallbackUserName : fallbackUserName,
            roleName: roleNameEl ? String(roleNameEl.textContent || '').trim() || 'Ta' : 'Ta',
            userAvatar: userAvatarImg ? String(userAvatarImg.getAttribute('src') || userAvatarImg.src || '').trim() : '',
            roleAvatar: roleAvatarImg ? String(roleAvatarImg.getAttribute('src') || roleAvatarImg.src || '').trim() : ''
        };
    }

    function syncHeaderInfo() {
        const info = getDisplayInfo();
        const userNameEl = document.getElementById('qa-user-name');
        const userAvatarEl = document.getElementById('qa-user-avatar');
        const roleNameEl = document.getElementById('qa-partner-name');
        const roleAvatarEl = document.getElementById('qa-partner-avatar');
        if (userNameEl) userNameEl.textContent = info.userName;
        if (roleNameEl) roleNameEl.textContent = info.roleName;
        if (userAvatarEl) {
            if (info.userAvatar) userAvatarEl.src = info.userAvatar;
            userAvatarEl.style.visibility = info.userAvatar ? 'visible' : 'hidden';
        }
        if (roleAvatarEl) {
            if (info.roleAvatar) roleAvatarEl.src = info.roleAvatar;
            roleAvatarEl.style.visibility = info.roleAvatar ? 'visible' : 'hidden';
        }
        return info;
    }

    function showToast(text) {
        const el = document.getElementById('qa-mini-toast');
        if (!el) return;
        el.textContent = String(text || '');
        el.hidden = false;
    }

    function hideToast() {
        const el = document.getElementById('qa-mini-toast');
        if (!el) return;
        el.hidden = true;
    }

    function escapeHtml(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function openConfirm(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const modal = document.getElementById('qa-confirm-modal');
        const titleEl = document.getElementById('qa-confirm-title');
        const textEl = document.getElementById('qa-confirm-text');
        if (!modal || !titleEl || !textEl) return;
        qaConfirmHandler = typeof opts.onConfirm === 'function' ? opts.onConfirm : null;
        titleEl.textContent = String(opts.title || '确认操作');
        textEl.textContent = String(opts.text || '是否继续？');
        modal.hidden = false;
    }

    function closeConfirm() {
        const modal = document.getElementById('qa-confirm-modal');
        if (!modal) return;
        modal.hidden = true;
        qaConfirmHandler = null;
    }

    function confirmCurrentDialog() {
        const handler = qaConfirmHandler;
        closeConfirm();
        if (typeof handler === 'function') {
            handler();
        }
    }

    function renderHistoryModal() {
        const listEl = document.getElementById('qa-history-list');
        if (!listEl) return;
        const history = service.getAnswerHistory();
        const info = getDisplayInfo();
        const userLabel = escapeHtml(info.userName || '我');
        const roleLabel = escapeHtml(info.roleName || 'Ta');
        if (!Array.isArray(history) || !history.length) {
            listEl.innerHTML = '<div class="qa-history-empty">还没有已完成的问答记录</div>';
            return;
        }
        const itemsHtml = history.slice().reverse().map(function (item, idx) {
            const completedAt = Number(item && (item.completedAt || item.partnerAnsweredAt || item.answeredAt) || 0);
            const dateText = service.formatDate(completedAt || Date.now());
            const questionText = escapeHtml(item && item.questionText ? item.questionText : '');
            const myAnswer = escapeHtml(item && item.myAnswer ? item.myAnswer : '');
            const partnerAnswer = escapeHtml(item && item.partnerAnswer ? item.partnerAnswer : '');
            const key = String(item && item.questionIndex) + '::' + String(item && item.questionText || '');
            const expanded = expandedHistoryKeys.has(key);
            return [
                '<div class="qa-history-item">',
                '  <button class="qa-history-toggle' + (expanded ? ' is-open' : '') + '" type="button" data-history-key="' + escapeHtml(key) + '">',
                '      <span class="qa-history-toggle-main">',
                '          <span class="qa-history-meta">第 ' + String(history.length - idx) + ' 题 · ' + dateText + '</span>',
                '          <span class="qa-history-question">' + questionText + '</span>',
                '      </span>',
                '      <span class="qa-history-chevron">' + (expanded ? '−' : '+') + '</span>',
                '  </button>',
                '  <div class="qa-history-panel' + (expanded ? ' is-open' : '') + '">',
                '      <div class="qa-history-answer"><span class="qa-history-answer-label">' + userLabel + '：</span>' + myAnswer + '</div>',
                '      <div class="qa-history-answer"><span class="qa-history-answer-label">' + roleLabel + '：</span>' + partnerAnswer + '</div>',
                '  </div>',
                '</div>'
            ].join('');
        }).join('');
        listEl.innerHTML = itemsHtml;
        listEl.querySelectorAll('[data-history-key]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const key = String(btn.getAttribute('data-history-key') || '').trim();
                if (!key) return;
                if (expandedHistoryKeys.has(key)) expandedHistoryKeys.delete(key);
                else expandedHistoryKeys.add(key);
                renderHistoryModal();
            });
        });
    }

    function openHistory() {
        const modal = document.getElementById('qa-history-modal');
        const qaModal = document.getElementById('couple-qa-modal');
        if (!modal) return;
        expandedHistoryKeys = new Set();
        renderHistoryModal();
        modal.hidden = false;
        if (qaModal) qaModal.classList.add('history-open');
    }

    function closeHistory() {
        const modal = document.getElementById('qa-history-modal');
        const qaModal = document.getElementById('couple-qa-modal');
        if (!modal) return;
        modal.hidden = true;
        if (qaModal) qaModal.classList.remove('history-open');
    }

    function focusMyInput() {
        const input = document.getElementById('qa-my-input');
        if (!input) return;
        requestAnimationFrame(function () {
            try {
                input.focus();
                const len = String(input.value || '').length;
                input.setSelectionRange(len, len);
            } catch (e) { }
        });
    }

    function render() {
        const modal = document.getElementById('couple-qa-modal');
        const state = service.getState();
        if (!modal || !state) return;

        const bank = service.getQuestionBank();
        const hasQuestions = Array.isArray(bank) && bank.length > 0;
        const dateEl = document.getElementById('qa-date');
        const textEl = document.getElementById('qa-text');
        const paperEl = document.getElementById('qa-paper');
        const printBtn = document.getElementById('qa-print-btn');
        const interactionArea = document.getElementById('qa-interaction-area');
        const myInput = document.getElementById('qa-my-input');
        const myDisplay = document.getElementById('qa-my-display');
        const submitBtn = document.getElementById('qa-submit-btn');
        const myEditBtn = document.getElementById('qa-my-edit-btn');
        const partnerCard = document.getElementById('qa-partner-card');
        const partnerContent = document.getElementById('qa-partner-content');
        const partnerEditBtn = document.getElementById('qa-partner-edit-btn');
        const tipText = document.getElementById('qa-tip-text');
        const lockTextEl = document.getElementById('qa-lock-text');
        const historyLink = document.getElementById('qa-history-link');
        const info = syncHeaderInfo();
        if (!dateEl || !textEl || !paperEl || !printBtn || !interactionArea || !myInput || !myDisplay || !submitBtn || !partnerCard || !partnerContent || !tipText) {
            return;
        }

        dateEl.textContent = service.formatDate(state.lastAnsweredTime || Date.now());
        if (historyLink) historyLink.style.display = 'block';
        if (myEditBtn) myEditBtn.hidden = true;
        if (partnerEditBtn) partnerEditBtn.hidden = true;

        if (!hasQuestions) {
            textEl.textContent = '今天还没有准备好新的问题';
            printBtn.textContent = 'WAIT';
            printBtn.classList.add('printed');
            paperEl.classList.add('show');
            interactionArea.classList.add('visible');
            myInput.style.display = 'none';
            myDisplay.style.display = 'none';
            submitBtn.style.display = 'none';
            partnerCard.classList.remove('locked');
            partnerCard.classList.add('unlocked');
            partnerCard.classList.remove('can-generate');
            partnerCard.classList.remove('generating');
            partnerContent.textContent = '题库为空时，这里会显示一个温柔的小提示。';
            tipText.textContent = '';
            if (lockTextEl) lockTextEl.textContent = '';
            return;
        }

        const question = service.getCurrentQuestion();
        textEl.textContent = question && question.text ? String(question.text) : '今天的问题还没准备好';

        if (state.hasPushed || state.isCurrentAnswered) {
            printBtn.textContent = 'OK';
            printBtn.classList.add('printed');
            paperEl.classList.add('show');
            interactionArea.classList.add('visible');
        } else {
            printBtn.textContent = 'PUSH';
            printBtn.classList.remove('printed');
            paperEl.classList.remove('show');
            interactionArea.classList.remove('visible');
        }

        if (state.isCurrentAnswered) {
            if (editingMyAnswer) {
                resetRevealUnlockState();
                myInput.style.display = 'block';
                myInput.value = state.myAnswer || '';
                myDisplay.style.display = 'none';
                submitBtn.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = '保存修改';
                partnerCard.classList.add('locked');
                partnerCard.classList.remove('unlocked');
                partnerCard.classList.remove('can-generate');
                partnerCard.classList.remove('generating');
                partnerContent.textContent = String(state.partnerAnswer || '').trim();
                tipText.textContent = '修改完成后保存新的答案，再重新解锁对方的回答';
                if (lockTextEl) lockTextEl.textContent = '修改答案后可重新生成对方回答';
                return;
            }

            myInput.style.display = 'none';
            myDisplay.style.display = 'block';
            myDisplay.textContent = String(state.myAnswer || '').trim();
            submitBtn.style.display = 'none';
            submitBtn.textContent = '确认投递';
            if (myEditBtn) myEditBtn.hidden = false;

            if (partnerRegeneratePending) {
                partnerCard.classList.add('locked');
                partnerCard.classList.remove('unlocked');
                partnerCard.classList.remove('can-generate');
                partnerCard.classList.add('generating');
                partnerContent.textContent = '正在认真组织语言...';
                tipText.textContent = info.roleName + ' 正在重新回答中...';
                if (lockTextEl) lockTextEl.textContent = info.roleName + ' 正在重新回答中';
                return;
            }

            if (state.partnerAnswerGenerated) {
                partnerCard.classList.toggle('locked', !!revealUnlockPending);
                partnerCard.classList.toggle('unlocked', !revealUnlockPending);
                partnerCard.classList.remove('can-generate');
                partnerCard.classList.remove('generating');
                partnerContent.textContent = String(state.partnerAnswer || '').trim();
                if (partnerEditBtn) partnerEditBtn.hidden = false;
                tipText.textContent = revealUnlockPending ? 'Ta 的回答到了，正在为你展开...' : '今天的问题已经好好交换过心声啦。';
                if (lockTextEl) {
                    lockTextEl.textContent = revealUnlockPending ? ('正在展开 ' + info.roleName + ' 的回答') : '';
                }
            } else {
                partnerCard.classList.add('locked');
                partnerCard.classList.remove('unlocked');
                partnerCard.classList.toggle('can-generate', !service.isGenerating());
                partnerCard.classList.toggle('generating', service.isGenerating());
                partnerContent.textContent = service.isGenerating() ? '正在认真组织语言...' : '点我解锁 Ta 的回答';
                tipText.textContent = service.isGenerating() ? 'Ta 正在回答中...' : '点击右侧卡片，解锁恋人的回答';
                if (lockTextEl) {
                    lockTextEl.textContent = service.isGenerating()
                        ? ((info.roleName || 'Ta') + ' 正在回答中')
                        : '点击解锁对方心声';
                }
            }
            return;
        }

        editingMyAnswer = false;
        partnerRegeneratePending = false;
        resetRevealUnlockState();
        myInput.style.display = 'block';
        myInput.value = state.myAnswer || '';
        myDisplay.style.display = 'none';
        submitBtn.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = '确认投递';
        partnerCard.classList.add('locked');
        partnerCard.classList.remove('unlocked');
        partnerCard.classList.remove('can-generate');
        partnerCard.classList.remove('generating');
        partnerContent.textContent = '';
        tipText.textContent = '';
        if (lockTextEl) lockTextEl.textContent = '回答后解锁对方心声';
    }

    async function triggerPartnerAnswerGeneration(forceRegenerate) {
        const state = service.getState();
        if (!state || !state.isCurrentAnswered || service.isGenerating()) return;
        if (!forceRegenerate && state.partnerAnswerGenerated) return;
        const info = getDisplayInfo();
        const toastText = forceRegenerate
            ? ((info.roleName || 'Ta') + ' 正在重新回答中')
            : ((info.roleName || 'Ta') + '正在回答中');
        showToast(toastText);
        partnerRegeneratePending = !!forceRegenerate;
        resetRevealUnlockState();
        render();
        try {
            if (forceRegenerate && typeof service.regeneratePartnerAnswer === 'function') {
                await service.regeneratePartnerAnswer();
            } else {
                await service.generatePartnerAnswer();
            }
            hideToast();
            partnerRegeneratePending = false;
            startPartnerReveal();
        } catch (e) {
            hideToast();
            partnerRegeneratePending = false;
            resetRevealUnlockState();
            render();
            alert(String(e && e.message ? e.message : e || '请求失败'));
        }
    }

    function bindPartnerCardClick() {
        const partnerCard = document.getElementById('qa-partner-card');
        if (!partnerCard || partnerCard.dataset.qaBound === '1') return;
        partnerCard.dataset.qaBound = '1';
        partnerCard.addEventListener('click', async function () {
            const state = service.getState();
            if (!state || !state.isCurrentAnswered || editingMyAnswer || state.partnerAnswerGenerated || service.isGenerating()) return;
            await triggerPartnerAnswerGeneration(false);
        });
    }

    function requestEditMyAnswer() {
        const state = service.getState();
        if (!state || !state.isCurrentAnswered) return;
        openConfirm({
            title: '修改答案',
            text: '是否要修改自己的答案？',
            onConfirm: function () {
                editingMyAnswer = true;
                partnerRegeneratePending = false;
                render();
                focusMyInput();
            }
        });
    }

    function requestRegeneratePartnerAnswer() {
        const state = service.getState();
        if (!state || !state.isCurrentAnswered || !state.partnerAnswerGenerated) return;
        openConfirm({
            title: '重新生成回答',
            text: '是否要让角色重新生成自己的答案？',
            onConfirm: function () {
                triggerPartnerAnswerGeneration(true);
            }
        });
    }

    async function openModal() {
        const modal = document.getElementById('couple-qa-modal');
        if (!modal) return;
        const roleId = service.getLinkedRoleId();
        if (!roleId) {
            alert('尚未绑定情侣角色');
            return;
        }
        await service.ensureState(roleId);
        await service.resetLegacyMockAnswerIfNeeded(roleId);
        editingMyAnswer = false;
        partnerRegeneratePending = false;
        bindPartnerCardClick();
        render();
        requestAnimationFrame(function () {
            modal.classList.add('active');
        });
    }

    function closeModal() {
        const modal = document.getElementById('couple-qa-modal');
        if (!modal) return;
        modal.classList.remove('active');
        hideToast();
        editingMyAnswer = false;
        partnerRegeneratePending = false;
        resetRevealUnlockState();
        closeHistory();
        closeConfirm();
    }

    async function handlePrint() {
        const roleId = service.getLinkedRoleId();
        if (!roleId) {
            alert('尚未绑定情侣角色');
            return;
        }
        await service.ensureState(roleId);
        const state = service.getState();
        if (!state || state.isCurrentAnswered) return;
        if (!state.hasPushed) {
            await service.markPrinted();
        }
        const paperEl = document.getElementById('qa-paper');
        const interactionArea = document.getElementById('qa-interaction-area');
        const printBtn = document.getElementById('qa-print-btn');
        if (printBtn) {
            printBtn.textContent = 'OK';
            printBtn.classList.add('printed');
        }
        if (paperEl) {
            paperEl.classList.add('show');
        }
        if (interactionArea) {
            interactionArea.classList.remove('visible');
            setTimeout(function () {
                interactionArea.classList.add('visible');
            }, 1500);
        }
        render();
    }

    async function submitAnswer() {
        const roleId = service.getLinkedRoleId();
        if (!roleId) {
            alert('尚未绑定情侣角色');
            return;
        }
        await service.ensureState(roleId);
        const input = document.getElementById('qa-my-input');
        const state = service.getState();
        if (!input || !state) return;
        const nextAnswer = String(input.value || '').trim();
        const currentAnswer = String(state.myAnswer || '').trim();
        if (editingMyAnswer && nextAnswer === currentAnswer) {
            editingMyAnswer = false;
            render();
            return;
        }
        try {
            await service.submitMyAnswer(nextAnswer);
            editingMyAnswer = false;
            partnerRegeneratePending = false;
            render();
        } catch (e) {
            alert(String(e && e.message ? e.message : e || '提交失败'));
        }
    }

    window.CoupleQaUI = {
        openModal: openModal,
        closeModal: closeModal,
        render: render,
        handlePrint: handlePrint,
        submitAnswer: submitAnswer,
        openHistory: openHistory,
        closeHistory: closeHistory,
        hideToast: hideToast,
        openConfirm: openConfirm,
        closeConfirm: closeConfirm
    };

    window.openCoupleQAModal = openModal;
    window.closeCoupleQAModal = closeModal;
    window.handleQaPrint = handlePrint;
    window.submitCoupleQaAnswer = submitAnswer;
    window.openCoupleQaHistory = openHistory;
    window.closeCoupleQaHistory = closeHistory;
    window.editCoupleQaMyAnswer = requestEditMyAnswer;
    window.editCoupleQaPartnerAnswer = requestRegeneratePartnerAnswer;
    window.closeCoupleQaConfirm = closeConfirm;
    window.confirmCoupleQaConfirm = confirmCurrentDialog;
    window.clearCoupleQaProgress = async function () {
        const ok = await service.clearProgress();
        hideToast();
        editingMyAnswer = false;
        partnerRegeneratePending = false;
        resetRevealUnlockState();
        closeHistory();
        closeConfirm();
        return ok;
    };
})();
