/* === [SEC-05] AI 回复解析与消息写入 === */

function isChatRoleViewActive(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return false;
    const currentRole = String(window.currentChatRole || '').trim();
    if (!currentRole || currentRole !== rid) return false;
    const chatView = document.getElementById('chat-view');
    if (chatView) {
        try {
            if (chatView.style.display === 'none') return false;
            if (typeof window.getComputedStyle === 'function' && window.getComputedStyle(chatView).display === 'none') {
                return false;
            }
        } catch (e) { }
    }
    if (document.body && document.body.classList && document.body.classList.contains('chat-view-active')) {
        return true;
    }
    return !chatView;
}

function getRoleNotificationMeta(roleId) {
    const rid = String(roleId || '').trim();
    const profile = (window.charProfiles && window.charProfiles[rid] && typeof window.charProfiles[rid] === 'object')
        ? window.charProfiles[rid]
        : {};
    return {
        avatar: String(profile.avatar || '').trim() || 'assets/chushitouxiang.jpg',
        name: String(profile.remark || profile.nickName || profile.name || rid || 'Ta').trim() || 'Ta'
    };
}

function isDocumentBackgrounded() {
    try {
        return String(document.visibilityState || '').toLowerCase() === 'hidden';
    } catch (e) {
        return false;
    }
}

function getAiMessageNotificationPreview(msg) {
    if (!msg || String(msg.role || '') !== 'ai') return '';
    const type = String(msg.type || 'text').trim();
    if (type === 'html') {
        const div = typeof document !== 'undefined' && document.createElement ? document.createElement('div') : null;
        if (div) {
            div.innerHTML = sanitizeChatBubbleHtml(msg.content);
            return String(div.textContent || '').trim();
        }
        return String(msg.content || '').replace(/<[^>]*>/g, '').trim();
    }
    if (type === 'translated_text') {
        const parsed = parseTranslatedTextPayload(msg.content);
        return String(parsed.translationText || parsed.foreignText || parsed.bodyText || '').trim();
    }
    if (type === 'text') {
        const structuredCandidate = normalizeStructuredTranslatedCandidate(msg.content);
        if (structuredCandidate.mode === 'translated_text') {
            return String(structuredCandidate.translation || structuredCandidate.foreign || '').trim();
        }
        if (structuredCandidate.mode === 'text' && structuredCandidate.text) {
            return structuredCandidate.text;
        }
        const parsed = shouldRenderTranslatedBubble(window.currentChatRole || msg.roleId || '', msg)
            ? parseTranslatedBubbleText(msg.content)
            : null;
        if (parsed) {
            return String(parsed.translationText || parsed.bodyText || '').trim();
        }
        return String(msg.content || '').trim();
    }
    if (type === 'voice') return '[语音]';
    if (type === 'image' || type === 'ai_secret_photo') return '[图片]';
    if (type === 'sticker') {
        const meta = typeof window.resolveStickerMetaByUrl === 'function'
            ? window.resolveStickerMetaByUrl(window.currentChatRole || msg.roleId || '', msg.stickerUrl || msg.content || '', msg.stickerName || '')
            : { name: '' };
        return meta && meta.name ? ('[表情包] ' + meta.name) : '[表情包]';
    }
    if (type === 'dice') return '[骰子]';
    if (type === 'transfer') {
        const amount = String(msg.amount || '').trim();
        return amount ? ('向你转了 ' + amount + ' 元') : '[转账]';
    }
    if (type === 'redpacket') {
        const note = String(msg.note || '').trim();
        return note ? ('给你发了红包: ' + note) : '[红包]';
    }
    if (type === 'location') {
        try {
            const payload = typeof msg.content === 'string' ? JSON.parse(msg.content) : (msg.content || {});
            const name = String(payload && (payload.name || payload.title) || '').trim();
            return name ? ('[位置] ' + name) : '[位置]';
        } catch (e) {
            return '[位置]';
        }
    }
    if (type === 'takeout_card') return '[外卖卡片]';
    if (type === 'gift_card') return '[礼物卡片]';
    if (type === 'offline_action') {
        const text = String(msg.content || '').trim();
        return text ? ('（' + text + '）') : '';
    }
    return String(msg.content || '').trim();
}

