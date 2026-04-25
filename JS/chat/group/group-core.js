(function () {
  const GROUP_ID_PREFIX = 'group_';

  function nowTs() {
    return Date.now();
  }

  function makeId(prefix) {
    return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeObject(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function getProfiles() {
    return safeObject(window.charProfiles);
  }

  function getChatStore() {
    if (!window.chatData || typeof window.chatData !== 'object') {
      window.chatData = {};
    }
    return window.chatData;
  }

  function getUnreadStore() {
    if (!window.chatUnread || typeof window.chatUnread !== 'object') {
      window.chatUnread = {};
    }
    return window.chatUnread;
  }

  function getUserPersonas() {
    if (!window.userPersonas || typeof window.userPersonas !== 'object') {
      window.userPersonas = {};
    }
    return window.userPersonas;
  }

  function ensureGroupProfile(roleId) {
    return safeObject(getProfiles()[roleId]);
  }

  function getMemberProfile(roleId) {
    return safeObject(getProfiles()[roleId]);
  }

  function normalizeMemberIds(memberIds) {
    return Array.from(new Set(safeArray(memberIds).filter((id) => {
      const profile = getProfiles()[id];
      return !!id && !!profile && !profile.isGroup;
    })));
  }

  function getUserProfileForGroup(roleId) {
    const personas = getUserPersonas();
    const fallback =
      (typeof window.getCurrentUserProfile === 'function' && window.getCurrentUserProfile()) ||
      {};
    return safeObject(personas[roleId]) && Object.keys(personas[roleId] || {}).length
      ? personas[roleId]
      : fallback;
  }

  function hasGroupUserIdentity(profile) {
    const source = safeObject(profile);
    return !!String(
      source.groupNickname ||
      source.nickname ||
      source.nickName ||
      source.displayName ||
      source.originalName ||
      source.name ||
      source.avatar ||
      ''
    ).trim();
  }

  function getDisplayName(profile, fallbackName) {
    const source = safeObject(profile);
    return (
      source.groupNickname ||
      source.nickname ||
      source.nickName ||
      source.displayName ||
      source.originalName ||
      source.name ||
      fallbackName ||
      '未命名成员'
    );
  }

  function getMemberIds(roleId) {
    const profile = ensureGroupProfile(roleId);
    return normalizeMemberIds(profile.memberIds || profile.members);
  }

  function getMembers(roleId) {
    return getMemberIds(roleId).map((memberId) => {
      const profile = getMemberProfile(memberId);
      return {
        roleId: memberId,
        name: getDisplayName(profile, memberId),
        originalName: profile.originalName || profile.name || memberId,
        avatar: profile.avatar || '',
        persona: profile.persona || profile.description || profile.desc || '',
        raw: profile
      };
    });
  }

  function getUserDisplayMember(roleId) {
    const personas = getUserPersonas();
    const scoped = safeObject(personas[roleId]);
    const hasIdentity = hasGroupUserIdentity(scoped);
    const displayProfile = hasIdentity ? scoped : {};
    const name = getDisplayName(displayProfile, '我');
    return {
      roleId: 'me',
      name: name || '我',
      originalName:
        displayProfile.originalName ||
        displayProfile.name ||
        displayProfile.nickname ||
        displayProfile.groupNickname ||
        name ||
        '我',
      avatar: displayProfile.avatar || 'assets/chushitouxiang.jpg',
      persona: displayProfile.persona || displayProfile.description || displayProfile.desc || '',
      raw: displayProfile
    };
  }

  function getDisplayMembers(roleId) {
    return [getUserDisplayMember(roleId)].concat(getMembers(roleId));
  }

  function normalizeNameToken(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[【】\[\]（）()\-_.·,，:：]/g, '');
  }

  function matchGroupMember(roleId, hints) {
    const members = getMembers(roleId);
    const normalizedHints = safeArray(hints)
      .map((value) => normalizeNameToken(value))
      .filter(Boolean);

    if (!normalizedHints.length) {
      return members[0] || null;
    }

    return (
      members.find((member) => {
        const tokens = [
          member.roleId,
          member.name,
          member.originalName,
          member.raw?.groupNickname,
          member.raw?.nickName,
          member.raw?.name
        ]
          .map((value) => normalizeNameToken(value))
          .filter(Boolean);

        return normalizedHints.some((hint) => {
          return tokens.some((token) => token === hint || token.includes(hint) || hint.includes(token));
        });
      }) ||
      members[0] ||
      null
    );
  }

  function isGroupChatRole(roleId) {
    if (!roleId) return false;
    const profile = ensureGroupProfile(roleId);
    return !!profile.isGroup || String(roleId).startsWith(GROUP_ID_PREFIX);
  }

  function resolveGroupMessageSender(roleId, msg) {
    return matchGroupMember(roleId, [msg?.senderRoleId, msg?.senderName, msg?.name]);
  }

  function getSenderLabel(roleId, msg) {
    if (!msg) return '';
    if (msg.role === 'me') {
      return getUserDisplayMember(roleId).name || '我';
    }
    const member = resolveGroupMessageSender(roleId, msg);
    return member ? member.name : '群成员';
  }

  function getHistory(roleId) {
    return safeArray(getChatStore()[roleId]);
  }

  function getMessageText(msg) {
    function stringifyMessageValue(value) {
      if (value == null) return '';
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      if (Array.isArray(value)) {
        return value
          .map((item) => stringifyMessageValue(item))
          .filter(Boolean)
          .join('\n')
          .trim();
      }
      if (typeof value === 'object') {
        const candidate =
          value.message != null ? value.message :
          value.content != null ? value.content :
          value.text != null ? value.text :
          value.reply_content != null ? value.reply_content :
          value.analysis != null ? value.analysis :
          value.strategy != null ? value.strategy :
          '';
        const nested = candidate && candidate !== value ? stringifyMessageValue(candidate) : '';
        if (nested) return nested;
        try {
          return JSON.stringify(value);
        } catch (err) {
          return String(value);
        }
      }
      return String(value).trim();
    }

    if (typeof window.ensureMessageContent === 'function') {
      return stringifyMessageValue(window.ensureMessageContent(msg));
    }
    if (msg?.content != null) return stringifyMessageValue(msg.content);
    if (msg?.text != null) return stringifyMessageValue(msg.text);
    return stringifyMessageValue(msg);
  }

  function mapHistoryForApi(roleId) {
    const history = getHistory(roleId);
    const visible = history.filter((msg) => {
      return !msg?.isDeleted && !msg?.deleted && !msg?.hidden && !msg?.isRecall;
    });

    if (!visible.length) {
      return { apiHistory: [], latestUserText: '' };
    }

    const latestMessage = visible[visible.length - 1];
    const apiHistory = visible.map((msg) => {
      const text = getMessageText(msg);
      const senderLabel = getSenderLabel(roleId, msg);
      const timestampTag = msg?.timestamp != null ? `[ts=${String(msg.timestamp).trim()}]` : '';
      return {
        role: msg.role === 'me' ? 'me' : 'ai',
        content: [timestampTag, senderLabel ? `【${senderLabel}】${text}` : text].filter(Boolean).join('')
      };
    });

    if (latestMessage.role === 'me') {
      apiHistory.pop();
      const timestampTag = latestMessage?.timestamp != null ? `[ts=${String(latestMessage.timestamp).trim()}]` : '';
      const latestUserText = `${timestampTag}【${getSenderLabel(roleId, latestMessage)}】${getMessageText(latestMessage)}`;
      return { apiHistory, latestUserText };
    }

    return { apiHistory, latestUserText: '' };
  }

  function buildGroupPrompt(roleId) {
    const profile = ensureGroupProfile(roleId);
    const members = getMembers(roleId);
    const me = getUserProfileForGroup(roleId);
    const memberBlock = members.length
      ? members
          .map((member, index) => {
            const persona = String(member.persona || 'N/A').trim();
            return `${index + 1}. roleId=${member.roleId}; originalName=${member.originalName}; groupName=${member.name}; persona=${persona}`;
          })
          .join('\n')
      : 'No members';
    const myNickname = getDisplayName(me, 'User');
    const myOriginalName = me.originalName || me.name || myNickname;
    const groupName = profile.nickName || profile.name || 'Group Chat';
    const groupDesc = String(profile.persona || profile.desc || profile.description || '').trim();
    
    // 构建群头衔信息给 AI
    let titleInfo = '';
    const settingsProfile = (typeof window.getChatSettingsProfile === 'function') ? window.getChatSettingsProfile(roleId) : null;
    if (settingsProfile && settingsProfile.groupTitleEnabled && settingsProfile.groupMemberTitles) {
      const titles = Object.entries(settingsProfile.groupMemberTitles).map(([uid, title]) => {
        const uName = uid === 'me' ? myOriginalName : (getMemberProfile(uid).name || uid);
        return `${uName}: ${title}`;
      }).join(', ');
      if (titles) {
        titleInfo = `\n# Group Titles\nCurrent member titles (members will react to these titles if recently changed or mentioned):\n${titles}`;
      }
    }

    return [
      '[[PROMPT_CLASS:ROLE_JSON_TASK]]',
      '[[SCENE:WECHAT_GROUP_V1]]',
      '# Core Mission: Group Chat Director',
      `You are a group chat director. In chat "${groupName}", you play all roles except the user.`,
      groupDesc ? `Group description: ${groupDesc}` : '',
      titleInfo,
      '# Output Contract',
      '- Output must be a JSON array only.',
      '- First element must be {"type":"thought_chain", ...}.',
      '- Action items come after thought_chain.',
      '# Role Rules',
      `- User nickname is "${myNickname}", legal name is "${myOriginalName}".`,
      '- CRITICAL: Characters MUST strictly speak in the language specified or implied by their persona. If a character is foreign or set to speak a foreign language, they MUST reply in that foreign language.',
      '- If a character speaks a foreign language, their message MUST use this format: "Foreign text「Chinese translation」" (e.g., "Of course!「当然！」").',
      '- Characters should reply to each other naturally, reacting to both the user and other group members.',
      '- When a character speaks, they should generate 2 to 5 messages to make the conversation feel rich and continuous. You can split their words into multiple "text" or "quote_reply" objects.',
      '- You can and SHOULD use "quote_reply" to quote other group members\' messages, not just the user\'s. Find their timestamps in the context history.',
      '- Create lively cross-character interactions (e.g., A says something, B quotes A and teases them, C chimes in).',
      '- Not everyone must talk each round.',
      '- Never reveal being an AI model.',
      '# Allowed Actions',
      '- text: {"type":"text","name":"original role name","message":"..."}',
      '- voice_message: {"type":"voice_message","name":"original role name","content":"..."}',
      '- quote_reply: {"type":"quote_reply","name":"original role name","target_timestamp":"existing timestamp","reply_content":"..."}',
      '- system_message: {"type":"system_message","content":"..."}',
      '- send_and_recall: {"type":"send_and_recall","name":"original role name","content":"..."}',
      '- change_group_name: {"type":"change_group_name","name":"original role name","new_name":"..."}',
      '- location_share: {"type":"location_share","name":"original role name","content":"..."}',
      '- sticker: {"type":"sticker","name":"original role name","meaning":"..."}',
      `- send_private_message: {"type":"send_private_message","name":"original role name","recipient":"${myOriginalName}","content":["..."]}`,
      '# Hard Constraints',
      '- name must match a real member originalName from member list.',
      '- Do not output markdown, explanation, or any text outside JSON array.',
      '- Never output diagnostics: token count, usage, prompt tokens, completion tokens, trace, debug.',
      '- If action planning fails, still output thought_chain plus 1-3 text items.',
      '# Group Members',
      memberBlock,
      '# Output Example',
      '[{"type":"thought_chain","analysis":"A confirms, B follows up","strategy":"respond then ask","character_thoughts":{"A":"confirm first","B":"follow up"}},{"type":"text","name":"A","message":"I am here, what happened?"},{"type":"quote_reply","name":"B","target_timestamp":"[ts=12345]","reply_content":"I agree with A, let\'s do this."}]'
    ]
      .filter(Boolean)
      .join('\n');
  }

  function buildGroupRequestDebug(roleId) {
    const mapped = mapHistoryForApi(roleId);
    const apiHistory =
      typeof window.buildApiMemoryHistory === 'function'
        ? window.buildApiMemoryHistory(roleId, mapped.apiHistory)
        : mapped.apiHistory;
    return {
      systemPrompt: buildGroupPrompt(roleId),
      apiHistory,
      userMessage: mapped.latestUserText || 'Please continue the group chat based on context.',
      roleId,
      groupName: ensureGroupProfile(roleId).nickName || ensureGroupProfile(roleId).name || ''
    };
  }

  function normalizeGroupActionType(type) {
    const token = String(type || 'text').trim().toLowerCase();
    if (!token) return 'text';
    if (token === 'voice' || token === 'voice_message') return 'voice_message';
    if (token === 'system' || token === 'system_message') return 'system_message';
    if (token === 'quote_reply' || token === 'quote') return 'quote_reply';
    if (token === 'send_and_recall' || token === 'recall') return 'send_and_recall';
    if (token === 'change_group_name' || token === 'rename_group') return 'change_group_name';
    if (token === 'change_group_avatar' || token === 'set_group_avatar') return 'change_group_avatar';
    if (token === 'location_share' || token === 'location') return 'location_share';
    if (token === 'private_message' || token === 'send_private_message') return 'send_private_message';
    return token;
  }

  function readActionText(item, keys) {
    const source = item && typeof item === 'object' ? item : {};
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (source[key] != null) {
        return getMessageText({ content: source[key] });
      }
    }
    return '';
  }

  function makeGroupChatMessage(roleId, member, options) {
    const cfg = safeObject(options);
    const timestamp = cfg.timestamp != null ? cfg.timestamp : nowTs();
    return {
      role: cfg.role || 'ai',
      type: cfg.type || 'text',
      content: cfg.content || '',
      senderRoleId: member?.roleId || cfg.senderRoleId || '',
      senderName: member?.name || cfg.senderName || cfg.name || '群成员',
      senderAvatar: member?.avatar || cfg.senderAvatar || '',
      timestamp,
      status: cfg.status || 'sent',
      quoteId: cfg.quoteId || undefined,
      quote: cfg.quote || undefined,
      quoteText: cfg.quoteText || undefined,
      quoteSourceText: cfg.quoteSourceText || undefined
    };
  }

  function buildSystemEventMessage(text, timestamp) {
    return {
      role: 'system',
      type: 'system_event',
      content: String(text || '').trim(),
      timestamp: timestamp != null ? timestamp : nowTs(),
      status: 'sent'
    };
  }

  function normalizeMuteUntil(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function normalizeGroupMuteAllState(profile) {
    const source = safeObject(profile);
    if (typeof source.groupMuteAll === 'boolean') {
      return { enabled: source.groupMuteAll, until: null };
    }
    const row = safeObject(source.groupMuteAll);
    return {
      enabled: row.enabled === true || row.active === true,
      until: normalizeMuteUntil(row.until)
    };
  }

  function normalizeGroupMutedMembersState(profile) {
    const source = safeObject(profile);
    const out = {};
    const legacyIds = Array.isArray(source.groupMutedMemberIds) ? source.groupMutedMemberIds : [];
    legacyIds.forEach((id) => {
      const key = String(id || '').trim();
      if (!key) return;
      out[key] = { until: null };
    });
    const rows = safeObject(source.groupMutedMembers);
    Object.keys(rows).forEach((key) => {
      const memberId = String(key || '').trim();
      if (!memberId) return;
      out[memberId] = { until: normalizeMuteUntil(rows[key]?.until) };
    });
    return out;
  }

  function isMuteRecordActive(record, now) {
    const row = safeObject(record);
    const hasEnabledFlag = typeof row.enabled === 'boolean' || typeof row.active === 'boolean';
    const enabled = row.enabled === true || row.active === true;
    const until = normalizeMuteUntil(row.until);
    if (until != null) {
      return until > now && (hasEnabledFlag ? enabled : true);
    }
    return hasEnabledFlag ? enabled : Object.keys(row).length > 0;
  }

  function getGroupMuteState(roleId) {
    const profile = ensureGroupProfile(roleId);
    return {
      muteAll: normalizeGroupMuteAllState(profile),
      mutedMembers: normalizeGroupMutedMembersState(profile)
    };
  }

  function isGroupMuteAllActive(roleId, now) {
    return isMuteRecordActive(getGroupMuteState(roleId).muteAll, now || nowTs());
  }

  function isGroupMemberMuted(roleId, memberId, now) {
    const memberKey = String(memberId || '').trim();
    if (!memberKey) return isGroupMuteAllActive(roleId, now);
    const ts = now || nowTs();
    if (isGroupMuteAllActive(roleId, ts)) return true;
    const state = getGroupMuteState(roleId);
    return isMuteRecordActive(state.mutedMembers[memberKey], ts);
  }

  function canGroupMemberSpeak(roleId, memberId, now) {
    return !isGroupMemberMuted(roleId, memberId, now);
  }

  function filterGroupAiPayloadByMute(roleId, payload) {
    const source = safeObject(payload);
    const ts = nowTs();
    return {
      thoughtChain: source.thoughtChain || null,
      messages: safeArray(source.messages).filter((msg) => {
        if (!msg || typeof msg !== 'object') return false;
        const senderRoleId = String(msg.senderRoleId || '').trim();
        if (senderRoleId) {
          return canGroupMemberSpeak(roleId, senderRoleId, ts);
        }
        if (msg.role !== 'ai') return true;
        return !isGroupMuteAllActive(roleId, ts);
      }),
      effects: safeArray(source.effects).filter((effect) => {
        if (!effect || typeof effect !== 'object') return false;
        const senderRoleId = String(effect.senderRoleId || '').trim();
        if (!senderRoleId) {
          return !isGroupMuteAllActive(roleId, ts);
        }
        return canGroupMemberSpeak(roleId, senderRoleId, ts);
      })
    };
  }

  function findGroupMessageByTimestamp(roleId, targetTimestamp) {
    let token = String(targetTimestamp || '').trim();
    if (!token) return null;
    // 如果 AI 包含了 [ts=...] 格式，将其提取出纯数字
    const tsMatch = token.match(/\[ts=(.+?)\]/);
    if (tsMatch) {
      token = tsMatch[1].trim();
    }
    
    const history = getHistory(roleId);
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const msg = history[i];
      if (!msg) continue;
      if (String(msg.timestamp || '').trim() === token) {
        return msg;
      }
    }
    return null;
  }

  function buildQuotePayload(roleId, targetTimestamp) {
    const target = findGroupMessageByTimestamp(roleId, targetTimestamp);
    if (!target) return null;
    const quoteId =
      (typeof window.ensureChatMessageId === 'function' && window.ensureChatMessageId(target)) ||
      String(target.id || '').trim() ||
      undefined;
    return {
      quoteId,
      quote: {
        name: getSenderLabel(roleId, target),
        text: getMessageText(target)
      },
      quoteText: getMessageText(target),
      quoteSourceText: getMessageText(target)
    };
  }

  function normalizeGroupAction(roleId, item, member) {
    const type = normalizeGroupActionType(item?.type);
    const actorName = member?.name || readActionText(item, ['name']) || '群成员';
    const timestamp = item?.timestamp != null ? item.timestamp : nowTs();

    if (type === 'thought_chain') {
      return { thoughtChain: item, messages: [], effects: [] };
    }

    if (type === 'text') {
      const text = readActionText(item, ['message', 'content', 'text', 'reply']);
      if (!text) return null;
      return {
        messages: [makeGroupChatMessage(roleId, member, { type: 'text', content: text, timestamp, name: actorName })],
        effects: []
      };
    }

    if (type === 'voice_message') {
      const text = readActionText(item, ['content', 'message', 'text']);
      if (!text) return null;
      return {
        messages: [makeGroupChatMessage(roleId, member, { type: 'voice', content: text, timestamp, name: actorName })],
        effects: []
      };
    }

    if (type === 'quote_reply') {
      const text = readActionText(item, ['reply_content', 'content', 'message', 'text']);
      if (!text) return null;
      const quotePayload = buildQuotePayload(roleId, item?.target_timestamp || item?.targetTimestamp);
      return {
        messages: [
          makeGroupChatMessage(roleId, member, Object.assign({
            type: 'text',
            content: text,
            timestamp,
            name: actorName
          }, quotePayload || {}))
        ],
        effects: []
      };
    }

    if (type === 'system_message') {
      const text = readActionText(item, ['content', 'message', 'text']);
      if (!text) return null;
      const systemMessage = buildSystemEventMessage(text, timestamp);
      systemMessage.senderRoleId = member?.roleId || '';
      return { messages: [systemMessage], effects: [] };
    }

    if (type === 'send_and_recall') {
      const systemMessage = buildSystemEventMessage(`${actorName}撤回了一条消息`, timestamp);
      systemMessage.senderRoleId = member?.roleId || '';
      return {
        messages: [systemMessage],
        effects: []
      };
    }

    if (type === 'change_group_name') {
      const newName = readActionText(item, ['new_name', 'newName', 'content']);
      if (!newName) return null;
      const systemMessage = buildSystemEventMessage(`${actorName}修改群名为“${newName}”`, timestamp);
      systemMessage.senderRoleId = member?.roleId || '';
      return {
        messages: [systemMessage],
        effects: [{ type: 'change_group_name', newName, senderRoleId: member?.roleId || '' }]
      };
    }

    if (type === 'change_group_avatar') {
      const avatarName = readActionText(item, ['avatar_name', 'avatarName', 'content']);
      if (!avatarName) return null;
      const systemMessage = buildSystemEventMessage(`${actorName}修改了群头像：${avatarName}`, timestamp);
      systemMessage.senderRoleId = member?.roleId || '';
      return {
        messages: [systemMessage],
        effects: [{ type: 'change_group_avatar', avatarName, senderRoleId: member?.roleId || '' }]
      };
    }

    if (type === 'location_share') {
      const place = readActionText(item, ['content', 'message', 'name']);
      if (!place) return null;
      return {
        messages: [
          makeGroupChatMessage(roleId, member, {
            type: 'location',
            content: JSON.stringify({ name: place, address: '' }),
            timestamp,
            name: actorName
          })
        ],
        effects: []
      };
    }

    if (type === 'sticker') {
      const meaning = readActionText(item, ['meaning', 'content', 'message']);
      if (!meaning) return null;
      return {
        messages: [makeGroupChatMessage(roleId, member, { type: 'text', content: `[表情] ${meaning}`, timestamp, name: actorName })],
        effects: []
      };
    }

    if (type === 'ai_image') {
      const desc = readActionText(item, ['description', 'content', 'message', 'image_prompt']);
      if (!desc) return null;
      return {
        messages: [makeGroupChatMessage(roleId, member, { type: 'text', content: `[图片] ${desc}`, timestamp, name: actorName })],
        effects: []
      };
    }

    if (type === 'send_private_message') {
      const privateText = readActionText(item, ['content', 'message', 'text']);
      if (!privateText) return null;
      const systemMessage = buildSystemEventMessage(`${actorName}悄悄给你发来了一条私信：${privateText}`, timestamp);
      systemMessage.senderRoleId = member?.roleId || '';
      return {
        messages: [systemMessage],
        effects: []
      };
    }

    const fallbackText = readActionText(item, ['message', 'content', 'text', 'reply_content', 'meaning', 'description']);
    if (!fallbackText) return null;
    return {
      messages: [makeGroupChatMessage(roleId, member, { type: 'text', content: fallbackText, timestamp, name: actorName })],
      effects: []
    };
  }

  function tryParseJsonArray(rawText) {
    const text = String(rawText || '').trim();
    if (!text) return null;

    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : text;

    try {
      const direct = JSON.parse(candidate);
      if (Array.isArray(direct)) return direct;
    } catch (err) {}

    const arrayMatch = candidate.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return null;

    try {
      const parsed = JSON.parse(arrayMatch[0]);
      return Array.isArray(parsed) ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function isDiagnosticGroupLine(text) {
    const value = String(text || '').trim();
    if (!value) return true;
    return /^(token\s*count|usage|prompt\s*tokens?|completion\s*tokens?|debug|trace)\b/i.test(value) ||
      /token\s*count\s*[:=]/i.test(value) ||
      /\b(prompt|completion)\s*tokens?\b/i.test(value);
  }

  function cleanGroupFallbackLine(text) {
    return String(text || '')
      .replace(/\u0060\u0060\u0060[\s\S]*?\u0060\u0060\u0060/g, ' ')
      .replace(/^[#>*\-\s]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildGroupFallbackMessages(members, rawText) {
    const lines = String(rawText || '')
      .split(/\r?\n+/)
      .map((line) => cleanGroupFallbackLine(line))
      .filter((line) => line && !isDiagnosticGroupLine(line))
      .slice(0, 3);

    if (!lines.length) {
      const first = members[0] || null;
      return [
        {
          role: 'ai',
          type: 'text',
          content: '我在，刚看到消息。你想先聊哪件事？',
          senderRoleId: first?.roleId || '',
          senderName: first?.name || '群成员',
          senderAvatar: first?.avatar || '',
          timestamp: nowTs(),
          status: 'sent'
        }
      ];
    }

    return lines.map((line, index) => {
      const member = members[index % Math.max(members.length, 1)] || null;
      return {
        role: 'ai',
        type: 'text',
        content: line,
        senderRoleId: member?.roleId || '',
        senderName: member?.name || '群成员',
        senderAvatar: member?.avatar || '',
        timestamp: nowTs(),
        status: 'sent'
      };
    });
  }

  function parseGroupAiResponse(rawText, roleId) {
    const members = getMembers(roleId);
    const parsed = tryParseJsonArray(rawText);

    if (Array.isArray(parsed) && parsed.length) {
      const messages = [];
      const effects = [];
      let thoughtChain = null;

      parsed.forEach((item, index) => {
        const member =
          matchGroupMember(roleId, [
            item?.senderRoleId,
            item?.roleId,
            item?.name,
            item?.speaker,
            item?.sender
          ]) ||
          members[index % Math.max(members.length, 1)] ||
          null;
        const normalized = normalizeGroupAction(roleId, item, member);
        if (!normalized) return;
        if (normalized.thoughtChain && !thoughtChain) {
          thoughtChain = normalized.thoughtChain;
        }
        safeArray(normalized.messages).forEach((msg) => {
          if (msg && typeof msg === 'object') messages.push(msg);
        });
        safeArray(normalized.effects).forEach((effect) => {
          if (effect && typeof effect === 'object') effects.push(effect);
        });
      });

      const filtered = messages.filter((msg) => !isDiagnosticGroupLine(getMessageText(msg)));
      if (filtered.length || effects.length || thoughtChain) {
        return {
          messages: filtered.length ? filtered : (effects.length ? [] : buildGroupFallbackMessages(members, rawText)),
          effects,
          thoughtChain
        };
      }
    }

    return { messages: buildGroupFallbackMessages(members, rawText), effects: [], thoughtChain: null };
  }

  async function createGroupChat(options) {
    const groupName = String(options?.name || '').trim();
    const memberIds = normalizeMemberIds(options?.memberIds);

    if (!groupName) {
      throw new Error('群名称不能为空');
    }
    if (memberIds.length < 2) {
      throw new Error('至少选择两位角色才能创建群聊');
    }

    const groupId = makeId(GROUP_ID_PREFIX);
    const firstAvatar = getMemberProfile(memberIds[0]).avatar || '';

    getProfiles()[groupId] = {
      id: groupId,
      name: groupName,
      nickName: groupName,
      avatar: firstAvatar,
      isGroup: true,
      memberIds,
      groupOwnerId: 'me',
      persona: `${groupName} 群聊`,
      description: `${memberIds.length} 位角色的群聊`
    };

    getChatStore()[groupId] = [];
    getUnreadStore()[groupId] = 0;

    const personas = getUserPersonas();
    if (!personas[groupId]) {
      personas[groupId] = {};
    }

    if (typeof window.saveData === 'function') {
      await window.saveData();
    }

    return groupId;
  }

  function getGroupChatPreview(roleId) {
    const history = getHistory(roleId);
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const msg = history[i];
      const text = getMessageText(msg);
      if (!text) continue;
      return `${getSenderLabel(roleId, msg)}: ${text}`;
    }
    return '群成员开始聊天吧';
  }

  async function pushGroupMessages(roleId, messages) {
    for (const msg of messages) {
      if (typeof window.pushRoleMessageToDataAndActiveView === 'function') {
        window.pushRoleMessageToDataAndActiveView(roleId, msg);
      } else {
        getHistory(roleId).push(msg);
      }
    }

    if (typeof window.saveData === 'function') {
      await window.saveData();
    }
    if (typeof window.loadWechatChatList === 'function') {
      window.loadWechatChatList(true);
    }
  }

  async function pushSystemEvent(roleId, text, timestamp) {
    const content = String(text || '').trim();
    if (!content) return null;
    const msg = buildSystemEventMessage(content, timestamp);
    await pushGroupMessages(roleId, [msg]);
    return msg;
  }

  async function applyGroupEffects(roleId, effects) {
    const profile = ensureGroupProfile(roleId);
    let changed = false;
    safeArray(effects).forEach((effect) => {
      if (!effect || typeof effect !== 'object') return;
      if (effect.type === 'change_group_name' && effect.newName) {
        profile.name = effect.newName;
        profile.nickName = effect.newName;
        changed = true;
      }
      if (effect.type === 'change_group_avatar' && effect.avatarName) {
        profile.groupAvatarLabel = effect.avatarName;
        changed = true;
      }
    });
    if (changed && typeof window.saveData === 'function') {
      await window.saveData();
    }
    if (changed && typeof window.loadWechatChatList === 'function') {
      window.loadWechatChatList(true);
    }
    return changed;
  }

  async function triggerGroupAI(roleId) {
    if (!isGroupChatRole(roleId)) return;

    const requestId = makeId('group_ai_');
    const titleEl = document.getElementById('current-chat-name');
    const previousTitle = titleEl ? titleEl.textContent : '';

    if (typeof window.setChatAiRequestInFlight === 'function') {
      window.setChatAiRequestInFlight(roleId, requestId);
    }
    if (titleEl) {
      titleEl.textContent = `${ensureGroupProfile(roleId).name || '群聊'} · 成员输入中...`;
    }

    const mapped = mapHistoryForApi(roleId);
    const apiHistory =
      typeof window.buildApiMemoryHistory === 'function'
        ? window.buildApiMemoryHistory(roleId, mapped.apiHistory)
        : mapped.apiHistory;
    const userMessage = mapped.latestUserText || '请根据上下文继续群聊。';
    const systemPrompt = buildGroupPrompt(roleId);

    return new Promise((resolve, reject) => {
      window.callAI(
        systemPrompt,
        apiHistory,
        userMessage,
        async (rawText) => {
          try {
            const parsedPayload = filterGroupAiPayloadByMute(roleId, parseGroupAiResponse(rawText, roleId));
            await applyGroupEffects(roleId, parsedPayload.effects);
            if (parsedPayload.messages.length) {
              await pushGroupMessages(roleId, parsedPayload.messages);
            }
            resolve(parsedPayload);
          } catch (err) {
            reject(err);
          } finally {
            if (typeof window.clearChatAiRequestInFlight === 'function') {
              window.clearChatAiRequestInFlight(roleId, requestId);
            }
            if (titleEl) {
              titleEl.textContent = previousTitle;
            }
          }
        },
        (error) => {
          if (typeof window.clearChatAiRequestInFlight === 'function') {
            window.clearChatAiRequestInFlight(roleId, requestId);
          }
          if (titleEl) {
            titleEl.textContent = previousTitle;
          }
          reject(error);
        },
        {
          disableLatestWrapper: true,
          temperature: 0.85
        }
      );
    });
  }

  window.GroupChat = {
    isGroupChatRole,
    getGroupMembers: getMembers,
    getGroupDisplayMembers: getDisplayMembers,
    getGroupMemberIds: getMemberIds,
    getGroupProfile: ensureGroupProfile,
    getUserDisplayMember,
    getGroupChatPreview,
    getGroupPrompt: buildGroupPrompt,
    buildGroupApiPayload: mapHistoryForApi,
    buildGroupRequestDebug,
    parseGroupAiResponse,
    resolveGroupMessageSender,
    getSenderLabel,
    createGroupChat,
    getGroupMuteState,
    isGroupMuteAllActive,
    isGroupMemberMuted,
    pushSystemEvent,
    triggerGroupAI
  };
})();
