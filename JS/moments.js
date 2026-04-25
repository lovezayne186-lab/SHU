const MOMENTS_STORAGE_KEY = 'wechat_moments_data';
const MOMENTS_DB_KEY = 'wechat_moments_data_v2';
const LEGACY_DEFAULT_MOMENTS_COVER = 'assets/images/beijing.jpg';
const DEFAULT_MOMENTS_COVER = 'assets/chushibeijing.jpg';
const DEFAULT_MOMENTS_AVATAR = 'assets/chushitouxiang.jpg';
const DEFAULT_MOMENTS_NAME = '我';

let momentsHydrationPromise = null;

function normalizeMomentsData(rawData) {
    const data = rawData && typeof rawData === 'object' ? rawData : {};
    if (!Array.isArray(data.posts)) data.posts = [];
    if (!data.userCover || data.userCover === LEGACY_DEFAULT_MOMENTS_COVER) data.userCover = DEFAULT_MOMENTS_COVER;
    if (!data.userAvatar) data.userAvatar = DEFAULT_MOMENTS_AVATAR;
    if (!data.userName) data.userName = DEFAULT_MOMENTS_NAME;
    return data;
}

function createDefaultMomentsData() {
    return {
        userCover: DEFAULT_MOMENTS_COVER,
        userAvatar: DEFAULT_MOMENTS_AVATAR,
        userName: DEFAULT_MOMENTS_NAME,
        posts: []
    };
}