function escapeHtmlText(text) {
    return String(text == null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseCommerceCardPayload(rawValue) {
    if (!rawValue) return {};
    if (typeof rawValue === 'object') return rawValue || {};
    try {
        const parsed = JSON.parse(String(rawValue || '{}'));
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function parseTranslatedTextPayload(rawValue) {
    let payload = {};
    let rawText = '';
    if (rawValue && typeof rawValue === 'object') {
        payload = rawValue || {};
    } else {
        rawText = String(rawValue == null ? '' : rawValue).trim();
        if (rawText) {
            try {
                const parsed = JSON.parse(rawText);
                if (parsed && typeof parsed === 'object') {
                    payload = parsed;
                }
            } catch (e) { }
        }
    }

    const foreignValue = payload.foreign != null
        ? payload.foreign
        : (payload.original != null
            ? payload.original
            : (payload.source != null
                ? payload.source
                : (payload.text != null ? payload.text : payload.content)));
    const translationValue = payload.translation != null
        ? payload.translation
        : (payload.chinese != null
            ? payload.chinese
            : (payload.zh != null ? payload.zh : payload.translationText));
    const bodyFallback = payload.body != null ? payload.body : payload.bodyText;
    const bodyText = stripMarkdownDisplayArtifacts(String(bodyFallback != null ? bodyFallback : rawText).trim());
    const foreignText = stripMarkdownDisplayArtifacts(String(foreignValue != null ? foreignValue : '').trim()) || bodyText;
    const translationText = stripMarkdownDisplayArtifacts(String(translationValue != null ? translationValue : '').trim()) || foreignText;

    return {
        rawText: rawText,
        speakerName: '',
        bodyText: foreignText || bodyText,
        foreignText: foreignText,
        translationText: translationText,
        hasTranslation: !!(foreignText && translationText)
    };
}

function renderTakeoutCardBubble(payload, msgStatus) {
    const data = payload && typeof payload === 'object' ? payload : {};
    const title = escapeHtmlText(String(data.foodName || data.shopName || '').trim() || '外卖');
    const items = Array.isArray(data.items) ? data.items : [];
    const priceText = escapeHtmlText(String(data.price || '').trim() || '--');
    const remark = escapeHtmlText(String(data.remark || '').trim());
    const paymentMode = String(data.paymentMode || 'paid').trim();
    const isPayOnBehalf = paymentMode === 'pay_on_behalf';
    const isPaid = msgStatus === 'paid';
    let platformText, payLabel, orderNumber;
    if (isPayOnBehalf && isPaid) {
        const payerName = escapeHtmlText(String(data.payerName || '').trim() || '对方');
        platformText = '外卖代付';
        payLabel = payerName + ' 已完成支付';
        orderNumber = '代付单';
    } else if (isPayOnBehalf) {
        platformText = '外卖代付';
        payLabel = '待付款';
        orderNumber = '代付单';
    } else {
        platformText = '外卖订单';
        payLabel = '实付金额';
        orderNumber = '已下单';
    }
    const itemsHtml = items.length
        ? items.map(function (item) {
            return `
                <div class="takeout-item-row">
                    <span class="takeout-item-name">${escapeHtmlText(item)}</span>
                    <span class="takeout-item-qty">1</span>
                </div>
            `;
        }).join('')
        : `
            <div class="takeout-item-row">
                <span class="takeout-item-name">${title}</span>
                <span class="takeout-item-qty">1</span>
            </div>
        `;
    const payRowClass = (isPayOnBehalf && !isPaid) ? 'takeout-pay-row is-pending' : 'takeout-pay-row';
    return `
        <div class="msg-bubble takeout-bubble custom-bubble-content">
            <div class="takeout-receipt-card">
                <div class="takeout-receipt-header">
                    <div class="takeout-receipt-top">
                        <span class="takeout-order-number">${orderNumber}</span>
                        <span class="takeout-platform">${platformText}</span>
                    </div>
                    <div class="takeout-receipt-logo">
                        <i class="bx bx-bowl-hot"></i>
                        <div class="takeout-shop-name">${title}</div>
                    </div>
                    <div class="takeout-slogan">喜悦发生于热爱生活的瞬间</div>
                </div>
                <div class="takeout-receipt-body">
                    <div class="takeout-items-header">
                        <span>商品名称</span>
                        <span style="text-align: right;">数量</span>
                    </div>
                    <div class="takeout-items-list">
                        ${itemsHtml}
                    </div>
                </div>
                <div class="takeout-receipt-divider"></div>
                <div class="takeout-receipt-footer">
                    <div class="takeout-total-row">
                        <span>合计</span>
                        <span>¥${priceText}</span>
                    </div>
                    <div class="takeout-receipt-divider"></div>
                    <div class="${payRowClass}">
                        <span>${payLabel}</span>
                        <span class="takeout-final-price">¥${priceText}</span>
                    </div>
                </div>
                ${remark ? `<div class="takeout-receipt-divider"></div><div class="takeout-receipt-remark">备注：${remark}</div>` : ''}
            </div>
        </div>
    `;
}

function renderGiftCardBubble(payload, msgStatus) {
    const data = payload && typeof payload === 'object' ? payload : {};
    const anonymous = data.anonymous === true;
    const paymentMode = String(data.paymentMode || 'paid').trim();
    const isPayOnBehalf = paymentMode === 'pay_on_behalf';
    const isPaid = msgStatus === 'paid';
    let bubbleTitle, giftHint, footerText;
    if (isPayOnBehalf && isPaid) {
        const payerName = escapeHtmlText(String(data.payerName || '').trim() || '对方');
        bubbleTitle = payerName + ' 已完成支付';
        giftHint = '';
        footerText = '微信礼物 · 代付已完成';
    } else if (isPayOnBehalf) {
        bubbleTitle = '请求支付一件商品';
        giftHint = anonymous ? '匿名包裹，先猜猜看里面是什么' : '点开看看我给你准备了什么';
        footerText = '微信礼物 · 待对方代付';
    } else {
        bubbleTitle = escapeHtmlText(String(data.bubbleTitle || '').trim() || (anonymous ? '送你一份匿名心意' : '送你一份心意'));
        giftHint = anonymous ? '匿名包裹，先猜猜看里面是什么' : '点开看看我给你准备了什么';
        footerText = '微信礼物';
    }
    const hintHtml = giftHint ? `<div class="gift-bubble-hint">${giftHint}</div>` : '';
    return `
        <div class="msg-bubble gift-message-bubble custom-bubble-content" data-gift-openable="1">
            <div class="gift-bubble starry-bg">
                <div class="bubble-main">
                    <div class="gift-preview-bow" aria-hidden="true">
                        <span></span><span></span><span></span><span></span><span></span>
                    </div>
                    <div class="bubble-copy">
                        <div class="bubble-title">${bubbleTitle}</div>
                        ${hintHtml}
                    </div>
                </div>
                <div class="bubble-footer starry-bg">${footerText}</div>
            </div>
        </div>
    `;
}

function ensureGiftRevealModal() {
    let modal = document.getElementById('chat-gift-reveal-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'chat-gift-reveal-modal';
    modal.className = 'gift-modal-overlay';
    modal.innerHTML = `
        <div class="gift-card-full starry-bg">
            <div class="card-header" id="gift-modal-header"></div>
            <div class="diagonal-ribbon"></div>
            <div class="open-btn-wrapper" id="gift-modal-open-btn">
                <div class="open-bg-layer1"></div>
                <div class="open-bg-layer2"></div>
                <div class="open-circle">开</div>
            </div>
            <div class="gift-reveal-content" id="gift-reveal-content">
                <div class="gift-reveal-tag">礼物详情</div>
                <div class="gift-reveal-name" id="gift-reveal-name"></div>
                <div class="gift-reveal-price" id="gift-reveal-price"></div>
                <div class="gift-reveal-note" id="gift-reveal-note"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.classList.remove('show');
            modal.classList.remove('is-opened');
        }
    });
    const openBtn = modal.querySelector('#gift-modal-open-btn');
    if (openBtn) {
        openBtn.addEventListener('click', function (e) {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            modal.classList.add('is-opened');
        });
    }
    return modal;
}

function openGiftRevealModal(msg) {
    const payload = parseCommerceCardPayload(msg && msg.content);
    const modal = ensureGiftRevealModal();
    const headerEl = document.getElementById('gift-modal-header');
    const nameEl = document.getElementById('gift-reveal-name');
    const priceEl = document.getElementById('gift-reveal-price');
    const noteEl = document.getElementById('gift-reveal-note');
    if (!modal || !headerEl || !nameEl || !priceEl || !noteEl) return;
    const senderName = String(payload.senderName || (msg && msg.role === 'me' ? '我' : 'Ta')).trim() || 'Ta';
    const anonymous = payload.anonymous === true;
    const paymentMode = String(payload.paymentMode || 'paid').trim();
    const amountText = String(payload.price || '').trim();
    headerEl.textContent = senderName + '：' + (anonymous ? '送你一份匿名心意' : '送你一份心意');
    nameEl.textContent = String(payload.itemName || '').trim() || (anonymous ? '匿名包裹' : '一份心意');
    priceEl.textContent = amountText ? ('¥' + amountText) : '';
    if (paymentMode === 'pay_on_behalf') {
        noteEl.textContent = anonymous ? '这是一份匿名包裹，同时附带了代付请求。' : '这份礼物附带了代付请求。';
    } else {
        noteEl.textContent = anonymous ? '拆开之前，对方只能先猜测里面是什么。' : '这份心意已经送达。';
    }
    modal.classList.remove('is-opened');
    modal.classList.add('show');
}

function ensureGiftPayOnBehalfModal() {
    let modal = document.getElementById('chat-gift-pay-on-behalf-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'chat-gift-pay-on-behalf-modal';
    modal.className = 'gift-modal-overlay';
    modal.innerHTML = `
        <div class="gift-pay-on-behalf-card starry-bg">
            <div class="gift-pay-header" id="gift-pay-header"></div>
            <div class="gift-pay-name" id="gift-pay-name"></div>
            <div class="gift-pay-price" id="gift-pay-price"></div>
            <div class="gift-pay-actions">
                <button type="button" class="gift-pay-btn accept" id="gift-pay-accept-btn">同意代付</button>
                <button type="button" class="gift-pay-btn decline" id="gift-pay-decline-btn">拒绝</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
    return modal;
}

function openGiftPayOnBehalfModal(msg) {
    const payload = parseCommerceCardPayload(msg && msg.content);
    const modal = ensureGiftPayOnBehalfModal();
    const headerEl = document.getElementById('gift-pay-header');
    const nameEl = document.getElementById('gift-pay-name');
    const priceEl = document.getElementById('gift-pay-price');
    const acceptBtn = document.getElementById('gift-pay-accept-btn');
    const declineBtn = document.getElementById('gift-pay-decline-btn');
    if (!modal || !headerEl || !nameEl || !priceEl || !acceptBtn || !declineBtn) return;
    const senderName = String(payload.senderName || (msg && msg.role === 'me' ? '我' : 'Ta')).trim() || 'Ta';
    const anonymous = payload.anonymous === true;
    const amountText = String(payload.price || '').trim();
    headerEl.textContent = senderName + ' 请求你代付一件礼物';
    nameEl.textContent = anonymous ? '匿名包裹' : String(payload.itemName || '').trim() || '一份心意';
    priceEl.textContent = amountText ? ('¥' + amountText) : '';

    const newAcceptBtn = acceptBtn.cloneNode(true);
    const newDeclineBtn = declineBtn.cloneNode(true);
    acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
    declineBtn.parentNode.replaceChild(newDeclineBtn, declineBtn);

    newAcceptBtn.addEventListener('click', function (e) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        const roleId = window.currentChatRole;
        if (!roleId || !msg) {
            modal.classList.remove('show');
            return;
        }
        const profile = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : {};
        const payerName = String(profile.remark || profile.nickName || profile.name || '对方').trim() || '对方';
        msg.status = 'paid';
        let parsed = null;
        try {
            parsed = JSON.parse(msg.content);
        } catch (e) {}
        if (parsed && typeof parsed === 'object') {
            parsed.payerName = payerName;
            msg.content = JSON.stringify(parsed);
        }
        saveData();
        const row = document.querySelector('.msg-row[data-timestamp="' + msg.timestamp + '"]');
        if (row) {
            const bubble = row.querySelector('.gift-message-bubble');
            if (bubble) {
                bubble.outerHTML = renderGiftCardBubble(parseCommerceCardPayload(msg.content), msg.status);
            }
        }
        modal.classList.remove('show');
    });

    newDeclineBtn.addEventListener('click', function (e) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        modal.classList.remove('show');
    });

    modal.classList.add('show');
}

function sanitizeChatBubbleHtml(rawHtml) {
    const raw = String(rawHtml == null ? '' : rawHtml);
    if (!raw) return '';
    if (typeof document === 'undefined' || !document.createElement) {
        return escapeHtmlText(raw);
    }

    const allowedTags = new Set([
        'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'hr', 'i', 'img', 'li', 'mark', 'ol', 'p', 'pre', 'section', 'small', 'span', 'strong',
        'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul'
    ]);
    const blockedTags = new Set([
        'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form', 'input',
        'button', 'textarea', 'select', 'option', 'svg', 'math', 'canvas', 'video', 'audio'
    ]);
    const allowedAttrsByTag = {
        a: new Set(['href', 'target', 'rel']),
        img: new Set(['src', 'alt', 'width', 'height']),
        td: new Set(['colspan', 'rowspan']),
        th: new Set(['colspan', 'rowspan'])
    };
    const globalAttrs = new Set(['class', 'title', 'role', 'aria-label', 'style']);

    const isSafeUrl = function (value, isImage) {
        const url = String(value || '').trim();
        if (!url) return false;
        const lower = url.replace(/[\u0000-\u001f\s]+/g, '').toLowerCase();
        if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) return false;
        if (isImage && lower.startsWith('data:image/')) return true;
        return /^(https?:|mailto:|tel:|\/|\.\/|\.\.\/|#)/i.test(url);
    };

    const sanitizeStyle = function (value) {
        return String(value || '')
            .split(';')
            .map(function (rule) { return rule.trim(); })
            .filter(function (rule) {
                if (!rule || rule.indexOf(':') === -1) return false;
                const lower = rule.toLowerCase();
                return lower.indexOf('expression') === -1 &&
                    lower.indexOf('javascript:') === -1 &&
                    lower.indexOf('@import') === -1 &&
                    lower.indexOf('behavior:') === -1 &&
                    lower.indexOf('url(') === -1;
            })
            .join('; ');
    };

    const template = document.createElement('template');
    template.innerHTML = raw;

    const walk = function (node) {
        const children = Array.prototype.slice.call(node.childNodes || []);
        children.forEach(function (child) {
            if (child.nodeType !== 1) return;
            const tag = String(child.tagName || '').toLowerCase();
            if (blockedTags.has(tag)) {
                child.remove();
                return;
            }
            if (!allowedTags.has(tag)) {
                child.replaceWith(document.createTextNode(child.textContent || ''));
                return;
            }

            Array.prototype.slice.call(child.attributes || []).forEach(function (attr) {
                const name = String(attr.name || '').toLowerCase();
                const value = String(attr.value || '');
                const allowedForTag = allowedAttrsByTag[tag];
                const isDataAttr = name.indexOf('data-') === 0;
                const allowed = globalAttrs.has(name) || isDataAttr || (allowedForTag && allowedForTag.has(name));
                if (!allowed || name.indexOf('on') === 0) {
                    child.removeAttribute(attr.name);
                    return;
                }
                if ((name === 'href' || name === 'src') && !isSafeUrl(value, tag === 'img')) {
                    child.removeAttribute(attr.name);
                    return;
                }
                if (name === 'style') {
                    const cleanStyle = sanitizeStyle(value);
                    if (cleanStyle) child.setAttribute('style', cleanStyle);
                    else child.removeAttribute('style');
                }
            });

            if (tag === 'a') {
                child.setAttribute('rel', 'noopener noreferrer');
                if (!child.getAttribute('target')) child.setAttribute('target', '_blank');
            }
            walk(child);
        });
    };

    walk(template.content);
    return template.innerHTML;
}

function getTranslatedRoleDisplayName(roleId) {
    const rid = String(roleId || '').trim();
    const profile = (window.charProfiles && rid && window.charProfiles[rid] && typeof window.charProfiles[rid] === 'object')
        ? window.charProfiles[rid]
        : {};
    return String(
        profile.realName ||
        profile.real_name ||
        profile.nickName ||
        profile.name ||
        rid ||
        'TA'
    ).trim() || 'TA';
}

function isChineseHeavyText(text) {
    const raw = String(text || '').trim();
    if (!raw) return false;
    const cjk = (raw.match(/[\u4e00-\u9fff]/g) || []).length;
    const kana = (raw.match(/[\u3040-\u30ff]/g) || []).length;
    const hangul = (raw.match(/[\uac00-\ud7af]/g) || []).length;
    const latin = (raw.match(/[A-Za-z]/g) || []).length;
    return cjk >= 2 && cjk >= kana + hangul && cjk >= Math.max(1, latin);
}

function isForeignHeavyText(text) {
    const raw = String(text || '').trim();
    if (!raw) return false;
    const cjk = (raw.match(/[\u4e00-\u9fff]/g) || []).length;
    const kana = (raw.match(/[\u3040-\u30ff]/g) || []).length;
    const hangul = (raw.match(/[\uac00-\ud7af]/g) || []).length;
    const latin = (raw.match(/[A-Za-z]/g) || []).length;
    const cyrillic = (raw.match(/[\u0400-\u04ff]/g) || []).length;
    const arabic = (raw.match(/[\u0600-\u06ff]/g) || []).length;
    if (kana || hangul || cyrillic || arabic) return true;
    if (latin >= 4 && latin > cjk * 2) return true;
    return false;
}

function countRegexMatches(text, pattern) {
    const raw = String(text || '');
    if (!raw || !pattern) return 0;
    const matches = raw.match(pattern);
    return matches ? matches.length : 0;
}

function getNonSimplifiedChineseScore(text) {
    const raw = String(text || '').trim();
    if (!raw || !isChineseHeavyText(raw)) return 0;
    const keywordScore = countRegexMatches(raw, /(粤语|廣東話|广东话|白話|白话|方言|繁體|繁体|正體|正体|文言|文言文|古漢語|古汉语|台語|臺語|闽南语|閩南語|客家話|客家话|吳語|吴语|滬語|沪语|上海話|上海话)/g);
    const traditionalScore = countRegexMatches(raw, /[這個們為來時後會說話讓還愛歡學習覺應實體點開關於與臺灣廣東電腦網頁貓車鐘鍾門裡見聽買麼嗎]/g);
    const dialectScore = countRegexMatches(raw, /[係嘅咗喺嚟冇唔佢哋啲咩喎乜邊嗰諗睇咁]/g);
    return keywordScore * 4 + traditionalScore * 2 + dialectScore * 3;
}

function getSimplifiedChineseScore(text) {
    const raw = String(text || '').trim();
    if (!raw || !isChineseHeavyText(raw)) return 0;
    return countRegexMatches(raw, /[这们为来说话让还欢学习觉应实体点开关于与台湾广东电脑网页猫车钟门里见听买吗]/g) * 2;
}

function isLikelyNonSimplifiedChineseText(text) {
    return getNonSimplifiedChineseScore(text) >= 2;
}

function isLikelyAutoTranslateOriginalText(text) {
    return isForeignHeavyText(text) || isLikelyNonSimplifiedChineseText(text);
}

function isLikelyAutoTranslatePair(originalText, translationText) {
    const original = String(originalText || '').trim();
    const translation = String(translationText || '').trim();
    if (!original || !translation || original === translation) return false;
    if (isForeignHeavyText(original)) {
        return isChineseHeavyText(translation);
    }
    if (!isLikelyNonSimplifiedChineseText(original) || !isChineseHeavyText(translation)) {
        return false;
    }
    const originalNonSimplified = getNonSimplifiedChineseScore(original);
    const translationNonSimplified = getNonSimplifiedChineseScore(translation);
    const originalSimplified = getSimplifiedChineseScore(original);
    const translationSimplified = getSimplifiedChineseScore(translation);
    return translationNonSimplified < originalNonSimplified || translationSimplified > originalSimplified || !isLikelyNonSimplifiedChineseText(translation);
}

function shouldUseStructuredTranslatedBubble(foreignText, translationText) {
    const foreign = String(foreignText || '').trim();
    const translation = String(translationText || '').trim();
    if (!foreign || !translation || foreign === translation) return false;
    return isLikelyAutoTranslateOriginalText(foreign) && isChineseHeavyText(translation);
}

function normalizeStructuredTranslatedCandidate(rawValue) {
    const parsedPayload = parseTranslatedTextPayload(rawValue);
    const foreignText = stripPromptLeakageText(stripControlDirectivesFromText(parsedPayload.foreignText || parsedPayload.bodyText || ''));
    const translationText = stripPromptLeakageText(stripControlDirectivesFromText(parsedPayload.translationText || parsedPayload.foreignText || ''));
    const normalizedForeign = String(foreignText || translationText || '').trim();
    const normalizedTranslation = String(translationText || foreignText || '').trim();
    if (!(normalizedForeign || normalizedTranslation)) {
        return { mode: 'empty', text: '', foreign: '', translation: '' };
    }
    if (shouldUseStructuredTranslatedBubble(normalizedForeign, normalizedTranslation)) {
        return {
            mode: 'translated_text',
            text: normalizedForeign,
            foreign: normalizedForeign,
            translation: normalizedTranslation
        };
    }
    return {
        mode: 'text',
        text: normalizedForeign || normalizedTranslation,
        foreign: normalizedForeign,
        translation: normalizedTranslation
    };
}

function isAutoTranslateBubbleEnabledForRole(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return false;
    try {
        if (typeof window.isAutoTranslateEnabled === 'function') {
            return !!window.isAutoTranslateEnabled(rid);
        }
    } catch (e) { }
    try {
        return localStorage.getItem('chat_auto_translate') === 'true';
    } catch (e2) {
        return false;
    }
}

function shouldRenderTranslatedBubble(roleId, msg) {
    return String(msg && msg.role || '') === 'ai' && isAutoTranslateBubbleEnabledForRole(roleId);
}

function stripMarkdownDisplayArtifacts(text) {
    let s = String(text || '').trim();
    if (!s) return '';
    s = s.replace(/^#{1,6}\s+/, '');
    s = s.replace(/^(?:\*\*|__)([\s\S]*?)(?:\*\*|__)$/, '$1');
    s = s.replace(/^(?:\*|_)([\s\S]*?)(?:\*|_)$/, '$1');
    s = s.replace(/^\*{2,3}(?=\S)/, '');
    s = s.replace(/\*{2,3}$/, '');
    s = s.replace(/^_{2,3}(?=\S)/, '');
    s = s.replace(/_{2,3}$/, '');
    return s.trim();
}

function stripLeadingChatNoise(text) {
    let s = String(text || '').replace(/\r\n?/g, '\n');
    if (!s) return '';
    const lines = s.split('\n').map(function (line) {
        let item = String(line || '').trim();
        if (!item) return '';
        item = stripMarkdownDisplayArtifacts(item);
        item = item.replace(/^[#*\-•·‣▪‣\u2022]+\s*/g, '');
        item = item.replace(/^[—–―]+\s*/g, '');
        item = item.replace(/^\d+[.)、]\s*/g, '');
        item = item.trim();
        return item;
    }).filter(Boolean);
    return lines.join('\n').trim();
}

function isLikelyActionDescriptorTextForTranslate(text) {
    const inner = String(text || '').trim();
    if (!inner) return false;
    const actionVerbs = [
        '看着', '望着', '盯着', '听着', '想着', '说着', '走着', '坐着', '躺着', '站着',
        '笑着', '哭着', '沉默', '沉吟', '顿了顿', '停顿', '叹', '叹气', '叹息',
        '揉', '按', '摸', '拿', '握', '捏', '放下', '拿起', '抬头', '低头', '回头',
        '转身', '起身', '靠着', '倚着', '趴着', '蹲着', '轻笑', '苦笑', '皱眉',
        '挑眉', '扬眉', '眨眼', '翻白眼', '打哈欠', '伸懒腰', '挠头', '点头',
        '摇头', '挥手', '摆手', '耸肩', '伸手', '抱住', '靠近', '后退', '走近'
    ];
    for (let i = 0; i < actionVerbs.length; i++) {
        if (inner.includes(actionVerbs[i])) return true;
    }
    if (/[“”"'「」]/.test(inner)) return false;
    if (/[，,、；;：:]/.test(inner) && !/[吗呢吧呀啊哦诶啦]/.test(inner)) return true;
    return false;
}

function unwrapParentheticalTranslationText(text) {
    const raw = String(text || '').trim();
    if (!raw) return '';
    const match = raw.match(/^[（(]\s*([\s\S]*?)\s*[）)]$/);
    if (!match) return raw;
    const inner = stripMarkdownDisplayArtifacts(match[1]);
    if (!inner) return '';
    if (!isChineseHeavyText(inner)) return raw;
    if (isLikelyActionDescriptorTextForTranslate(inner)) return raw;
    return inner;
}

function normalizeAutoTranslateForeignCandidateText(text) {
    let out = stripMarkdownDisplayArtifacts(text);
    if (!out) return '';
    out = stripLeadingChatNoise(out);
    out = out.replace(/^(?:原文|外文|外语|英文原文|日文原文|韩文原文|法文原文|德文原文|西语原文|俄语原文|泰语原文|source|original|foreign|message)\s*[:：\-]\s*/i, '');
    out = out.replace(/^[「“"'`]+/, '').replace(/[」”"'`]+$/, '');
    return out.trim();
}

function normalizeAutoTranslateChineseCandidateText(text) {
    let out = stripMarkdownDisplayArtifacts(text);
    if (!out) return '';
    out = stripLeadingChatNoise(out);
    out = out.replace(/^(?:中文翻译|中文|翻译|译文|中译|意思是|意思|含义|translation)\s*[:：\-]\s*/i, '');
    out = unwrapParentheticalTranslationText(out);
    out = out.replace(/^[「“"'`]+/, '').replace(/[」”"'`]+$/, '');
    return out.trim();
}

function extractLabeledTranslatedParts(text) {
    const cleanedDisplay = stripMarkdownDisplayArtifacts(text);
    if (!cleanedDisplay) return null;

    const inlineMatch = cleanedDisplay.match(/^([\s\S]*?)(?:\s+|[\r\n]+)(?:中文翻译|中文|翻译|译文|中译|意思是|意思|含义|translation)\s*[:：]\s*([\s\S]+)$/i);
    if (inlineMatch) {
        const foreignInline = normalizeAutoTranslateForeignCandidateText(inlineMatch[1]);
        const translationInline = normalizeAutoTranslateChineseCandidateText(inlineMatch[2]);
        if (isLikelyAutoTranslatePair(foreignInline, translationInline)) {
            return { foreignText: foreignInline, translationText: translationInline };
        }
    }

    const lines = cleanedDisplay.split(/\n+/).map(function (line) {
        return stripMarkdownDisplayArtifacts(line);
    }).filter(Boolean);
    for (let i = 0; i < lines.length - 1; i++) {
        const foreignLine = normalizeAutoTranslateForeignCandidateText(lines[i]);
        const translationLine = normalizeAutoTranslateChineseCandidateText(lines[i + 1]);
        if (isLikelyAutoTranslatePair(foreignLine, translationLine)) {
            return { foreignText: foreignLine, translationText: translationLine };
        }
    }
    return null;
}

function buildWrappedTranslatedText(roleId, foreignText, translationText) {
    const foreign = String(foreignText || '').trim();
    const translation = String(translationText || '').trim();
    if (!foreign) return '';
    if (!translation) {
        return foreign;
    }
    return foreign + '（' + translation + '）';
}

function normalizeSingleTranslatedText(rawText, roleId) {
    const cleaned = typeof stripPromptLeakageText === 'function'
        ? stripPromptLeakageText(rawText)
        : String(rawText || '').trim();
    if (!cleaned) return '';
    const cleanedDisplay = stripMarkdownDisplayArtifacts(cleaned);
    if (!cleanedDisplay) return '';
    const parsed = parseTranslatedBubbleText(cleanedDisplay);
    if (parsed && parsed.hasTranslation) {
        return buildWrappedTranslatedText(roleId, parsed.foreignText, parsed.translationText);
    }

    const labeledParts = extractLabeledTranslatedParts(cleanedDisplay);
    if (labeledParts) {
        return buildWrappedTranslatedText(roleId, labeledParts.foreignText, labeledParts.translationText);
    }

    const lines = cleanedDisplay.split(/\n+/).map(function (line) {
        return stripMarkdownDisplayArtifacts(line);
    }).filter(Boolean);
    if (lines.length >= 2) {
        let foreignLine = '';
        let translationLine = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const foreignCandidate = normalizeAutoTranslateForeignCandidateText(line);
            if (!foreignLine && isLikelyAutoTranslateOriginalText(foreignCandidate)) {
                foreignLine = foreignCandidate;
                continue;
            }
            const translationCandidate = normalizeAutoTranslateChineseCandidateText(line);
            if (foreignLine && isLikelyAutoTranslatePair(foreignLine, translationCandidate)) {
                translationLine = translationCandidate;
                break;
            }
        }
        if (foreignLine && translationLine) {
            return buildWrappedTranslatedText(roleId, foreignLine, translationLine);
        }
    }

    const fullParenMatch = cleanedDisplay.match(/^(.*?)\s*[（(]\s*([\u4e00-\u9fff][\s\S]*?)\s*[）)]\s*$/);
    if (fullParenMatch && isLikelyAutoTranslatePair(fullParenMatch[1], fullParenMatch[2])) {
        return buildWrappedTranslatedText(
            roleId,
            stripMarkdownDisplayArtifacts(fullParenMatch[1]),
            unwrapParentheticalTranslationText('(' + fullParenMatch[2] + ')')
        );
    }
    return cleanedDisplay;
}

function normalizeAutoTranslateReplySegments(segments, roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return Array.isArray(segments) ? segments : [];
    const enabled = typeof window.isAutoTranslateEnabled === 'function'
        ? !!window.isAutoTranslateEnabled(rid)
        : (localStorage.getItem('chat_auto_translate') === 'true');
    if (!enabled) return Array.isArray(segments) ? segments : [];

    const source = Array.isArray(segments) ? segments : [];
    return source.map(function (seg) {
        if (!seg || typeof seg !== 'object') return seg;
        if (seg.kind === 'translated_text') {
            const normalized = normalizeStructuredTranslatedCandidate(seg);
            if (normalized.mode === 'translated_text') {
                return {
                    kind: 'translated_text',
                    foreign: normalized.foreign,
                    translation: normalized.translation
                };
            }
            if (normalized.mode === 'text' && normalized.text) {
                return { kind: 'text', text: normalized.text };
            }
            return null;
        }
        if (seg.kind === 'text') {
            const currentText = stripPromptLeakageText(stripControlDirectivesFromText(seg.text || ''));
            if (!currentText || isProtocolNoiseText(currentText)) return null;
            return { kind: 'text', text: currentText };
        }
        return seg;
    }).filter(Boolean);
}

function parseTranslatedBubbleText(rawText) {
    const original = String(rawText == null ? '' : rawText).trim();
    if (!original) return null;

    let body = typeof stripPromptLeakageText === 'function'
        ? stripPromptLeakageText(original)
        : original;
    body = stripMarkdownDisplayArtifacts(body);
    let speakerName = '';
    const wrappedMatch = body.match(/^\s*[\[【]\s*([^：:\[\]【】\n]{1,80}?)的消息：([\s\S]+)[\]】]\s*$/);
    if (wrappedMatch) {
        speakerName = String(wrappedMatch[1] || '').trim();
        body = String(wrappedMatch[2] || '').trim();
    } else {
        const looseMatch = body.match(/^\s*([^：:\[\]【】\n]{1,80}?)的消息：([\s\S]+)\s*$/);
        if (looseMatch) {
            speakerName = String(looseMatch[1] || '').trim();
            body = String(looseMatch[2] || '').trim();
        }
    }

    if (!body) {
        return null;
    }

    let foreignText = '';
    let translationText = '';
    const quoteOpen = body.lastIndexOf('「');
    const quoteClose = body.lastIndexOf('」');
    if (quoteOpen !== -1 && quoteClose > quoteOpen) {
        foreignText = stripMarkdownDisplayArtifacts(body.slice(0, quoteOpen));
        translationText = stripMarkdownDisplayArtifacts(body.slice(quoteOpen + 1, quoteClose));
    } else {
        const parenOpen = Math.max(body.lastIndexOf('('), body.lastIndexOf('（'));
        const parenClose = Math.max(body.lastIndexOf(')'), body.lastIndexOf('）'));
        if (parenOpen !== -1 && parenClose > parenOpen) {
            const maybeForeign = stripMarkdownDisplayArtifacts(body.slice(0, parenOpen));
            const maybeTranslation = stripMarkdownDisplayArtifacts(body.slice(parenOpen + 1, parenClose));
            if (isLikelyAutoTranslatePair(maybeForeign, maybeTranslation)) {
                foreignText = maybeForeign;
                translationText = maybeTranslation;
            }
        }
    }

    if (!(foreignText && translationText)) {
        const labeledParts = extractLabeledTranslatedParts(body);
        if (labeledParts) {
            foreignText = labeledParts.foreignText;
            translationText = labeledParts.translationText;
        }
    }

    if (!(foreignText && translationText)) {
        const lines = body.split(/\n+/).map(function (line) {
            return stripMarkdownDisplayArtifacts(line);
        }).filter(Boolean);
        if (lines.length >= 2) {
            for (let i = 0; i < lines.length - 1; i++) {
                if (isLikelyAutoTranslatePair(lines[i], lines[i + 1])) {
                    foreignText = lines[i];
                    translationText = lines[i + 1];
                    break;
                }
            }
        }
    }

    return {
        rawText: original,
        speakerName: speakerName,
        bodyText: body,
        foreignText: foreignText,
        translationText: translationText,
        hasTranslation: !!(foreignText && translationText)
    };
}

function buildTranslatedBubbleInnerHtml(parsed, options) {
    const info = parsed && typeof parsed === 'object' ? parsed : null;
    if (!info) return '';
    const opts = options && typeof options === 'object' ? options : {};
    const baseClass = opts.baseClass || 'translated-message-bubble';
    const foreignClass = opts.foreignClass || 'translated-message-foreign';
    const dividerClass = opts.dividerClass || 'translated-message-divider';
    const translationClass = opts.translationClass || 'translated-message-translation';
    const foreignText = escapeHtmlText(info.foreignText || info.bodyText || '').replace(/\n/g, '<br>');
    const translationText = escapeHtmlText(info.translationText || '').replace(/\n/g, '<br>');
    const title = opts.title || '点击收起或展开翻译';
    if (info.hasTranslation) {
        return `
            <div class="${baseClass}" data-translation-bubble="1" title="${escapeHtmlText(title)}">
                <div class="${foreignClass}">${foreignText}</div>
                <div class="${dividerClass}" aria-hidden="true"></div>
                <div class="${translationClass}">${translationText}</div>
            </div>
        `;
    }
    return `
        <div class="${baseClass}" data-translation-bubble="1" title="${escapeHtmlText(title)}">
            <div class="${foreignClass}">${escapeHtmlText(info.bodyText || '').replace(/\n/g, '<br>')}</div>
        </div>
    `;
}

function bindTranslatedBubbleToggle(bubbleEl) {
    if (!bubbleEl) return;
    bubbleEl.addEventListener('click', function (e) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        bubbleEl.classList.toggle('is-collapsed');
    });
}

window.escapeHtmlText = escapeHtmlText;
window.sanitizeChatBubbleHtml = sanitizeChatBubbleHtml;
window.parseTranslatedTextPayload = parseTranslatedTextPayload;
window.normalizeStructuredTranslatedCandidate = normalizeStructuredTranslatedCandidate;
window.parseTranslatedBubbleText = parseTranslatedBubbleText;
window.buildTranslatedBubbleInnerHtml = buildTranslatedBubbleInnerHtml;
window.bindTranslatedBubbleToggle = bindTranslatedBubbleToggle;
window.shouldRenderTranslatedBubble = shouldRenderTranslatedBubble;

function collectBackgroundAiReplyNotification(queue, msg) {
    if (!Array.isArray(queue) || !msg) return;
    if (String(msg.role || '') !== 'ai') return;
    const preview = getAiMessageNotificationPreview(msg);
    if (!preview) return;
    queue.push(msg);
}

function showBackgroundAiReplyNotifications(roleId, messages) {
    if (isChatRoleViewActive(roleId)) return;
    const list = Array.isArray(messages) ? messages.filter(Boolean) : [];
    if (!list.length) return;
    const meta = getRoleNotificationMeta(roleId);
    const useBrowserNotification = isDocumentBackgrounded();
    const delayStep = useBrowserNotification ? 260 : 1150;

    list.forEach(function (msg, index) {
        const preview = getAiMessageNotificationPreview(msg);
        if (!preview) return;
        window.setTimeout(function () {
            if (isChatRoleViewActive(roleId)) return;
            if (useBrowserNotification) {
                try {
                    if (window.BrowserNotificationBridge && typeof window.BrowserNotificationBridge.show === 'function') {
                        window.BrowserNotificationBridge.show(meta.name, preview, {
                            icon: meta.avatar,
                            roleId: roleId,
                            tag: 'chat-role-' + String(roleId || '').trim() + '-' + String(msg.timestamp || Date.now()) + '-' + index,
                            renotify: true,
                            durationMs: 8000
                        });
                    }
                } catch (e0) { }
                return;
            }
            try {
                if (typeof window.showIosNotification === 'function') {
                    window.showIosNotification(meta.avatar, meta.name, preview, { durationMs: 3600 });
                }
            } catch (e1) { }
        }, index * delayStep);
    });
}

function showBackgroundAiReplyNotification(roleId, msg) {
    showBackgroundAiReplyNotifications(roleId, [msg]);
}

function pushRoleMessageToDataAndActiveView(roleId, msg) {
    const rid = String(roleId || '').trim();
    if (!rid || !msg) {
        try {
            window.__lastAiMessagePushDebug = {
                roleId: rid,
                reason: 'missing_role_or_msg',
                at: Date.now()
            };
        } catch (e) { }
        return false;
    }
    if (!window.chatData) window.chatData = {};
    if (!window.chatData[rid]) window.chatData[rid] = [];
    if (msg.role === 'ai' && msg.type === 'translated_text') {
        const normalized = normalizeStructuredTranslatedCandidate(msg.content);
        if (normalized.mode === 'empty') {
            try {
                window.__lastAiMessagePushDebug = {
                    roleId: rid,
                    reason: 'translated_text_empty_or_noise',
                    at: Date.now(),
                    originalContent: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content || {})
                };
            } catch (e) { }
            return false;
        }
        if (normalized.mode === 'translated_text') {
            msg.content = JSON.stringify({
                foreign: normalized.foreign,
                translation: normalized.translation
            });
        } else {
            msg.type = 'text';
            msg.content = normalized.text;
        }
    } else if (msg.role === 'ai' && (!msg.type || msg.type === 'text')) {
        const cleanedContent = stripPromptLeakageText(stripControlDirectivesFromText(msg.content || ''));
        if (!cleanedContent || isProtocolNoiseText(cleanedContent)) {
            try {
                window.__lastAiMessagePushDebug = {
                    roleId: rid,
                    reason: 'cleaned_empty_or_noise',
                    at: Date.now(),
                    originalContent: String(msg.content || ''),
                    cleanedContent: cleanedContent
                };
            } catch (e) { }
            return false;
        }
        const autoTranslateEnabled = isAutoTranslateBubbleEnabledForRole(rid);
        if (autoTranslateEnabled) {
            const compact = cleanedContent.trim();
            if (compact.startsWith('{') && compact.endsWith('}')) {
                const structuredCandidate = normalizeStructuredTranslatedCandidate(compact);
                if (structuredCandidate.mode === 'translated_text') {
                    msg.type = 'translated_text';
                    msg.content = JSON.stringify({
                        foreign: structuredCandidate.foreign,
                        translation: structuredCandidate.translation
                    });
                } else if (structuredCandidate.mode === 'text' && structuredCandidate.text) {
                    msg.content = structuredCandidate.text;
                } else {
                    msg.content = cleanedContent;
                }
            } else {
                msg.content = cleanedContent;
            }
        } else {
            msg.content = cleanedContent;
        }
    }
    ensureChatMessageId(msg);
    window.chatData[rid].push(msg);
    if (!isChatRoleViewActive(rid)) {
        try {
            window.__lastAiMessagePushDebug = {
                roleId: rid,
                reason: 'view_inactive',
                at: Date.now(),
                msgType: String(msg.type || 'text'),
                contentPreview: String(msg.content || '').slice(0, 200)
            };
        } catch (e) { }
        return false;
    }
    appendMessageToDOM(msg);
    if (msg.timestamp && typeof window.markChatRoleAsRead === 'function') {
        try {
            window.markChatRoleAsRead(rid, msg.timestamp, { persist: false, refreshList: false, save: false });
        } catch (e) { }
    }
    try {
        window.__lastAiMessagePushDebug = {
            roleId: rid,
            reason: 'rendered',
            at: Date.now(),
            msgType: String(msg.type || 'text'),
            contentPreview: String(msg.content || '').slice(0, 200)
        };
    } catch (e) { }
    return true;
}

window.isChatRoleViewActive = isChatRoleViewActive;
window.pushRoleMessageToDataAndActiveView = pushRoleMessageToDataAndActiveView;

function getTrackedChatResponseRequestInfo(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return null;
    const store = window.__chatInflightRequestByRole || {};
    const info = store[rid];
    return info && typeof info === 'object' ? info : null;
}

function isTrackedChatResponsePending(roleId) {
    return !!getTrackedChatResponseRequestInfo(roleId);
}

function refreshTrackedChatResponseIndicators(roleId) {
    const rid = String(roleId || '').trim();
    try {
        if (typeof window.loadWechatChatList === 'function') {
            window.loadWechatChatList(true);
        }
    } catch (e) { }
    try {
        if (!rid) return;
        if (String(window.currentChatRole || '').trim() !== rid) return;
        const headerTitle = document.getElementById('current-chat-name');
        if (!headerTitle) return;
        const profile = (window.charProfiles && window.charProfiles[rid]) ? window.charProfiles[rid] : {};
        const defaultTitle = String(profile.remark || profile.nickName || profile.name || rid || 'Ta').trim() || 'Ta';
        headerTitle.innerText = isTrackedChatResponsePending(rid) ? '对方正在输入...' : defaultTitle;
    } catch (e2) { }
}

window.getTrackedChatResponseRequestInfo = getTrackedChatResponseRequestInfo;
window.isTrackedChatResponsePending = isTrackedChatResponsePending;
window.refreshTrackedChatResponseIndicators = refreshTrackedChatResponseIndicators;

function getMoneyActionKind(info, fallbackText) {
    const item = info && typeof info === 'object' ? info : {};
    if (typeof window.normalizeMoneyActionKind === 'function') {
        return window.normalizeMoneyActionKind(item.kind, item.remark || item.note || '', fallbackText || '');
    }
    const raw = String(item.kind || '').trim().toLowerCase();
    const compact = raw.replace(/[\s_-]+/g, '');
    if (compact === 'redpacket' || compact === 'hongbao') return 'redpacket';
    if (compact === 'transfer' || compact === 'zhuanzhang' || compact === 'moneytransfer') return 'transfer';
    const text = [item.remark, item.note, fallbackText].map(function (value) {
        return String(value || '').trim();
    }).filter(Boolean).join(' ');
    return /红包|🧧|恭喜发财|大吉大利|压岁钱|利是|开红包|拆红包|hong\s*bao|red\s*packet/i.test(text)
        ? 'redpacket'
        : 'transfer';
}

function buildModernChatJsonPromptForEvent(roleId, eventPrompt) {
    const rid = String(roleId || window.currentChatRole || '').trim();
    const extraPrompt = String(eventPrompt || '').trim();
    const fallbackProfile = window.charProfiles && rid ? (window.charProfiles[rid] || {}) : {};
    const fallbackPersona = window.userPersonas && rid ? (window.userPersonas[rid] || {}) : {};

    if (typeof window.buildWechatPrivatePromptV2 === 'function' && typeof window.buildPromptContextBundle === 'function') {
        try {
            const bundle = window.buildPromptContextBundle(rid, {}) || {};
            const profile = bundle.profile || fallbackProfile || {};
            const userPersona = bundle.userPersona || fallbackPersona || {};
            const stickerPromptText = typeof buildAIStickerPromptText === 'function' ? buildAIStickerPromptText() : '';
            const timePrompt = '【当前系统时间】\n' + new Date().toLocaleString('zh-CN', { hour12: false });
            return window.buildWechatPrivatePromptV2({
                roleId: rid,
                profile: profile,
                roleName: bundle.roleName || profile.nickName || profile.name || 'TA',
                realName: String(profile.realName || profile.real_name || profile.nickName || profile.name || bundle.roleName || 'TA').trim() || 'TA',
                language: String(profile.language || profile.lang || '').trim(),
                roleDesc: profile.desc || '',
                roleStyle: profile.style || '',
                roleSchedule: profile.schedule || '',
                roleRemark: bundle.roleRemark || '',
                userName: userPersona.name || '',
                userGender: userPersona.gender || '',
                userBirthday: userPersona.birthday ? String(userPersona.birthday) + (userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）') : '',
                userSetting: userPersona.setting || '',
                memoryArchivePrompt: bundle.memoryArchivePrompt || '',
                worldBookPromptText: bundle.worldBookPromptText || '',
                timePerceptionPrompt: timePrompt,
                giftTaskPrompt: bundle.giftTaskPrompt || '',
                coupleWishlistPrompt: bundle.coupleWishlistPrompt || '',
                transferScenePrompt: extraPrompt,
                stickerPromptText: stickerPromptText
            });
        } catch (e) { }
    }

    let prompt = String(fallbackProfile.desc || '你是一个真实的成年人角色，需要以自然微信聊天口吻回应用户。');
    if (fallbackProfile.schedule) prompt += '\n\n【作息安排】\n' + String(fallbackProfile.schedule).trim();
    if (fallbackProfile.style) prompt += '\n\n【聊天风格】\n' + String(fallbackProfile.style).trim();
    if (extraPrompt) prompt += '\n\n' + extraPrompt;
    prompt += '\n\n[[PROMPT_CLASS:FULL_CHAT]]\n[[SCENE:WECHAT_PRIVATE_V2]]\n[[PROMPT_OUTPUT:chat_json]]';
    prompt += '\n\n你必须且仅输出一个 JSON 对象。必须包含 reply、status、actions、system_event。只要触发动作，就必须同时给出自然 reply。';
    prompt += '\nreply 数组里可使用 {"type":"voice","content":"..."}、{"type":"photo","content":"画面描述"}、{"type":"sticker","url":"表情包URL"}；用户明确要求 HTML 时可使用 {"type":"html","content":"<div>...</div>"}。照片和表情包不要混用。';
    return prompt;
}

function buildMoneyEventPrompt(kind, status, amount) {
    const isRedpacket = kind === 'redpacket';
    if (isRedpacket) {
        if (status === 'accepted') {
            return [
                '【🧧 红包领取回执场景】',
                '系统事件：用户刚刚领取了你之前发出的红包' + (amount ? '，金额 ' + amount + ' 元' : '') + '。',
                '你需要像真人一样自然回应这件事，可以开心、打趣、接话或顺势推进关系。',
                '必须输出主聊天 JSON；reply 至少 1 条自然可见气泡，不能只输出 actions。',
                '不要新建红包/转账卡片，不要写 UI 状态占位符。'
            ].join('\n');
        }
        return [
            '【🧧 红包退回回执场景】',
            '系统事件：用户没有领取你之前发出的红包，红包已退回。',
            '请按人设自然回应，可以询问、打趣、体谅或收住。',
            '必须输出主聊天 JSON；reply 至少 1 条自然可见气泡，不能只输出 actions。'
        ].join('\n');
    }
    if (status === 'accepted') {
        return [
            '【💸 转账收款回执场景】',
            '系统事件：用户刚刚收下了你之前发出的转账。',
            '你需要像真人一样自然回应这件事，可以接住对方、解释、逗一下或继续当前话题。',
            '必须输出主聊天 JSON；reply 至少 1 条自然可见气泡，不能只输出 actions。',
            '不要新建转账/红包卡片，不要写 UI 状态占位符。'
        ].join('\n');
    }
    return [
        '【💸 转账退回回执场景】',
        '系统事件：用户刚刚退回了你之前发出的转账。',
        '请按人设自然回应，可以追问、体谅、坚持或收住。',
        '必须输出主聊天 JSON；reply 至少 1 条自然可见气泡，不能只输出 actions。'
    ].join('\n');
}

function buildImageEventPrompt(imageCount) {
    const count = Math.max(1, parseInt(imageCount, 10) || 1);
    return [
        '【图片消息场景】',
        '用户刚刚发送了' + count + '张真实图片。请结合图片内容和用户附带文字自然回复。',
        '如果用户明确要求你“换头像/用这张当头像/把头像换成这个”，必须在 actions.changeAvatar 中返回 {"index": 1}，多图时按用户指代选择对应 index，并同时在 reply 中自然说明。',
        '如果只是看图、分享照片或让你评价图片，不要更换头像。',
        '照片/图片和表情包必须区分：用户发来的真实图片是 image；你要发表情包时只能用 {"type":"sticker","url":"可用表情清单里的URL"}；你要发生活照片时用 {"type":"photo","content":"画面描述"}。',
        '必须输出主聊天 JSON；只要触发头像或其他动作，就必须同时给出自然 reply。'
    ].join('\n');
}

function handleActions(roleId, actions, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const onBackgroundMessage = typeof opts.onBackgroundMessage === 'function' ? opts.onBackgroundMessage : null;
    const result = { postMessages: [], offlineMeetingStart: false, offlineMeetingSource: '', recall: null, acceptTransfer: false, openRedpacket: false };
    if (!roleId || !actions || typeof actions !== 'object') return result;
    if (!window.chatData) window.chatData = {};
    if (!window.chatData[roleId]) window.chatData[roleId] = [];

    try {
        const act = actions || {};

        const hasStandaloneRedpacket = !!(act.redpacket || act.hongbao || act.redPacket);
        const moneyAction = act.transfer || act.redpacket || act.hongbao || act.redPacket;
        if (moneyAction) {
            const info = moneyAction;
            const amountNum = typeof info.amount === 'number' ? info.amount : parseFloat(info.amount);
            if (!isNaN(amountNum) && amountNum > 0) {
                const msgType = getMoneyActionKind(info, hasStandaloneRedpacket ? '红包' : '');
                result.postMessages.push({
                    type: msgType,
                    amount: amountNum.toFixed(2),
                    note: typeof info.remark === 'string' ? info.remark : (typeof info.note === 'string' ? info.note : '')
                });
            }
        }

        if (act.location) {
            const loc = act.location;
            const name = typeof loc.name === 'string' ? loc.name : '';
            const address = typeof loc.address === 'string' ? loc.address : '';
            const payload = JSON.stringify({ name: name, address: address });
            const now = Date.now();
            const aiMsg = {
                role: 'ai',
                content: payload,
                type: 'location',
                timestamp: now
            };
            const rendered = pushRoleMessageToDataAndActiveView(roleId, aiMsg);
            if (!rendered && onBackgroundMessage) onBackgroundMessage(aiMsg);
        }

        if (act.changeAvatar) {
            handleChangeAvatarAction(roleId, act.changeAvatar);
        }

        const acceptTransferAct = act.acceptTransfer || act.accept_transfer || act.receiveTransfer || act.receive_transfer || act.collectTransfer || act.collect_transfer;
        if (acceptTransferAct === true || acceptTransferAct === 'true' || acceptTransferAct === 1 || (acceptTransferAct && typeof acceptTransferAct === 'object')) {
            result.acceptTransfer = true;
        }
        const openRedpacketAct = act.openRedpacket || act.open_redpacket || act.openRedPacket || act.open_hongbao || act.receiveRedpacket || act.receive_redpacket;
        if (openRedpacketAct === true || openRedpacketAct === 'true' || openRedpacketAct === 1 || (openRedpacketAct && typeof openRedpacketAct === 'object')) {
            result.openRedpacket = true;
        }

        const giftTaskAct = act.gift_task || act.giftTask || act.giftTodo || act.giftTodoAction;
        if (giftTaskAct) {
            const giftTaskApi = typeof window.applyGiftTodoAction === 'function' ? window.applyGiftTodoAction : null;
            const tasks = Array.isArray(giftTaskAct) ? giftTaskAct : [giftTaskAct];
            const giftTaskResults = [];
            for (let i = 0; i < tasks.length; i++) {
                const spec = tasks[i];
                if (!spec || typeof spec !== 'object') continue;
                if (!giftTaskApi) continue;
                try {
                    const out = giftTaskApi(roleId, spec);
                    if (out) giftTaskResults.push(out);
                } catch (e) {
                    console.error('gift_task 处理失败:', e);
                }
            }
            if (giftTaskResults.length) {
                result.giftTask = giftTaskResults.length === 1 ? giftTaskResults[0] : giftTaskResults;
            }
        }

        const familyAct = act.family_card || act.familyCard || act.send_family_card || act.sendFamilyCard;
        if (familyAct) {
            let rawAmount = null;
            if (typeof familyAct === 'number' || typeof familyAct === 'string') {
                rawAmount = familyAct;
            } else if (familyAct && typeof familyAct === 'object') {
                rawAmount = familyAct.amount != null ? familyAct.amount : (familyAct.value != null ? familyAct.value : familyAct.money);
            }
            const amt = normalizeFamilyCardAmount(rawAmount);
            if (amt) {
                result.postMessages.push({ type: 'family_card', amount: amt });
            }
        }

        const offlineMeetingAct = act.offlineMeeting || act.offline_meeting || act.startOfflineMeeting;
        if (offlineMeetingAct && typeof offlineMeetingAct === 'object' && offlineMeetingAct.start) {
            if (!window.chatMapData) window.chatMapData = {};
            if (!window.chatMapData[roleId]) window.chatMapData[roleId] = {};
            const source = String(offlineMeetingAct.source || '').trim();
            const forceOnlineAfterMeeting = window.chatMapData[roleId].forceOnlineAfterMeeting === true;
            const allowLocationCardStart = (function () {
                const list = window.chatData && Array.isArray(window.chatData[roleId]) ? window.chatData[roleId] : [];
                for (let i = list.length - 1; i >= 0; i--) {
                    const item = list[i];
                    if (!item || item.hidden === true || item.recalled === true) continue;
                    if (item.role !== 'me') continue;
                    if (item.type === 'system_event' || item.type === 'call_memory') continue;
                    if (item.type === 'location') return false;
                    return true;
                }
                return true;
            })();
            if (!forceOnlineAfterMeeting && (source === 'arrival' || allowLocationCardStart)) {
                window.chatMapData[roleId].isMeeting = true;
                window.chatMapData[roleId].forceOnlineAfterMeeting = false;
                result.offlineMeetingStart = true;
                result.offlineMeetingSource = source;
            } else {
                console.log('[OfflineMeeting] blocked for role:', roleId, 'source:', source || '(none)', 'forceOnlineAfterMeeting=', forceOnlineAfterMeeting, 'allowLocationCardStart=', allowLocationCardStart);
            }
        }

        const recallAct = act.recall || act.revoke || act.withdraw;
        if (recallAct) {
            let recallSpec = {};
            if (typeof recallAct === 'string') {
                recallSpec = { target: recallAct };
            } else if (recallAct === true) {
                recallSpec = { target: 'self_last' };
            } else if (typeof recallAct === 'object') {
                recallSpec = recallAct;
            }
            const finalSpec = Object.assign({}, recallSpec, {
                initiator: 'ai',
                includeInAI: true,
                triggerAI: false,
                animate: true
            });
            if (!finalSpec.target && !finalSpec.messageId && !finalSpec.quoteId) {
                finalSpec.target = 'self_last';
            }
            if (typeof window.performChatMessageRecall === 'function') {
                result.recall = window.performChatMessageRecall(roleId, finalSpec);
            }
        }
    } catch (e) {
        console.error('handleActions 处理失败:', e);
    }
    return result;
}

function isRoleCurrentlyOfflineMeeting(roleId) {
    if (!roleId || !window.chatMapData) return false;
    return !!(window.chatMapData[roleId] && window.chatMapData[roleId].isMeeting === true);
}

function isRoleForcedOnlineAfterMeeting(roleId) {
    if (!roleId || !window.chatMapData) return false;
    return !!(window.chatMapData[roleId] && window.chatMapData[roleId].forceOnlineAfterMeeting === true);
}

function pushOfflineMixedSegments(result, text) {
    const raw = String(text || '').trim();
    if (!raw) return;
    const parts = raw.split('|||');
    for (let i = 0; i < parts.length; i++) {
        const part = String(parts[i] || '').trim();
        if (!part) continue;
        const re = /[（(]([\s\S]*?)[）)]/g;
        let match = null;
        let lastIndex = 0;
        let hadMatch = false;
        while ((match = re.exec(part)) !== null) {
            hadMatch = true;
            const before = part.slice(lastIndex, match.index).trim();
            if (before) {
                result.push({ kind: 'text', text: before });
            }
            const actionText = String(match[1] || '').trim();
            if (actionText) {
                result.push({ kind: 'offline_action', content: actionText });
            }
            lastIndex = re.lastIndex;
        }
        const tail = part.slice(lastIndex).trim();
        if (tail) {
            result.push({ kind: 'text', text: tail });
        } else if (!hadMatch && part) {
            result.push({ kind: 'text', text: part });
        }
    }
}

function isProtocolNoiseText(text) {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    if (!s) return true;
    if (/^[-—–_~=.•·|]+$/.test(s)) return true;
    return false;
}

function isLikelyThoughtLeakText(text) {
    const s = String(text || '').replace(/\r\n?/g, '\n').trim();
    if (!s) return false;
    const compact = s.replace(/\s+/g, ' ').trim();
    if (!compact) return false;

    if (/(?:^|[\s"'])?(?:thought|inner_monologue|system_event|quoteId|quote_id|reply_to|actions|status)\s*[:：]/i.test(compact)) return true;
    if (/(?:输出格式铁律|角色扮演核心规则|指令使用原则与动机|个人状态的动态管理|元数据铁律|你的角色设定|对话者的角色设定|当前情景|世界观|长期记忆|关系与身份档案|可用表情包|可用指令列表|情景感知|可用资源)/.test(compact)) return true;
    if (/^#{1,6}\s*.*(?:回复|回应|回答|翻译|格式|说明|示例|message|output|response)/i.test(compact)) return true;
    if (/^(?:理解|气氛|氛围|关系温度|关系状态|策略|动作|分析|判断|回复策略|互动策略|本轮策略)\s*[:：]/.test(compact)) return true;
    if (/(?:理解|气氛|策略|动作)\s*[:：].{0,40}(?:理解|气氛|策略|动作)\s*[:：]/.test(compact)) return true;
    if (/(?:我(?:该|得|先|需要|应该|必须)|先在)\s*(?:分析|判断|想想|思考|决定|考虑|确认|规划|组织|回复|怎么回复|怎么接|怎么说)/.test(compact)) return true;
    if (/(?:当前|现在的)\s*(?:气氛|氛围|关系|关系温度|关系状态)/.test(compact)) return true;
    if (/(?:要不要|是否需要)\s*触发(?:引用|语音|位置|通话|金钱|动作)?/.test(compact)) return true;
    if (/(?:不能前后打架|严格服从|内部思维链|隐藏思维链|不对用户可见|用户可见内容)/.test(compact)) return true;
    if (/(?:你的回复必须是一个JSON数组|数组中的每个对象都必须包含|第一个元素必须是|不要输出Markdown|不要输出代码块|不要输出任何解释|只输出JSON|禁止泄露|禁止输出任何思考过程|系统提示词|提示词来源)/.test(compact)) return true;
    if (/^[（(].*(?:不必要|而是|应该|必须|格式|翻译|原文|中文|外语|消息|回复).*[）)]$/.test(compact)) return true;
    return false;
}

function stripLikelyThoughtLeakLines(text) {
    const s = String(text || '').replace(/\r\n?/g, '\n');
    if (!s) return '';
    const kept = s.split('\n').map(function (line) {
        return String(line || '').trim();
    }).filter(function (line) {
        if (!line) return false;
        if (isProtocolNoiseText(line)) return false;
        if (isLikelyThoughtLeakText(line)) return false;
        return true;
    });
    return kept.join('\n').trim();
}

function stripPromptLeakageText(text) {
    let s = String(text || '');
    if (!s) return '';
    s = s.replace(/\r\n?/g, '\n');
    s = s.replace(/<thinking>[\s\S]*?<\/thinking>/gi, ' ');
    s = s.replace(/(?:^|\n)\s*```(?:json)?\s*/gi, '\n');
    s = s.replace(/```+/g, ' ');
    s = s.replace(/\[\s*VOICE\s*:\s*([\s\S]*?)\]/gi, '$1');
    s = s.replace(/\[\s*PHOTO\s*:\s*([\s\S]*?)\]/gi, '$1');
    s = s.replace(/\[\s*LOCATION\s*:\s*([^|\]]*?)\s*\|\s*([^\]]*?)\]/gi, '$1 $2');
    s = s.replace(/(?:^|\n)\s*#{1,6}\s*.*(?:回复|回应|回答|翻译|格式|说明|示例|message|output|response)[^\n]*/gi, '\n');
    s = s.replace(/(?:^|\n)\s*(?:[#＊*]+\s*)?(?:【)?(?:输出格式铁律|角色扮演核心规则|指令使用原则与动机|个人状态的动态管理|元数据铁律|你的角色设定|对话者的角色设定|当前情景|世界观|长期记忆|关系与身份档案|可用表情包|可用指令列表|情景感知|可用资源)(?:】)?[^\n]*\n?/gi, '\n');
    s = s.replace(/(?:^|\n)\s*(?:"?reply"?|回复|content|内容|thought|思考链|思考|inner_monologue|内心独白|status|actions|system_event|系统提示|quoteId|quote_id|reply_to|update_thoughts)\s*[:：][^\n]*/gi, '\n');
    s = s.replace(/(?:^|\n)\s*[\[【](?:内心独白|思考链|思考|引用回复|语音消息|语音|发送照片|发送图片|发送位置|见面触发(?:已关闭)?|主动视频(?:\/语音)?通话|主动语音通话|一起听(?:邀请|\/骰子)?|骰子互动|金钱能力|亲属卡|头像变更|微信气泡拆分规则(?:（最高优先级）)?|点外卖卡片（强制落地）|送礼物卡片)[\]】]\s*[:：]?\s*/gi, '\n');
    s = s.replace(/(?:^|\n)\s*【(?:引用回复|语音消息|发送照片|发送位置|见面触发(?:已关闭)?|主动视频(?:\/语音)?通话|主动语音通话|一起听(?:邀请|\/骰子)?|骰子互动|金钱能力|亲属卡|头像变更|微信气泡拆分规则(?:（最高优先级）)?|点外卖卡片（强制落地）|送礼物卡片)】\s*[:：]?\s*/gi, '\n');
    s = s.replace(/(?:^|\n)\s*-\s*(?:你的回复必须是一个JSON数组|数组中的每个对象都必须包含|第一个元素必须是|不要输出Markdown|不要输出代码块|不要输出任何解释|禁止泄露|禁止输出任何思考过程|只输出JSON|只输出上述格式).*$/gmi, '\n');
    s = s.replace(/(?:^|\n)\s*[（(].*(?:不必要|而是|应该|必须|格式|翻译|原文|中文|外语|消息|回复).*[）)]\s*/g, '\n');
    s = s.replace(/(?:^|\n)\s*(?:quoteId|quote_id|reply_to|thought|system_event|inner_monologue|status|actions)\s*[:：][^\n]*/gi, '\n');
    s = s.replace(/\n{3,}/g, '\n\n');
    const cleaned = stripLikelyThoughtLeakLines(s).split('\n').map(function (line) {
        return stripLeadingChatNoise(line);
    }).filter(Boolean).join('\n');
    return cleaned.trim();
}

function extractInlineQuoteText(text) {
    const raw = String(text || '');
    if (!raw) return { text: '', quoteText: '' };
    let quoteText = '';
    const cleaned = raw.replace(/\[QUOTE\]([\s\S]*?)\[\/QUOTE\]/ig, function (_, inner) {
        const value = String(inner || '').replace(/\s+/g, ' ').trim();
        if (value && !quoteText) quoteText = value;
        return ' ';
    });
    return {
        text: cleaned.replace(/\s{2,}/g, ' ').trim(),
        quoteText: quoteText
    };
}

function normalizeAiJsonPayloadShape(parsed) {
    if (parsed == null) return null;
    if (Array.isArray(parsed)) {
        return { reply: parsed };
    }
    if (typeof parsed === 'string') {
        return { reply: parsed };
    }
    if (parsed && typeof parsed === 'object') {
        return parsed;
    }
    return null;
}

function hasMeaningfulActionPayload(actions) {
    if (!actions || typeof actions !== 'object') return false;
    const keys = Object.keys(actions);
    for (let i = 0; i < keys.length; i++) {
        const value = actions[keys[i]];
        if (value == null) continue;
        if (typeof value === 'string' && !String(value).trim()) continue;
        if (Array.isArray(value) && !value.length) continue;
        if (typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length) continue;
        return true;
    }
    return false;
}

function isQuoteOnlyDirectivePayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
    const hasQuote = payload.quoteId != null || payload.quote_id != null || payload.reply_to != null;
    if (!hasQuote) return false;
    if (payload.reply != null || payload.reply_bubbles != null) return false;
    if (payload.system_event != null && String(payload.system_event || '').trim()) return false;
    if (payload.type != null || payload.kind != null) return false;
    if (payload.content != null && String(payload.content || '').trim()) return false;
    if (payload.text != null && String(payload.text || '').trim()) return false;
    if (hasMeaningfulActionPayload(payload.actions)) return false;
    const keys = Object.keys(payload).filter(function (key) {
        const value = payload[key];
        if (value == null) return false;
        if (typeof value === 'string' && !String(value).trim()) return false;
        if (Array.isArray(value) && !value.length) return false;
        if (typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length) return false;
        return true;
    });
    return keys.every(function (key) {
        return key === 'quoteId' || key === 'quote_id' || key === 'reply_to' || key === 'thought' || key === 'status';
    });
}

function extractBalancedJsonFragment(text, openChar) {
    const source = String(text || '');
    if (!source) return '';
    const closeChar = openChar === '{' ? '}' : ']';
    let start = -1;
    let depth = 0;
    let inString = false;
    let stringQuote = '"';
    let escaped = false;
    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                escaped = true;
                continue;
            }
            if (ch === stringQuote) {
                inString = false;
            }
            continue;
        }
        if (ch === '"' || ch === "'") {
            inString = true;
            stringQuote = ch;
            continue;
        }
        if (ch === openChar) {
            if (depth === 0) start = i;
            depth += 1;
            continue;
        }
        if (ch === closeChar && depth > 0) {
            depth -= 1;
            if (depth === 0 && start !== -1) {
                return source.slice(start, i + 1);
            }
        }
    }
    return '';
}

function tryParseStructuredAiPayload(rawText) {
    const text = String(rawText || '').trim();
    if (!text) return null;
    const candidates = [];
    const seen = Object.create(null);
    const pushCandidate = function (value) {
        const s = String(value || '').trim();
        if (!s || seen[s]) return;
        seen[s] = true;
        candidates.push(s);
    };

    const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
    let fenceMatch = null;
    while ((fenceMatch = fenceRegex.exec(text)) !== null) {
        if (fenceMatch && fenceMatch[1]) pushCandidate(fenceMatch[1]);
    }
    pushCandidate(text);

    for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        try {
            const parsed = JSON.parse(candidate);
            const normalized = normalizeAiJsonPayloadShape(parsed);
            if (normalized) return normalized;
        } catch (e) { }

        const objectFragment = extractBalancedJsonFragment(candidate, '{');
        if (objectFragment) {
            try {
                const parsedObject = JSON.parse(objectFragment);
                const normalizedObject = normalizeAiJsonPayloadShape(parsedObject);
                if (normalizedObject) return normalizedObject;
            } catch (e2) { }
        }

        const arrayFragment = extractBalancedJsonFragment(candidate, '[');
        if (arrayFragment) {
            try {
                const parsedArray = JSON.parse(arrayFragment);
                const normalizedArray = normalizeAiJsonPayloadShape(parsedArray);
                if (normalizedArray) return normalizedArray;
            } catch (e3) { }
        }
    }
    return null;
}

function normalizeStructuredReplySegments(replyValue, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const offlineMode = !!opts.offlineMode;
    const result = [];

    function pushInlineStructuredToken(tokenText) {
        const token = String(tokenText || '').trim();
        if (!token) return false;

        let match = token.match(/^\[\[\s*VIDEO_CALL_USER\s*\]\]$/i);
        if (match) {
            pushObject('video_call');
            return true;
        }
        match = token.match(/^\[\[\s*CALL_USER\s*\]\]$/i);
        if (match) {
            pushObject('call');
            return true;
        }
        match = token.match(/^\[\[\s*DICE\s*\]\]$/i);
        if (match) {
            pushObject('dice');
            return true;
        }
        return false;
    }

    function pushText(text) {
        const s = stripPromptLeakageText(text);
        if (!s) return;
        if (pushInlineStructuredToken(s)) return;

        const compact = s.trim();
        if ((compact.startsWith('{') && compact.endsWith('}')) || (compact.startsWith('[') && compact.endsWith(']'))) {
            try {
                const parsed = JSON.parse(compact);
                const nested = normalizeStructuredReplySegments(parsed, options);
                if (Array.isArray(nested) && nested.length) {
                    result.push.apply(result, nested);
                    return;
                }
            } catch (e) { }
        }

        if (offlineMode) {
            pushOfflineMixedSegments(result, s);
            return;
        }
        const normalized = stripLeadingChatNoise(s).replace(/\r\n?/g, '\n');
        const coarseParts = normalized.indexOf('|||') !== -1 ? normalized.split('|||') : [normalized];
        for (let i = 0; i < coarseParts.length; i++) {
            const block = String(coarseParts[i] || '').trim();
            if (!block) continue;
            const lineParts = block.split(/\n+/);
            for (let j = 0; j < lineParts.length; j++) {
                const item = stripLeadingChatNoise(String(lineParts[j] || '').trim());
                if (!item) continue;
                if (isProtocolNoiseText(item)) continue;
                result.push({ kind: 'text', text: item });
            }
        }
    }

    function pushObject(type, payload) {
        result.push(Object.assign({ kind: String(type || '').trim() }, payload || {}));
    }

    function pushStructuredObjectItem(item) {
        if (!item || typeof item !== 'object') return false;

        if (item.reply_bubbles != null) {
            const nestedReplyBubbles = normalizeStructuredReplySegments(item.reply_bubbles, options);
            if (Array.isArray(nestedReplyBubbles) && nestedReplyBubbles.length) {
                result.push.apply(result, nestedReplyBubbles);
                return true;
            }
        }

        if (item.reply != null) {
            const nestedReply = normalizeStructuredReplySegments(item.reply, options);
            if (Array.isArray(nestedReply) && nestedReply.length) {
                result.push.apply(result, nestedReply);
                return true;
            }
        }

        const rawType = String(item.type || item.kind || '').trim().toLowerCase();
        const looksLikeTranslatedPayload = item.foreign != null || item.translation != null || item.original != null || item.source != null || item.chinese != null || item.zh != null || item.translationText != null;
        if ((!rawType || rawType === 'text') && looksLikeTranslatedPayload) {
            const normalized = normalizeStructuredTranslatedCandidate(item);
            if (normalized.mode === 'translated_text') {
                pushObject('translated_text', {
                    foreign: normalized.foreign,
                    translation: normalized.translation
                });
            } else if (normalized.mode === 'text' && normalized.text) {
                pushText(normalized.text);
            }
            return true;
        }
        if (!rawType || rawType === 'text') {
            pushText(item.content != null ? item.content : item.text);
            return true;
        }
        if (rawType === 'translated_text' || rawType === 'translated') {
            const normalized = normalizeStructuredTranslatedCandidate(item);
            if (normalized.mode === 'translated_text') {
                pushObject('translated_text', {
                    foreign: normalized.foreign,
                    translation: normalized.translation
                });
            } else if (normalized.mode === 'text' && normalized.text) {
                pushText(normalized.text);
            }
            return true;
        }
        if (rawType === 'html') {
            pushObject('html', {
                content: String(item.content != null ? item.content : (item.html != null ? item.html : item.text || '')).trim()
            });
            return true;
        }
        if (rawType === 'offline_action' || rawType === 'action' || rawType === 'narration') {
            const actionContent = String(item.content != null ? item.content : item.text || '').trim();
            if (offlineMode) pushObject('offline_action', { content: actionContent });
            else pushText(actionContent);
            return true;
        }
        if (rawType === 'voice') {
            pushObject('voice', { content: String(item.content != null ? item.content : item.text || '').trim() });
            return true;
        }
        if (rawType === 'photo') {
            pushObject('photo', { content: String(item.description != null ? item.description : (item.content != null ? item.content : item.text || '')).trim() });
            return true;
        }
        if (rawType === 'location') {
            pushObject('location', {
                name: String(item.name || item.title || '').trim(),
                address: String(item.address || item.content || '').trim()
            });
            return true;
        }
        if (rawType === 'sticker') {
            pushObject('sticker', { content: String(item.url || item.src || item.content || item.name || item.stickerName || '').trim() });
            return true;
        }
        if (rawType === 'dice') {
            pushObject('dice');
            return true;
        }
        if (rawType === 'video_call' || rawType === 'video') {
            pushObject('video_call');
            return true;
        }
        if (rawType === 'call' || rawType === 'voice_call') {
            pushObject('call');
            return true;
        }
        if (rawType === 'takeout_card') {
            pushObject('takeout_card', {
                shopName: String(item.shopName || '').trim(),
                foodName: String(item.foodName || '').trim(),
                items: Array.isArray(item.items) ? item.items : [],
                price: String(item.price || '').trim(),
                remark: String(item.remark || '').trim(),
                paymentMode: String(item.paymentMode || '').trim()
            });
            return true;
        }
        if (rawType === 'gift_card' || rawType === 'giftcard' || rawType === 'gift' || rawType === 'send_gift') {
            const anonymousValue = item.anonymous != null ? item.anonymous : item.isAnonymous;
            pushObject('gift_card', {
                itemName: String(item.itemName || item.name || '').trim(),
                price: String(item.price || item.amount || '').trim(),
                paymentMode: String(item.paymentMode || '').trim(),
                anonymous: anonymousValue === true || String(anonymousValue || '').toLowerCase() === 'true',
                bubbleTitle: String(item.bubbleTitle || '').trim()
            });
            return true;
        }
        pushText(item.content != null ? item.content : item.text);
        return true;
    }

    if (replyValue == null) return result;

    if (Array.isArray(replyValue)) {
        for (let i = 0; i < replyValue.length; i++) {
            const item = replyValue[i];
            if (typeof item === 'string') {
                pushText(item);
                continue;
            }
            if (!pushStructuredObjectItem(item)) continue;
        }
        return result;
    }

    if (typeof replyValue === 'string') {
        pushText(replyValue);
        return result;
    }

    if (typeof replyValue === 'object') {
        pushStructuredObjectItem(replyValue);
        return result;
    }

    return result;
}

function extractVisibleReplyFromLooseText(rawText) {
    const text = String(rawText || '').replace(/\r\n?/g, '\n').trim();
    if (!text) return '';

    const parsedPayload = tryParseStructuredAiPayload(text);
    if (parsedPayload) {
        if (isQuoteOnlyDirectivePayload(parsedPayload)) return '';
        if (parsedPayload.reply != null) {
            if (Array.isArray(parsedPayload.reply)) return JSON.stringify(parsedPayload.reply);
            if (typeof parsedPayload.reply === 'string') return parsedPayload.reply.trim();
        }
        if (parsedPayload.reply_bubbles != null) {
            if (Array.isArray(parsedPayload.reply_bubbles)) return JSON.stringify(parsedPayload.reply_bubbles);
            if (typeof parsedPayload.reply_bubbles === 'string') return parsedPayload.reply_bubbles.trim();
        }
    }

    const embeddedReplyPatterns = [
        /"reply"\s*:\s*(\[[\s\S]*?\])\s*(?=,\s*"system_event"|,\s*"status"|,\s*"actions"|,\s*"quoteId"|,\s*"quote_id"|})/i,
        /"reply"\s*:\s*("(?:\\.|[^"])*")\s*(?=,\s*"system_event"|,\s*"status"|,\s*"actions"|,\s*"quoteId"|,\s*"quote_id"|})/i
    ];
    for (let i = 0; i < embeddedReplyPatterns.length; i++) {
        const match = text.match(embeddedReplyPatterns[i]);
        if (!match || !match[1]) continue;
        try {
            const parsed = JSON.parse(match[1]);
            if (Array.isArray(parsed)) return JSON.stringify(parsed);
            if (typeof parsed === 'string') return parsed.trim();
        } catch (e) { }
    }

    const blockPatterns = [
        /(?:^|\n)\s*(?:"?reply"?|回复)\s*[:：]\s*([\s\S]*?)(?=\n\s*(?:"?(?:thought|status|actions|system_event|quoteId|inner_monologue)"?|思考|状态|动作|系统提示|内心独白)\s*[:：]|\s*$)/i,
        /(?:^|\n)\s*(?:"?content"?|内容)\s*[:：]\s*([\s\S]*?)(?=\n\s*(?:"?(?:thought|status|actions|system_event|quoteId|inner_monologue)"?|思考|状态|动作|系统提示|内心独白)\s*[:：]|\s*$)/i
    ];
    for (let i = 0; i < blockPatterns.length; i++) {
        const match = text.match(blockPatterns[i]);
        if (match && match[1]) {
            const extracted = String(match[1] || '').trim();
            if (extracted) return extracted;
        }
    }

    const cleaned = text
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .replace(/(?:^|\n)\s*(?:"?thought"?|思考链|思考|内心独白|inner_monologue)\s*[:：][^\n]*/gi, '')
        .replace(/(?:^|\n)\s*(?:"?system_event"?|system event|系统提示)\s*[:：][^\n]*/gi, '')
        .replace(/(?:^|\n)\s*[\[【](?:内心独白|思考链|思考|引用回复)[^\]\n】]*[\]】][^\n]*/gi, '')
        .replace(/(?:^|\n)\s*[\[【](?:语音消息|语音|发送照片|发送图片|发送位置|主动视频(?:\/语音)?通话|主动语音通话|一起听(?:邀请|\/骰子)?|骰子互动|金钱能力|亲属卡|头像变更|微信气泡拆分规则(?:（最高优先级）)?|点外卖卡片（强制落地）|送礼物卡片)[\]】]\s*[:：]?/gi, '\n')
        .replace(/(?:^|\n)\s*【(?:引用回复|语音消息|发送照片|发送位置|主动视频(?:\/语音)?通话|主动语音通话|一起听(?:邀请|\/骰子)?|骰子互动|金钱能力|亲属卡|头像变更|微信气泡拆分规则(?:（最高优先级）)?|点外卖卡片（强制落地）|送礼物卡片)】\s*[:：]?/gi, '\n')
        .trim();
    return stripPromptLeakageText(cleaned);
}

function serializeReplySegmentsForDirectiveParsing(segments) {
    const list = Array.isArray(segments) ? segments : [];
    return list.map(function (seg) {
        if (!seg) return '';
        if (seg.kind === 'text') return String(seg.text || '');
        if (seg.kind === 'translated_text') return String(seg.translation || seg.foreign || '');
        return '';
    }).filter(Boolean).join('|||');
}

function stripControlDirectivesFromText(text) {
    let s = String(text || '');
    if (!s) return '';
    s = s.replace(/\[QUOTE\]([\s\S]*?)\[\/QUOTE\]/gi, ' ');
    s = s.replace(/\[\[\s*LISTEN_TOGETHER_(?:ACCEPT|DECLINE)\s*:\s*[^\]]+?\s*\]\]/gi, ' ');
    if (typeof window.consumeMoneyAcceptDirectiveCodes === 'function') {
        s = window.consumeMoneyAcceptDirectiveCodes(s, window.currentChatRole || '').text;
    } else {
        s = s.replace(/\[\[\s*ACCEPT_TRANSFER\s*\]\]/gi, ' ');
        s = s.replace(/\[\[\s*OPEN_REDPACKET\s*\]\]/gi, ' ');
    }
    s = s.replace(/(?:\[\[?\s*|【\s*)(?:accept|accepted|receive|received|collect|claim|take|open|agree|reject|decline|refuse)(?:[-_\s:：]*[\w.-]+)?\s*(?:\]\]?|】)/gi, ' ');
    s = s.replace(/:::\s*TRANSFER\s*:(\{[\s\S]*?\})\s*:::/gi, ' ');
    s = s.replace(/[\[【]\s*(?:已\s*收\s*款|已\s*收\s*取|已\s*收\s*下|收\s*下\s*转\s*账|已\s*接受\s*转\s*账|转\s*账\s*已\s*收)\s*[：:\s]*[¥￥]?\s*\d*(?:\.\d+)?\s*(?:元)?\s*[\]】]/gi, ' ');
    s = s.replace(/[\[【]\s*(?:已\s*收\s*款|已\s*收\s*取|已\s*收\s*下)\s*[\]】]\s*[¥￥]?\s*\d+(?:\.\d+)?\s*(?:元)?/gi, ' ');
    s = s.replace(/[\[【]\s*(?:已\s*领\s*取\s*红\s*包|红\s*包\s*已\s*领\s*取|已\s*拆\s*红\s*包|拆\s*开\s*红\s*包)\s*[：:\s]*[¥￥]?\s*\d*(?:\.\d+)?\s*(?:元)?\s*[\]】]/gi, ' ');
    s = s.replace(/[\[【]\s*(?:已\s*领\s*取|已\s*拆\s*开)\s*[\]】]\s*[¥￥]?\s*\d+(?:\.\d+)?\s*(?:元)?/gi, ' ');
    s = s.replace(/[\[【]\s*(?:转账|微信转账|红包|发红包)\s*[\]】]\s*[：:\s]*[¥￥]?\s*[0-9]+(?:\.[0-9]+)?\s*(?:元)?/gi, ' ');
    s = s.replace(/[\[【]\s*(?:转账|微信转账|红包|发红包)\s*[\]】]/gi, ' ');
    s = s.replace(/\s*\|\|\|\s*/g, '|||');
    s = s.replace(/\s{2,}/g, ' ');
    s = s.replace(/(?:^\|\|\|)+|(?:\|\|\|$)+/g, '');
    return s.trim();
}

function sanitizeReplySegmentsForDisplay(segments, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const offlineMode = !!opts.offlineMode;
    const source = Array.isArray(segments) ? segments : [];
    const out = [];
    for (let i = 0; i < source.length; i++) {
        const seg = source[i];
        if (!seg) continue;
        if (seg.kind !== 'text') {
            out.push(seg);
            continue;
        }
        const cleaned = stripPromptLeakageText(stripControlDirectivesFromText(seg.text || ''));
        if (!cleaned) continue;
        const normalized = normalizeStructuredReplySegments(cleaned, { offlineMode: offlineMode });
        if (Array.isArray(normalized) && normalized.length) out.push.apply(out, normalized);
    }
    return out;
}

function normalizeImageUrlCandidate(url) {
    if (!url || typeof url !== 'string') return '';
    let u = url.trim();
    if (!u) return '';
    if (u.length >= 2 && ((u.startsWith('`') && u.endsWith('`')) || (u.startsWith('"') && u.endsWith('"')) || (u.startsWith("'") && u.endsWith("'")))) {
        u = u.slice(1, u.length - 1).trim();
    }
    const stickerMatch = u.match(/^\[STICKER:\s*([^\]]+)\]$/i);
    if (stickerMatch && stickerMatch[1]) {
        u = String(stickerMatch[1]).trim();
    }
    return u;
}

function resolveKnownStickerMetaForAI(roleId, rawValue, fallbackName) {
    if (typeof window.resolveStickerMetaByUrl !== 'function') return null;
    const meta = window.resolveStickerMetaByUrl(roleId, rawValue, fallbackName || '');
    if (meta && meta.found && meta.url) return meta;
    return null;
}

function isValidImageUrlCandidate(url) {
    const u = normalizeImageUrlCandidate(url);
    if (!u) return false;
    if (u.startsWith('data:image/')) return true;
    if (u.startsWith('blob:')) return true;
    if (/^(\/|\.\/|\.\.\/|assets\/)/i.test(u)) return true;
    let parsed = null;
    try {
        parsed = new URL(u);
    } catch (e) {
        return false;
    }
    if (!parsed) return false;
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const path = (parsed.pathname || '').toLowerCase();
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path)) return true;
    const q = (parsed.search || '').toLowerCase();
    if (q.includes('image') || q.includes('img') || q.includes('format=') || q.includes('mime=')) return true;
    return true;
}

function preloadImageUrl(url, timeoutMs) {
    return new Promise(function (resolve) {
        const u = normalizeImageUrlCandidate(url);
        if (!u) return resolve(false);
        const img = new Image();
        let done = false;
        let timerId = null;
        function finish(ok) {
            if (done) return;
            done = true;
            if (timerId) clearTimeout(timerId);
            img.onload = null;
            img.onerror = null;
            resolve(!!ok);
        }
        timerId = setTimeout(function () {
            finish(false);
        }, Math.max(800, timeoutMs || 2500));
        img.onload = function () { finish(true); };
        img.onerror = function () { finish(false); };
        try { img.referrerPolicy = 'no-referrer'; } catch (e) { }
        let srcToLoad = u;
        try {
            srcToLoad = new URL(u, window.location.href).href;
        } catch (e) { }
        img.src = srcToLoad;
    });
}

function ensureChatHeaderAvatar() {
    const existing = document.getElementById('current-chat-avatar');
    if (existing) existing.remove();
    return null;
}

function applyCharacterAvatarToUI(roleId, avatarUrl) {
    if (!roleId) return [];
    const profile = window.charProfiles && window.charProfiles[roleId] ? window.charProfiles[roleId] : null;
    if (profile) {
        profile.avatar = avatarUrl;
    }

    const animatedTargets = [];

    if (window.currentChatRole === roleId) {
        const oldHeaderAvatar = document.getElementById('current-chat-avatar');
        if (oldHeaderAvatar) oldHeaderAvatar.remove();
    }

    const menuAvatar = document.getElementById('menu-role-avatar');
    if (menuAvatar && window.currentChatRole === roleId) {
        try { menuAvatar.referrerPolicy = 'no-referrer'; } catch (e) { }
        menuAvatar.src = avatarUrl;
        animatedTargets.push(menuAvatar);
    }

    const statusAvatar = document.getElementById('status-monitor-avatar-img');
    if (statusAvatar && window.currentChatRole === roleId) {
        try { statusAvatar.referrerPolicy = 'no-referrer'; } catch (e) { }
        statusAvatar.src = avatarUrl;
        animatedTargets.push(statusAvatar);
    }

    const callAvatar = document.getElementById('voice-call-avatar');
    if (callAvatar && window.currentChatRole === roleId) {
        try { callAvatar.referrerPolicy = 'no-referrer'; } catch (e) { }
        callAvatar.src = avatarUrl;
        animatedTargets.push(callAvatar);
    }

    if (window.currentChatRole === roleId) {
        const historyBox = document.getElementById('chat-history');
        if (historyBox) {
            const aiRows = historyBox.querySelectorAll('.msg-row[data-role="ai"] .msg-avatar img');
            aiRows.forEach(function (img) {
                try { img.referrerPolicy = 'no-referrer'; } catch (e) { }
                img.src = avatarUrl;
                animatedTargets.push(img);
            });
        }
    }

    return animatedTargets;
}

function runAvatarSwapAnimation(targets) {
    if (!targets || !targets.length) return;
    for (let i = 0; i < targets.length; i++) {
        const el = targets[i];
        if (!el || typeof el.animate !== 'function') continue;
        try {
            el.animate(
                [
                    { transform: 'scale(1)', filter: 'brightness(1)' },
                    { transform: 'scale(1.08)', filter: 'brightness(1.25)' },
                    { transform: 'scale(1)', filter: 'brightness(1)' }
                ],
                { duration: 420, easing: 'ease-out' }
            );
        } catch (e) { }
    }
}

function appendAvatarSwapError(roleId, text) {
    const now = Date.now();
    const msg = {
        role: 'ai',
        content: text || '我想换但图片加载失败了。',
        type: 'text',
        timestamp: now
    };
    const rendered = pushRoleMessageToDataAndActiveView(roleId, msg);
    saveData();
    if (!rendered) {
        showBackgroundAiReplyNotification(roleId, msg);
        if (typeof window.loadWechatChatList === 'function') {
            try { window.loadWechatChatList(true); } catch (e) { }
        }
    }
}

async function handleChangeAvatarAction(roleId, payload) {
    let chosenUrl = '';
    if (payload && typeof payload === 'object') {
        const rawIndex = payload.index != null ? payload.index : (payload.pick != null ? payload.pick : payload.choice);
        if (rawIndex != null) {
            const idx = parseInt(String(rawIndex), 10);
            if (!isNaN(idx) && idx > 0) {
                try {
                    const list = window.__latestUserImagesByRole && window.__latestUserImagesByRole[roleId]
                        ? window.__latestUserImagesByRole[roleId]
                        : [];
                    if (Array.isArray(list) && idx <= list.length) {
                        chosenUrl = list[idx - 1];
                    }
                } catch (e) { }
            }
        }
        if (!chosenUrl && payload.url) chosenUrl = payload.url;
    } else if (typeof payload === 'string') {
        chosenUrl = payload;
    }

    let avatarUrl = normalizeImageUrlCandidate(chosenUrl);
    if (!avatarUrl || !isValidImageUrlCandidate(avatarUrl)) {
        try {
            const list = window.__latestUserImagesByRole && window.__latestUserImagesByRole[roleId]
                ? window.__latestUserImagesByRole[roleId]
                : [];
            const ts = window.__latestUserImagesByRoleTs && window.__latestUserImagesByRoleTs[roleId]
                ? Number(window.__latestUserImagesByRoleTs[roleId])
                : 0;
            const isRecent = ts > 0 ? (Date.now() - ts) < (30 * 60 * 1000) : true;
            if (Array.isArray(list) && list.length > 0 && isRecent) {
                const last = list[list.length - 1];
                const fallback = normalizeImageUrlCandidate(last);
                if (fallback && isValidImageUrlCandidate(fallback)) {
                    avatarUrl = fallback;
                }
            }
        } catch (e) { }
    }
    if (!avatarUrl || !isValidImageUrlCandidate(avatarUrl)) {
        appendAvatarSwapError(roleId, '我想换，但这张图的链接看起来不太对，加载失败了。');
        return;
    }

    if (!window.charProfiles) window.charProfiles = {};
    if (!window.charProfiles[roleId]) window.charProfiles[roleId] = {};

    const prevAvatar = window.charProfiles[roleId].avatar || '';
    const targets = applyCharacterAvatarToUI(roleId, avatarUrl);
    runAvatarSwapAnimation(targets);

    const ok = await preloadImageUrl(avatarUrl, 25000);
    if (!ok) {
        if (prevAvatar) {
            const revertTargets = applyCharacterAvatarToUI(roleId, prevAvatar);
            runAvatarSwapAnimation(revertTargets);
        }
        appendAvatarSwapError(roleId, '我想换，但这张图我这边加载不出来，先不换了。');
        saveData();
        return;
    }

    saveData();
    if (typeof window.loadWechatChatList === 'function') {
        try { window.loadWechatChatList(true); } catch (e) { }
    }
}

function beginTrackedChatResponseRequest(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return '';
    window.__chatInflightRequestByRole = window.__chatInflightRequestByRole || {};
    const requestId = 'chatreq_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    window.__chatInflightRequestByRole[rid] = {
        id: requestId,
        startedAt: Date.now()
    };
    refreshTrackedChatResponseIndicators(rid);
    return requestId;
}

function isTrackedChatResponseRequestCurrent(roleId, requestId) {
    const rid = String(roleId || '').trim();
    const reqId = String(requestId || '').trim();
    if (!rid || !reqId) return false;
    const store = window.__chatInflightRequestByRole || {};
    return !!(store[rid] && store[rid].id === reqId);
}

function finishTrackedChatResponseRequest(roleId, requestId) {
    const rid = String(roleId || '').trim();
    if (!isTrackedChatResponseRequestCurrent(rid, requestId)) return;
    try {
        delete window.__chatInflightRequestByRole[rid];
    } catch (e) { }
    refreshTrackedChatResponseIndicators(rid);
}

function getChatAiRequestLockStore() {
    if (!window.__chatAiRequestLockByRole || typeof window.__chatAiRequestLockByRole !== 'object') {
        window.__chatAiRequestLockByRole = {};
    }
    return window.__chatAiRequestLockByRole;
}

function getChatAiRequestLockInfo(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return null;
    const store = getChatAiRequestLockStore();
    const item = store[rid];
    return item && typeof item === 'object' ? item : null;
}

function getChatAiRequestLockMaxAgeMs() {
    return 90 * 1000;
}

function cleanupStaleChatAiRequestLock(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return false;
    const item = getChatAiRequestLockInfo(rid);
    if (!item || item.inFlight !== true) return false;
    const startedAt = Number(item.startedAt || 0);
    if (!startedAt) return false;
    if (Date.now() - startedAt < getChatAiRequestLockMaxAgeMs()) return false;
    try {
        delete getChatAiRequestLockStore()[rid];
        window.__lastChatAiLockAutoCleared = {
            roleId: rid,
            requestId: String(item.requestId || ''),
            startedAt: startedAt,
            clearedAt: Date.now(),
            reason: 'stale_timeout'
        };
    } catch (e) { }
    return true;
}

function isChatAiRequestInFlight(roleId) {
    const rid = String(roleId || '').trim();
    if (!rid) return false;
    cleanupStaleChatAiRequestLock(rid);
    const item = getChatAiRequestLockInfo(rid);
    return !!(item && item.inFlight === true);
}

function syncChatAiRequestLockState(roleId) {
    const rid = String(roleId || '').trim();
    const locked = isChatAiRequestInFlight(rid);
    const btn = document.querySelector('.circle-btn.ai-btn');
    if (btn) {
        btn.classList.toggle('is-ai-busy', locked);
        btn.setAttribute('aria-disabled', locked ? 'true' : 'false');
        btn.style.pointerEvents = '';
        btn.style.opacity = locked ? '0.55' : '';
        btn.style.filter = locked ? 'saturate(0.7)' : '';
    }
}

function setChatAiRequestInFlight(roleId, requestId) {
    const rid = String(roleId || '').trim();
    if (!rid) return;
    const store = getChatAiRequestLockStore();
    store[rid] = {
        inFlight: true,
        requestId: String(requestId || '').trim(),
        startedAt: Date.now()
    };
    syncChatAiRequestLockState(rid);
}

function clearChatAiRequestInFlight(roleId, requestId) {
    const rid = String(roleId || '').trim();
    if (!rid) return;
    const store = getChatAiRequestLockStore();
    const item = store[rid];
    const reqId = String(requestId || '').trim();
    if (!item) {
        syncChatAiRequestLockState(rid);
        return;
    }
    if (reqId && item.requestId && String(item.requestId) !== reqId) {
        syncChatAiRequestLockState(rid);
        return;
    }
    delete store[rid];
    syncChatAiRequestLockState(rid);
}

window.isChatAiRequestInFlight = isChatAiRequestInFlight;
window.setChatAiRequestInFlight = setChatAiRequestInFlight;
window.clearChatAiRequestInFlight = clearChatAiRequestInFlight;
window.syncChatAiRequestLockState = syncChatAiRequestLockState;
window.cleanupStaleChatAiRequestLock = cleanupStaleChatAiRequestLock;

function setTrackedChatResponseHeaderText(headerTitle, roleId, requestId, text) {
    if (!headerTitle) return;
    if (!isTrackedChatResponseRequestCurrent(roleId, requestId)) return;
    const currentRole = String(window.currentChatRole || '').trim();
    const rid = String(roleId || '').trim();
    if (currentRole && rid && currentRole !== rid) return;
    headerTitle.innerText = text;
}

function invokeAIWithCommonHandlers(systemPrompt, cleanHistory, userMessage, roleId, headerTitle, oldTitle) {
    const requestId = beginTrackedChatResponseRequest(roleId);
    const isCurrentRequest = function () {
        return isTrackedChatResponseRequestCurrent(roleId, requestId);
    };
    const restoreHeaderTitle = function () {
        setTrackedChatResponseHeaderText(headerTitle, roleId, requestId, oldTitle);
    };
    const finishRequest = function () {
        if (typeof window.clearChatAiRequestInFlight === 'function') {
            window.clearChatAiRequestInFlight(roleId, requestId);
        }
        finishTrackedChatResponseRequest(roleId, requestId);
    };
    const clearBusyReplyQueueIfNeeded = function () {
        if (String(window.__busyReplyQueueFlushRoleId || '') !== String(roleId || '')) return;
        if (typeof window.clearBusyReplyQueue === 'function') {
            try {
                window.clearBusyReplyQueue(roleId);
            } catch (e) { }
        }
        window.__busyReplyQueueFlushRoleId = '';
    };

    if (typeof window.callAI === 'function') {
        if (typeof window.setChatAiRequestInFlight === 'function') {
            window.setChatAiRequestInFlight(roleId, requestId);
        }
        window.callAI(
            systemPrompt,
            cleanHistory,
            userMessage,
            async (aiResponseText) => {
                if (!isCurrentRequest()) return;
                let rawText = typeof aiResponseText === 'string' ? aiResponseText : '';
                const originalAiResponseText = rawText;
                try {
                    window.__lastAiRawResponseDebug = {
                        at: Date.now(),
                        roleId: roleId,
                        textPreview: String(originalAiResponseText || '').slice(0, 1000)
                    };
                } catch (e) { }
                const wasOfflineMeeting = isRoleCurrentlyOfflineMeeting(roleId);
                let backgroundReplyNoticeQueue = [];

                let jsonPayload = null;
                let thoughtText = '';
                let innerMonologueText = '';
                let replyText = '';
                let replySegments = [];
                let systemEventText = '';
                let actions = null;
                let busyGuardMeta = null;

                // =================================================
                // 🛠️ 增强解析：确保能吃掉各种格式的 JSON
                // =================================================
                if (rawText) {
                    jsonPayload = tryParseStructuredAiPayload(rawText);
                    if (!jsonPayload) {
                        console.warn("非标准 JSON 回复，降级为普通文本处理");
                    }
                }

                if (jsonPayload && jsonPayload.busy_guard && typeof jsonPayload.busy_guard === 'object') {
                    busyGuardMeta = jsonPayload.busy_guard;
                    const delayMs = Math.max(0, parseInt(busyGuardMeta.delayMs, 10) || 0);
                    const activitySnapshot = typeof window.getBusyReplyUserActivity === 'function'
                        ? window.getBusyReplyUserActivity(roleId)
                        : 0;
                    if (delayMs > 0) {
                        await new Promise(function (resolve) { setTimeout(resolve, delayMs); });
                        if (!isCurrentRequest()) return;
                        if (typeof window.getBusyReplyUserActivity === 'function' &&
                            window.getBusyReplyUserActivity(roleId) !== activitySnapshot) {
                            restoreHeaderTitle();
                            finishRequest();
                            return;
                        }
                    }
                }

        let pendingQuoteId = '';
        let pendingInlineQuoteText = '';
        if (jsonPayload && typeof jsonPayload === 'object') {
            const q = jsonPayload.quoteId != null
                ? jsonPayload.quoteId
                : (jsonPayload.quote_id != null ? jsonPayload.quote_id : (jsonPayload.reply_to != null ? jsonPayload.reply_to : ''));
            pendingQuoteId = String(q || '').trim();
            if (/^(?:null|none|false|no|无|不引用|省略)$/i.test(pendingQuoteId)) {
                pendingQuoteId = '';
            }
        }
        let quoteApplied = false;
        const tryAttachQuote = function (msgObj) {
                    if (!msgObj) return;
                    if (pendingInlineQuoteText && !quoteApplied) {
                        msgObj.quoteSourceText = pendingInlineQuoteText;
                        if (!msgObj.quoteId) msgObj.quoteId = pendingQuoteId || 'user_last';
                        if (msgObj.quoteId || msgObj.quoteSourceText) {
                            resolveQuoteBlockForMessage(roleId, msgObj);
                        }
                        if (!(msgObj.quote && msgObj.quote.text)) {
                            msgObj.quote = {
                                name: '引用',
                                text: pendingInlineQuoteText
                            };
                        }
                        pendingInlineQuoteText = '';
                        quoteApplied = true;
                        return;
                    }
                    if (pendingQuoteId && !quoteApplied) {
                        msgObj.quoteId = pendingQuoteId;
                        resolveQuoteBlockForMessage(roleId, msgObj);
                        if (msgObj.quote && msgObj.quote.text) {
                            quoteApplied = true;
                            return;
                        }
                    }
                };

                // =================================================
                // 🧠 逻辑分发：思考 / 回复 / 系统事件
                // =================================================
                if (jsonPayload) {
                    // 1. 提取内部思考 (Thought，用于逻辑推理)
                    if (typeof jsonPayload.thought === 'string') {
                        thoughtText = jsonPayload.thought;
                        if (thoughtText.trim()) {
                            saveHiddenThoughtToHistory(roleId, thoughtText, '【思考链】');
                        }
                    }

                    // 2. 提取状态与内心独白 (Status + inner_monologue)
                    if (jsonPayload.status && typeof jsonPayload.status === 'object') {
                        const statusObj = jsonPayload.status;
                        if (typeof statusObj.inner_monologue === 'string') {
                            innerMonologueText = statusObj.inner_monologue;
                            saveHiddenThoughtToHistory(roleId, innerMonologueText, '【内心独白】');
                        } else if (!innerMonologueText && typeof jsonPayload.thought === 'string') {
                            innerMonologueText = jsonPayload.thought;
                        }
                    }

                    // 3. 提取动作 (Actions)
                    if (jsonPayload.actions && typeof jsonPayload.actions === 'object') {
                        actions = handleActions(roleId, jsonPayload.actions, {
                            onBackgroundMessage: function (msg) {
                                collectBackgroundAiReplyNotification(backgroundReplyNoticeQueue, msg);
                            }
                        });
                    }
                    const offlineModeNow = wasOfflineMeeting || !!(actions && actions.offlineMeetingStart);

                    if (jsonPayload.status || innerMonologueText) {
                        updateRoleStatusFromAI(roleId, jsonPayload.status, innerMonologueText);
                    }

                    // 4. 处理核心回复 (Reply vs System Event)
                    // 注意：如果 reply 是 null，代表“不回消息”
                    if (jsonPayload.reply === null || jsonPayload.reply === undefined) {
                        // --- 物理阻断状态 (如洗澡/手术) ---
                        replyText = ''; // 既然是 null，就不要显示气泡

                        // 检查是否有系统事件提示
                        if (jsonPayload.system_event) {
                            systemEventText = String(jsonPayload.system_event);
                            const systemEventNoticeMsg = {
                                role: 'ai',
                                content: systemEventText,
                                type: 'system_event',
                                timestamp: Date.now()
                            };
                            if (busyGuardMeta) systemEventNoticeMsg.busyGuard = busyGuardMeta;
                            collectBackgroundAiReplyNotification(backgroundReplyNoticeQueue, systemEventNoticeMsg);
                            appendSystemStatusToDOM(roleId, systemEventText, { busyGuard: busyGuardMeta }); // 显示灰色小字
                        }
                    } else {
                        // --- 正常回复 ---
                        replySegments = normalizeStructuredReplySegments(
                            jsonPayload.reply_bubbles != null ? jsonPayload.reply_bubbles : jsonPayload.reply,
                            { offlineMode: offlineModeNow }
                        );
                        if (typeof jsonPayload.reply === 'string') {
                            replyText = String(jsonPayload.reply);
                        } else if (!replySegments.length && jsonPayload.reply_bubbles != null) {
                            replyText = String(jsonPayload.reply_bubbles || '');
                        } else {
                            replyText = '';
                        }
                    }

                    // 5. 将处理后的文本赋值给 rawText，供后续流程渲染
                    // 关键：这里我们只把 replyText 给后续流程，这样界面上就看不到 JSON 代码了！
                    rawText = replyText;
                }
                else {
                    // 如果不是 JSON，尝试去除旧版的 <thinking> 标签作为兜底
                    rawText = extractVisibleReplyFromLooseText(rawText);
                    replySegments = normalizeStructuredReplySegments(rawText, { offlineMode: wasOfflineMeeting });
                }

                // =================================================
                // 🛑 阻断检查：如果 rawText 是空的（因为在洗澡），直接结束
                // =================================================
                if (!rawText && !replySegments.length && !jsonPayload?.actions && originalAiResponseText) {
                    const fallbackVisibleText = stripPromptLeakageText(
                        stripControlDirectivesFromText(
                            extractVisibleReplyFromLooseText(originalAiResponseText)
                        )
                    );
                    if (fallbackVisibleText && !isProtocolNoiseText(fallbackVisibleText)) {
                        rawText = fallbackVisibleText;
                        replySegments = normalizeStructuredReplySegments(fallbackVisibleText, {
                            offlineMode: wasOfflineMeeting
                        });
                    }
                }

                if (!rawText && !replySegments.length && !jsonPayload?.actions) {
                    try {
                        window.__lastAiMessagePushDebug = {
                            roleId: roleId,
                            reason: 'empty_after_parse',
                            at: Date.now(),
                            originalContent: String(originalAiResponseText || '').slice(0, 1000),
                            hadJsonPayload: !!jsonPayload,
                            systemEventText: String(systemEventText || ''),
                            hasActions: !!(jsonPayload && jsonPayload.actions)
                        };
                    } catch (e) { }
                    // 恢复标题状态
                    restoreHeaderTitle();
                    // 保存数据（因为可能存了 thought 或 system_event）
                    saveData();
                    finishRequest();
                    return; // 不执行后续的气泡渲染
                }

                let commandCarrierText = '';
                if (Array.isArray(replySegments) && replySegments.length) {
                    commandCarrierText = serializeReplySegmentsForDirectiveParsing(replySegments);
                } else {
                    commandCarrierText = String(rawText || '');
                }

                let listenTogetherDecisions = [];
                const ltDecision = applyListenTogetherDecisionFromAI(commandCarrierText || '', roleId);
                if (ltDecision && ltDecision.handled) {
                    listenTogetherDecisions = Array.isArray(ltDecision.decisions) ? ltDecision.decisions : [];
                    commandCarrierText = String(ltDecision.text || '').trim();
                }

                const joinedReplyTextForQuickCheck = (function () {
                    if (Array.isArray(replySegments) && replySegments.length) {
                        return replySegments.map(function (seg) {
                            if (!seg) return '';
                            if (seg.kind === 'text') return String(seg.text || '');
                            if (seg.kind === 'translated_text') return String(seg.translation || seg.foreign || '');
                            if (seg.kind === 'html') return String(seg.content || '');
                            if (seg.kind === 'voice' || seg.kind === 'photo' || seg.kind === 'sticker') return String(seg.content || '');
                            if (seg.kind === 'location') return String(seg.name || '') + ' ' + String(seg.address || '');
                            if (seg.kind === 'video_call') return '[[VIDEO_CALL_USER]]';
                            if (seg.kind === 'call') return '[[CALL_USER]]';
                            if (seg.kind === 'dice') return '[[DICE]]';
                            return '';
                        }).join('|||');
                    }
                    return String(rawText || '');
                })();

                const familyParsed = parseAIFamilyCardFromContent(commandCarrierText || joinedReplyTextForQuickCheck || '');
                const familyCardAmountFromText = familyParsed.amount;
                commandCarrierText = familyParsed.text || '';

                const parsed = parseAITransferFromContent(commandCarrierText || '', roleId);
                const transferInfo = parsed.transfer;
                const acceptTransfer = parsed.acceptTransfer || !!(actions && actions.acceptTransfer);
                const openRedpacket = parsed.openRedpacket || !!(actions && actions.openRedpacket);
                const baseText = parsed.text || '';
                const effectiveOfflineMode = wasOfflineMeeting || !!(actions && actions.offlineMeetingStart);
                if (Array.isArray(replySegments) && replySegments.length) {
                    replySegments = sanitizeReplySegmentsForDisplay(replySegments, {
                        offlineMode: effectiveOfflineMode
                    });
                    replySegments = normalizeAutoTranslateReplySegments(replySegments, roleId);
                } else {
                    rawText = baseText;
                    replySegments = normalizeStructuredReplySegments(baseText, {
                        offlineMode: effectiveOfflineMode
                    });
                    replySegments = normalizeAutoTranslateReplySegments(replySegments, roleId);
                }
                let parts = [];
                if (Array.isArray(replySegments) && replySegments.length) {
                    parts = replySegments.slice(0, 10);
                } else {
                    parts = normalizeAutoTranslateReplySegments(normalizeStructuredReplySegments(baseText, {
                        offlineMode: effectiveOfflineMode
                    }), roleId).slice(0, 10);
                }

                let hasNormalReply = false;

                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    if (!part) continue;
                    if (part.kind !== 'text') {
                        hasNormalReply = true;
                        break;
                    }
                    const textPart = String(part.text || '').trim();
                    if (!textPart) continue;

                    const cleanedPart = textPart.replace(/\s*\[\[DICE\]\]\s*/g, ' ').trim();
                    const isSys = cleanedPart.startsWith('[') ||
                        (cleanedPart.startsWith('(') && cleanedPart.endsWith(')')) ||
                        cleanedPart.includes('系统：');

                    if (!isSys) {
                        hasNormalReply = true;
                        break;
                    }
                }

                const shouldMarkMessagesRead = hasNormalReply && !busyGuardMeta;
                if (shouldMarkMessagesRead) {
                    if (window.chatData[roleId]) {
                        window.chatData[roleId].forEach(m => {
                            if (m.role === 'me' && m.status === 'sent') {
                                m.status = 'read';
                            }
                        });
                    }

                    if (isChatRoleViewActive(roleId)) {
                        const labels = document.querySelectorAll('.msg-status-text');
                        labels.forEach(label => {
                            if (label.innerText === '已送达') {
                                label.innerText = '已读';
                            }
                        });
                    }
                }

                const baseDelay = parseInt(localStorage.getItem('chat_bubble_delay')) || 200;

                let hasVisibleReplyBeforeTool = false;
                let pendingCallKind = '';

                // 🔥【修改开始】循环处理 AI 回复的每一段
                for (let i = 0; i < parts.length; i++) {
                    if (!isCurrentRequest()) return;
                    const segment = parts[i];
                    if (!segment) continue;
                    let part = segment.kind === 'text' ? String(segment.text || '').trim() : '';
                    if (segment.kind === 'text' && !part) continue;

                    if (segment.kind === 'text') {
                        const inlineQuote = extractInlineQuoteText(part);
                        if (inlineQuote.quoteText) {
                            pendingInlineQuoteText = inlineQuote.quoteText;
                        }
                        part = inlineQuote.text;
                        if (!part) continue;
                    }

                    const now = Date.now();
                    let hasDice = false;

                    if (segment.kind === 'video_call') {
                        pendingCallKind = 'video_call';
                        continue;
                    }
                    if (segment.kind === 'call') {
                        if (pendingCallKind !== 'video_call') pendingCallKind = 'call';
                        continue;
                    }

                    if (segment.kind === 'dice') {
                        const point = Math.floor(Math.random() * 6) + 1;
                        const diceMsg = {
                            role: 'ai',
                            content: String(point),
                            type: 'dice',
                            timestamp: now
                        };
                        tryAttachQuote(diceMsg);
                        const rendered = pushRoleMessageToDataAndActiveView(roleId, diceMsg);
                            if (!rendered) collectBackgroundAiReplyNotification(backgroundReplyNoticeQueue, diceMsg);
                        hasVisibleReplyBeforeTool = true;
                        if (i < parts.length - 1) {
                            await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                            if (!isCurrentRequest()) return;
                        }
                        continue;
                    }

                    if (segment.kind === 'offline_action') {
                        const actionText = String(segment.content || '').trim();
                        if (actionText) {
                            const actionMsg = {
                                role: 'ai',
                                content: actionText,
                                type: 'offline_action',
                                timestamp: now
                            };
                            tryAttachQuote(actionMsg);
                            const rendered = pushRoleMessageToDataAndActiveView(roleId, actionMsg);
                            if (!rendered) collectBackgroundAiReplyNotification(backgroundReplyNoticeQueue, actionMsg);
                            hasVisibleReplyBeforeTool = true;
                        }
                        if (i < parts.length - 1) {
                            await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                            if (!isCurrentRequest()) return;
                        }
                        continue;
                    }

                    if (segment.kind === 'voice' || segment.kind === 'photo' || segment.kind === 'location' || segment.kind === 'sticker' || segment.kind === 'takeout_card' || segment.kind === 'gift_card' || segment.kind === 'html' || segment.kind === 'translated_text') {
                        let directMsgType = 'text';
                        let directContent = '';
                        if (segment.kind === 'voice') {
                            directMsgType = 'voice';
                            directContent = String(segment.content || '').trim();
                        } else if (segment.kind === 'translated_text') {
                            directMsgType = 'translated_text';
                            directContent = JSON.stringify({
                                foreign: String(segment.foreign || '').trim(),
                                translation: String(segment.translation || '').trim()
                            });
                        } else if (segment.kind === 'html') {
                            directMsgType = 'html';
                            directContent = String(segment.content || '').trim();
                        } else if (segment.kind === 'photo') {
                            directMsgType = 'ai_secret_photo';
                            directContent = String(segment.content || '').trim();
                        } else if (segment.kind === 'location') {
                            directMsgType = 'location';
                            directContent = JSON.stringify({
                                name: String(segment.name || '').trim(),
                                address: String(segment.address || '').trim()
                            });
                        } else if (segment.kind === 'sticker') {
                            directMsgType = 'sticker';
                            directContent = String(segment.content || '').trim();
                        } else if (segment.kind === 'takeout_card') {
                            directMsgType = 'takeout_card';
                            directContent = JSON.stringify({
                                shopName: String(segment.shopName || '').trim(),
                                foodName: String(segment.foodName || '').trim(),
                                items: Array.isArray(segment.items) ? segment.items : [],
                                price: String(segment.price || '').trim(),
                                remark: String(segment.remark || '').trim(),
                                paymentMode: String(segment.paymentMode || '').trim()
                            });
                        } else if (segment.kind === 'gift_card') {
                            directMsgType = 'gift_card';
                            directContent = JSON.stringify({
                                itemName: String(segment.itemName || '').trim(),
                                price: String(segment.price || '').trim(),
                                paymentMode: String(segment.paymentMode || '').trim(),
                                anonymous: segment.anonymous === true,
                                bubbleTitle: String(segment.bubbleTitle || '').trim()
                            });
                        }
                        if (directContent || directMsgType === 'location' || directMsgType === 'takeout_card' || directMsgType === 'gift_card') {
                            const directMsg = {
                                role: 'ai',
                                content: directContent,
                                type: directMsgType,
                                timestamp: now
                            };
                            if (directMsgType === 'voice') {
                                directMsg.duration = calcVoiceDurationSeconds(directContent);
                            } else if (directMsgType === 'sticker') {
                                const stickerMeta = typeof window.resolveStickerMetaByUrl === 'function'
                                    ? window.resolveStickerMetaByUrl(roleId, directContent, '')
                                    : { url: directContent, name: '' };
                                directMsg.content = String(stickerMeta && stickerMeta.url || directContent || '').trim();
                                directMsg.stickerUrl = directMsg.content;
                                directMsg.stickerName = String(stickerMeta && stickerMeta.name || '').trim();
                            }
                            tryAttachQuote(directMsg);
                            const rendered = pushRoleMessageToDataAndActiveView(roleId, directMsg);
                            if (!rendered) collectBackgroundAiReplyNotification(backgroundReplyNoticeQueue, directMsg);
                            hasVisibleReplyBeforeTool = true;
                        }
                        if (i < parts.length - 1) {
                            await new Promise(r => setTimeout(r, baseDelay * 2 + Math.random() * baseDelay));
                            if (!isCurrentRequest()) return;
                        }
                        continue;
                    }

                    // === 骰子处理（保持不变）===
                    if (part.indexOf('[[DICE]]') !== -1) {
                        const point = Math.floor(Math.random() * 6) + 1;
                        const diceMsg = {
                            role: 'ai',
                            content: String(point),
                            type: 'dice',
                            timestamp: now
                        };
                        tryAttachQuote(diceMsg);
                        const rendered = pushRoleMessageToDataAndActiveView(roleId, diceMsg);
                        if (!rendered) collectBackgroundAiReplyNotification(backgroundReplyNoticeQueue, diceMsg);
                        hasVisibleReplyBeforeTool = true;
                        hasDice = true;
                        part = part.replace(/\s*\[\[DICE\]\]\s*/g, ' ').trim();
                        if (!part) {
                            if (i < parts.length - 1) {
                                await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                                if (!isCurrentRequest()) return;
                            }
                            continue;
                        }
                    }

                    let msgType = 'text';
                    let msgContent = part;

                    {
                        const redpacketPattern = /\[REDPACKET:\s*([0-9]+(?:\.[0-9]+)?)\s*:\s*([^\]]*?)\]/i;
                        const redpacketMatch = part.match(redpacketPattern);
                        if (redpacketMatch) {
                            const amount = redpacketMatch[1].trim();
                            let note = redpacketMatch[2].trim();
                            if (!note) {
                                note = '恭喜发财，大吉大利';
                            }
                            const redMsg = {
                                role: 'ai',
                                type: 'redpacket',
                                amount: amount,
                                note: note,
                                timestamp: now,
                                status: 'unopened'
                            };
                            tryAttachQuote(redMsg);
                            const renderedRed = pushRoleMessageToDataAndActiveView(roleId, redMsg);
                            if (!renderedRed) collectBackgroundAiReplyNotification(backgroundReplyNoticeQueue, redMsg);
                            hasVisibleReplyBeforeTool = true;

                            const remainTextForRed = part.replace(redpacketPattern, '').trim();
                            if (remainTextForRed) {
                                const inlineQuote = extractInlineQuoteText(remainTextForRed);
                                const textMsg = {
                                    role: 'ai',
                                    content: inlineQuote.text,
                                    type: 'text',
                                    timestamp: now
                                };
                                if (busyGuardMeta) textMsg.busyGuard = busyGuardMeta;
                                if (inlineQuote.quoteText) pendingInlineQuoteText = inlineQuote.quoteText;
                                if (!String(textMsg.content || '').trim()) {
                                    if (i < parts.length - 1) {
                                        await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                                        if (!isCurrentRequest()) return;
                                    }
                                    continue;
                                }
                                tryAttachQuote(textMsg);
                                const renderedText = pushRoleMessageToDataAndActiveView(roleId, textMsg);
                                if (!renderedText) collectBackgroundAiReplyNotification(backgroundReplyNoticeQueue, textMsg);
                                hasVisibleReplyBeforeTool = true;
                            }

                            if (i < parts.length - 1) {
                                await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                                if (!isCurrentRequest()) return;
                            }
                            continue;
                        }

                        const stickerPattern = /\[\s*(?:STICKER|表情包|贴纸)\s*[:：]\s*([^\]]+?)\s*\]/i;
                        const stickerMatch = part.match(stickerPattern);

                        if (stickerMatch) {
                            let url = normalizeImageUrlCandidate(stickerMatch[1]);
                            if (url.startsWith('//')) {
                                url = 'https:' + url;
                            }
                            msgType = 'sticker';
                            msgContent = url;

                            const remainText = part.replace(stickerPattern, '').trim();
                            if (remainText) {
                                const inlineQuote = extractInlineQuoteText(remainText);
                                const textMsg = {
                                    role: 'ai',
                                    content: inlineQuote.text,
                                    type: 'text',
                                    timestamp: now
                                };
                                if (busyGuardMeta) textMsg.busyGuard = busyGuardMeta;
                                if (inlineQuote.quoteText) pendingInlineQuoteText = inlineQuote.quoteText;
                                if (!String(textMsg.content || '').trim()) {
                                    await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                                    if (!isCurrentRequest()) return;
                                } else {
                                tryAttachQuote(textMsg);
                                const rendered = pushRoleMessageToDataAndActiveView(roleId, textMsg);
                                if (!rendered) collectBackgroundAiReplyNotification(backgroundReplyNoticeQueue, textMsg);
                                hasVisibleReplyBeforeTool = true;
                                }

                                await new Promise(r => setTimeout(r, baseDelay + Math.random() * (baseDelay / 2)));
                                if (!isCurrentRequest()) return;
                            }
                        } else if (/^https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(part)) {
                            const knownSticker = resolveKnownStickerMetaForAI(roleId, part, '');
                            if (knownSticker && knownSticker.url) {
                                msgType = 'sticker';
                                msgContent = knownSticker.url;
                            } else {
                                msgType = 'image';
                                msgContent = part;
                            }
                        }
                    }

                    // === 语音时长计算（保持不变）===
                    let duration = 0;
                    if (msgType === 'voice') {
                        duration = calcVoiceDurationSeconds(msgContent);
                    }

                    // === 构建消息对象并发送（保持不变）===
                    const visibleTextContent = msgType === 'text'
                        ? stripPromptLeakageText(stripControlDirectivesFromText(extractInlineQuoteText(msgContent).text))
                        : msgContent;
                    const aiMsg = {
                        role: 'ai',
                        content: visibleTextContent,
                        type: msgType,
                        timestamp: now
                    };
                    if (busyGuardMeta) aiMsg.busyGuard = busyGuardMeta;
                    if (msgType === 'text' && isProtocolNoiseText(aiMsg.content)) {
                        continue;
                    }
                    if (msgType === 'voice') {
                        aiMsg.duration = duration;
                    } else if (msgType === 'sticker') {
                        const stickerMeta = typeof window.resolveStickerMetaByUrl === 'function'
                            ? window.resolveStickerMetaByUrl(roleId, visibleTextContent, '')
                            : { url: visibleTextContent, name: '' };
                        aiMsg.content = String(stickerMeta && stickerMeta.url || visibleTextContent || '').trim();
                        aiMsg.stickerUrl = aiMsg.content;
                        aiMsg.stickerName = String(stickerMeta && stickerMeta.name || '').trim();
                    }
                    tryAttachQuote(aiMsg);
                    const rendered = pushRoleMessageToDataAndActiveView(roleId, aiMsg);
                    if (!rendered) collectBackgroundAiReplyNotification(backgroundReplyNoticeQueue, aiMsg);
                    hasVisibleReplyBeforeTool = true;

                    // === 模拟打字延迟（调整为更自然的间隔）===
                    if (i < parts.length - 1) {
                        // 增加消息之间的延迟，使回复更像真人
                        const delayTime = baseDelay * 2 + Math.random() * baseDelay;
                        await new Promise(r => setTimeout(r, delayTime));
                        if (!isCurrentRequest()) return;
                    }
                }

                // 🔥【修改结束】

                if ((!listenTogetherDecisions || !listenTogetherDecisions.length) && Array.isArray(cleanHistory) && cleanHistory.length) {
                    const lastH = cleanHistory[cleanHistory.length - 1];
                    if (lastH && lastH.role === 'me' && lastH.type === 'listen_invite') {
                        let inviteId = String(lastH.inviteId || '').trim();
                        if (!inviteId) inviteId = findLatestPendingInviteId(roleId);
                        if (inviteId && !findInviteDecisionMessage(roleId, inviteId)) {
                            const declineRe = /(拒绝|不了|不行|下次|改天|没空|忙|不太方便)/;
                            const contextRe = /(一起听|一起听歌|听歌|听这首)/;
                            const shouldDecline = declineRe.test(baseText) && contextRe.test(baseText);
                            listenTogetherDecisions = [{ kind: shouldDecline ? 'DECLINE' : 'ACCEPT', inviteId: inviteId }];
                        }
                    }
                }

                if (Array.isArray(listenTogetherDecisions) && listenTogetherDecisions.length) {
                    for (let i = 0; i < listenTogetherDecisions.length; i++) {
                        const d = listenTogetherDecisions[i] || {};
                        const kind = String(d.kind || '').toUpperCase();
                        const inviteId = String(d.inviteId || '').trim();
                        if (!inviteId) continue;
                        if (kind === 'ACCEPT') {
                            if (!findInviteDecisionMessage(roleId, inviteId)) {
                                updateInviteStatusInData(roleId, inviteId, 'accepted');
                                if (isChatRoleViewActive(roleId)) {
                                    const row = document.querySelector('.msg-row[data-type="listen_invite"] .listen-invite-card[data-invite-id="' + String(inviteId) + '"]');
                                    const rowEl = row && row.closest ? row.closest('.msg-row') : null;
                                    if (rowEl) updateInviteCardRow(rowEl, 'accepted');
                                }
                                characterAcceptsInvite(inviteId, roleId);
                            }
                        } else if (kind === 'DECLINE') {
                            characterDeclinesInvite(inviteId, '', roleId);
                        }
                    }
                }

                const familyCardAmountFromActions = (function () {
                    if (!actions || !actions.postMessages || !Array.isArray(actions.postMessages)) return '';
                    for (let i = 0; i < actions.postMessages.length; i++) {
                        const p = actions.postMessages[i];
                        if (p && p.type === 'family_card' && p.amount) return String(p.amount);
                    }
                    return '';
                })();
                const familyCardAmount = familyCardAmountFromActions || familyCardAmountFromText;
                if (familyCardAmount && window.FamilyCard && typeof window.FamilyCard.receiveFromRole === 'function') {
                    window.FamilyCard.receiveFromRole(roleId, familyCardAmount);
                }

                const hasActionMoneyPostMessages = (function () {
                    if (!actions || !Array.isArray(actions.postMessages)) return false;
                    for (let i = 0; i < actions.postMessages.length; i++) {
                        const postMsg = actions.postMessages[i];
                        if (postMsg && (postMsg.type === 'transfer' || postMsg.type === 'redpacket')) return true;
                    }
                    return false;
                })();

                if (actions && Array.isArray(actions.postMessages)) {
                    for (let i = 0; i < actions.postMessages.length; i++) {
                        const postMsg = actions.postMessages[i];
                        if (!postMsg || (postMsg.type !== 'transfer' && postMsg.type !== 'redpacket')) continue;
                        const amountText = String(postMsg.amount || '').trim();
                        if (!amountText) continue;
                        const transferMsg = {
                            role: 'ai',
                            type: postMsg.type,
                            amount: amountText,
                            note: String(postMsg.note || '').trim(),
                            timestamp: Date.now(),
                            status: postMsg.type === 'redpacket' ? 'unopened' : 'sent'
                        };
                        const rendered = pushRoleMessageToDataAndActiveView(roleId, transferMsg);
                        if (!rendered) collectBackgroundAiReplyNotification(backgroundReplyNoticeQueue, transferMsg);
                    }
                }

                if (transferInfo && !hasActionMoneyPostMessages) {
                    const nowTransfer = Date.now();
                    let msgTypeForTransfer = transferInfo.kind === 'redpacket' ? 'redpacket' : 'transfer';

                    const transferMsg = {
                        role: 'ai',
                        type: msgTypeForTransfer,
                        amount: transferInfo.amount,
                        note: transferInfo.remark || '',
                        timestamp: nowTransfer,
                        status: msgTypeForTransfer === 'redpacket' ? 'unopened' : 'sent'
                    };
                    const rendered = pushRoleMessageToDataAndActiveView(roleId, transferMsg);
                    if (!rendered) collectBackgroundAiReplyNotification(backgroundReplyNoticeQueue, transferMsg);
                }

                if (pendingCallKind && hasVisibleReplyBeforeTool) {
                    clearBusyReplyQueueIfNeeded();
                    restoreHeaderTitle();
                    finishRequest();
                    showIncomingCallUI(roleId, pendingCallKind === 'video_call');
                    return;
                }

                if (acceptTransfer) {
                    markLastUserTransferAccepted(roleId);
                }

                if (openRedpacket) {
                    markLastUserRedpacketOpened(roleId);
                }

                saveData();

                if (shouldMarkMessagesRead && window.GiftPoolSystem && typeof window.GiftPoolSystem.recordChatTurn === 'function') {
                    try {
                        window.GiftPoolSystem.recordChatTurn(roleId, 1);
                    } catch (e) { }
                }

                if (typeof window.maybeAutoUpdateMemoryArchive === 'function') {
                    window.maybeAutoUpdateMemoryArchive(roleId);
                }

                if (backgroundReplyNoticeQueue.length && !isChatRoleViewActive(roleId)) {
                    showBackgroundAiReplyNotifications(roleId, backgroundReplyNoticeQueue);
                    if (typeof window.loadWechatChatList === 'function') {
                        try { window.loadWechatChatList(true); } catch (e) { }
                    }
                }

                clearBusyReplyQueueIfNeeded();
                if (typeof window.clearChatAiRequestInFlight === 'function') {
                    window.clearChatAiRequestInFlight(roleId, requestId);
                }
                restoreHeaderTitle();
                finishRequest();
            },
            (errorMessage) => {
                if (!isCurrentRequest()) return;
                if (String(window.__busyReplyQueueFlushRoleId || '') === String(roleId || '')) {
                    window.__busyReplyQueueFlushRoleId = '';
                }
                if (typeof window.clearChatAiRequestInFlight === 'function') {
                    window.clearChatAiRequestInFlight(roleId, requestId);
                }
                restoreHeaderTitle();
                finishRequest();

                alert("❌ API 调用失败\n\n" + errorMessage + "\n\n请检查：\n• API 地址是否正确\n• API 密钥是否有效\n• 网络连接是否正常");

                console.error("❌ API 调用失败:", errorMessage);
            },
            {
                softTimeoutNoAbort: true,
                onSlow: function () {
                    setTrackedChatResponseHeaderText(headerTitle, roleId, requestId, '对方正在输入（网络较慢）...');
                },
                shouldDeliver: function () {
                    return isCurrentRequest();
                }
            }
        );
    } else {
        if (typeof window.clearChatAiRequestInFlight === 'function') {
            window.clearChatAiRequestInFlight(roleId, requestId);
        }
        restoreHeaderTitle();
        finishRequest();
        alert("❌ API 模块未加载\n\n请刷新页面后重试");
    }
}

