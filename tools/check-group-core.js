const fs = require('fs');

const s = fs.readFileSync('JS/chat/group/group-core.js', 'utf8');

const checks = {
  okBracket: s.includes('【${senderLabel}】'),
  badBracket: s.includes('ã€?{senderLabel}'),
  badLatestUser: s.includes('ã€?{getSenderLabel'),
  hasTokenBan: s.includes('Never output diagnostics: token count'),
  hasDiagFilter: s.includes('function isDiagnosticGroupLine'),
  hasFallbackBuilder: s.includes('function buildGroupFallbackMessages'),
  fnMapHistoryCount: (s.match(/function mapHistoryForApi\(roleId\)/g) || []).length,
  fnPromptCount: (s.match(/function buildGroupPrompt\(roleId\)/g) || []).length,
  fnParseCount: (s.match(/function parseGroupAiResponse\(rawText, roleId\)/g) || []).length,
  oldNameTemplate: s.includes('â€?{newName}') || s.includes('ä¿®æ”¹ç¾¤åä¸ºâ€?{newName}â€'),
  oldAvatarTemplate: s.includes('ï¼?{avatarName}') || s.includes('ä¿®æ”¹äº†ç¾¤å¤´åƒï¼?{avatarName}')
};

console.log(checks);