function syncMomentsDataToLocalStorage(data) {
    if (!data || typeof data !== 'object') return;
    try {
        localStorage.setItem(MOMENTS_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
}

async function syncMomentsDataToIndexedDb(data) {
    if (!data || typeof data !== 'object') return;
    if (!(window.localforage && typeof window.localforage.setItem === 'function')) return;
    try {
        await window.localforage.setItem(MOMENTS_DB_KEY, data);
    } catch (e) {}
}

function cacheMomentsData(data) {
    const normalized = normalizeMomentsData(data);
    window.momentsData = normalized;
    return normalized;
}

async function hydrateMomentsDataFromIndexedDb() {
    if (momentsHydrationPromise) return momentsHydrationPromise;
    momentsHydrationPromise = (async function () {
        if (!(window.localforage && typeof window.localforage.getItem === 'function')) return window.momentsData || null;
        try {
            const stored = await window.localforage.getItem(MOMENTS_DB_KEY);
            if (!stored || typeof stored !== 'object') return window.momentsData || null;
            const normalized = cacheMomentsData(stored);
            syncMomentsDataToLocalStorage(normalized);
            return normalized;
        } catch (e) {
            return window.momentsData || null;
        }
    })();
    return momentsHydrationPromise;
}

function initMomentsData() {
    if (window.momentsData && typeof window.momentsData === 'object') {
        return normalizeMomentsData(window.momentsData);
    }
    let stored = null;
    let raw = '';
    try {
        raw = localStorage.getItem(MOMENTS_STORAGE_KEY) || '';
    } catch (e0) {
        raw = '';
    }
    if (raw) {
        try {
            stored = JSON.parse(raw);
        } catch (e) {
            stored = null;
        }
    }
    let data = null;
    if (stored && typeof stored === 'object') {
        data = normalizeMomentsData(stored);
        syncMomentsDataToIndexedDb(data);
    } else {
        data = createDefaultMomentsData();
        hydrateMomentsDataFromIndexedDb().then(function (hydrated) {
            if (!hydrated || typeof hydrated !== 'object') {
                syncMomentsDataToLocalStorage(window.momentsData || data);
                syncMomentsDataToIndexedDb(window.momentsData || data);
                return;
            }
            if (typeof renderMoments === 'function') {
                try { renderMoments(); } catch (e2) {}
            }
        });
    }
    return cacheMomentsData(data);
}

function saveMomentsData() {
    if (!window.momentsData || typeof window.momentsData !== 'object') return;
    syncMomentsDataToLocalStorage(window.momentsData);
    syncMomentsDataToIndexedDb(window.momentsData);
}

function formatMomentsTime(ts) {
    if (!ts) return '';
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return '刚刚';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return minutes + '分钟前';
    const nowDate = new Date();
    const todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    if (ts >= yesterdayStart && ts < todayStart) return '昨天';
    const d = new Date(ts);
    return d.getMonth() + 1 + '/' + d.getDate();
}

function toMomentsDateKey(date) {
    var d = new Date(date);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

function formatMomentsChatTimestamp(ts) {
    var num = Number(ts);
    if (!isFinite(num) || num <= 0) return '';
    var d = new Date(num);
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return toMomentsDateKey(d) + ' ' + hh + ':' + mm;
}

function buildMomentsChatFocusContext(cleanHistory, nowTs, maxTodayLines, maxRecentLines) {
    var list = Array.isArray(cleanHistory) ? cleanHistory : [];
    var todayKey = toMomentsDateKey(nowTs || Date.now());
    var todayLines = [];
    var recentLines = [];
    for (var i = 0; i < list.length; i++) {
        var msg = list[i];
        if (!msg || typeof msg !== 'object') continue;
        var role = String(msg.role || '').trim();
        if (role !== 'me' && role !== 'ai') continue;
        var content = String(msg.content || '').replace(/\s+/g, ' ').trim();
        if (!content) continue;
        var ts = Number(msg.timestamp);
        var who = role === 'me' ? '我' : 'TA';
        var stamp = formatMomentsChatTimestamp(ts);
        var line = stamp ? ('[' + stamp + '] ' + who + '：' + content) : (who + '：' + content);
        recentLines.push(line);
        if (stamp && toMomentsDateKey(ts) === todayKey) {
            todayLines.push(line);
        }
    }
    var todayLimit = Math.max(4, Math.min(30, Number(maxTodayLines) || 16));
    var recentLimit = Math.max(6, Math.min(40, Number(maxRecentLines) || 22));
    var finalToday = todayLines.length <= todayLimit ? todayLines : todayLines.slice(todayLines.length - todayLimit);
    var finalRecent = recentLines.length <= recentLimit ? recentLines : recentLines.slice(recentLines.length - recentLimit);
    return {
        todayKey: todayKey,
        hasTodayChat: todayLines.length > 0,
        todayChatCount: todayLines.length,
        todayChatText: finalToday.length ? finalToday.join('\n') : '（今天暂无和用户的微信聊天记录）',
        recentChatText: finalRecent.length ? finalRecent.join('\n') : '（暂无近期聊天记录）'
    };
}

function getDisplayNameById(id, data) {
    if (id === 'me' || !id) return data.userName || DEFAULT_MOMENTS_NAME;
    const profiles = window.charProfiles || {};
    const p = profiles[id] || {};
    return p.nickName || id;
}

function getAvatarByRoleId(roleId, data) {
    if (roleId === 'me' || !roleId) return data.userAvatar || DEFAULT_MOMENTS_AVATAR;
    const profiles = window.charProfiles || {};
    const p = profiles[roleId] || {};
    return p.avatar || DEFAULT_MOMENTS_AVATAR;
}

function resolveMomentsRoleId(roleLike) {
    if (!roleLike) return '';
    const raw = String(roleLike);
    if (raw === 'me') return 'me';
    const profiles = window.charProfiles || {};
    if (profiles && profiles[raw]) return raw;
    const norm = raw.trim();
    const keys = Object.keys(profiles || {});
    for (let i = 0; i < keys.length; i++) {
        const id = keys[i];
        const p = profiles[id] || {};
        const nick = (p.nickName || '').trim();
        const name = (p.name || '').trim();
        if (nick && nick === norm) return id;
        if (name && name === norm) return id;
    }
    return raw;
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function bindMomentsGlobalClick() {
    if (window._momentsClickBound) return;
    window._momentsClickBound = true;
    document.addEventListener('click', function (e) {
        const target = e.target;
        if (!target) return;
        if (target.closest && (target.closest('.post-action-btn') || target.closest('.action-menu') || target.closest('#moments-input-bar') || target.closest('.comment-row'))) return;
        const menus = document.querySelectorAll('.action-menu.show');
        for (let i = 0; i < menus.length; i++) {
            menus[i].classList.remove('show');
        }
        hideCommentInput();
    });
}

function bindMomentsScroll() {
    const container = document.getElementById('moments-view');
    if (!container) return;
    const nav = container.querySelector('.moments-navbar');
    if (!nav || nav._scrollBound) return;
    nav._scrollBound = true;
    container.addEventListener('scroll', function () {
        if (container.scrollTop > 10) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
    });
}

function renderMoments() {
    const container = document.getElementById('moments-view');
    if (!container) return;
    const data = initMomentsData();
    const posts = Array.isArray(data.posts) ? data.posts.slice() : [];
    posts.sort(function (a, b) {
        const ta = a && a.timestamp ? a.timestamp : 0;
        const tb = b && b.timestamp ? b.timestamp : 0;
        return tb - ta;
    });
    let html = '';
    html += '<div class="moments-navbar">';
    html += '  <div class="moments-nav-left" onclick="exitMoments()" style="cursor:pointer;">';
    html += '      <i class="fas fa-chevron-left"></i>';
    html += '  </div>';
    html += '  <div class="moments-nav-title">朋友圈</div>';
    html += '  <div class="moments-nav-camera" onclick="openMomentsPublisher()"><i class="bx bxs-camera"></i></div>';
    html += '</div>';
    html += '<div class="moments-header">';
    html += '  <img class="moments-cover" src="' + escapeHtml(data.userCover || DEFAULT_MOMENTS_COVER) + '" alt="" onclick="changeMomentsCover()">';
    html += '  <div class="moments-user-float">';
    html += '      <div class="moments-user-name">' + escapeHtml(data.userName || DEFAULT_MOMENTS_NAME) + '</div>';
    html += '      <img class="moments-user-avatar" src="' + escapeHtml(data.userAvatar || DEFAULT_MOMENTS_AVATAR) + '" alt="" onclick="changeMomentsAvatar()">';
    html += '  </div>';
    html += '</div>';
    html += '<div class="moments-list">';
    for (let i = 0; i < posts.length; i++) {
        const post = posts[i] || {};
        const postId = String(post.id || '');
        const roleId = post.roleId || 'me';
        const nickname = getDisplayNameById(roleId, data);
        const avatar = getAvatarByRoleId(roleId, data);
        const content = post.content || '';
        const images = Array.isArray(post.images) ? post.images : [];
        const likes = Array.isArray(post.likes) ? post.likes : [];
        const comments = Array.isArray(post.comments) ? post.comments : [];
        const likedByMe = likes.indexOf('me') !== -1;
        let imagesClass = 'post-images-grid';
        if (images.length === 1) imagesClass += ' one-img';
        else if (images.length > 1 && images.length <= 4) imagesClass += ' two-cols';
        else if (images.length > 4) imagesClass += ' three-cols';
        html += '<div class="moment-post" data-post-id="' + escapeHtml(postId) + '">';
        html += '  <div class="post-avatar">';
        html += '      <img src="' + escapeHtml(avatar) + '" alt="">';
        html += '  </div>';
        html += '  <div class="post-content">';
        html += '      <div class="post-nickname">' + escapeHtml(nickname) + '</div>';
        if (content) {
            html += '      <div class="post-text">' + escapeHtml(content) + '</div>';
        }
        if (images.length > 0) {
            html += '      <div class="' + imagesClass + '">';
            for (let j = 0; j < images.length; j++) {
                const src = images[j];
                if (!src) continue;
                html += '          <img class="post-img" src="' + escapeHtml(src) + '" onclick="previewImage(\'' + escapeHtml(src) + '\')" alt="">';
            }
            html += '      </div>';
        }
        html += '      <div class="post-meta-row">';
        html += '          <div class="post-meta-left">';
        html += '              <span class="post-time">' + escapeHtml(formatMomentsTime(post.timestamp || 0)) + '</span>';
        var visibility = post && post.visibility ? post.visibility : { type: 'public', list: [] };
        var restricted = visibility && visibility.type && visibility.type !== 'public';
        if (roleId === 'me' && restricted) {
            html += '              <span class="post-visibility-flag"><i class="fas fa-user-lock"></i></span>';
        }
        if (roleId === 'me') {
            html += '              <span class="post-delete-btn" onclick="deletePost(\'' + escapeHtml(postId) + '\')">删除</span>';
        }
        html += '          </div>';
        html += '          <span class="post-action-btn" onclick="toggleActionMenu(this, \'' + escapeHtml(postId) + '\')">···</span>';
        html += '          <div class="action-menu">';
        html += '              <div class="menu-item-btn" onclick="toggleLike(\'' + escapeHtml(postId) + '\')">' + (likedByMe ? '取消赞' : '赞') + '</div>';
        html += '              <div class="menu-item-btn" onclick="onClickComment(\'' + escapeHtml(postId) + '\')">评论</div>';
        html += '          </div>';
        html += '      </div>';
        const hasLikes = likes.length > 0;
        const hasComments = comments.length > 0;
        if (hasLikes || hasComments) {
            html += '      <div class="post-comments-area has-content">';
            if (hasLikes) {
                const likeNames = [];
                for (let k = 0; k < likes.length; k++) {
                    likeNames.push(escapeHtml(getDisplayNameById(likes[k], data)));
                }
                html += '          <div class="like-list">❤️ ' + likeNames.join('，') + '</div>';
            }
            if (hasComments) {
                html += '          <div class="comment-list">';
                for (let m = 0; m < comments.length; m++) {
                    const c = comments[m] || {};
                    const fromId = c.from || '';
                    const fromName = getDisplayNameById(fromId, data);
                    const safeFromName = escapeHtml(fromName).replace(/'/g, "\\'");
                    html += '              <div class="comment-row" onclick="onReplyComment(\'' + escapeHtml(postId) + '\', \'' + escapeHtml(fromId) + '\', \'' + safeFromName + '\')">';
                    html += '                  <span class="comment-user">' + escapeHtml(fromName) + '：</span>';
                    html += '                  <span>' + escapeHtml(c.content || '') + '</span>';
                    html += '              </div>';
                }
                html += '          </div>';
            }
            html += '      </div>';
        }
        html += '  </div>';
        html += '</div>';
    }
    html += '</div>';
    html += '<div id="moments-input-bar">';
    html += '  <input type="text" placeholder="">';
    html += '  <button type="button" onclick="submitComment()">发送</button>';
    html += '</div>';
    container.innerHTML = html;
    bindMomentsGlobalClick();
    bindMomentsScroll();
}

function exitMoments() {
    const appWindow = document.getElementById('app-window');
    if (appWindow) {
        appWindow.classList.remove('moments-fullscreen');
    }
    if (typeof window.switchWechatTab === 'function') {
        const tabBtn = document.querySelector('.chat-nav-btn[onclick*="switchWechatTab(\'chat\'"]');
        window.switchWechatTab('chat', tabBtn || null);
    }
}

window.renderMoments = renderMoments;
window.exitMoments = exitMoments;

function toggleActionMenu(btnElement, postId) {
    bindMomentsGlobalClick();
    const row = btnElement && btnElement.closest ? btnElement.closest('.post-meta-row') : null;
    if (!row) return;
    const menu = row.querySelector('.action-menu');
    if (!menu) return;
    const isShow = menu.classList.contains('show');
    const menus = document.querySelectorAll('.action-menu.show');
    for (let i = 0; i < menus.length; i++) {
        menus[i].classList.remove('show');
    }
    if (!isShow) menu.classList.add('show');
}

function toggleLike(postId) {
    const data = initMomentsData();
    const posts = Array.isArray(data.posts) ? data.posts : [];
    const targetIndex = posts.findIndex(function (p) {
        return String(p.id || '') === String(postId);
    });
    if (targetIndex === -1) return;
    const post = posts[targetIndex];
    if (!Array.isArray(post.likes)) post.likes = [];
    const myId = 'me';
    const idx = post.likes.indexOf(myId);
    if (idx === -1) post.likes.push(myId);
    else post.likes.splice(idx, 1);
    window.momentsData.posts = posts;
    saveMomentsData();
    renderMoments();
}

function showCommentInput(postId) {
    const bar = document.getElementById('moments-input-bar');
    if (!bar) return;
    bar.style.display = 'flex';
    bar.setAttribute('data-post-id', String(postId));
    const input = bar.querySelector('input, textarea');
    if (input) {
        input.value = '';
        input.focus();
        input.onkeydown = function (e) {
            if (e.key === 'Enter') submitComment();
        };
    }
}

function hideCommentInput() {
    const bar = document.getElementById('moments-input-bar');
    if (!bar) return;
    if (bar.style.display === 'none' || bar.style.display === '') return;
    const input = bar.querySelector('input, textarea');
    if (input) {
        input.value = '';
        input.placeholder = '';
    }
    bar.style.display = 'none';
    bar.removeAttribute('data-post-id');
    window._momentsReplyTarget = null;
}

function onClickComment(postId) {
    window._momentsReplyTarget = null;
    showCommentInput(postId);
    const input = document.querySelector('#moments-input-bar input, #moments-input-bar textarea');
    if (input) input.placeholder = '';
}

function onReplyComment(postId, targetRoleId, targetName) {
    if (!postId || !targetRoleId) return;
    const resolvedId = resolveMomentsRoleId(targetRoleId);
    if (resolvedId === 'me') return;
    window._momentsReplyTarget = { id: resolvedId, name: targetName || '' };
    showCommentInput(postId);
    const input = document.querySelector('#moments-input-bar input, #moments-input-bar textarea');
    if (input) input.placeholder = '回复 ' + (targetName || '') + '：';
}

function submitComment() {
    const bar = document.getElementById('moments-input-bar');
    if (!bar) return;
    const postId = bar.getAttribute('data-post-id') || '';
    if (!postId) return;
    const input = bar.querySelector('input, textarea');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const hadExplicitReplyTarget = !!(window._momentsReplyTarget && window._momentsReplyTarget.id);
    const data = initMomentsData();
    const posts = Array.isArray(data.posts) ? data.posts : [];
    const targetIndex = posts.findIndex(function (p) {
        return String(p.id || '') === String(postId);
    });
    if (targetIndex === -1) return;
    const post = posts[targetIndex];
    if (!Array.isArray(post.comments)) post.comments = [];
    let finalContent = text;
    let replyTargetId = null;
    let replyTargetName = '';
    if (window._momentsReplyTarget && window._momentsReplyTarget.id) {
        replyTargetId = resolveMomentsRoleId(window._momentsReplyTarget.id);
        replyTargetName = window._momentsReplyTarget.name || '';
        finalContent = '回复 ' + (replyTargetName || '') + '：' + text;
    } else {
        const posterId = resolveMomentsRoleId(post.roleId || '');
        if (posterId && posterId !== 'me') {
            replyTargetId = posterId;
        } else if (Array.isArray(post.comments) && post.comments.length > 0) {
            for (let i = post.comments.length - 1; i >= 0; i--) {
                const c = post.comments[i];
                if (c && c.from && c.from !== 'me') {
                    replyTargetId = resolveMomentsRoleId(c.from);
                    break;
                }
            }
        }
    }
    post.comments.push({ from: 'me', content: finalContent });
    input.value = '';
    bar.style.display = 'none';
    window._momentsReplyTarget = null;
    input.placeholder = '';
    window.momentsData.posts = posts;
    saveMomentsData();
    renderMoments();

    if (replyTargetId && replyTargetId !== 'me') {
        try {
            const posterResolved = resolveMomentsRoleId(post && post.roleId ? post.roleId : '');
            const isDirectCommentToAiPost = !hadExplicitReplyTarget && posterResolved && posterResolved !== 'me';
            if (isDirectCommentToAiPost && replyTargetId === posterResolved) {
                triggerAIResponseToCommentOnAiPost(post, text, replyTargetId);
            } else {
                triggerAIResponseToReply(post, text, replyTargetId);
            }
        } catch (e) {
            console.error('triggerAIResponseToReply error:', e);
        }
    }
}

function deletePost(postId) {
    if (!confirm('确定要删除这条朋友圈吗？')) return;
    const data = initMomentsData();
    const posts = Array.isArray(data.posts) ? data.posts : [];
    const filtered = posts.filter(function (p) {
        return String(p.id || '') !== String(postId);
    });
    window.momentsData.posts = filtered;
    saveMomentsData();
    renderMoments();
}

function changeMomentsCover() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = function () {
        if (!input.files || !input.files[0]) return;
        if (typeof window.handleImageUpload === 'function') {
            window.handleImageUpload(input, null, function (base64) {
                const data = initMomentsData();
                data.userCover = base64;
                window.momentsData = data;
                saveMomentsData();
                renderMoments();
            }, 720);
        } else {
            const reader = new FileReader();
            reader.onload = function (e) {
                const data = initMomentsData();
                data.userCover = e.target.result;
                window.momentsData = data;
                saveMomentsData();
                renderMoments();
            };
            reader.readAsDataURL(input.files[0]);
        }
    };
    document.body.appendChild(input);
    input.click();
    setTimeout(function () {
        if (input.parentNode) input.parentNode.removeChild(input);
    }, 0);
}

function changeMomentsAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = function () {
        if (!input.files || !input.files[0]) return;
        if (typeof window.handleImageUpload === 'function') {
            window.handleImageUpload(input, null, function (base64) {
                const data = initMomentsData();
                data.userAvatar = base64;
                window.momentsData = data;
                saveMomentsData();
                renderMoments();
                try {
                    localStorage.setItem('user_avatar', data.userAvatar || '');
                } catch (e) {}
                if (window.MineProfile && typeof window.MineProfile.handleAvatarFromMoments === 'function') {
                    window.MineProfile.handleAvatarFromMoments(data.userAvatar || '');
                }
            }, 720);
        } else {
            const reader = new FileReader();
            reader.onload = function (e) {
                const data = initMomentsData();
                data.userAvatar = e.target.result;
                window.momentsData = data;
                saveMomentsData();
                renderMoments();
                try {
                    localStorage.setItem('user_avatar', data.userAvatar || '');
                } catch (e2) {}
                if (window.MineProfile && typeof window.MineProfile.handleAvatarFromMoments === 'function') {
                    window.MineProfile.handleAvatarFromMoments(data.userAvatar || '');
                }
            };
            reader.readAsDataURL(input.files[0]);
        }
    };
    document.body.appendChild(input);
    input.click();
    setTimeout(function () {
        if (input.parentNode) input.parentNode.removeChild(input);
    }, 0);
}

function previewImage(src) {
    let overlay = document.getElementById('moments-image-preview');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'moments-image-preview';
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.background = 'rgba(0,0,0,0.8)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        const img = document.createElement('img');
        img.id = 'moments-image-preview-img';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        overlay.appendChild(img);
        overlay.addEventListener('click', function () {
            overlay.style.display = 'none';
        });
        document.body.appendChild(overlay);
    }
    const imgEl = document.getElementById('moments-image-preview-img') || overlay.querySelector('img');
    if (imgEl) imgEl.src = src;
    overlay.style.display = 'flex';
}

function openMomentsPublisher() {
    var modal = document.getElementById('moments-publish-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'moments-publish-modal';
        modal.className = 'moments-publish-modal';
        modal.innerHTML = ''
            + '<div class="moments-publish-nav">'
            + '  <button class="moments-publish-cancel" onclick="closeMomentsPublisher()">取消</button>'
            + '  <div class="moments-publish-title">发朋友圈</div>'
            + '  <button id="moments-publish-submit" class="moments-publish-submit disabled" onclick="submitMomentFromModal()">发表</button>'
            + '</div>'
            + '<div class="moments-publish-body">'
            + '  <textarea id="moments-publish-text" class="moments-publish-text" placeholder="这一刻的想法..." oninput="onMomentsDraftChange()"></textarea>'
            + '  <div class="moments-publish-images">'
            + '    <div id="moments-publish-images-grid" class="moments-publish-grid"></div>'
            + '    <input type="file" id="moments-publish-file" accept="image/*" multiple style="display:none" onchange="handleMomentsImageFiles(this)">'
            + '  </div>'
            + '  <div class="moments-publish-options">'
            + '    <div class="publish-option-item" id="moments-option-location" onclick="onClickMomentsLocation()">'
            + '      <span class="option-icon"><i class="fas fa-location-dot"></i></span>'
            + '      <span class="option-text">所在位置</span>'
            + '      <span class="option-extra" id="moments-option-location-text"></span>'
            + '      <span class="option-arrow">›</span>'
            + '    </div>'
            + '    <div class="publish-option-item" id="moments-option-remind" onclick="onClickMomentsRemind()">'
            + '      <span class="option-icon"><i class="fas fa-at"></i></span>'
            + '      <span class="option-text">提醒谁看</span>'
            + '      <span class="option-extra" id="moments-option-remind-text"></span>'
            + '      <span class="option-arrow">›</span>'
            + '    </div>'
            + '    <div class="publish-option-item" id="moments-option-visibility" onclick="onClickMomentsVisibility()">'
            + '      <span class="option-icon"><i class="fas fa-user-lock"></i></span>'
            + '      <span class="option-text">谁可以看</span>'
            + '      <span class="option-extra" id="moments-option-visibility-text"></span>'
            + '      <span class="option-arrow">›</span>'
            + '    </div>'
            + '  </div>'
            + '</div>';
        document.body.appendChild(modal);
    }
    window._momentsDraftImages = [];
    window._momentsDraftText = '';
    window._momentsDraftLocation = '';
    window._momentsDraftRemindIds = [];
    window._momentsDraftVisibility = { type: 'public', list: [] };
    var textEl = document.getElementById('moments-publish-text');
    if (textEl) textEl.value = '';
    updateMomentsOptionTexts();
    renderMomentsDraftImages();
    updateMomentsPublishButtonState();
    modal.style.display = 'flex';
}

function closeMomentsPublisher() {
    var modal = document.getElementById('moments-publish-modal');
    if (modal) modal.style.display = 'none';
    window._momentsDraftImages = [];
    window._momentsDraftText = '';
    window._momentsDraftLocation = '';
    window._momentsDraftRemindIds = [];
    window._momentsDraftVisibility = { type: 'public', list: [] };
}

function renderMomentsDraftImages() {
    var grid = document.getElementById('moments-publish-images-grid');
    if (!grid) return;
    var images = window._momentsDraftImages || [];
    grid.innerHTML = '';
    for (var i = 0; i < images.length; i++) {
        var src = images[i];
        var item = document.createElement('div');
        item.className = 'publish-img-item';
        item.innerHTML = '<img src="' + src + '"><span class="publish-img-remove" onclick="removeMomentsImage(' + i + ')">×</span>';
        grid.appendChild(item);
    }
    if (images.length < 9) {
        var add = document.createElement('div');
        add.className = 'publish-img-add';
        add.innerHTML = '+';
        add.onclick = function () {
            var input = document.getElementById('moments-publish-file');
            if (input) {
                input.value = '';
                input.click();
            }
        };
        grid.appendChild(add);
    }
}

function updateMomentsOptionTexts() {
    var locTextEl = document.getElementById('moments-option-location-text');
    var remindTextEl = document.getElementById('moments-option-remind-text');
    var visTextEl = document.getElementById('moments-option-visibility-text');

    var loc = window._momentsDraftLocation || '';
    if (locTextEl) {
        locTextEl.textContent = loc ? loc : '';
    }

    var remindIds = Array.isArray(window._momentsDraftRemindIds) ? window._momentsDraftRemindIds : [];
    if (remindTextEl) {
        if (remindIds.length > 0) {
            var names = [];
            var profiles = window.charProfiles || {};
            for (var i = 0; i < remindIds.length; i++) {
                var rid = remindIds[i];
                var p = profiles[rid] || {};
                var name = p.nickName || p.name || rid;
                names.push('@' + name);
            }
            remindTextEl.textContent = names.join('、');
        } else {
            remindTextEl.textContent = '';
        }
    }

    var vis = window._momentsDraftVisibility || { type: 'public', list: [] };
    if (visTextEl) {
        if (vis.type === 'public') {
            visTextEl.textContent = '公开';
        } else if (vis.type === 'private') {
            visTextEl.textContent = '仅自己可见';
        } else if (vis.type === 'allow') {
            visTextEl.textContent = '部分可见';
        } else if (vis.type === 'deny') {
            visTextEl.textContent = '不给谁看';
        } else {
            visTextEl.textContent = '';
        }
    }
}

function handleMomentsImageFiles(input) {
    if (!input || !input.files || !input.files.length) return;
    var files = Array.prototype.slice.call(input.files);
    var images = window._momentsDraftImages || [];
    var remain = 9 - images.length;
    if (remain <= 0) return;
    files = files.slice(0, remain);

    var index = 0;
    function next() {
        if (index >= files.length) {
            window._momentsDraftImages = images;
            renderMomentsDraftImages();
            updateMomentsPublishButtonState();
            return;
        }
        var file = files[index++];
        if (!file) {
            next();
            return;
        }
        if (typeof window.handleImageUpload === 'function') {
            var tempInput = document.createElement('input');
            tempInput.type = 'file';
            tempInput.style.display = 'none';
            var dt = new DataTransfer();
            dt.items.add(file);
            tempInput.files = dt.files;
            window.handleImageUpload(tempInput, null, function (base64) {
                if (base64) images.push(base64);
                next();
            }, 1024);
        } else {
            var reader = new FileReader();
            reader.onload = function (e) {
                if (e.target && e.target.result) images.push(e.target.result);
                next();
            };
            reader.readAsDataURL(file);
        }
    }
    next();
}

function removeMomentsImage(index) {
    var images = window._momentsDraftImages || [];
    if (index < 0 || index >= images.length) return;
    images.splice(index, 1);
    window._momentsDraftImages = images;
    renderMomentsDraftImages();
    updateMomentsPublishButtonState();
}

function onMomentsDraftChange() {
    var textEl = document.getElementById('moments-publish-text');
    var value = textEl ? String(textEl.value || '') : '';
    window._momentsDraftText = value;
    updateMomentsPublishButtonState();
}

function updateMomentsPublishButtonState() {
    var btn = document.getElementById('moments-publish-submit');
    if (!btn) return;
    var text = window._momentsDraftText || '';
    var images = window._momentsDraftImages || [];
    var hasContent = (text && text.trim()) || (images && images.length > 0);
    if (hasContent) {
        btn.classList.remove('disabled');
    } else {
        btn.classList.add('disabled');
    }
}

function onClickMomentsLocation() {
    var current = window._momentsDraftLocation || '';
    var input = window.prompt('填写所在位置：', current || '');
    if (input === null) return;
    input = String(input || '').trim();
    window._momentsDraftLocation = input;
    updateMomentsOptionTexts();
}

function onClickMomentsRemind() {
    var modal = document.getElementById('forward-modal');
    var listContainer = document.getElementById('forward-contact-list');
    if (!modal || !listContainer) return;

    listContainer.innerHTML = '';

    var allRoles = Object.keys(window.charProfiles || {});

    allRoles.forEach(function (roleId) {
        var profile = (window.charProfiles && window.charProfiles[roleId]) || {};
        var item = document.createElement('div');
        item.className = 'forward-item';

        var checked = Array.isArray(window._momentsDraftRemindIds) && window._momentsDraftRemindIds.indexOf(roleId) !== -1;

        item.onclick = function () {
            var arr = Array.isArray(window._momentsDraftRemindIds) ? window._momentsDraftRemindIds.slice() : [];
            var idx = arr.indexOf(roleId);
            if (idx === -1) {
                arr.push(roleId);
            } else {
                arr.splice(idx, 1);
            }
            window._momentsDraftRemindIds = arr;
            updateMomentsOptionTexts();
            var nowChecked = arr.indexOf(roleId) !== -1;
            if (nowChecked) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
            var checkEl = item.querySelector('.forward-check');
            if (checkEl) {
                checkEl.textContent = nowChecked ? '✓' : '';
            }
        };

        item.innerHTML = ''
            + '<img src="' + (profile.avatar || 'assets/chushitouxiang.jpg') + '" class="forward-avatar">'
            + '<span class="forward-name">' + (profile.nickName || profile.name || roleId) + '</span>'
            + '<span class="forward-check">' + (checked ? '✓' : '') + '</span>';

        if (checked) {
            item.classList.add('selected');
        }

        listContainer.appendChild(item);
    });

    modal.style.display = 'flex';
}

function onClickMomentsVisibility() {
    var sheet = document.getElementById('moments-visibility-sheet');
    if (!sheet) {
        sheet = document.createElement('div');
        sheet.id = 'moments-visibility-sheet';
        sheet.className = 'moments-visibility-sheet';
        sheet.innerHTML = ''
            + '<div class="moments-visibility-mask" onclick="closeMomentsVisibilitySheet()"></div>'
            + '<div class="moments-visibility-panel">'
            + '  <div class="moments-visibility-option" data-value="public" onclick="onSelectMomentsVisibility(\'public\')">公开</div>'
            + '  <div class="moments-visibility-option" data-value="private" onclick="onSelectMomentsVisibility(\'private\')">私密（仅自己可见）</div>'
            + '  <div class="moments-visibility-option" data-value="allow" onclick="onSelectMomentsVisibility(\'allow\')">部分可见...</div>'
            + '  <div class="moments-visibility-option" data-value="deny" onclick="onSelectMomentsVisibility(\'deny\')">不给谁看...</div>'
            + '  <div class="moments-visibility-cancel" onclick="closeMomentsVisibilitySheet()">取消</div>'
            + '</div>';
        document.body.appendChild(sheet);
    }
    sheet.style.display = 'flex';
}

function closeMomentsVisibilitySheet() {
    var sheet = document.getElementById('moments-visibility-sheet');
    if (sheet) sheet.style.display = 'none';
}

function onSelectMomentsVisibility(type) {
    closeMomentsVisibilitySheet();
    if (type === 'public') {
        window._momentsDraftVisibility = { type: 'public', list: [] };
        updateMomentsOptionTexts();
        return;
    }
    if (type === 'private') {
        window._momentsDraftVisibility = { type: 'private', list: [] };
        updateMomentsOptionTexts();
        return;
    }
    if (type === 'allow') {
        openMomentsVisibilityTargetSheet('allow');
        return;
    }
    if (type === 'deny') {
        openMomentsVisibilityTargetSheet('deny');
        return;
    }
}

function openMomentsVisibilityTargetSheet(type) {
    if (type !== 'allow' && type !== 'deny') return;
    window._momentsPendingVisibilityType = type;
    var sheet = document.getElementById('moments-visibility-target-sheet');
    if (!sheet) {
        sheet = document.createElement('div');
        sheet.id = 'moments-visibility-target-sheet';
        sheet.className = 'moments-visibility-sheet';
        sheet.innerHTML = ''
            + '<div class="moments-visibility-mask" onclick="closeMomentsVisibilityTargetSheet()"></div>'
            + '<div class="moments-visibility-panel">'
            + '  <div class="moments-visibility-option" onclick="onSelectMomentsVisibilityTarget(\'contacts\')">选择联系人</div>'
            + '  <div class="moments-visibility-option" onclick="onSelectMomentsVisibilityTarget(\'groups\')">选择分类</div>'
            + '  <div class="moments-visibility-cancel" onclick="closeMomentsVisibilityTargetSheet()">取消</div>'
            + '</div>';
        document.body.appendChild(sheet);
    }
    sheet.style.display = 'flex';
}

function closeMomentsVisibilityTargetSheet() {
    var sheet = document.getElementById('moments-visibility-target-sheet');
    if (sheet) sheet.style.display = 'none';
}

function onSelectMomentsVisibilityTarget(method) {
    closeMomentsVisibilityTargetSheet();
    var type = window._momentsPendingVisibilityType;
    window._momentsPendingVisibilityType = '';
    if (type !== 'allow' && type !== 'deny') return;

    var current = window._momentsDraftVisibility || { type: 'public', list: [] };
    if (method === 'contacts') {
        var currentList = current && current.type === type && Array.isArray(current.list) ? current.list : [];
        var title = type === 'allow'
            ? '选择可以看到这条朋友圈的联系人'
            : '选择不会看到这条朋友圈的联系人';
        pickMomentsRoles(title, currentList, function (ids) {
            window._momentsDraftVisibility = { type: type, list: ids || [] };
            updateMomentsOptionTexts();
        });
        return;
    }

    if (method === 'groups') {
        var currentGroups = current && current.type === type && Array.isArray(current.groups) ? current.groups : [];
        var title2 = type === 'allow'
            ? '选择可以看到这条朋友圈的分类'
            : '选择不会看到这条朋友圈的分类';
        pickMomentsGroups(title2, currentGroups, function (groups) {
            var selectedGroups = Array.isArray(groups) ? groups : [];
            var ids2 = getRoleIdsByGroups(selectedGroups);
            window._momentsDraftVisibility = { type: type, list: ids2, groups: selectedGroups };
            updateMomentsOptionTexts();
        });
        return;
    }
}

function getAllGroupNames() {
    var namesMap = {};
    var profiles = window.charProfiles || {};
    Object.keys(profiles).forEach(function (roleId) {
        var p = profiles[roleId] || {};
        var gs = Array.isArray(p.groups) ? p.groups : [];
        gs.forEach(function (g) {
            if (!g) return;
            namesMap[String(g)] = true;
        });
    });
    try {
        var custom = JSON.parse(localStorage.getItem('wechat_custom_groups') || '[]');
        if (Array.isArray(custom)) {
            custom.forEach(function (g2) {
                if (!g2) return;
                namesMap[String(g2)] = true;
            });
        }
    } catch (e) { }
    return Object.keys(namesMap).sort(function (a, b) {
        return a.localeCompare(b, 'zh-Hans-CN');
    });
}

function getRoleIdsByGroups(groupValues) {
    var selected = Array.isArray(groupValues) ? groupValues.slice() : [];
    var includeUngrouped = selected.indexOf('__UNGROUPED__') !== -1;
    var groups = selected.filter(function (g) { return g && g !== '__UNGROUPED__'; });

    var profiles = window.charProfiles || {};
    var allRoles = Object.keys(profiles);
    var result = [];

    allRoles.forEach(function (roleId) {
        var p = profiles[roleId] || {};
        var gs = Array.isArray(p.groups) ? p.groups : [];
        if (includeUngrouped && (!gs || gs.length === 0)) {
            result.push(roleId);
            return;
        }
        for (var i = 0; i < gs.length; i++) {
            if (groups.indexOf(gs[i]) !== -1) {
                result.push(roleId);
                return;
            }
        }
    });

    return result;
}

function pickMomentsGroups(title, initialSelectedGroups, onDone) {
    var modal = document.getElementById('forward-modal');
    var listContainer = document.getElementById('forward-contact-list');
    if (!modal || !listContainer) {
        alert('暂不支持选择分类');
        if (typeof onDone === 'function') {
            onDone(Array.isArray(initialSelectedGroups) ? initialSelectedGroups : []);
        }
        return;
    }

    listContainer.innerHTML = '';

    var headerTitle = modal.querySelector('.forward-header span:first-child');
    if (headerTitle) {
        headerTitle.textContent = title || '选择分类';
    }

    var allGroups = getAllGroupNames();
    var options = [{ value: '__UNGROUPED__', label: '未分组' }];
    allGroups.forEach(function (g) {
        options.push({ value: g, label: g });
    });

    var selected = Array.isArray(initialSelectedGroups) ? initialSelectedGroups.slice() : [];

    options.forEach(function (opt) {
        var item = document.createElement('div');
        item.className = 'forward-item';
        var checked = selected.indexOf(opt.value) !== -1;

        item.onclick = function () {
            var idx = selected.indexOf(opt.value);
            if (idx === -1) {
                selected.push(opt.value);
            } else {
                selected.splice(idx, 1);
            }
            var nowChecked = selected.indexOf(opt.value) !== -1;
            if (nowChecked) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
            var checkEl = item.querySelector('.forward-check');
            if (checkEl) {
                checkEl.textContent = nowChecked ? '✓' : '';
            }
        };

        item.innerHTML = ''
            + '<div class="forward-avatar" style="display:flex;align-items:center;justify-content:center;background:#f2f2f2;color:#8e8e93;font-size:12px;">分组</div>'
            + '<span class="forward-name">' + escapeHtml(opt.label) + '</span>'
            + '<span class="forward-check">' + (checked ? '✓' : '') + '</span>';

        if (checked) {
            item.classList.add('selected');
        }

        listContainer.appendChild(item);
    });

    var footer = modal.querySelector('.forward-footer');
    if (!footer) {
        footer = document.createElement('div');
        footer.className = 'forward-footer';
        var btn = document.createElement('button');
        btn.id = 'forward-select-confirm';
        btn.textContent = '完成';
        btn.style.width = '100%';
        btn.style.padding = '10px 0';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.backgroundColor = '#07c160';
        btn.style.color = '#ffffff';
        btn.style.fontSize = '15px';
        btn.style.cursor = 'pointer';
        footer.appendChild(btn);
        var box = modal.querySelector('.forward-box');
        if (box) {
            box.appendChild(footer);
        }
    }

    var confirmBtn = modal.querySelector('#forward-select-confirm');
    if (confirmBtn) {
        confirmBtn.onclick = function () {
            window.closeForwardModal();
            if (typeof onDone === 'function') {
                onDone(selected.slice());
            }
        };
    }

    modal.style.display = 'flex';
}

function pickMomentsRoles(title, initialSelected, onDone) {
    var modal = document.getElementById('forward-modal');
    var listContainer = document.getElementById('forward-contact-list');
    if (!modal || !listContainer) {
        alert('暂不支持选择联系人');
        if (typeof onDone === 'function') {
            onDone(Array.isArray(initialSelected) ? initialSelected : []);
        }
        return;
    }

    listContainer.innerHTML = '';

    var headerTitle = modal.querySelector('.forward-header span:first-child');
    if (headerTitle) {
        headerTitle.textContent = title || '选择联系人';
    }

    var selected = Array.isArray(initialSelected) ? initialSelected.slice() : [];
    var allRoles = Object.keys(window.charProfiles || {});

    allRoles.forEach(function (roleId) {
        var p = window.charProfiles[roleId] || {};
        var name = p.nickName || p.name || roleId;

        var item = document.createElement('div');
        item.className = 'forward-item';

        var checked = selected.indexOf(roleId) !== -1;

        item.onclick = function () {
            var idx = selected.indexOf(roleId);
            if (idx === -1) {
                selected.push(roleId);
            } else {
                selected.splice(idx, 1);
            }
            var nowChecked = selected.indexOf(roleId) !== -1;
            if (nowChecked) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
            var checkEl = item.querySelector('.forward-check');
            if (checkEl) {
                checkEl.textContent = nowChecked ? '✓' : '';
            }
        };

        item.innerHTML = ''
            + '<img src="' + (p.avatar || 'assets/chushitouxiang.jpg') + '" class="forward-avatar">'
            + '<span class="forward-name">' + name + '</span>'
            + '<span class="forward-check">' + (checked ? '✓' : '') + '</span>';

        if (checked) {
            item.classList.add('selected');
        }

        listContainer.appendChild(item);
    });

    var footer = modal.querySelector('.forward-footer');
    if (!footer) {
        footer = document.createElement('div');
        footer.className = 'forward-footer';
        var btn = document.createElement('button');
        btn.id = 'forward-select-confirm';
        btn.textContent = '完成';
        btn.style.width = '100%';
        btn.style.padding = '10px 0';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.backgroundColor = '#07c160';
        btn.style.color = '#ffffff';
        btn.style.fontSize = '15px';
        btn.style.cursor = 'pointer';
        footer.appendChild(btn);
        var box = modal.querySelector('.forward-box');
        if (box) {
            box.appendChild(footer);
        }
    }

    var confirmBtn = modal.querySelector('#forward-select-confirm');
    if (confirmBtn) {
        confirmBtn.onclick = function () {
            window.closeForwardModal();
            if (typeof onDone === 'function') {
                onDone(selected.slice());
            }
        };
    }

    modal.style.display = 'flex';
}

function submitMomentFromModal() {
    var text = window._momentsDraftText || '';
    var images = window._momentsDraftImages || [];
    var hasText = text && String(text).trim();
    var hasImages = Array.isArray(images) && images.length > 0;
    if (!hasText && !hasImages) return;

    var data = initMomentsData();
    var posts = Array.isArray(data.posts) ? data.posts : [];
    var now = Date.now();
    var locationText = window._momentsDraftLocation || '';
    var remindIds = Array.isArray(window._momentsDraftRemindIds) ? window._momentsDraftRemindIds.slice() : [];
    var visibility = window._momentsDraftVisibility || { type: 'public', list: [] };
    var newPost = {
        id: 'post_' + now,
        roleId: 'me',
        content: hasText ? String(text).trim() : '',
        images: hasImages ? images.slice() : [],
        timestamp: now,
        location: locationText,
        mentions: remindIds,
        visibility: visibility,
        likes: [],
        comments: []
    };
    posts.push(newPost);
    data.posts = posts;
    window.momentsData = data;
    saveMomentsData();
    renderMoments();
    closeMomentsPublisher();

    try {
        triggerAIReactionToMoment(newPost);
    } catch (e) {
        console.error('triggerAIReactionToMoment error:', e);
    }
}

function getCurrentChatRoleId() {
    if (window.currentChatRole && typeof window.currentChatRole === 'string' && window.currentChatRole) {
        return window.currentChatRole;
    }
    var stored = null;
    try {
        stored = localStorage.getItem('currentChatId') || '';
    } catch (e) { }
    return stored || '';
}

function getUserPersonaForRole(roleId) {
    if (!roleId) return '';
    var personas = window.userPersonas || {};
    var p = personas[roleId];
    if (!p || typeof p !== 'object') return '';
    return p.persona || p.desc || '';
}

function buildAIReactionPrompt(post, aiId, aiProfile, userName, userPersona) {
    var aiName = aiProfile && (aiProfile.nickName || aiProfile.name) ? (aiProfile.nickName || aiProfile.name) : aiId || 'AI';
    var contentText = post && post.content ? String(post.content).trim() : '';
    var imagesCount = post && Array.isArray(post.images) ? post.images.length : 0;
    var hasImage = imagesCount > 0;
    var imagesDesc = hasImage
        ? ('有 ' + imagesCount + ' 张图片（模型可以直接理解这些图片的画面内容）')
        : '没有图片';
    var userLabel = userName || '用户';
    var locationText = post && post.location ? String(post.location).trim() : '';
    var mentions = post && Array.isArray(post.mentions) ? post.mentions : [];
    var remindForAi = mentions.indexOf(aiId) !== -1;

    var basePersona = aiProfile && (aiProfile.persona || aiProfile.prompt || aiProfile.desc) ? (aiProfile.persona || aiProfile.prompt || aiProfile.desc) : '';
    var userPersonaText = userPersona ? userPersona : '';

    var systemPrompt = typeof window.buildRoleLitePrompt === 'function'
        ? window.buildRoleLitePrompt('moments_reaction', aiId, {
            includeContinuity: true,
            maxSummaryLines: 10,
            sceneIntro: '当前场景是角色看到用户新发的朋友圈后，决定要不要互动。',
            taskGuidance: '你可以看到用户刚发的朋友圈，需要基于你们关系、最近互动和角色本身判断是否点赞、评论，或者什么都不做。',
            outputInstructions: '只输出当前任务要求的 JSON 对象，不要解释，不要代码块。'
        })
        : ('你是聊天中的 AI 角色：' + aiName + '。你和 ' + userLabel + ' 在微信里聊天，你可以看到对方发的朋友圈，并根据关系选择是否点赞或评论。');

    var userMessageParts = [];
    userMessageParts.push('用户刚刚在微信朋友圈发了一条新动态。');
    userMessageParts.push('【动态内容】' + (contentText || '(用户只发了图片，没有文字)'));
    userMessageParts.push('【图片】' + imagesDesc + '。');
    if (locationText) {
        userMessageParts.push('【发布位置】' + locationText);
    }
    if (remindForAi) {
        userMessageParts.push('【特别提醒】用户在这条朋友圈中 @ 了你，请优先考虑互动。');
    } else if (mentions.length > 0) {
        userMessageParts.push('【特别提醒的人】这条动态中 @ 了部分联系人。');
    }
    if (basePersona) {
        userMessageParts.push('【你的角色人设】' + basePersona);
    }
    if (userPersonaText) {
        userMessageParts.push('【关于用户的设定】' + userPersonaText);
    }
    userMessageParts.push('请完全按照下面格式，输出一个 JSON 对象，不要写解释：');
    userMessageParts.push('{');
    userMessageParts.push('  "like": true 或 false,');
    userMessageParts.push('  "comment": "这里写评论内容，如果不想评论就留空字符串"');
    userMessageParts.push('}');
    userMessageParts.push('注意：你可以什么都不做（既不点赞也不评论），此时请返回 {"like": false, "comment": ""}。');
    userMessageParts.push('其中 "comment" 字段的值必须是【纯文本的一句话】，禁止包含思考过程、理由说明、代码块、markdown 语法、JSON 字符串或任何额外结构。');
    userMessageParts.push('不要在上面 JSON 之外输出任何内容，不要输出代码块，不要解释你的思路。');

    return {
        systemPrompt: systemPrompt,
        userMessage: userMessageParts.join('\n')
    };
}

function triggerAIReactionToMoment(post) {
    if (!post || typeof post !== 'object') return;
    var profiles = window.charProfiles || {};
    var allRoles = Object.keys(profiles);
    if (!allRoles || !allRoles.length) return;

    var visibility = post && post.visibility ? post.visibility : { type: 'public', list: [] };

    allRoles.forEach(function (roleId) {
        var canSee = true;
        if (visibility && visibility.type) {
            if (visibility.type === 'private') {
                canSee = false;
            } else if (visibility.type === 'allow') {
                if (!visibility.list || visibility.list.indexOf(roleId) === -1) {
                    canSee = false;
                }
            } else if (visibility.type === 'deny') {
                if (visibility.list && visibility.list.indexOf(roleId) !== -1) {
                    canSee = false;
                }
            }
        }
        if (!canSee) return;

        var delay = 3000 + Math.floor(Math.random() * 15000);
        setTimeout(function (targetId) {
            return function () {
                triggerSingleAIReaction(post, targetId);
            };
        }(roleId), delay);
    });
}

function triggerSingleAIReaction(post, aiId) {
    if (!post || typeof post !== 'object') return;
    if (!aiId) return;

    var profiles = window.charProfiles || {};
    var aiProfile = profiles[aiId] || {};

    var data = window.momentsData || initMomentsData();
    var userName = data && data.userName ? data.userName : DEFAULT_MOMENTS_NAME;
    var userPersona = getUserPersonaForRole(aiId);

    var prompts = buildAIReactionPrompt(post, aiId, aiProfile, userName, userPersona);

    if (typeof window.callAI !== 'function') {
        console.warn('callAI not found, skip AI reaction to moment.');
        return;
    }

    try {
        var userPayload = prompts.userMessage;
        if (post && Array.isArray(post.images) && post.images.length > 0) {
            var firstImage = post.images[0];
            if (firstImage && typeof firstImage === 'string') {
                userPayload = {
                    type: 'image',
                    base64: firstImage,
                    text: prompts.userMessage
                };
            }
        }
        window.callAI(
            prompts.systemPrompt,
            [],
            userPayload,
            function (text) {
                if (!text) return;
                var raw = String(text).trim();
                var jsonText = raw;
                if (!jsonText.startsWith('{')) {
                    var start = jsonText.indexOf('{');
                    var end = jsonText.lastIndexOf('}');
                    if (start >= 0 && end > start) {
                        jsonText = jsonText.slice(start, end + 1);
                    }
                }
                var obj = null;
                try {
                    obj = JSON.parse(jsonText);
                } catch (e) {
                    console.warn('AI reaction JSON parse failed:', e, raw);
                    return;
                }
                if (!obj || typeof obj !== 'object') return;
                var like = !!obj.like;
                var commentText = obj.comment != null ? String(obj.comment) : '';
                commentText = sanitizeAIPlainText(commentText);

                var currentData = initMomentsData();
                var postsArr = Array.isArray(currentData.posts) ? currentData.posts : [];
                var idx = postsArr.findIndex(function (p) {
                    return String(p.id || '') === String(post.id || '');
                });
                if (idx === -1) return;
                var target = postsArr[idx];
                if (!Array.isArray(target.likes)) target.likes = [];
                if (!Array.isArray(target.comments)) target.comments = [];

                if (like) {
                    if (target.likes.indexOf(aiId) === -1) {
                        target.likes.push(aiId);
                    }
                }

                if (commentText && commentText.trim()) {
                    target.comments.push({
                        from: aiId,
                        content: commentText.trim()
                    });
                }

                currentData.posts = postsArr;
                window.momentsData = currentData;
                saveMomentsData();
                renderMoments();

                if (commentText && commentText.trim()) {
                    try {
                        var discoverBtn = document.querySelector('.chat-bottom-bar .chat-nav-btn:nth-child(2)');
                        if (discoverBtn) {
                            discoverBtn.setAttribute('data-has-moments-notification', '1');
                            discoverBtn.style.position = 'relative';
                            var dot = discoverBtn.querySelector('.moments-notify-dot');
                            if (!dot) {
                                dot = document.createElement('span');
                                dot.className = 'moments-notify-dot';
                                dot.style.position = 'absolute';
                                dot.style.top = '4px';
                                dot.style.right = '20px';
                                dot.style.width = '6px';
                                dot.style.height = '6px';
                                dot.style.borderRadius = '50%';
                                dot.style.backgroundColor = '#f44';
                                discoverBtn.appendChild(dot);
                            }
                        }
                    } catch (e2) {
                        console.warn('set discover notification failed:', e2);
                    }
                }
            },
            function (err) {
                console.warn('AI reaction to moment failed:', err);
            }
        );
    } catch (e) {
        console.error('triggerSingleAIReaction callAI error:', e);
    }
}

// 🔍 搜索 function sanitizeAIPlainText 并替换为：
function sanitizeAIPlainText(text) {
    if (text == null) return '';
    let s = String(text);

    // === 1. 尝试从 Markdown/JSON 中提取内容 ===
    try {
        let potentialJson = s;
        // 移除 ```json ... ```
        potentialJson = potentialJson.replace(/```(json)?/gi, '').trim();
        
        const start = potentialJson.indexOf('{');
        const end = potentialJson.lastIndexOf('}');
        
        if (start !== -1 && end > start) {
            const jsonBody = potentialJson.substring(start, end + 1);
            const obj = JSON.parse(jsonBody);
            
            // 朋友圈回复常见的字段
            if (obj.comment) s = String(obj.comment);
            else if (obj.reply) s = String(obj.reply);
            else if (obj.content) s = String(obj.content);
            else if (obj.message) s = String(obj.message);
            // 如果解析成功但没有上述字段，s 保持原样 (可能 AI 把内容放在了别的地方，或者本身就不是 JSON)
        }
    } catch (e) {
        // 解析失败，按普通文本处理
    }

    // === 2. 文本清洗 ===
    // 去除 <thinking>
    s = s.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    if (s.indexOf('<thinking>') !== -1) s = s.split('<thinking>')[0];
    
    // 彻底移除剩余的 ```
    s = s.replace(/```/g, '');

    // 移除前缀行
    const lines = s.split('\n');
    const cleanedLines = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        if (/^(思考过程|推理过程|解释|思路|分析|推断|system|assistant)\s*[:：]/i.test(line)) continue;
        cleanedLines.push(line);
    }
    s = cleanedLines.join(' ');
    
    return s.replace(/[ \t]{2,}/g, ' ').trim();
}


function triggerAIResponseToCommentOnAiPost(post, userContent, targetRoleId) {
    if (!post || typeof post !== 'object') return;
    if (!userContent) return;
    if (!targetRoleId) return;
    if (typeof window.callAI !== 'function') {
        console.warn('callAI not found, skip AI response to comment.');
        return;
    }

    var profiles = window.charProfiles || {};
    var aiProfile = profiles[targetRoleId] || {};
    var aiName = aiProfile.nickName || aiProfile.name || targetRoleId;

    var originalText = post.content || '';
    var images = Array.isArray(post.images) ? post.images : [];
    var commentsArr = Array.isArray(post.comments) ? post.comments : [];
    var imageInfo = '';
    if (images.length === 0) {
        imageInfo = '无图片';
    } else if (images.length === 1) {
        imageInfo = '有 1 张图片（模型可以直接理解这张图片的画面内容）';
    } else {
        imageInfo = '有 ' + images.length + ' 张图片（模型可以直接理解这些图片的画面内容）';
    }

    var systemPrompt = typeof window.buildRoleLitePrompt === 'function'
        ? window.buildRoleLitePrompt('moments_comment_reply', targetRoleId, {
            includeContinuity: true,
            maxSummaryLines: 10,
            sceneIntro: '当前场景是用户在角色朋友圈下评论后，角色的轻量回复。',
            taskGuidance: '你需要根据朋友圈原文、评论区上下文和你们的关系，用一句自然的话接住用户的评论。',
            outputInstructions: '只回复一句自然中文，不要前缀、不要解释、不要 JSON、不要代码块。'
        })
        : ('你是朋友圈中的角色「' + aiName + '」。用户刚刚在你发的朋友圈下面评论了一句话，你需要自然地接话。');
    var userMessageParts = [];
    userMessageParts.push('请根据以下上下文，用一句自然的话回复用户：');
    userMessageParts.push('【你的朋友圈内容】' + (originalText || '（无文字，仅图片）'));
    userMessageParts.push('【图片情况】' + imageInfo);
    if (commentsArr.length > 0) {
        var recent = commentsArr.slice(-6).map(function (c) {
            if (!c) return '';
            var fromId = c.from || '';
            var who = fromId === 'me' ? '用户' : (profiles[fromId] && (profiles[fromId].nickName || profiles[fromId].name) ? (profiles[fromId].nickName || profiles[fromId].name) : fromId);
            var ct = c.content != null ? String(c.content) : '';
            return who + '：' + ct;
        }).filter(Boolean).join('\n');
        if (recent) userMessageParts.push('【评论区最近对话】\n' + recent);
    }
    userMessageParts.push('【用户的评论】' + userContent);
    userMessageParts.push('要求：只回复一句话，不要带任何前缀或解释。禁止输出思考过程、分析步骤、代码块、markdown、JSON 或任何额外结构，只输出这句话的正文内容。');
    var userMessage = userMessageParts.join('\n');

    var delay = 2000 + Math.floor(Math.random() * 3000);
    setTimeout(function () {
        try {
            window.callAI(
                systemPrompt,
                [],
                {
                    type: images && images.length > 0 && typeof images[0] === 'string' ? 'image' : undefined,
                    base64: images && images.length > 0 && typeof images[0] === 'string' ? images[0] : undefined,
                    text: userMessage
                },
                function (text) {
                    if (!text) return;
                    var raw = String(text).trim();
                    if (raw.includes('```')) {
                        raw = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
                    }
                    var reply = sanitizeAIPlainText(raw);
                    if (!reply) return;

                    var currentData = initMomentsData();
                    var postsArr = Array.isArray(currentData.posts) ? currentData.posts : [];
                    var idx = postsArr.findIndex(function (p) {
                        return String(p.id || '') === String(post.id || '');
                    });
                    if (idx === -1) return;
                    var targetPost = postsArr[idx];
                    if (!Array.isArray(targetPost.comments)) targetPost.comments = [];

                    var userNameData = currentData && currentData.userName ? currentData.userName : (typeof DEFAULT_MOMENTS_NAME !== 'undefined' ? DEFAULT_MOMENTS_NAME : '');
                    var atName = userNameData || '';
                    if (atName) {
                        var atPrefix = '@' + atName;
                        if (reply.indexOf(atPrefix) !== 0) {
                            reply = atPrefix + ' ' + reply;
                        }
                    }

                    targetPost.comments.push({
                        from: targetRoleId,
                        content: reply
                    });

                    currentData.posts = postsArr;
                    window.momentsData = currentData;
                    saveMomentsData();
                    renderMoments();
                },
                function (err) {
                    console.warn('AI response to comment failed:', err);
                }
            );
        } catch (e) {
            console.error('triggerAIResponseToCommentOnAiPost callAI error:', e);
        }
    }, delay);
}