function markLastUserTransferAccepted(roleId) {
    const historyBox = isChatRoleViewActive(roleId) ? document.getElementById('chat-history') : null;
    const list = window.chatData[roleId] || [];
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (m && m.role === 'me' && m.type === 'transfer' && m.status !== 'accepted') {
            m.status = 'accepted';
            
            const ts = m.timestamp;
            if (historyBox && ts) {
                const selector = '.msg-row[data-role="me"][data-type="transfer"][data-timestamp="' + ts + '"] .transfer-bubble';
                const bubble = historyBox.querySelector(selector);
                if (bubble) {
                    bubble.classList.add('transfer-bubble-accepted');
                    playMoneyReceiveAnimation(bubble);
                    const footer = bubble.querySelector('.transfer-footer');
                    if (footer) {
                        footer.innerText = '对方已收钱';
                    }
                }
            }
            saveData();
            break;
        }
    }
}

function playMoneyReceiveAnimation(bubble) {
    if (!bubble || !bubble.classList) return;
    bubble.classList.remove('money-receive-anim');
    void bubble.offsetWidth;
    bubble.classList.add('money-receive-anim');
    setTimeout(function () {
        if (bubble && bubble.classList) bubble.classList.remove('money-receive-anim');
    }, 850);
}

function markLastUserRedpacketOpened(roleId) {
    const historyBox = isChatRoleViewActive(roleId) ? document.getElementById('chat-history') : null;
    const list = window.chatData[roleId] || [];
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (m && m.role === 'me' && m.type === 'redpacket' && m.status !== 'opened') {
            m.status = 'opened';
            
            const ts = m.timestamp;
            if (historyBox && ts) {
                const selector = '.msg-row[data-role="me"][data-type="redpacket"][data-timestamp="' + ts + '"] .redpacket-bubble';
                const bubble = historyBox.querySelector(selector);
                if (bubble) {
                    bubble.setAttribute('data-status', 'opened');
                    playMoneyReceiveAnimation(bubble);
                    const statusEl = bubble.querySelector('.redpacket-status-text');
                    if (statusEl) {
                        statusEl.innerText = '红包已领取';
                    }
                }
            }
            saveData();
            break;
        }
    }
}

