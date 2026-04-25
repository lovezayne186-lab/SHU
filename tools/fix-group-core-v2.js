const fs = require('fs');

const filePath = 'JS/chat/group/group-core.js';
const source = fs.readFileSync(filePath, 'utf8');

const promptBlock = `function mapHistoryForApi(roleId) {
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
      const timestampTag = msg?.timestamp != null ? \`[ts=\${String(msg.timestamp).trim()}]\` : '';
      return {
        role: msg.role === 'me' ? 'me' : 'ai',
        content: [timestampTag, senderLabel ? \`【\${senderLabel}】\${text}\` : text].filter(Boolean).join('')
      };
    });

    if (latestMessage.role === 'me') {
      apiHistory.pop();
      const timestampTag = latestMessage?.timestamp != null ? \`[ts=\${String(latestMessage.timestamp).trim()}]\` : '';
      const latestUserText = \`\${timestampTag}【\${getSenderLabel(roleId, latestMessage)}】\${getMessageText(latestMessage)}\`;
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
            return \`\${index + 1}. roleId=\${member.roleId}; originalName=\${member.originalName}; groupName=\${member.name}; persona=\${persona}\`;
          })
          .join('\\n')
      : 'No members';
    const myNickname = getDisplayName(me, 'User');
    const myOriginalName = me.originalName || me.name || myNickname;
    const groupName = profile.nickName || profile.name || 'Group Chat';
    const groupDesc = String(profile.persona || profile.desc || profile.description || '').trim();

    return [
      '[[PROMPT_CLASS:ROLE_JSON_TASK]]',
      '[[SCENE:WECHAT_GROUP_V1]]',
      '# Core Mission: Group Chat Director',
      \`You are a group chat director. In chat "\${groupName}", you play all roles except the user.\`,
      groupDesc ? \`Group description: \${groupDesc}\` : '',
      '# Output Contract',
      '- Output must be a JSON array only.',
      '- First element must be {"type":"thought_chain", ...}.',
      '- Action items come after thought_chain.',
      '# Role Rules',
      \`- User nickname is "\${myNickname}", legal name is "\${myOriginalName}".\`,
      '- Characters should reply to each other naturally.',
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
      \`- send_private_message: {"type":"send_private_message","name":"original role name","recipient":"\${myOriginalName}","content":["..."]}\`,
      '# Hard Constraints',
      '- name must match a real member originalName from member list.',
      '- Do not output markdown, explanation, or any text outside JSON array.',
      '- Never output diagnostics: token count, usage, prompt tokens, completion tokens, trace, debug.',
      '- If action planning fails, still output thought_chain plus 1-3 text items.',
      '# Group Members',
      memberBlock,
      '# Output Example',
      '[{"type":"thought_chain","analysis":"A confirms, B follows up","strategy":"respond then ask","character_thoughts":{"A":"confirm first","B":"follow up"}},{"type":"text","name":"A","message":"I am here, what happened?"}]'
    ]
      .filter(Boolean)
      .join('\\n');
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

  function normalizeGroupActionType(type) {`;

const parseBlock = `function isDiagnosticGroupLine(text) {
    const value = String(text || '').trim();
    if (!value) return true;
    return /^(token\\s*count|usage|prompt\\s*tokens?|completion\\s*tokens?|debug|trace)\\b/i.test(value) ||
      /token\\s*count\\s*[:=]/i.test(value) ||
      /\\b(prompt|completion)\\s*tokens?\\b/i.test(value);
  }

  function cleanGroupFallbackLine(text) {
    return String(text || '')
      .replace(/\\u0060\\u0060\\u0060[\\s\\S]*?\\u0060\\u0060\\u0060/g, ' ')
      .replace(/^[#>*\\-\\s]+/g, '')
      .replace(/\\s+/g, ' ')
      .trim();
  }

  function buildGroupFallbackMessages(members, rawText) {
    const lines = String(rawText || '')
      .split(/\\r?\\n+/)
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

  async function createGroupChat(options) {`;

let updated = source;

const promptPattern = /function mapHistoryForApi\(roleId\) \{[\s\S]*?\n  function normalizeGroupActionType\(type\) \{/;
if (!promptPattern.test(updated)) {
  throw new Error('prompt block not found');
}
updated = updated.replace(promptPattern, promptBlock);

const parsePattern = /function parseGroupAiResponse\(rawText, roleId\) \{[\s\S]*?\n  async function createGroupChat\(options\) \{/;
if (!parsePattern.test(updated)) {
  throw new Error('parse block not found');
}
updated = updated.replace(parsePattern, parseBlock);

if (!updated.includes('buildGroupRequestDebug,')) {
  updated = updated.replace(
    '    buildGroupApiPayload: mapHistoryForApi,\n    parseGroupAiResponse,',
    '    buildGroupApiPayload: mapHistoryForApi,\n    buildGroupRequestDebug,\n    parseGroupAiResponse,'
  );
}

fs.writeFileSync(filePath, updated, 'utf8');
console.log('patched group-core v2');