function triggerAIResponseToReply(post, userContent, targetRoleId) {
    if (!post || typeof post !== 'object') return;
    if (!userContent) return;
    if (!targetRoleId) return;
    if (typeof window.callAI !== 'function') {
        console.warn('callAI not found, skip AI response to reply.');
        return;
    }

    var profiles = window.charProfiles || {};
    var aiProfile = profiles[targetRoleId] || {};
    var aiName = aiProfile.nickName || aiProfile.name || targetRoleId;

    var originalText = post.content || '';
    var images = Array.isArray(post.images) ? post.images : [];
    var commentsArr = Array.isArray(post.comments) ? post.comments : [];
    var imageInfo = '';
    if (images.length === 0) {
        imageInfo = '无图片';
    } else if (images.length === 1) {
        imageInfo = '有 1 张图片（模型可以直接理解这张图片的画面内容）';
    } else {
        imageInfo = '有 ' + images.length + ' 张图片（模型可以直接理解这些图片的画面内容）';
    }

    var previousComment = '';
    if (Array.isArray(post.comments)) {
        for (var i = post.comments.length - 1; i >= 0; i--) {
            var c = post.comments[i];
            if (c && c.from === targetRoleId) {
                previousComment = c.content || '';
                break;
            }
        }
    }

    var systemPrompt = typeof window.buildRoleLitePrompt === 'function'
        ? window.buildRoleLitePrompt('moments_reply_reply', targetRoleId, {
            includeContinuity: true,
            maxSummaryLines: 10,
            sceneIntro: '当前场景是用户回复了角色在朋友圈里的评论。',
            taskGuidance: '你需要根据原贴、你之前的评论和评论区上下文，用一句自然的话继续回复，但不要机械重复上一句观点。',
            outputInstructions: '只回复一句自然中文，不要前缀、不要解释、不要 JSON、不要代码块。'
        })
        : ('你是朋友圈中的角色「' + aiName + '」。用户刚刚在朋友圈中回复了你的评论。');
    var userMessageParts = [];
    userMessageParts.push('请根据以下上下文，用一句自然的话回复用户，不要重复你之前的观点：');
    userMessageParts.push('【朋友圈原贴内容】' + (originalText || '（无文字，仅图片）'));
    userMessageParts.push('【图片情况】' + imageInfo);
    userMessageParts.push('【你之前的评论】' + (previousComment || '（之前没有评论内容）'));
    if (commentsArr.length > 0) {
        var recent = commentsArr.slice(-6).map(function (c) {
            if (!c) return '';
            var fromId = c.from || '';
            var who = fromId === 'me' ? '用户' : (profiles[fromId] && (profiles[fromId].nickName || profiles[fromId].name) ? (profiles[fromId].nickName || profiles[fromId].name) : fromId);
            var ct = c.content != null ? String(c.content) : '';
            return who + '：' + ct;
        }).filter(Boolean).join('\n');
        if (recent) userMessageParts.push('【评论区最近对话】\n' + recent);
    }
    userMessageParts.push('【用户的回复】' + userContent);
    userMessageParts.push('要求：只回复一句话，不要带任何前缀或解释。禁止输出思考过程、分析步骤、代码块、markdown、JSON 或任何额外结构，只输出这句话的正文内容。');

    var userMessage = userMessageParts.join('\n');

    var delay = 2000 + Math.floor(Math.random() * 3000);
    setTimeout(function () {
        try {
            window.callAI(
                systemPrompt,
                [],
                {
                    type: images && images.length > 0 && typeof images[0] === 'string' ? 'image' : undefined,
                    base64: images && images.length > 0 && typeof images[0] === 'string' ? images[0] : undefined,
                    text: userMessage
                },
                function (text) {
                    if (!text) return;
                    var raw = String(text).trim();
                    // 修改点开始：处理 Markdown 包裹的 JSON
                    if (raw.includes('```')) {
                        raw = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
                    }
                    // 修改点结束
                    
                    var reply = raw;
                    // 尝试解析 JSON 提取内容 (借助新的 sanitizeAIPlainText 逻辑)
                    reply = sanitizeAIPlainText(reply);
                    
                    if (!reply) return;

                    var currentData = initMomentsData();
                    var postsArr = Array.isArray(currentData.posts) ? currentData.posts : [];
                    var idx = postsArr.findIndex(function (p) {
                        return String(p.id || '') === String(post.id || '');
                    });
                    if (idx === -1) return;
                    var targetPost = postsArr[idx];
                    if (!Array.isArray(targetPost.comments)) targetPost.comments = [];

                    var userNameData = currentData && currentData.userName ? currentData.userName : (typeof DEFAULT_MOMENTS_NAME !== 'undefined' ? DEFAULT_MOMENTS_NAME : '');
                    var atName = userNameData || '';
                    if (atName) {
                        var atPrefix = '@' + atName;
                        if (reply.indexOf(atPrefix) !== 0) {
                            reply = atPrefix + ' ' + reply;
                        }
                    }

                    targetPost.comments.push({
                        from: targetRoleId,
                        content: reply
                    });

                    currentData.posts = postsArr;
                    window.momentsData = currentData;
                    saveMomentsData();
                    renderMoments();
                },
                function (err) {
                    console.warn('AI response to reply failed:', err);
                }
            );
        } catch (e) {
            console.error('triggerAIResponseToReply callAI error:', e);
        }
    }, delay);
}