async function sendAITransferSystemNotice(roleId, status) {
    if (!roleId) return;

    const profile = window.charProfiles[roleId] || {};

    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【语音消息规则】\n如果你想发语音，请在 reply 数组里使用 JSON 对象：{"type":"voice","content":"语音转文字内容"}。`;

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];
    const fullHistory = history.map(m => ensureMessageContent({ ...m }));
    const cleanHistory = fullHistory.filter(m => m && m.content);

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    let text = '';
    if (status === 'accepted') {
        text = '(系统提示：用户收下了你的转账)';
    } else if (status === 'returned') {
        text = '(系统提示：用户退回了你的转账)';
    } else {
        return;
    }

    systemPrompt = buildModernChatJsonPromptForEvent(roleId, buildMoneyEventPrompt('transfer', status));

    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, text, roleId, headerTitle, oldTitle);
}

async function sendAIRedpacketSystemNotice(roleId, status, amount) {
    if (!roleId) return;

    const profile = window.charProfiles[roleId] || {};

    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【语音消息规则】\n如果你想发语音，请在 reply 数组里使用 JSON 对象：{"type":"voice","content":"语音转文字内容"}。`;

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];
    const fullHistory = history.map(m => ensureMessageContent({ ...m }));
    const cleanHistory = fullHistory.filter(m => m && m.content);

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    let text = '';
    if (status === 'accepted') {
        const safeAmount = amount ? String(amount) : '';
        text = safeAmount
            ? `(系统提示：用户领取了你的红包，金额 ${safeAmount} 元)`
            : '(系统提示：用户领取了你的红包)';
    } else if (status === 'declined') {
        text = '(系统提示：用户没有领取红包，将红包退回)';
    } else {
        return;
    }

    systemPrompt = buildModernChatJsonPromptForEvent(roleId, buildMoneyEventPrompt('redpacket', status, amount));

    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, text, roleId, headerTitle, oldTitle);
}

