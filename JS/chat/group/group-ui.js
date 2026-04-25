(function () {
  let originalOpenCreator = null;
  let originalLoadWechatChatList = null;
  let originalEnterChat = null;
  let originalTriggerAI = null;
  let originalSendMessage = null;
  let originalResolveMessageSenderName = null;
  let originalCreateMessageRow = null;

  function safeText(value) {
    return String(value || '').trim();
  }

  function getGroupApi() {
    return window.GroupChat || null;
  }

  function isGroupRole(roleId) {
    const api = getGroupApi();
    return !!api && api.isGroupChatRole(roleId);
  }

  function ensureStyle() {
    if (document.getElementById('group-chat-style')) return;
    const style = document.createElement('style');
    style.id = 'group-chat-style';
    style.textContent = `
      .group-chat-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.35);
        backdrop-filter: blur(8px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        padding: 20px;
      }
      .group-chat-overlay.is-open {
        display: flex;
      }
      .group-chat-panel {
        width: min(480px, 100%);
        max-height: 85vh;
        overflow: auto;
        border-radius: 20px;
        background: linear-gradient(180deg, #fffdf6 0%, #fff 100%);
        box-shadow: 0 18px 60px rgba(15, 23, 42, 0.18);
        padding: 20px;
      }
      .group-chat-panel h3 {
        margin: 0 0 8px;
        font-size: 20px;
      }
      .group-chat-panel p {
        margin: 0 0 16px;
        color: #64748b;
        line-height: 1.6;
      }
      .group-chat-actions {
        display: grid;
        gap: 12px;
      }
      .group-chat-action-btn,
      .group-chat-footer button {
        border: 0;
        border-radius: 14px;
        padding: 12px 14px;
        cursor: pointer;
        font-size: 14px;
      }
      .group-chat-action-btn.primary,
      .group-chat-footer .confirm-btn {
        background: #333333;
        color: #fff;
      }
      .group-chat-action-btn.primary:hover,
      .group-chat-footer .confirm-btn:hover {
        background: #222222;
      }
      .group-chat-action-btn.secondary,
      .group-chat-footer .cancel-btn {
        background: #f1f5f9;
        color: #334155;
      }
      .group-chat-action-btn.secondary:hover,
      .group-chat-footer .cancel-btn:hover {
        background: #e2e8f0;
      }
      .group-chat-input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #dbe4f0;
        border-radius: 14px;
        padding: 12px 14px;
        font-size: 14px;
        margin: 8px 0 14px;
        outline: none;
      }
      .group-chat-input:focus {
        border-color: #0f766e;
        box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
      }
      .group-member-list {
        display: grid;
        gap: 10px;
        margin-bottom: 16px;
      }
      .group-member-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 14px;
        background: #f8fafc;
      }
      .group-member-item img {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        object-fit: cover;
        background: #e2e8f0;
      }
      .group-member-main {
        flex: 1;
        min-width: 0;
      }
      .group-member-main strong,
      .group-member-main span {
        display: block;
      }
      .group-member-main span {
        margin-top: 2px;
        color: #64748b;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .group-chat-footer {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      .group-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(15, 118, 110, 0.12);
        color: #0f766e;
        font-size: 11px;
        margin-left: 8px;
      }
      .group-sender-label {
        margin-bottom: 4px;
        color: #0f766e;
        font-size: 12px;
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);
  }

  function closeOverlay(overlay) {
    overlay.classList.remove('is-open');
  }

  function openOverlay(overlay) {
    overlay.classList.add('is-open');
  }

  function ensureCreationMenu() {
    let overlay = document.getElementById('group-chat-create-menu');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'group-chat-create-menu';
    overlay.className = 'group-chat-overlay';
    overlay.innerHTML = `
      <div class="group-chat-panel">
        <h3>创建聊天</h3>
        <p>你可以继续创建单个角色，也可以直接新建一个群聊，把已有角色拉进来开始对话。</p>
        <div class="group-chat-actions">
          <button type="button" class="group-chat-action-btn primary" data-action="group">创建群聊</button>
          <button type="button" class="group-chat-action-btn secondary" data-action="role">创建角色</button>
          <button type="button" class="group-chat-action-btn secondary" style="background:#f1f5f9; color:#475569;" data-action="cancel">取消</button>
        </div>
      </div>
    `;

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeOverlay(overlay);
        return;
      }
      const action = event.target?.dataset?.action;
      if (!action) return;
      closeOverlay(overlay);
      if (action === 'group') {
        openGroupCreator();
      } else if (action === 'role' && typeof originalOpenCreator === 'function') {
        originalOpenCreator();
      }
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function getAvailableCharacters() {
    return Object.entries(window.charProfiles || {})
      .filter(([roleId, profile]) => roleId && profile && !profile.isGroup)
      .map(([roleId, profile]) => {
        return {
          roleId,
          name:
            profile.groupNickname ||
            profile.nickName ||
            profile.name ||
            profile.originalName ||
            roleId,
          persona: profile.persona || profile.description || profile.desc || '',
          avatar: profile.avatar || ''
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureForwardPickerButton(modal) {
    let footer = modal.querySelector('.forward-footer');
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'forward-footer';
      const btn = document.createElement('button');
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
      const box = modal.querySelector('.forward-box');
      if (box) {
        box.appendChild(footer);
      }
    }
    return modal.querySelector('#forward-select-confirm');
  }

  function buildAutoGroupName(memberIds) {
    const chars = getAvailableCharacters().filter((item) => memberIds.includes(item.roleId));
    const names = chars.map((item) => item.name).filter(Boolean);
    if (names.length <= 2) {
      return `${names.join('、')}群`;
    }
    return `${names[0]}等${names.length}人`;
  }

  function openSharedContactPicker(options) {
    const modal = document.getElementById('forward-modal');
    const listContainer = document.getElementById('forward-contact-list');
    if (!modal || !listContainer) {
      window.showToast?.('暂不支持选择联系人');
      return;
    }

    const headerTitle = modal.querySelector('.forward-header span:first-child');
    if (headerTitle) {
      headerTitle.textContent = options?.title || '选择联系人';
    }

    const selected = Array.isArray(options?.initialSelected) ? options.initialSelected.slice() : [];
    const characters = getAvailableCharacters();
    listContainer.innerHTML = '';

    if (!characters.length) {
      listContainer.innerHTML =
        '<div style="padding:20px; text-align:center; color:#999;">暂无可选联系人，请先创建角色</div>';
    } else {
      characters.forEach((item) => {
        const checked = selected.includes(item.roleId);
        const row = document.createElement('div');
        row.className = `forward-item${checked ? ' selected' : ''}`;
        row.innerHTML = `
          <img src="${item.avatar || 'assets/chushitouxiang.jpg'}" class="forward-avatar">
          <span class="forward-name">${escapeHtml(item.name)}</span>
          <span class="forward-check">${checked ? '✓' : ''}</span>
        `;
        row.onclick = function () {
          const idx = selected.indexOf(item.roleId);
          if (idx === -1) {
            selected.push(item.roleId);
          } else {
            selected.splice(idx, 1);
          }
          const nowChecked = selected.includes(item.roleId);
          row.classList.toggle('selected', nowChecked);
          const checkEl = row.querySelector('.forward-check');
          if (checkEl) {
            checkEl.textContent = nowChecked ? '✓' : '';
          }
        };
        listContainer.appendChild(row);
      });
    }

    const confirmBtn = ensureForwardPickerButton(modal);
    if (confirmBtn) {
      confirmBtn.textContent = options?.confirmText || '完成';
      confirmBtn.onclick = function () {
        window.closeForwardModal?.();
        options?.onDone?.(selected.slice());
      };
    }

    modal.style.display = 'flex';
  }

  async function createGroupFromSelectedContacts(memberIds) {
    if (!Array.isArray(memberIds) || memberIds.length < 2) {
      window.showToast?.('至少选择两位联系人');
      return;
    }

    try {
      const groupName = buildAutoGroupName(memberIds);
      const roleId = await getGroupApi().createGroupChat({ name: groupName, memberIds });
      if (typeof window.loadWechatChatList === 'function') {
        window.loadWechatChatList(true);
      }
      if (typeof window.enterChatRoom === 'function') {
        window.enterChatRoom(roleId);
      }
      window.showToast?.('群聊已创建');
    } catch (err) {
      window.showToast?.(err?.message || '创建群聊失败');
    }
  }

  function openGroupCreator() {
    openSharedContactPicker({
      title: '选择群聊联系人',
      confirmText: '创建群聊',
      initialSelected: [],
      onDone: createGroupFromSelectedContacts
    });
  }

  function openChatCreationMenu() {
    openOverlay(ensureCreationMenu());
  }

  function getRoleIdFromChatItem(item) {
    return (
      item?.dataset?.id ||
      item?.dataset?.roleId ||
      item?.dataset?.chatId ||
      safeText(item?.getAttribute?.('data-id')) ||
      (() => {
        const onclick = safeText(item?.getAttribute?.('onclick'));
        const match = onclick.match(/enterChatRoom\(['"](.+?)['"]\)/);
        return match ? match[1] : '';
      })()
    );
  }

  function decorateChatListGroups() {
    const api = getGroupApi();
    if (!api) return;

    document
      .querySelectorAll('[data-is-group="true"]')
      .forEach((item) => {
        const roleId = getRoleIdFromChatItem(item);
        if (!roleId || !api.isGroupChatRole(roleId)) return;

        const titleEl = item.querySelector(
          '.chat-name, .wechat-chat-name, .chat-item-name, .name, .title'
        );
        if (titleEl && !titleEl.querySelector('.group-badge')) {
          const badge = document.createElement('span');
          badge.className = 'group-badge';
          badge.textContent = '群聊';
          titleEl.appendChild(badge);
        }

        const previewEl = item.querySelector(
          '.chat-last-msg, .wechat-last-msg, .chat-item-preview, .desc, .preview'
        );
        if (previewEl) {
          previewEl.textContent = api.getGroupChatPreview(roleId);
        }
      });
  }

  function updateRoomForGroup(roleId) {
    const api = getGroupApi();
    const titleEl = document.getElementById('current-chat-name');
    const heartBtn = document.getElementById('status-heart-btn');
    if (!api || !titleEl || !heartBtn) return;

    if (api.isGroupChatRole(roleId)) {
      const profile = api.getGroupProfile(roleId);
      const members =
        typeof api.getGroupDisplayMembers === 'function'
          ? api.getGroupDisplayMembers(roleId)
          : api.getGroupMembers(roleId);
      titleEl.textContent = `${profile.name || '群聊'} (${members.length})`;
      heartBtn.style.display = 'none';
    } else {
      heartBtn.style.display = '';
    }
  }

  function setAvatarForGroupRow(row, member) {
    if (!row || !member) return;
    const avatarImg = row.querySelector('.msg-avatar img, .message-avatar img, img');
    if (avatarImg && member.avatar) {
      avatarImg.src = member.avatar;
      avatarImg.alt = member.name || '群成员';
    }
  }

  function ensureSenderLabel(row, name, memberId, roleId) {
    if (!row || !name) return;
    const bubble = row.querySelector(
      '.msg-content-wrapper, .message-content-wrapper, .msg-bubble, .message-bubble'
    );
    if (!bubble) return;

    let label = bubble.querySelector('.group-sender-label');
    if (!label) {
      label = document.createElement('div');
      label.className = 'group-sender-label flex items-center gap-1';
      bubble.prepend(label);
    }

    // Check for title
    let titleHtml = '';
    if (roleId && memberId) {
      const settingsProfile = (typeof window.getChatSettingsProfile === 'function') ? window.getChatSettingsProfile(roleId) : null;
      if (settingsProfile && settingsProfile.groupTitleEnabled) {
        const titleText = (settingsProfile.groupMemberTitles && settingsProfile.groupMemberTitles[memberId]) || '';
        if (titleText) {
          const ownerId = String(settingsProfile.groupOwnerId || '').trim();
          const adminIds = Array.isArray(settingsProfile.groupAdminIds) ? settingsProfile.groupAdminIds : [];
          
          let roleColor = 'text-[#AF52DE] bg-[#AF52DE]/10 border-[#AF52DE]/20'; // 紫色
          if (memberId === ownerId) {
            roleColor = 'text-[#F5A623] bg-[#F5A623]/10 border-[#F5A623]/20'; // 金色
          } else if (adminIds.includes(memberId)) {
            roleColor = 'text-[#34C759] bg-[#34C759]/10 border-[#34C759]/20'; // 绿色
          }
          
          titleHtml = `<span class="px-1.5 py-0.5 text-[9px] rounded border ${roleColor} leading-none whitespace-nowrap">${titleText}</span>`;
        }
      }
    }
    
    label.innerHTML = `${titleHtml}<span>${name}</span>`;
  }

  function wrapLoadWechatChatList() {
    if (typeof window.loadWechatChatList !== 'function' || originalLoadWechatChatList) return;
    originalLoadWechatChatList = window.loadWechatChatList;
    window.loadWechatChatList = function (...args) {
      const result = originalLoadWechatChatList.apply(this, args);
      decorateChatListGroups();
      return result;
    };
  }

  function wrapEnterChat() {
    if (typeof window.enterChat !== 'function' || originalEnterChat) return;
    originalEnterChat = window.enterChat;
    window.enterChat = function (...args) {
      const result = originalEnterChat.apply(this, args);
      const roleId = args[0] || window.currentChatRole;
      updateRoomForGroup(roleId);
      return result;
    };
  }

  function wrapTriggerAI() {
    if (typeof window.triggerAI !== 'function' || originalTriggerAI) return;
    originalTriggerAI = window.triggerAI;
    window.triggerAI = function (...args) {
      const roleId = window.currentChatRole;
      if (isGroupRole(roleId)) {
        return getGroupApi().triggerGroupAI(roleId);
      }
      return originalTriggerAI.apply(this, args);
    };
  }

  function wrapSendMessage() {
    if (typeof window.sendMessage !== 'function' || originalSendMessage) return;
    originalSendMessage = window.sendMessage;
    window.sendMessage = function (...args) {
      return originalSendMessage.apply(this, args);
    };
  }

  function wrapResolveMessageSenderName() {
    if (typeof window.resolveMessageSenderName !== 'function' || originalResolveMessageSenderName) return;
    originalResolveMessageSenderName = window.resolveMessageSenderName;
    window.resolveMessageSenderName = function (roleId, msg, ...rest) {
      if (isGroupRole(roleId) && (msg?.role === 'ai' || msg?.role === 'me')) {
        return getGroupApi().getSenderLabel(roleId, msg);
      }
      return originalResolveMessageSenderName.call(this, roleId, msg, ...rest);
    };
  }

  function wrapCreateMessageRow() {
    if (typeof window.createMessageRow !== 'function' || originalCreateMessageRow) return;
    originalCreateMessageRow = window.createMessageRow;
    window.createMessageRow = function (msg, ...rest) {
      const row = originalCreateMessageRow.call(this, msg, ...rest);
      const roleId = window.currentChatRole;
      if (!isGroupRole(roleId)) {
        return row;
      }
      
      if (msg?.role === 'ai') {
        const member = getGroupApi().resolveGroupMessageSender(roleId, msg);
        setAvatarForGroupRow(row, member);
        ensureSenderLabel(row, member?.name || msg?.senderName || '群成员', member?.roleId || msg?.senderRoleId, roleId);
      } else if (msg?.role === 'me') {
        const me =
          typeof getGroupApi().getUserDisplayMember === 'function'
            ? getGroupApi().getUserDisplayMember(roleId)
            : { name: '我', avatar: '' };
        setAvatarForGroupRow(row, me);
        ensureSenderLabel(row, me.name || '我', 'me', roleId);
        // User messages are usually right-aligned, adjust label alignment if needed
        const label = row.querySelector('.group-sender-label');
        if (label) {
          label.style.display = 'flex';
          label.style.justifyContent = 'flex-end';
        }
      }
      
      return row;
    };
  }

  function bindTopPlusButton() {
    const btn = document.getElementById('top-plus-btn');
    if (!btn) return;
    btn.onclick = openChatCreationMenu;
  }

  function boot() {
    ensureStyle();
    originalOpenCreator = typeof window.openCreator === 'function' ? window.openCreator : null;
    window.openChatCreationMenu = openChatCreationMenu;
    window.openGroupCreator = openGroupCreator;
    window.startGroupChatCreationFlow = openGroupCreator;
    wrapLoadWechatChatList();
    wrapEnterChat();
    wrapTriggerAI();
    wrapSendMessage();
    wrapResolveMessageSenderName();
    wrapCreateMessageRow();
    bindTopPlusButton();
    decorateChatListGroups();
    updateRoomForGroup(window.currentChatRole);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