window.initMomentsData = initMomentsData;
window.saveMomentsData = saveMomentsData;
window.formatMomentsTime = formatMomentsTime;
window.renderMoments = renderMoments;
window.toggleActionMenu = toggleActionMenu;
window.toggleLike = toggleLike;
window.onClickComment = onClickComment;
window.onReplyComment = onReplyComment;
window.showCommentInput = showCommentInput;
window.submitComment = submitComment;
window.deletePost = deletePost;
window.changeMomentsCover = changeMomentsCover;
window.changeMomentsAvatar = changeMomentsAvatar;
window.previewImage = previewImage;
window.openMomentsPublisher = openMomentsPublisher;

initMomentsData();

var MOMENTS_PROACTIVE_KEY = 'moments_proactive_state_v1';

function loadProactiveState() {
    var raw = null;
    try {
        raw = localStorage.getItem(MOMENTS_PROACTIVE_KEY);
    } catch (e) { }
    if (!raw) return {};
    try {
        var obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') return obj;
    } catch (e2) { }
    return {};
}

function saveProactiveState(state) {
    try {
        localStorage.setItem(MOMENTS_PROACTIVE_KEY, JSON.stringify(state || {}));
    } catch (e) { }
}

function getChatSettingsForRole(roleId) {
    var id = roleId || '';
    if (!id) return {};
    var raw = null;
    try {
        raw = localStorage.getItem('chat_settings_by_role') || '{}';
    } catch (e) { }
    if (!raw) return {};
    try {
        var all = JSON.parse(raw);
        if (all && typeof all === 'object' && all[id] && typeof all[id] === 'object') {
            return all[id];
        }
    } catch (e2) { }
    return {};
}