async function handleImageForAI(base64, roleId) {
    if (!roleId) return;

    const profile = window.charProfiles[roleId] || {};

    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【语音消息规则】\n如果你想发语音，请在 reply 数组里使用 JSON 对象：{"type":"voice","content":"语音转文字内容"}。`;

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];
    const cleanHistory = history.filter(msg => msg && msg.content);

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    let caption = "";
    const input = document.getElementById('msg-input');
    if (input && input.value) {
        caption = input.value.trim();
    }

    const userPayload = {
        type: 'image',
        base64: base64,
        text: caption
    };

    systemPrompt = buildModernChatJsonPromptForEvent(roleId, buildImageEventPrompt(1));

    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, userPayload, roleId, headerTitle, oldTitle);
}

async function handleImagesForAI(images, roleId, captionOverride) {
    if (!roleId) return;
    const list = Array.isArray(images) ? images.filter(u => typeof u === 'string' && u) : [];
    if (!list.length) return;

    const profile = window.charProfiles[roleId] || {};

    let systemPrompt = profile.desc || "你是一个友好的AI助手";

    if (profile.schedule && profile.schedule.trim()) {
        systemPrompt += `\n\n【${profile.nickName || 'TA'} 的作息安排】\n${profile.schedule.trim()}`;
    }

    if (profile.style && profile.style.trim()) {
        systemPrompt += `\n\n【聊天风格】\n${profile.style.trim()}`;
    }

    const userPersona = window.userPersonas[roleId] || {};
    if (userPersona.name || userPersona.gender || userPersona.birthday || userPersona.setting) {
        systemPrompt += `\n\n【关于对话的另一方（用户）】\n`;
        if (userPersona.name) {
            systemPrompt += `用户名字：${userPersona.name}\n`;
        }
        if (userPersona.gender) {
            systemPrompt += `用户性别：${userPersona.gender}\n`;
        }
        if (userPersona.birthday) {
            const typeLabel = userPersona.birthdayType === 'lunar' ? '（农历）' : '（阳历）';
            systemPrompt += `用户生日：${userPersona.birthday}${typeLabel}\n`;
        }
        if (userPersona.setting) {
            systemPrompt += `用户背景：${userPersona.setting}\n`;
        }
    }

    {
        const wbPrompt = buildWorldBookPrompt(profile.worldbookId);
        if (wbPrompt) systemPrompt += wbPrompt;
    }

    systemPrompt += `\n\n【语音消息规则】\n如果你想发语音，请在 reply 数组里使用 JSON 对象：{"type":"voice","content":"语音转文字内容"}。`;

    const stickerPromptText = buildAIStickerPromptText();
    if (stickerPromptText) {
        systemPrompt += '\n\n' + stickerPromptText;
    }

    await initData();

    const history = window.chatData[roleId] || [];
    const cleanHistory = history.filter(msg => msg && msg.content);

    const headerTitle = document.getElementById('current-chat-name');
    const oldTitle = headerTitle ? headerTitle.innerText : "聊天中";
    if (headerTitle) headerTitle.innerText = "对方正在输入...";

    let caption = typeof captionOverride === 'string' ? captionOverride : "";
    if (!caption) {
        const input = document.getElementById('msg-input');
        if (input && input.value) {
            caption = String(input.value).trim();
        }
    }

    const userPayload = {
        type: 'images',
        images: list,
        text: caption
    };

    systemPrompt = buildModernChatJsonPromptForEvent(roleId, buildImageEventPrompt(list.length));

    const historyForApi = buildApiMemoryHistory(roleId, cleanHistory);
    invokeAIWithCommonHandlers(systemPrompt, historyForApi, userPayload, roleId, headerTitle, oldTitle);
}

function compressImageFileToDataUrl(file, maxSize) {
    return new Promise(function (resolve) {
        if (!file) return resolve('');
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxWidth = maxSize || 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                let out = '';
                try {
                    out = canvas.toDataURL('image/jpeg', 0.6);
                } catch (e2) {
                    out = '';
                }
                resolve(out);
            };
            img.onerror = function () { resolve(''); };
            img.src = e.target && e.target.result ? e.target.result : '';
        };
        reader.onerror = function () { resolve(''); };
        try {
            reader.readAsDataURL(file);
        } catch (e) {
            resolve('');
        }
    });
}

// =========================================================
// 🔄 替换结束
// =========================================================

// =========================================================
// 渲染消息到屏幕 (修复版：精确识别系统提示 + 表情包)
// =========================================================
function appendMessageToDOM(msg) {
    const historyBox = document.getElementById('chat-history');
    if (!historyBox) return;
    function appendSystemRow(sysMsg, reasonTag) {
        try {
            window.__lastAiRenderDecision = {
                at: Date.now(),
                reason: reasonTag,
                msgType: String(sysMsg && sysMsg.type || ''),
                role: String(sysMsg && sysMsg.role || ''),
                preview: String(sysMsg && sysMsg.content || '').slice(0, 200)
            };
        } catch (e) { }
        const text = sysMsg && sysMsg.content !== undefined ? sysMsg.content : "";
        const sysRow = typeof window.buildSystemMessageRowElement === 'function'
            ? window.buildSystemMessageRowElement(sysMsg, msgId)
            : (function () {
                const row = document.createElement('div');
                row.className = 'sys-msg-row';
                if (msgId) {
                    row.setAttribute('data-msg-id', msgId);
                }
                if (sysMsg && sysMsg.role) {
                    row.setAttribute('data-role', String(sysMsg.role));
                }
                if (sysMsg && sysMsg.type) {
                    row.setAttribute('data-type', String(sysMsg.type));
                }
                if (sysMsg && sysMsg.timestamp) {
                    row.setAttribute('data-timestamp', String(sysMsg.timestamp));
                }
                row.innerHTML = `<span class="sys-msg-text">${text}</span>`;
                return row;
            })();
        historyBox.appendChild(sysRow);
        historyBox.scrollTop = historyBox.scrollHeight;
    }

    if (msg && msg.hidden) {
        try {
            window.__lastAiRenderDecision = {
                at: Date.now(),
                reason: 'hidden',
                msgType: String(msg.type || ''),
                role: String(msg.role || '')
            };
        } catch (e) { }
        return;
    }

    if (msg && msg.type === 'call_memory') {
        try {
            window.__lastAiRenderDecision = {
                at: Date.now(),
                reason: 'call_memory',
                msgType: String(msg.type || ''),
                role: String(msg.role || '')
            };
        } catch (e) { }
        return;
    }

    const msgId = ensureChatMessageId(msg);

    if (
        msg &&
        (msg.type === 'system' || msg.type === 'system_event' || msg.role === 'system') &&
        typeof msg.content === 'string' &&
        msg.content.indexOf('[系统]') === 0 &&
        (msg.content.indexOf('一起听') !== -1 || msg.content.indexOf('歌曲切换为') !== -1)
    ) {
        try {
            window.__lastAiRenderDecision = {
                at: Date.now(),
                reason: 'skip_music_system',
                msgType: String(msg.type || ''),
                role: String(msg.role || ''),
                preview: String(msg.content || '').slice(0, 200)
            };
        } catch (e) { }
        return;
    }

    if (msg && msg.type === 'system_event') {
        appendSystemRow(msg, 'system_event');
        return;
    }
    if (msg && msg.type === 'offline_action') {
        try {
            window.__lastAiRenderDecision = {
                at: Date.now(),
                reason: 'offline_action',
                msgType: String(msg.type || ''),
                role: String(msg.role || ''),
                preview: String(msg.content || '').slice(0, 200)
            };
        } catch (e) { }
        const text = msg && msg.content !== undefined ? msg.content : "";
        const actionRow = document.createElement('div');
        actionRow.className = 'sys-msg-row offline-action-row';
        if (msgId) {
            actionRow.setAttribute('data-msg-id', msgId);
        }
        if (msg.role) {
            actionRow.setAttribute('data-role', String(msg.role));
        }
        actionRow.setAttribute('data-type', 'offline_action');
        if (msg.timestamp) {
            actionRow.setAttribute('data-timestamp', String(msg.timestamp));
        }
        actionRow.innerHTML = `<span class="sys-msg-text">（${text}）</span>`;
        historyBox.appendChild(actionRow);
        historyBox.scrollTop = historyBox.scrollHeight;
        return;
    }
    if (msg && msg.type === 'system') {
        appendSystemRow(msg, 'system');
        return;
    }

    const content = msg && msg.content !== undefined ? msg.content : "";
    let displayContent = content;
    let shouldTriggerLocationShare = false;
    let locationTriggerBlockedBySettings = false;
    if (msg && msg.role === 'me' && (msg.type === undefined || msg.type === 'text' || msg.type === 'location_share')) {
        displayContent = stripLocationSharePrefix(content);
    }

    if (msg && msg.role === 'ai' && typeof content === 'string') {
        if (content.indexOf(':::ACTION_TRIGGER_LOCATION:::') !== -1) {
            const settings = typeof window.getCurrentChatSettings === 'function'
                ? window.getCurrentChatSettings(window.currentChatRole || '')
                : {};
            const allowOfflineInvite = !settings || settings.allowOfflineInvite !== false;
            shouldTriggerLocationShare = allowOfflineInvite;
            locationTriggerBlockedBySettings = !allowOfflineInvite;
            const stripped = content.replace(/:::ACTION_TRIGGER_LOCATION:::/g, '').trim();
            if (stripped) {
                msg.content = stripped;
                displayContent = stripped;
            } else {
                msg.type = 'system_event';
                msg.content = '我发起了位置共享';
                msg.systemEventKind = 'location_share_invite';
                msg.includeInAI = false;
                displayContent = msg.content;
            }
        }
    }

    if (msg && (msg.type === 'system_event' || msg.type === 'system')) {
        appendSystemRow(msg, String(msg.type || 'system'));
        if (shouldTriggerLocationShare) {
            try {
                const rid = window.currentChatRole;
                if (rid) {
                    showIncomingLocationShareUI(rid);
                }
            } catch (e) { }
        }
        if (locationTriggerBlockedBySettings) {
            try {
                saveData();
            } catch (e) { }
        }
        return;
    }

    // === 🔥 核心改进：精确识别系统消息 ===
    const isSysMsg = detectSystemMessage(msg, content);

    if (isSysMsg && msg.role === 'ai') {
        appendSystemRow({
            role: msg.role,
            type: msg.type || 'text',
            content: content,
            timestamp: msg.timestamp,
            systemEventKind: msg.systemEventKind || ''
        }, 'detectSystemMessage');
        return;
    }

    // --- 1. 时间显示逻辑 ---
    const msgTime = msg.timestamp || 0;
    if (msgTime > 0) {
        const roleForDivider = String(window.currentChatRole || '');
        const hiddenDivider = typeof window.isChatTimeDividerHidden === 'function'
            ? window.isChatTimeDividerHidden(roleForDivider, msgTime)
            : false;
        if ((window.lastRenderedTime === 0 || (msgTime - window.lastRenderedTime > 300000)) && !hiddenDivider) {
            const timeLabel = typeof createChatTimeDividerElement === 'function'
                ? createChatTimeDividerElement(msgTime)
                : document.createElement('div');
            if (!timeLabel.className) timeLabel.className = 'chat-time-label';
            if (!timeLabel.textContent) timeLabel.innerText = formatChatDividerTime(msgTime);
            historyBox.appendChild(timeLabel);
            window.lastRenderedTime = msgTime;
        } else {
            window.lastRenderedTime = msgTime;
        }
    }

    // --- 2. 准备基础数据 ---
    const groupApi = window.GroupChat;
    const isGroupChat = !!(
        groupApi &&
        typeof groupApi.isGroupChatRole === 'function' &&
        groupApi.isGroupChatRole(window.currentChatRole || '')
    );

    if (isGroupChat && typeof createMessageRow === 'function') {
        const groupRow = createMessageRow(msg);
        if (groupRow) {
            if (typeof fillReplacementTextBubble === 'function') {
                fillReplacementTextBubble(groupRow);
            }
            historyBox.appendChild(groupRow);
            if (typeof bindMessageLongPressEdit === 'function') {
                try {
                    bindMessageLongPressEdit(groupRow, msg);
                } catch (e) { }
            }
            historyBox.scrollTop = historyBox.scrollHeight;
            return;
        }
    }

    const roleId = window.currentChatRole;
    const isMe = (msg.role === 'me');
    let avatarUrl = "";

    resolveQuoteBlockForMessage(roleId, msg);

    if (isMe) {
        const myPersona = window.userPersonas[roleId] || {};
        avatarUrl = myPersona.avatar || "assets/chushitouxiang.jpg";
    } else {
        const profile = window.charProfiles[roleId] || {};
        avatarUrl = profile.avatar || "assets/chushitouxiang.jpg";
    }

    let smallTimeStr = msgTime > 0 ? formatChatTime(msgTime) : "";

    // --- 3. 🔥 构建气泡内容 (支持引用块) ---
    let bubbleHtml = "";

    if (msg.type === 'listen_invite') {
        const inviteId = String(msg.inviteId || '');
        const p = getCurrentUserProfile();
        const userName = msg.userName ? String(msg.userName) : String(p.name || '我');
        const userAvatar = msg.userAvatar ? String(msg.userAvatar) : String(p.avatar || 'assets/chushitouxiang.jpg');
        const status = String(msg.inviteStatus || 'pending');
        const isPending = status === 'pending';
        const isCancelled = status === 'cancelled';
        const isDeclined = status === 'declined';
        const isAccepted = status === 'accepted';
        const stateText = isCancelled ? '已取消' : (isDeclined ? '已拒绝' : (isAccepted ? '已接受' : '等待对方回应...'));
        bubbleHtml = `
            <div class="msg-bubble listen-invite-bubble custom-bubble-content">
                <div class="listen-invite-card invite-card-sent${(isCancelled || isDeclined) ? ' is-disabled' : ''}${isCancelled ? ' is-cancelled' : ''}${isAccepted ? ' is-accepted' : ''}" data-invite-id="${inviteId}">
                    <div class="listen-invite-body">
                        <div class="listen-invite-avatars">
                            <div class="listen-invite-avatar">
                                <img src="${userAvatar}" alt="" />
                            </div>
                            <div class="listen-invite-line" aria-hidden="true">
                                <svg viewBox="0 0 160 40" preserveAspectRatio="none">
                                    <polyline
                                        points="0,20 46,20 58,12 72,30 86,14 100,20 160,20"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                                <i class="bx bxs-heart" aria-hidden="true"></i>
                            </div>
                            <div class="listen-invite-avatar"></div>
                        </div>
                        <div class="listen-invite-title">${userName}</div>
                        <div class="listen-invite-subtext">邀请你一起听</div>
                        <div class="listen-invite-state">${stateText}</div>
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'listen_invite_accepted') {
        const p = getCurrentUserProfile();
        const userAvatar = msg.userAvatar ? String(msg.userAvatar) : String(p.avatar || 'assets/chushitouxiang.jpg');
        const characterName = msg.characterName ? String(msg.characterName) : '对方';
        const characterAvatar = msg.characterAvatar ? String(msg.characterAvatar) : avatarUrl;
        bubbleHtml = `
            <div class="msg-bubble listen-invite-bubble custom-bubble-content">
                <div class="listen-invite-card invite-card-accepted">
                    <div class="listen-invite-body">
                        <div class="listen-invite-avatars">
                            <div class="listen-invite-avatar">
                                <img src="${userAvatar}" alt="" />
                            </div>
                            <div class="listen-invite-line" aria-hidden="true">
                                <svg viewBox="0 0 160 40" preserveAspectRatio="none">
                                    <polyline
                                        points="0,20 46,20 58,12 72,30 86,14 100,20 160,20"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                                <i class="bx bxs-heart" aria-hidden="true"></i>
                            </div>
                            <div class="listen-invite-avatar">
                                <img src="${characterAvatar}" alt="" />
                            </div>
                        </div>
                        <div class="listen-invite-subtext">${characterName} 已加入一起听</div>
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'listen_invite_declined') {
        const characterName = msg.characterName ? String(msg.characterName) : '对方';
        const extra = msg.extraText ? String(msg.extraText) : '';
        const extraHtml = extra ? `<div class="listen-invite-state">${extra}</div>` : '';
        bubbleHtml = `
            <div class="msg-bubble listen-invite-bubble custom-bubble-content">
                <div class="listen-invite-card invite-card-accepted is-disabled">
                    <div class="listen-invite-body">
                        <div class="listen-invite-subtext">${characterName} 拒绝了一起听</div>
                        ${extraHtml}
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'couple_invite') {
        bubbleHtml = `
            <div class="msg-bubble couple-invite-bubble custom-bubble-content">
                <div class="couple-invite-card">
                    <div class="couple-invite-header">
                        <div class="couple-invite-icon"><i class='bx bxs-heart'></i></div>
                        <div class="couple-invite-title">情侣空间邀请</div>
                    </div>
                    <div class="couple-invite-text">想和你建立专属情侣关系</div>
                </div>
            </div>
        `;
    } else if (msg.type === 'couple_unlink') {
        bubbleHtml = `
            <div class="msg-bubble couple-invite-bubble custom-bubble-content">
                <div class="couple-invite-card unlink">
                    <div class="couple-invite-header">
                        <div class="couple-invite-icon"><i class='bx bx-heart-circle'></i></div>
                        <div class="couple-invite-title">解除关系通知</div>
                    </div>
                    <div class="couple-invite-text">已解除情侣空间绑定</div>
                </div>
            </div>
        `;
    } else if (msg.type === 'history') {
        // 聊天记录类型
        const lines = msg.preview || ["聊天记录详情..."];
        let linesHTML = lines.map(line => `<div class="history-row">${line}</div>`).join('');
        bubbleHtml = `
            <div class="history-bubble-container" onclick="alert('查看详情功能暂未开发')">
                <div class="history-title">聊天记录</div>
                <div class="history-divider"></div>
                <div class="history-content">${linesHTML}</div>
            </div>`;
    } else if (msg.type === 'image' || msg.type === 'sticker') {
        const rawImgSrc = msg.type === 'sticker'
            ? String(msg.stickerUrl || content || '').trim()
            : String(content || '').trim();
        const imgSrc = typeof normalizeImageUrlCandidate === 'function'
            ? normalizeImageUrlCandidate(rawImgSrc)
            : rawImgSrc;
        const extraClass = msg.type === 'sticker' ? ' custom-sticker' : '';
        bubbleHtml = `
            <div class="msg-bubble msg-bubble-image custom-bubble-content custom-image-message${extraClass}">
                <img src="${imgSrc}">
            </div>
        `;
    } else if (msg.type === 'transfer') {
        const amount = msg.amount || "";
        const note = msg.note || "";
        const noteHtml = note ? `<div class="transfer-note">${note}</div>` : '';
        const status = msg.status || 'sent';
        let extraClass = '';
        if (status === 'accepted' || status === 'returned') {
            extraClass = ' transfer-bubble-accepted';
        }
        let footerText = '待领取';
        if (msg.role === 'me') {
            if (status === 'accepted') {
                footerText = '对方已收钱 ✓';
            }
        } else {
            if (status === 'accepted') {
                footerText = '已收钱';
            } else if (status === 'returned') {
                footerText = '已退回';
            }
        }
        bubbleHtml = `
            <div class="msg-bubble transfer-bubble custom-bubble-content custom-transfer-card${extraClass}">
                <div class="chat-transfer-card-surface">
                    <div class="transfer-main">
                        <div class="transfer-icon-circle">
                            <i class="bx bx-transfer"></i>
                        </div>
                        <div class="transfer-info">
                            <div class="transfer-amount">¥${amount}</div>
                            ${noteHtml}
                        </div>
                    </div>
                    <div class="transfer-split"></div>
                    <div class="transfer-footer">${footerText}</div>
                </div>
            </div>
        `;
    } else if (msg.type === 'redpacket') {
        const amount = msg.amount || "";
        let note = msg.note || '';
        if (!note) {
            note = '恭喜发财，大吉大利';
        }
        const status = msg.status || 'unopened';
        const isOpened = status === 'opened';
        const amountHtml = isOpened && amount ? `<div class="redpacket-amount">¥${amount}</div>` : '';
        const statusText = isOpened ? '红包已领取' : '领取红包';
        bubbleHtml = `
            <div class="msg-bubble redpacket-bubble custom-bubble-content" data-status="${status}">
                <div class="chat-redpacket-card-surface">
                    <div class="redpacket-main">
                        <div class="redpacket-icon"></div>
                        <div class="redpacket-info">
                            <div class="redpacket-note">${note}</div>
                            <div class="redpacket-status-text">${statusText}</div>
                        </div>
                        ${amountHtml}
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'family_card') {
        const amount = msg.amount || "";
        const status = msg.status === 'accepted' ? 'accepted' : (msg.role === 'ai' ? 'pending' : (msg.status || 'sent'));
        const subtitle = status === 'accepted'
            ? '已领取'
            : (msg.role === 'ai' ? `额度 ¥${amount}，立即领取` : `额度 ¥${amount}`);
        bubbleHtml = `
            <div class="msg-bubble family-card-bubble custom-bubble-content" data-status="${status}">
                <div class="family-card-main">
                    <div class="family-card-icon"></div>
                    <div class="family-card-text">
                        <div class="family-card-title">送你一张亲属卡</div>
                        <div class="family-card-subtitle">${subtitle}</div>
                    </div>
                </div>
                <div class="family-card-divider"></div>
                <div class="family-card-footer">亲属卡</div>
            </div>
        `;
    } else if (msg.type === 'call_end') {
        const safeText = content.replace(/\n/g, ' ');
        bubbleHtml = `
            <div class="msg-bubble call-end-bubble custom-bubble-content">
                <div class="call-end-main">
                    <i class="bx bx-phone-call call-end-icon"></i>
                    <span class="call-end-text">${safeText}</span>
                </div>
            </div>
        `;
    } else if (msg.type === 'voice') {
        const safeVoiceText = content.replace(/\n/g, '<br>');
        const durationSec = msg.duration || calcVoiceDurationSeconds(content);
        bubbleHtml = `
            <div class="msg-bubble voice-bubble custom-bubble-content">
                <div class="voice-main">
                    <div class="voice-icon">
                        <span class="voice-wave wave1"></span>
                        <span class="voice-wave wave2"></span>
                        <span class="voice-wave wave3"></span>
                    </div>
                    <div class="voice-duration">${durationSec}"</div>
                </div>
                <div class="voice-text" style="display:none;">${safeVoiceText}</div>
            </div>
        `;
    } else if (msg.type === 'dice') {
        const point = content || "";
        let animClass = "";
        if (msgTime && (Date.now() - msgTime < 2000)) {
            animClass = ' dice-anim';
        }
        bubbleHtml = `
            <div class="msg-bubble custom-bubble-content">
                <i class="bx bx-dice-${point} dice-icon${animClass}"></i>
            </div>
        `;
    } else if (msg.type === 'takeout_card') {
        bubbleHtml = renderTakeoutCardBubble(parseCommerceCardPayload(content), msg.status);
    } else if (msg.type === 'gift_card') {
        bubbleHtml = renderGiftCardBubble(parseCommerceCardPayload(content), msg.status);
    } else if (msg.type === 'location') {
        let name = '';
        let address = '';
        try {
            const obj = JSON.parse(content || '{}');
            if (obj && typeof obj === 'object') {
                name = String(obj.name || '').trim();
                address = String(obj.address || '').trim();
            }
        } catch (e) { }
        const nameHtml = name ? `<div class="location-name">${name}</div>` : `<div class="location-name">位置</div>`;
        const addressHtml = address ? `<div class="location-address">${address}</div>` : '';
        bubbleHtml = `
            <div class="msg-bubble location-bubble custom-bubble-content custom-location-card">
                <div class="location-card">
                    <div class="location-map-area">
                        <i class='bx bxs-map location-pin-icon'></i>
                    </div>
                    <div class="location-info">
                        ${nameHtml}
                        ${addressHtml}
                    </div>
                </div>
            </div>
        `;
    } else if (msg.type === 'ai_secret_photo') {
        const fallbackVirtualPhotoPath = 'assets/chatphoto.jpg';
        const photoSource = String(window.virtualPhotoImagePath || fallbackVirtualPhotoPath).trim() || fallbackVirtualPhotoPath;
        const photoAlt = escapeHtmlText(content || '照片');
        bubbleHtml = `
            <div class="msg-bubble msg-bubble-image ai-photo-bubble custom-bubble-content custom-image-message">
                <img src="${escapeHtmlText(photoSource)}" alt="${photoAlt}">
                <div class="ai-photo-fallback" aria-hidden="true">
                    <i class="bx bx-image-alt"></i>
                    <span>照片</span>
                </div>
            </div>
        `;
    } else {
            const stickerMatch = String(content || '').match(/\[\s*(?:STICKER|表情包|贴纸)\s*[:：]\s*([^\]]+?)\s*\]/i);
            if (stickerMatch) {
                let url = normalizeImageUrlCandidate(stickerMatch[1]);
                if (url.startsWith('//')) {
                    url = 'https:' + url;
                }
            bubbleHtml = `
                <div class="msg-bubble msg-bubble-image custom-bubble-content custom-sticker">
                    <img src="${url}">
                </div>
            `;
        } else {
            const msgType = String(msg.type || 'text').trim();
            const isHtmlBubble = msg.role === 'ai' && msgType === 'html';
            const inlineStructuredCandidate = msgType === 'text'
                ? normalizeStructuredTranslatedCandidate(displayContent)
                : null;
            const isStructuredTranslatedBubble = msgType === 'translated_text' || (inlineStructuredCandidate && inlineStructuredCandidate.mode === 'translated_text');
            const translatedPayload = msgType === 'translated_text'
                ? parseTranslatedTextPayload(content)
                : (inlineStructuredCandidate && inlineStructuredCandidate.mode === 'translated_text'
                    ? parseTranslatedTextPayload({
                        foreign: inlineStructuredCandidate.foreign,
                        translation: inlineStructuredCandidate.translation
                    })
                    : (!isHtmlBubble && shouldRenderTranslatedBubble(roleId, msg) ? parseTranslatedBubbleText(displayContent) : null));
            let quoteBlockHtml = "";
            if (msg.quote && msg.quote.text) {
                let shortQuote = msg.quote.text;
                shortQuote = String(shortQuote || '').replace(/\s+/g, ' ').trim();
                if (shortQuote.length > 80) {
                    shortQuote = shortQuote.substring(0, 80) + '...';
                }
                const quoteTargetId = msg.quoteId != null ? String(msg.quoteId).trim() : '';
                const quoteIdAttr = quoteTargetId ? ` data-quote-id="${quoteTargetId}"` : '';
                quoteBlockHtml = `
                <div class="quote-block"${quoteIdAttr}>
                    <span class="quote-name">${msg.quote.name || 'TA'}:</span>
                    <span class="quote-preview">${shortQuote}</span>
                </div>
            `;
            }

            if (msg.role === 'ai' && translatedPayload && translatedPayload.hasTranslation) {
                bubbleHtml = `
                <div class="msg-bubble custom-bubble-content translated-message-shell${msg.role === 'me' ? ' translated-message-shell-me' : ' translated-message-shell-ai'}${msg.translationCollapsed ? ' is-collapsed' : ''}">
                    ${quoteBlockHtml}
                    ${buildTranslatedBubbleInnerHtml(translatedPayload, {
                        baseClass: 'translated-message-bubble',
                        foreignClass: 'translated-message-foreign',
                        dividerClass: 'translated-message-divider',
                        translationClass: 'translated-message-translation'
                    })}
                </div>
            `;
            } else {
                const bubbleText = translatedPayload
                    ? translatedPayload.bodyText
                    : (inlineStructuredCandidate && inlineStructuredCandidate.mode === 'text'
                        ? inlineStructuredCandidate.text
                        : displayContent);
                const safeBubbleText = isHtmlBubble
                    ? sanitizeChatBubbleHtml(bubbleText)
                    : escapeHtmlText(bubbleText || '');
                const dataText = escapeHtmlText(bubbleText || '');
                if (isHtmlBubble) {
                    bubbleHtml = `
                    <div class="msg-bubble custom-bubble-content">
                        ${quoteBlockHtml}
                        <div class="msg-text custom-bubble-text chat-html-bubble">${safeBubbleText}</div>
                    </div>
                `;
                } else if (msg.role === 'ai' && msgType === 'text') {
                    bubbleHtml = `
                    <div class="msg-bubble custom-bubble-content">
                        ${quoteBlockHtml}
                        <div class="msg-text custom-bubble-text" data-text="${dataText}" data-render-mode="text"></div>
                    </div>
                `;
                } else {
                    bubbleHtml = `
                    <div class="msg-bubble custom-bubble-content">
                        ${quoteBlockHtml}
                        <div class="msg-text custom-bubble-text">${safeBubbleText}</div>
                    </div>
                `;
                }
            }
        }
    }

    // --- 4. 构建状态文字 ---
    let statusHtml = "";
    if (isMe) {
        if (msg.type !== 'call_end' && msg.type !== 'couple_invite' && msg.type !== 'couple_unlink') {
            let statusText = "已送达";
            if (msg.status === 'read') statusText = "已读";
            statusHtml = `<div class="msg-status-text">${statusText}</div>`;
        }
    }

    // --- 5. 组合最终 HTML ---
    const row = document.createElement('div');
    const isPlainTextMessage = !msg.type || String(msg.type || '') === 'text' || String(msg.type || '') === 'translated_text' || String(msg.type || '') === 'location_share';
    row.className = isMe
        ? 'msg-row msg-right custom-bubble-container is-me' + (isPlainTextMessage ? ' msg-plain-bubble' : '')
        : 'msg-row msg-left custom-bubble-container is-other' + (isPlainTextMessage ? ' msg-plain-bubble' : '');
    if (msg.role) {
        row.setAttribute('data-role', msg.role);
    }
    if (msg.type) {
        row.setAttribute('data-type', msg.type);
    }
    if (msg.timestamp) {
        row.setAttribute('data-timestamp', String(msg.timestamp));
    }
    if (msgId) {
        row.setAttribute('data-msg-id', msgId);
    }

    const avatarHtml = `
        <div class="msg-avatar-wrap">
            <div class="msg-avatar">
                <img src="${avatarUrl}" alt="">
            </div>
            <div class="msg-avatar-time">${smallTimeStr}</div>
        </div>
    `;

    row.innerHTML = `
        ${avatarHtml}
        <div class="msg-content-wrapper">
            ${bubbleHtml}
            ${statusHtml}
        </div>
    `;

    const bubbleEl = row.querySelector('.msg-bubble');
    if (bubbleEl && smallTimeStr && msg.type !== 'couple_invite' && msg.type !== 'couple_unlink') {
        const t = document.createElement('div');
        t.className = 'msg-bubble-time';
        t.textContent = smallTimeStr;
        bubbleEl.appendChild(t);
    }

    const quoteBlockEl = row.querySelector('.quote-block');
    if (quoteBlockEl && msg.quoteId) {
        quoteBlockEl.addEventListener('click', function (e) {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            if (typeof window.scrollToChatMessageById === 'function') {
                window.scrollToChatMessageById(String(msg.quoteId));
            }
        });
    }

    const translatedBubbleShell = row.querySelector('.translated-message-shell');
    if (translatedBubbleShell) {
        translatedBubbleShell.addEventListener('click', function (e) {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            const nextCollapsed = !translatedBubbleShell.classList.contains('is-collapsed');
            translatedBubbleShell.classList.toggle('is-collapsed', nextCollapsed);
            msg.translationCollapsed = nextCollapsed;
        });
    }

    if (msg.type === 'voice') {
        const voiceBubble = row.querySelector('.voice-bubble');
        if (voiceBubble) {
            const textEl = voiceBubble.querySelector('.voice-text');
            voiceBubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                if (!textEl) return;
                const visible = textEl.style.display === 'block';
                textEl.style.display = visible ? 'none' : 'block';
                if (visible) {
                    voiceBubble.classList.remove('voice-bubble-open');
                } else {
                    voiceBubble.classList.add('voice-bubble-open');
                }
            });
        }
    }

    if (msg.type === 'ai_secret_photo') {
        const bubble = row.querySelector('.ai-photo-bubble');
        if (bubble) {
            const imageEl = bubble.querySelector('img');
            const showPhotoFallback = function () {
                bubble.classList.add('is-photo-fallback');
                if (imageEl) {
                    imageEl.style.display = 'none';
                }
            };
            const hidePhotoFallback = function () {
                bubble.classList.remove('is-photo-fallback');
                if (imageEl) {
                    imageEl.style.display = '';
                }
            };
            if (imageEl && !imageEl.__aiPhotoFallbackBound) {
                imageEl.__aiPhotoFallbackBound = true;
                imageEl.addEventListener('error', showPhotoFallback);
                imageEl.addEventListener('load', function () {
                    if (imageEl.naturalWidth > 0 && imageEl.naturalHeight > 0) {
                        hidePhotoFallback();
                    } else {
                        showPhotoFallback();
                    }
                });
                if (imageEl.complete && (!imageEl.naturalWidth || !imageEl.naturalHeight)) {
                    showPhotoFallback();
                }
            }
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                if (msg && msg.content) {
                    alert(msg.content);
                }
            });
        }
    }

    if (msg.type === 'redpacket') {
        const bubble = row.querySelector('.redpacket-bubble');
        if (bubble) {
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                if (msg.role === 'me') {
                    return;
                }
                openRedpacketModal({
                    msg: msg,
                    row: row
                });
            });
        }
    }

    if (msg.type === 'transfer' && msg.role === 'ai') {
        const bubble = row.querySelector('.transfer-bubble');
        if (bubble) {
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                openAITransferModal({
                    msg: msg,
                    row: row
                });
            });
        }
    }

    if (msg.type === 'family_card' && msg.role === 'ai') {
        const bubble = row.querySelector('.family-card-bubble');
        if (bubble) {
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                const st = msg && typeof msg.status === 'string' ? msg.status : 'pending';
                if (st !== 'pending') return;
                openFamilyCardAcceptModal({
                    msg: msg,
                    row: row,
                    roleId: window.currentChatRole
                });
            });
        }
    }

    if (msg.type === 'gift_card') {
        const bubble = row.querySelector('.gift-message-bubble');
        if (bubble) {
            bubble.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') {
                    e.stopPropagation();
                }
                const payload = parseCommerceCardPayload(msg && msg.content);
                const paymentMode = String(payload.paymentMode || 'paid').trim();
                const isPayOnBehalf = paymentMode === 'pay_on_behalf';
                const isPaid = msg.status === 'paid';
                if (isPayOnBehalf && !isPaid) {
                    openGiftPayOnBehalfModal(msg);
                } else {
                    openGiftRevealModal(msg);
                }
            });
        }
    }

    if (msg.type === 'listen_invite') {
        const buttons = row.querySelectorAll('.listen-invite-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', function (e) {
                if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                const action = btn.getAttribute('data-action') || '';
                const inviteId = btn.getAttribute('data-invite-id') || '';
                handleInviteClick(action, inviteId);
            });
        });
    }

    historyBox.appendChild(row);
    historyBox.scrollTop = historyBox.scrollHeight;
    try {
        window.__lastAiRenderDecision = {
            at: Date.now(),
            reason: 'bubble_rendered',
            msgType: String(msg.type || ''),
            role: String(msg.role || ''),
            preview: String(content || '').slice(0, 200)
        };
    } catch (e) { }

    // 为AI文本消息添加打字效果（仅对新消息生效）
    if (msg.role === 'ai' && msg.type === 'text') {
        const textEl = row.querySelector('.msg-text[data-text]');
        if (textEl) {
            const fullText = textEl.getAttribute('data-text');
            
            // 检查是否是历史消息（时间戳与当前时间差较大）
            const isHistoricalMessage = msg.timestamp && (Date.now() - msg.timestamp > 5000);
            
            if (isHistoricalMessage) {
                // 历史消息：直接显示完整内容，不触发打字效果
                textEl.textContent = fullText;
                textEl.removeAttribute('data-text');
                textEl.removeAttribute('data-render-mode');
            } else {
                // 新消息：触发打字效果
                textEl.textContent = '';
                textEl.removeAttribute('data-text');
                textEl.removeAttribute('data-render-mode');

                // 打字效果实现
                let index = 0;
                const typeSpeed = 30; // 打字速度，单位毫秒

                function type() {
                    if (index < fullText.length) {
                        textEl.appendChild(document.createTextNode(fullText.charAt(index)));
                        index++;
                        historyBox.scrollTop = historyBox.scrollHeight;
                        setTimeout(type, typeSpeed);
                    }
                }

                // 开始打字动画
                setTimeout(type, 100);
            }
        }
    }

    if (shouldTriggerLocationShare) {
        try {
            const rid = window.currentChatRole;
            if (rid) {
                showIncomingLocationShareUI(rid);
            }
        } catch (e) { }
    }
    if (locationTriggerBlockedBySettings) {
        try {
            saveData();
        } catch (e) { }
    }

    const isHistoricalMessage = msg.timestamp && (Date.now() - msg.timestamp > 5000);
    if (!isHistoricalMessage && typeof window.updateMsgRowGroupClasses === 'function') {
        window.updateMsgRowGroupClasses();
    }
}

function updateMsgRowGroupClasses() {
    const historyBox = document.getElementById('chat-history');
    if (!historyBox) return;

    const rows = historyBox.querySelectorAll('.msg-row');
    const rowList = Array.prototype.slice.call(rows);

    for (let i = 0; i < rowList.length; i++) {
        const currentRow = rowList[i];
        const currentRole = currentRow.getAttribute('data-role') || '';
        const nextRow = rowList[i + 1];
        const nextRole = nextRow ? (nextRow.getAttribute('data-role') || '') : '';

        if (currentRole && nextRole && currentRole === nextRole) {
            currentRow.classList.add('not-last-in-group');
        } else {
            currentRow.classList.remove('not-last-in-group');
        }
    }
}
window.updateMsgRowGroupClasses = updateMsgRowGroupClasses;

function normalizeManualStickerName(rawName) {
    let name = String(rawName || '').trim();
    if (!name) return '';
    name = name.replace(/\s+/g, ' ').trim();
    name = name.replace(/[：:]\s*$/, '').trim();
    return name;
}

function resolveStickerMetaForManualEdit(roleId, rawValue, fallbackName) {
    const rid = String(roleId || window.currentChatRole || '').trim();
    const raw = String(rawValue || '').trim();
    const fallback = normalizeManualStickerName(fallbackName || raw);
    if (typeof window.resolveStickerMetaByUrl === 'function') {
        const direct = window.resolveStickerMetaByUrl(rid, raw, fallback);
        if (direct && direct.url) return direct;
    }

    const targetName = normalizeManualStickerName(raw || fallback);
    if (!targetName) return { url: '', name: fallback };

    const scope = typeof window.getStickerScopeForRole === 'function'
        ? window.getStickerScopeForRole(rid)
        : { tabs: window.stickerData || {} };
    const tabs = scope && scope.tabs && typeof scope.tabs === 'object' ? scope.tabs : {};
    let fuzzyMatch = null;
    const tabKeys = Object.keys(tabs);
    for (let i = 0; i < tabKeys.length; i++) {
        const list = Array.isArray(tabs[tabKeys[i]]) ? tabs[tabKeys[i]] : [];
        for (let j = 0; j < list.length; j++) {
            const item = list[j];
            if (!item) continue;
            const itemName = normalizeManualStickerName(item.name || '');
            const itemUrl = String(item.src || item.url || item.href || '').trim();
            if (!itemName || !itemUrl) continue;
            if (itemName === targetName) {
                return { url: itemUrl, name: itemName };
            }
            if (!fuzzyMatch && (itemName.indexOf(targetName) !== -1 || targetName.indexOf(itemName) !== -1)) {
                fuzzyMatch = { url: itemUrl, name: itemName };
            }
        }
    }
    return fuzzyMatch || { url: '', name: fallback };
}

function clearStructuredFieldsForEditedMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    delete msg.duration;
    delete msg.stickerUrl;
    delete msg.stickerName;
    delete msg.quoteId;
    delete msg.quote;
    delete msg.quoteSourceText;
    delete msg.amount;
    delete msg.note;
    delete msg.inviteId;
    delete msg.inviteStatus;
    delete msg.userName;
    delete msg.userAvatar;
    delete msg.characterName;
    delete msg.characterAvatar;
    delete msg.track;
    delete msg.extraText;
    delete msg.shopName;
    delete msg.items;
    delete msg.price;
    delete msg.remark;
}

function buildEditableDraftForMessage(roleId, msg) {
    const m = msg && typeof msg === 'object' ? msg : {};
    const type = String(m.type || 'text').trim();
    if (!type || type === 'text') {
        const quoteText = String(m.quoteSourceText || (m.quote && m.quote.text) || '').trim();
        const quoteId = String(m.quoteId || '').trim();
        if (quoteText || quoteId) {
            return JSON.stringify({
                type: 'text',
                content: typeof m.content === 'string' ? m.content : '',
                quoteText: quoteText,
                quoteId: quoteId || 'user_last'
            }, null, 2);
        }
        return typeof m.content === 'string' ? m.content : '';
    }
    if (type === 'html') {
        return JSON.stringify({
            type: 'html',
            content: String(m.content || '')
        }, null, 2);
    }
    if (type === 'translated_text') {
        const payload = parseTranslatedTextPayload(m.content);
        return JSON.stringify({
            type: 'translated_text',
            foreign: String(payload.foreignText || payload.bodyText || '').trim(),
            translation: String(payload.translationText || payload.foreignText || '').trim()
        }, null, 2);
    }
    if (type === 'voice') {
        return JSON.stringify({
            type: 'voice',
            content: String(m.content || '')
        }, null, 2);
    }
    if (type === 'location') {
        let payload = {};
        try {
            payload = JSON.parse(m.content || '{}') || {};
        } catch (e) { }
        return JSON.stringify({
            type: 'location',
            name: String(payload.name || '').trim(),
            address: String(payload.address || '').trim()
        }, null, 2);
    }
    if (type === 'sticker') {
        const meta = resolveStickerMetaForManualEdit(roleId, m.stickerUrl || m.content || '', m.stickerName || '');
        return JSON.stringify({
            type: 'sticker',
            name: String(meta.name || '').trim(),
            url: String(meta.url || '').trim()
        }, null, 2);
    }
    if (type === 'transfer') {
        return JSON.stringify({
            type: 'transfer',
            amount: String(m.amount || '').trim(),
            note: String(m.note || '').trim()
        }, null, 2);
    }
    if (type === 'redpacket') {
        return JSON.stringify({
            type: 'redpacket',
            amount: String(m.amount || '').trim(),
            note: String(m.note || '').trim()
        }, null, 2);
    }
    return typeof m.content === 'string' ? m.content : '';
}

function fillReplacementTextBubble(replacement) {
    if (!replacement || !replacement.querySelector) return;
    const textEl = replacement.querySelector('.msg-text[data-text]');
    if (!textEl) return;
    const fullText = String(textEl.getAttribute('data-text') || '');
    const mode = String(textEl.getAttribute('data-render-mode') || 'text').trim();
    if (mode === 'html') textEl.innerHTML = sanitizeChatBubbleHtml(fullText);
    else textEl.textContent = fullText;
    textEl.removeAttribute('data-text');
    textEl.removeAttribute('data-render-mode');
}

function replaceEditedMessageRow(row, msg) {
    if (!row || !row.parentNode) return row;
    if (typeof createMessageRow !== 'function') return row;
    const replacement = createMessageRow(msg);
    if (!replacement) return row;
    fillReplacementTextBubble(replacement);
    try {
        row.parentNode.replaceChild(replacement, row);
        return replacement;
    } catch (e) {
        return row;
    }
}

function applyManualStructuredObjectToMessage(roleId, msg, parsedValue, rawInput) {
    const obj = parsedValue && typeof parsedValue === 'object' ? parsedValue : null;
    if (!obj) return false;
    const rawType = String(obj.type || obj.kind || '').trim().toLowerCase();
    if (!rawType) return false;

    clearStructuredFieldsForEditedMessage(msg);

    if (rawType === 'text') {
        msg.type = 'text';
        msg.content = String(obj.content != null ? obj.content : obj.text || '').trim();
        const quoteText = String(obj.quoteText != null ? obj.quoteText : (obj.quote_text != null ? obj.quote_text : '')).trim();
        const quoteId = String(obj.quoteId != null ? obj.quoteId : (obj.quote_id != null ? obj.quote_id : (obj.reply_to != null ? obj.reply_to : ''))).trim();
        if (quoteText) {
            msg.quoteSourceText = quoteText;
            msg.quoteId = quoteId || 'user_last';
        } else if (quoteId) {
            msg.quoteId = quoteId;
        }
        if (msg.quoteId || msg.quoteSourceText) {
            resolveQuoteBlockForMessage(roleId, msg);
            if (!(msg.quote && msg.quote.text) && msg.quoteSourceText) {
                msg.quote = { name: '引用', text: msg.quoteSourceText };
            }
        }
        return true;
    }
    if (rawType === 'translated_text' || rawType === 'translated') {
        const parsed = parseTranslatedTextPayload(obj);
        const foreignText = String(parsed.foreignText || parsed.bodyText || '').trim();
        const translationText = String(parsed.translationText || parsed.foreignText || '').trim();
        if (!(foreignText || translationText)) return false;
        msg.type = 'translated_text';
        msg.content = JSON.stringify({
            foreign: foreignText || translationText,
            translation: translationText || foreignText
        });
        return true;
    }
    if (rawType === 'html') {
        msg.type = 'html';
        msg.content = String(obj.content != null ? obj.content : (obj.html != null ? obj.html : obj.text || '')).trim();
        return true;
    }
    if (rawType === 'voice') {
        msg.type = 'voice';
        msg.content = String(obj.content != null ? obj.content : obj.text || '').trim();
        msg.duration = calcVoiceDurationSeconds(msg.content);
        return true;
    }
    if (rawType === 'location') {
        msg.type = 'location';
        msg.content = JSON.stringify({
            name: String(obj.name || obj.title || '').trim(),
            address: String(obj.address || obj.content || '').trim()
        });
        return true;
    }
    if (rawType === 'sticker') {
        const meta = resolveStickerMetaForManualEdit(
            roleId,
            obj.url || obj.src || obj.content || '',
            obj.name || obj.title || obj.text || rawInput
        );
        if (!meta || !meta.url) return false;
        msg.type = 'sticker';
        msg.content = String(meta.url || '').trim();
        msg.stickerUrl = msg.content;
        msg.stickerName = String(meta.name || '').trim();
        return true;
    }
    if (rawType === 'transfer') {
        const amount = String(obj.amount || '').trim();
        if (!amount) return false;
        msg.type = 'transfer';
        msg.amount = amount;
        msg.note = String(obj.note != null ? obj.note : (obj.remark != null ? obj.remark : '')).trim();
        msg.status = String(msg.status || (msg.role === 'ai' ? 'pending' : 'sent')).trim() || (msg.role === 'ai' ? 'pending' : 'sent');
        msg.content = '';
        return true;
    }
    if (rawType === 'redpacket') {
        const amount = String(obj.amount || '').trim();
        if (!amount) return false;
        msg.type = 'redpacket';
        msg.amount = amount;
        msg.note = String(obj.note != null ? obj.note : (obj.remark != null ? obj.remark : '')).trim();
        msg.status = String(msg.status || (msg.role === 'ai' ? 'unopened' : 'sent')).trim() || (msg.role === 'ai' ? 'unopened' : 'sent');
        msg.content = '';
        return true;
    }
    return false;
}

function applyEditedMessageContent(roleId, msg, rawInput) {
    const rid = String(roleId || window.currentChatRole || '').trim();
    if (!msg || typeof msg !== 'object') return { ok: false, reason: 'no_msg' };
    const draft = String(rawInput == null ? '' : rawInput);
    const trimmed = draft.trim();
    if (!trimmed) return { ok: false, reason: 'empty' };

    let parsedValue = null;
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            parsedValue = JSON.parse(trimmed);
        } catch (e) { }
    }

    if (parsedValue && !Array.isArray(parsedValue) && applyManualStructuredObjectToMessage(rid, msg, parsedValue, trimmed)) {
        return { ok: true, changedType: true, type: msg.type };
    }

    const structured = normalizeStructuredReplySegments(parsedValue != null ? parsedValue : trimmed, { offlineMode: false });
    const first = Array.isArray(structured) && structured.length ? structured[0] : null;
    clearStructuredFieldsForEditedMessage(msg);

    if (!first) {
        msg.type = 'text';
        msg.content = trimmed;
        return { ok: true, changedType: true, type: msg.type };
    }

    if (first.kind === 'voice') {
        msg.type = 'voice';
        msg.content = String(first.content || '').trim();
        msg.duration = calcVoiceDurationSeconds(msg.content);
        return { ok: true, changedType: true, type: msg.type };
    }
    if (first.kind === 'translated_text') {
        msg.type = 'translated_text';
        msg.content = JSON.stringify({
            foreign: String(first.foreign || '').trim(),
            translation: String(first.translation || '').trim()
        });
        return { ok: true, changedType: true, type: msg.type };
    }
    if (first.kind === 'location') {
        msg.type = 'location';
        msg.content = JSON.stringify({
            name: String(first.name || '').trim(),
            address: String(first.address || '').trim()
        });
        return { ok: true, changedType: true, type: msg.type };
    }
    if (first.kind === 'sticker') {
        const stickerMeta = resolveStickerMetaForManualEdit(rid, first.content || '', trimmed);
        if (stickerMeta && stickerMeta.url) {
            msg.type = 'sticker';
            msg.content = String(stickerMeta.url || '').trim();
            msg.stickerUrl = msg.content;
            msg.stickerName = String(stickerMeta.name || '').trim();
            return { ok: true, changedType: true, type: msg.type };
        }
    }
    if (first.kind === 'text') {
        const textParts = structured.filter(function (seg) {
            return seg && seg.kind === 'text' && String(seg.text || '').trim();
        }).map(function (seg) {
            return String(seg.text || '').trim();
        });
        msg.type = 'text';
        msg.content = textParts.length ? textParts.join('\n') : trimmed;
        return { ok: true, changedType: true, type: msg.type };
    }

    msg.type = 'text';
    msg.content = trimmed;
    return { ok: true, changedType: true, type: msg.type };
}

function parseEditableMessageDraft(rawInput) {
    const draft = String(rawInput == null ? '' : rawInput);
    const trimmed = draft.trim();
    const result = {
        raw: draft,
        trimmed: trimmed,
        type: '',
        content: '',
        foreign: '',
        translation: '',
        quoteText: '',
        quoteId: '',
        name: '',
        url: '',
        address: '',
        amount: '',
        note: ''
    };
    if (!trimmed) return result;
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                result.type = String(parsed.type || parsed.kind || '').trim().toLowerCase();
                result.content = String(parsed.content != null ? parsed.content : parsed.text || '').trim();
                result.foreign = String(parsed.foreign != null ? parsed.foreign : (parsed.foreignText != null ? parsed.foreignText : '')).trim();
                result.translation = String(parsed.translation != null ? parsed.translation : (parsed.translationText != null ? parsed.translationText : '')).trim();
                result.quoteText = String(parsed.quoteText != null ? parsed.quoteText : (parsed.quote_text != null ? parsed.quote_text : '')).trim();
                result.quoteId = String(parsed.quoteId != null ? parsed.quoteId : (parsed.quote_id != null ? parsed.quote_id : (parsed.reply_to != null ? parsed.reply_to : ''))).trim();
                result.name = String(parsed.name || parsed.title || '').trim();
                result.url = String(parsed.url || parsed.src || '').trim();
                result.address = String(parsed.address || '').trim();
                result.amount = String(parsed.amount || '').trim();
                result.note = String(parsed.note != null ? parsed.note : (parsed.remark != null ? parsed.remark : '')).trim();
                return result;
            }
        } catch (e) { }
    }
    result.content = trimmed;
    return result;
}

function buildEditorTemplateDraft(mode, rawInput) {
    const parsed = parseEditableMessageDraft(rawInput);
    const content = parsed.content || parsed.name || '';
    const quoteText = parsed.quoteText || '';
    const quoteId = parsed.quoteId || 'user_last';
    if (mode === 'text') {
        return content || parsed.trimmed || '';
    }
    if (mode === 'quote') {
        return JSON.stringify({
            type: 'text',
            content: content,
            quoteText: quoteText,
            quoteId: quoteId
        }, null, 2);
    }
    if (mode === 'voice') {
        return JSON.stringify({
            type: 'voice',
            content: content
        }, null, 2);
    }
    if (mode === 'location') {
        return JSON.stringify({
            type: 'location',
            name: parsed.name || content,
            address: parsed.address || ''
        }, null, 2);
    }
    if (mode === 'transfer') {
        return JSON.stringify({
            type: 'transfer',
            amount: parsed.amount || '88.00',
            note: parsed.note || '恭喜发财'
        }, null, 2);
    }
    if (mode === 'redpacket') {
        return JSON.stringify({
            type: 'redpacket',
            amount: parsed.amount || '8.88',
            note: parsed.note || '恭喜发财'
        }, null, 2);
    }
    if (mode === 'translated') {
        return JSON.stringify({
            type: 'translated_text',
            foreign: parsed.foreign || parsed.content || '',
            translation: parsed.translation || ''
        }, null, 2);
    }
    if (mode === 'sticker') {
        return JSON.stringify({
            type: 'sticker',
            name: parsed.name || content || '',
            url: parsed.url || ''
        }, null, 2);
    }
    return String(rawInput || '');
}

let currentChatMessageEditorContext = null;

function getChatMessageEditorElements() {
    let mask = document.getElementById('chat-message-editor-mask');
    if (!mask) {
        mask = document.createElement('div');
        mask.id = 'chat-message-editor-mask';
        mask.className = 'chat-message-editor-mask';
        mask.innerHTML = `
            <div class="chat-message-editor-sheet" role="dialog" aria-modal="true">
                <div class="chat-message-editor-handle" aria-hidden="true"></div>
                <div class="chat-message-editor-title">编辑消息</div>
                <div class="chat-message-editor-subtitle">支持直接写文本，也支持一键切成语音、位置、转账、红包、翻译、引用或表情包模板。</div>
                <div class="chat-message-editor-quick">
                    <button type="button" class="chat-message-editor-chip" data-editor-template="text">文本</button>
                    <button type="button" class="chat-message-editor-chip" data-editor-template="quote">引用</button>
                    <button type="button" class="chat-message-editor-chip" data-editor-template="voice">语音</button>
                    <button type="button" class="chat-message-editor-chip" data-editor-template="location">位置</button>
                    <button type="button" class="chat-message-editor-chip" data-editor-template="transfer">转账</button>
                    <button type="button" class="chat-message-editor-chip" data-editor-template="redpacket">红包</button>
                    <button type="button" class="chat-message-editor-chip" data-editor-template="translated">翻译</button>
                    <button type="button" class="chat-message-editor-chip" data-editor-template="sticker">表情包</button>
                </div>
                <textarea id="chat-message-editor-input" class="chat-message-editor-input" spellcheck="false"></textarea>
                <div class="chat-message-editor-tip">示例：{"type":"voice","content":"慢点凶我，我在听。"}</div>
                <div class="chat-message-editor-actions">
                    <button type="button" class="chat-message-editor-btn chat-message-editor-btn-cancel" data-editor-action="cancel">取消</button>
                    <button type="button" class="chat-message-editor-btn chat-message-editor-btn-save" data-editor-action="save">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
    }
    return {
        mask: mask,
        input: mask.querySelector('#chat-message-editor-input')
    };
}

