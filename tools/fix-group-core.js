const fs = require('fs');

const filePath = 'JS/chat/group/group-core.js';
const source = fs.readFileSync(filePath, 'utf8');

const replacement = `function mapHistoryForApi(roleId) {
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
            const persona = String(member.persona || '暂无').trim();
            return \`\${index + 1}. roleId=\${member.roleId}; 角色本名=\${member.originalName}; 群内显示名=\${member.name}; 人设=\${persona}\`;
          })
          .join('\\n')
      : '暂无成员';
    const myNickname = getDisplayName(me, '用户');
    const myOriginalName = me.originalName || me.name || myNickname;
    const groupName = profile.nickName || profile.name || '群聊';
    const groupDesc = String(profile.persona || profile.desc || profile.description || '').trim();

    return [
      '[[PROMPT_CLASS:ROLE_JSON_TASK]]',
      '[[SCENE:WECHAT_GROUP_V1]]',
      '# 核心任务：群聊导演',
      \`你是一个群聊AI导演，负责扮演微信群“\${groupName}”里除了用户以外的所有角色。\`,
      groupDesc ? \`群聊设定：\${groupDesc}\` : '',
      '# 输出格式铁律',
      '- 你的回复必须是一个 JSON 数组。',
      '- JSON 数组的第一个元素必须是 {"type":"thought_chain", ...}。',
      '- thought_chain 之后，才是所有角色的具体行动对象。',
      '# 角色扮演核心规则',
      '- 必须先思后行，先完成 thought_chain，再输出可见动作。',
      '- 角色之间必须互相回应、补充、反驳，形成自然讨论。',
      \`- 用户的身份是【\${myNickname}】，本名是【\${myOriginalName}】。\`,
      '- 绝不能透露你是 AI 或模型，严禁发展线下剧情。',
      '# 导演策略与节奏控制',
      '- 不是每个角色都必须在每一轮都发言。',
      '- 允许角色之间形成短暂的两人对话或三人讨论。',
      '- 如果对话陷入平淡，可以主动创造轻微群事件来打破僵局。',
      '- 优先使用主要群聊场景：text、voice_message、quote_reply、system_message、send_and_recall、change_group_name、location_share。',
      '# 指令格式',
      '- thought_chain: {"type":"thought_chain","analysis":"...","strategy":"...","character_thoughts":{"角色名":"想法"}}',
      '- text: {"type":"text","name":"角色本名","message":"内容"}',
      '- voice_message: {"type":"voice_message","name":"角色本名","content":"语音文字"}',
      '- quote_reply: {"type":"quote_reply","name":"角色本名","target_timestamp":"已有时间戳","reply_content":"回复内容"}',
      '- send_and_recall: {"type":"send_and_recall","name":"角色本名","content":"内容"}',
      '- system_message: {"type":"system_message","content":"系统文本"}',
      '- change_group_name: {"type":"change_group_name","name":"角色本名","new_name":"新群名"}',
      '- location_share: {"type":"location_share","name":"角色本名","content":"位置名"}',
      '- sticker: {"type":"sticker","name":"角色本名","meaning":"表情含义"}',
      \`- send_private_message: {"type":"send_private_message","name":"角色本名","recipient":"\${myOriginalName}","content":["私信内容"]}\`,
      '- 为了稳定映射，除 system_message 外可以额外补充 senderRoleId，但 name 必须优先填写角色本名。',
      '# 额外限制',
      '- 不要替用户说话。',
      '- 不要输出 Markdown，不要输出解释，不要输出数组外的任何文字。',
      '- 如果这一轮不需要复杂动作，只输出 thought_chain 和若干 text。',
      '- 历史消息里可能带有 [ts=时间戳] 标记；如果要 quote_reply，target_timestamp 必须引用已有时间戳。',
      '- 如果某个动作字段本应是字符串，就不要输出对象。',
      '- 建议每轮输出 1 到 4 个可见动作，避免刷屏太多。',
      '# 群成员列表',
      '群成员列表：',
      memberBlock,
      '# 输出示例',
      '[{"type":"thought_chain","analysis":"A先接用户的话，B补一句，形成自然互动。","strategy":"先确认，再追问。","character_thoughts":{"岑野":"先确认情况","空空":"补一句吐槽"}} , {"type":"text","name":"岑野","senderRoleId":"role_a","message":"先说说怎么了？"}]'
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
      userMessage: mapped.latestUserText || '请根据上下文继续群聊。',
      roleId,
      groupName: ensureGroupProfile(roleId).nickName || ensureGroupProfile(roleId).name || ''
    };
  }

  function normalizeGroupActionType(type) {`;

const pattern = /function mapHistoryForApi\(roleId\) \{[\s\S]*?\n  function normalizeGroupActionType\(type\) \{/;
if (!pattern.test(source)) {
  throw new Error('target block not found');
}

let updated = source.replace(pattern, replacement);
updated = updated.replace(
  "    buildGroupApiPayload: mapHistoryForApi,\n    parseGroupAiResponse,",
  "    buildGroupApiPayload: mapHistoryForApi,\n    buildGroupRequestDebug,\n    parseGroupAiResponse,"
);
updated = updated.replace(/\$\{actorName\}ä¿®æ”¹ç¾¤åä¸ºâ€\?\{newName\}â€/g, '${actorName}修改群名为“${newName}”');
updated = updated.replace(/\$\{actorName\}ä¿®æ”¹äº†ç¾¤å¤´åƒï¼\?\{avatarName\}/g, '${actorName}修改了群头像：${avatarName}');

fs.writeFileSync(filePath, updated, 'utf8');
console.log('patched group-core prompt block');