function isRoleMomentsPostingEnabled(roleId) {
    var settings = getChatSettingsForRole(roleId);
    return settings.momentsPostingEnabled === true;
}

function checkProactiveMomentsTick() {
    var profiles = window.charProfiles || {};
    var roleIds = Object.keys(profiles || {});
    if (!roleIds || !roleIds.length) return;
    var now = Date.now();
    var baseInterval = 60 * 60 * 1000;
    var state = loadProactiveState();
    roleIds.forEach(function (roleId) {
        if (!roleId || roleId === 'me') return;
        if (!isRoleMomentsPostingEnabled(roleId)) return;
        var s = state[roleId] || {};
        var lastCheck = typeof s.lastCheckAt === 'number' ? s.lastCheckAt : 0;
        if (now - lastCheck < baseInterval) return;
        s.lastCheckAt = now;
        state[roleId] = s;
        maybeTriggerRoleProactiveMoment(roleId, s);
    });
    saveProactiveState(state);
}

function maybeTriggerRoleProactiveMoment(roleId, roleState) {
    if (!roleId) return;
    if (typeof window.callAI !== 'function') return;
    var profiles = window.charProfiles || {};
    var profile = profiles[roleId] || {};
    var data = window.momentsData || initMomentsData();
    var postsForLimit = Array.isArray(data.posts) ? data.posts : [];
    var nowTsForLimit = Date.now();
    var dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    var dayStartTs = dayStart.getTime();
    var todayCount = 0;
    for (var i = 0; i < postsForLimit.length; i++) {
        var p = postsForLimit[i];
        if (!p || p.roleId !== roleId) continue;
        var ts = typeof p.timestamp === 'number' ? p.timestamp : 0;
        if (ts >= dayStartTs && ts <= nowTsForLimit) {
            todayCount++;
        }
    }
    var personaTextRaw = profile.desc || profile.persona || profile.prompt || '';
    var personaTextLower = String(personaTextRaw || '');
    var isExtrovert = personaTextLower.indexOf('外向') !== -1
        || personaTextLower.indexOf('开朗') !== -1
        || personaTextLower.indexOf('活泼') !== -1
        || personaTextLower.indexOf('社牛') !== -1;
    var isIntrovert = personaTextLower.indexOf('内向') !== -1
        || personaTextLower.indexOf('安静') !== -1
        || personaTextLower.indexOf('慢热') !== -1
        || personaTextLower.indexOf('害羞') !== -1;
    var maxPerDay = 2;
    if (isExtrovert) maxPerDay = 3;
    else if (isIntrovert) maxPerDay = 2;
    if (todayCount >= maxPerDay) return;
    var userName = data && data.userName ? data.userName : DEFAULT_MOMENTS_NAME;
    var personaText = profile.desc || profile.persona || profile.prompt || '';
    var styleText = profile.style || '';
    var scheduleText = profile.schedule || '';
    var worldbookText = '';
    var wbIds = profile.worldbookId || [];
    if (typeof wbIds === 'string') wbIds = wbIds ? [wbIds] : [];
    
    if (wbIds.length && window.worldBooks) {
        var wbParts = [];
        wbIds.forEach(function(id) {
            var wbId = String(id || '').trim();
            if (!wbId) return;
            if (wbId.indexOf('CATEGORY:') === 0 || wbId.indexOf('cat:') === 0) {
                var targetCat = wbId.includes(':') ? wbId.split(':')[1].trim() : wbId;
                Object.keys(window.worldBooks).forEach(function(bid) {
                    var b = window.worldBooks[bid];
                    if (b && String(b.category || '').trim() === targetCat) {
                        wbParts.push('设定: ' + (b.title || '') + '\n内容: ' + (b.content || ''));
                    }
                });
            } else if (window.worldBooks[wbId]) {
                var wb = window.worldBooks[wbId];
                wbParts.push('世界书标题：' + (wb.title || '') + '\n世界书内容：' + (wb.content || ''));
            }
        });
        worldbookText = wbParts.join('\n---\n');
    }
    var archiveSections = null;
    if (typeof window.getMemoryArchiveSections === 'function') {
        try {
            archiveSections = window.getMemoryArchiveSections(roleId);
        } catch (e) { }
    }
    var archive = archiveSections && archiveSections.archive
        ? archiveSections.archive
        : ((window.memoryArchiveStore && window.memoryArchiveStore[roleId]) ? window.memoryArchiveStore[roleId] : null);
    var likesText = archiveSections && archiveSections.likesText ? archiveSections.likesText : (archive && archive.likesText ? archive.likesText : '');
    var habitsText = archiveSections && archiveSections.habitsText ? archiveSections.habitsText : (archive && archive.habitsText ? archive.habitsText : '');
    var eventsText = archiveSections && archiveSections.eventsText ? archiveSections.eventsText : (archive && archive.eventsText ? archive.eventsText : '');
    var lastPostAt = roleState && typeof roleState.lastPostAt === 'number' ? roleState.lastPostAt : 0;
    var lastPostDesc = lastPostAt ? new Date(lastPostAt).toLocaleString() : '从未发过朋友圈';
    var nowStr = new Date().toLocaleString();

    var rawHistory = window.chatData && Array.isArray(window.chatData[roleId]) ? window.chatData[roleId].slice() : [];
    var cleanHistory = rawHistory.filter(function (msg) {
        if (!msg || typeof msg !== 'object') return false;
        if (msg.hidden === true) return false;
        if (msg.type === 'call_memory') return msg.includeInAI === true;
        if (msg.type === 'system_event') return msg.includeInAI === true;
        return !!msg.content;
    });
    var historyForApi = cleanHistory.slice(-40);
    try {
        if (typeof window.buildApiMemoryHistory === 'function') {
            historyForApi = window.buildApiMemoryHistory(roleId, cleanHistory);
        }
    } catch (e0) { }
    if (!Array.isArray(historyForApi)) historyForApi = [];
    var chatFocusContext = buildMomentsChatFocusContext(cleanHistory, nowTsForLimit, 16, 22);

    var extraCurrentContext = [
        '【当前时间】' + nowStr,
        '【今日已发朋友圈条数】' + String(todayCount),
        '【你上一次主动发朋友圈的时间】' + lastPostDesc,
        '【今天是否和用户聊天】' + (chatFocusContext.hasTodayChat ? '是' : '否'),
        '【今天聊天记录（带日期时间）】\n' + chatFocusContext.todayChatText
    ].join('\n');

    var systemPrompt = typeof window.buildFullChatPrompt === 'function'
        ? window.buildFullChatPrompt('moments_proactive_post', roleId, {
            outputMode: 'plain_json_task',
            history: historyForApi,
            maxSummaryLines: 20,
            extraCurrentContext: extraCurrentContext,
            extraTaskRules: [
                '你要像真实成年人一样判断表达欲，而不是机械定时发圈。',
                '最近聊天状态、关系余温、刚发生的互动，优先级高于静态世界书设定。',
                chatFocusContext.hasTodayChat
                    ? '如果今天和用户有聊天，朋友圈内容应优先围绕今天的互动、今天引发的情绪和今天的生活片段展开。'
                    : '如果今天没有和用户聊天，朋友圈内容应更像你在分享自己的生活，不要硬把几天前的聊天写成今天刚发生。',
                '如果不适合发，就明确选择不发，不要为了完成任务硬凑一条朋友圈。'
            ].join('\n')
        })
        : ('你是微信里的 AI 角色「' + (profile.nickName || profile.name || roleId) + '」。你和用户正在微信里聊天。你需要根据自己的人设、世界书和对话记忆，决定现在要不要主动发一条朋友圈。');

    var msgParts = [];
    msgParts.push('请你结合 system prompt 里给出的最近聊天摘要、关系进展、长期记忆，以及下面这些运行时信息，自主判断现在是否适合发一条新的朋友圈。');
    msgParts.push('当前时间：' + nowStr);
    msgParts.push('用户昵称：' + (userName || '用户'));
    msgParts.push('今日已发朋友圈条数：' + String(todayCount));
    msgParts.push('你上一次主动发朋友圈的时间：' + lastPostDesc);
    msgParts.push('今天是否和用户聊天：' + (chatFocusContext.hasTodayChat ? '是' : '否'));
    if (chatFocusContext.hasTodayChat) {
        msgParts.push('如果今天有聊天，你发的这条朋友圈应优先围绕今天的互动、今天的心情余温或由今天聊天触发的生活感受来写。');
        msgParts.push('【今天聊天记录（带日期时间）】\n' + chatFocusContext.todayChatText);
    } else {
        msgParts.push('如果今天没有聊天，你这条朋友圈应更像在分享自己的生活、状态或当下见闻，不要硬提几天前的旧聊天。');
    }
    msgParts.push('【带日期的近期聊天参考】\n' + chatFocusContext.recentChatText);
    msgParts.push('请严格遵守时间线：看到旧聊天时，不要把它写成今天刚发生。');
    if (personaText && typeof window.buildFullChatPrompt !== 'function') msgParts.push('角色人设：' + personaText);
    if (styleText && typeof window.buildFullChatPrompt !== 'function') msgParts.push('说话风格：' + styleText);
    if (scheduleText && typeof window.buildFullChatPrompt !== 'function') msgParts.push('作息偏好：' + scheduleText);
    if (worldbookText && typeof window.buildFullChatPrompt !== 'function') msgParts.push(worldbookText);
    if (likesText && typeof window.buildFullChatPrompt !== 'function') msgParts.push('关于用户的喜好总结：\n' + likesText);
    if (habitsText && typeof window.buildFullChatPrompt !== 'function') msgParts.push('关于用户的习惯总结：\n' + habitsText);
    if (eventsText && typeof window.buildFullChatPrompt !== 'function') msgParts.push('你和用户的近期聊天记忆/关系进展：\n' + eventsText);
    msgParts.push('请只输出一个 JSON 对象，格式如下：');
    msgParts.push('{');
    msgParts.push('  "should_post": true 或 false,');
    msgParts.push('  "content": "如果要发，这里写朋友圈文案，控制在 50 字以内，纯文本一句话",');
    msgParts.push('  "visibility": "public 或 private 或 friends",');
    msgParts.push('  "mood": "happy 或 neutral 或 sad"');
    msgParts.push('}');
    msgParts.push('要求：');
    msgParts.push('1. 严格只返回上面这个 JSON，不要在前后增加任何解释、思考过程或额外内容。');
    msgParts.push('2. 如果你觉得现在不适合发朋友圈，就返回 {"should_post": false, "content": "", "visibility": "public", "mood": "neutral"}。');
    msgParts.push('3. "content" 必须是纯文本，不要包含表情代码、markdown、换行、JSON 或代码块。');

    var userMessage = msgParts.join('\n');

    window.callAI(
        systemPrompt,
        historyForApi,
        userMessage,
        function (text) {
            if (!text) return;
            var raw = String(text).trim();
            var jsonText = raw;
            if (!jsonText.startsWith('{')) {
                var start = jsonText.indexOf('{');
                var end = jsonText.lastIndexOf('}');
                if (start >= 0 && end > start) {
                    jsonText = jsonText.slice(start, end + 1);
                }
            }
            var obj = null;
            try {
                obj = JSON.parse(jsonText);
            } catch (e) {
                console.warn('AI proactive moment JSON parse failed:', e, raw);
                return;
            }
            if (!obj || typeof obj !== 'object') return;
            var shouldPost = !!obj.should_post;
            var content = obj.content != null ? String(obj.content) : '';
            content = sanitizeAIPlainText(content);
            if (!shouldPost || !content) return;

            var visibilityType = 'public';
            if (obj.visibility === 'private') {
                visibilityType = 'private';
            } else if (obj.visibility === 'friends') {
                visibilityType = 'public';
            }

            var currentData = initMomentsData();
            var posts = Array.isArray(currentData.posts) ? currentData.posts : [];
            var nowTs = Date.now();
            var newPost = {
                id: 'post_ai_' + roleId + '_' + nowTs,
                roleId: roleId,
                content: content,
                images: [],
                timestamp: nowTs,
                location: '',
                mentions: [],
                visibility: { type: visibilityType, list: [] },
                likes: [],
                comments: []
            };
            posts.push(newPost);
            currentData.posts = posts;
            window.momentsData = currentData;
            saveMomentsData();

            var state = loadProactiveState();
            if (!state[roleId]) state[roleId] = {};
            state[roleId].lastPostAt = nowTs;
            saveProactiveState(state);
        },
        function (err) {
            console.warn('AI proactive moment failed:', err);
        }
    );
}

if (!window._momentsProactiveTimer) {
    window._momentsProactiveTimer = setInterval(checkProactiveMomentsTick, 5 * 60 * 1000);
}