function closeChatMessageEditor(result) {
    const els = getChatMessageEditorElements();
    if (els.mask) els.mask.classList.remove('show');
    const ctx = currentChatMessageEditorContext;
    currentChatMessageEditorContext = null;
    if (ctx && typeof ctx.resolve === 'function') {
        ctx.resolve(result);
    }
}

function bindChatMessageEditorEvents() {
    const els = getChatMessageEditorElements();
    if (!els || !els.mask || els.mask.dataset.bound === '1') return;
    els.mask.dataset.bound = '1';

    els.mask.addEventListener('click', function (e) {
        if (e && e.target === els.mask) {
            closeChatMessageEditor(null);
            return;
        }
        const target = e && e.target && e.target.closest ? e.target.closest('[data-editor-action], [data-editor-template]') : null;
        if (!target) return;
        const action = String(target.getAttribute('data-editor-action') || '').trim();
        if (action === 'cancel') {
            closeChatMessageEditor(null);
            return;
        }
        if (action === 'save') {
            closeChatMessageEditor(els.input ? String(els.input.value || '') : '');
            return;
        }
        const mode = String(target.getAttribute('data-editor-template') || '').trim();
        if (!mode || !els.input) return;
        els.input.value = buildEditorTemplateDraft(mode, els.input.value || '');
        try { els.input.focus(); } catch (e2) { }
    });
}

window.openChatMessageEditor = function (options) {
    const opts = options && typeof options === 'object' ? options : {};
    const els = getChatMessageEditorElements();
    bindChatMessageEditorEvents();
    if (els && els.input) {
        els.input.value = String(opts.initialValue != null ? opts.initialValue : '');
    }
    if (els && els.mask) {
        els.mask.classList.add('show');
    }
    return new Promise(function (resolve) {
        currentChatMessageEditorContext = { resolve: resolve };
        window.setTimeout(function () {
            try {
                if (els && els.input) {
                    els.input.focus();
                    els.input.setSelectionRange(els.input.value.length, els.input.value.length);
                }
            } catch (e) { }
        }, 30);
    });
}

window.getEditableChatMessageDraft = buildEditableDraftForMessage;
window.applyEditedChatMessageContent = function (roleId, msg, rawInput, row) {
    const result = applyEditedMessageContent(roleId, msg, rawInput);
    if (!result || !result.ok) return result;
    const nextRow = replaceEditedMessageRow(row, msg);
    return Object.assign({}, result, { row: nextRow });
};

function bindMessageLongPressEdit(row, msg) {
    if (!row || !msg) return;
    const bubble = row.querySelector('.msg-bubble');
    if (!bubble) return;
    const ts = msg.timestamp;
    if (!ts) return;
    const msgId = typeof ensureChatMessageId === 'function' ? ensureChatMessageId(msg) : String(msg.id || '');
    const roleId = window.currentChatRole;
    if (!roleId) return;
    let pressTimer = null;
    function clearPressTimer() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    }
    function handleEdit() {
        clearPressTimer();
        const original = typeof window.getEditableChatMessageDraft === 'function'
            ? window.getEditableChatMessageDraft(roleId, msg)
            : (typeof msg.content === 'string' ? msg.content : '');
        if (typeof window.openChatMessageEditor !== 'function') return;
        window.openChatMessageEditor({ initialValue: original }).then(function (result) {
            if (result === null) return;
            if (!window.chatData) window.chatData = {};
            const list = window.chatData[roleId] || [];
            for (let i = list.length - 1; i >= 0; i--) {
                const m = list[i];
                if (!m) continue;
                const currentId = typeof ensureChatMessageId === 'function' ? ensureChatMessageId(m) : String(m.id || '');
                if ((msgId && currentId === msgId) || (!msgId && m.timestamp === ts && m.role === msg.role)) {
                    const applied = typeof window.applyEditedChatMessageContent === 'function'
                        ? window.applyEditedChatMessageContent(roleId, m, result, row)
                        : null;
                    if (!applied || !applied.ok) return;
                    msg = m;
                    break;
                }
            }
            try {
                saveData();
            } catch (e) { }
            try {
                if (typeof window.maybeAutoUpdateMemoryArchive === 'function') {
                    window.maybeAutoUpdateMemoryArchive(roleId);
                }
            } catch (e) { }
        });
    }
    function startPress(e) {
        if (e && e.type === 'mousedown' && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        clearPressTimer();
        pressTimer = setTimeout(function () {
            handleEdit();
        }, 600);
    }
    function cancelPress() {
        clearPressTimer();
    }
    bubble.addEventListener('mousedown', startPress);
    bubble.addEventListener('touchstart', startPress);
    bubble.addEventListener('mouseup', cancelPress);
    bubble.addEventListener('mouseleave', cancelPress);
    bubble.addEventListener('touchend', cancelPress);
    bubble.addEventListener('touchmove', cancelPress);
    bubble.addEventListener('contextmenu', function (e) {
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        handleEdit();
    });
}

let currentAITransferContext = null;
let currentRedpacketContext = null;

