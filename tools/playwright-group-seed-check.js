const path = require('path');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });
  const page = await browser.newPage({
    viewport: { width: 430, height: 932 }
  });

  const logs = [];
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });

  await page.evaluate(async () => {
    const now = Date.now();
    window.charProfiles = {
      role_a: {
        name: '岑野',
        nickName: '岑野',
        originalName: '岑野',
        avatar: 'assets/chushitouxiang.jpg',
        persona: '说话直接，反应快'
      },
      role_b: {
        name: '空空',
        nickName: '空空',
        originalName: '空空',
        avatar: 'assets/chushitouxiang.jpg',
        persona: '嘴碎一点，但很会接话'
      },
      group_demo: {
        id: 'group_demo',
        name: '测试群聊',
        nickName: '测试群聊',
        avatar: 'assets/chushitouxiang.jpg',
        isGroup: true,
        memberIds: ['role_a', 'role_b'],
        persona: '两个人的小群'
      }
    };

    window.userPersonas = {
      group_demo: {
        name: '用户',
        originalName: '用户',
        avatar: 'assets/chushitouxiang.jpg'
      }
    };

    const quoteTarget = {
      id: 'm_quote_target',
      role: 'me',
      type: 'text',
      content: '现在是谁在说话',
      timestamp: now - 5000,
      status: 'sent'
    };

    window.chatData = {
      group_demo: [
        {
          role: 'ai',
          type: 'text',
          content: '闲的吗？',
          senderRoleId: 'role_a',
          senderName: '岑野',
          senderAvatar: 'assets/chushitouxiang.jpg',
          timestamp: now - 9000,
          status: 'sent'
        },
        quoteTarget,
        {
          role: 'ai',
          type: 'text',
          content: { message: '我应该显示成正常文本，不该是 object' },
          senderRoleId: 'role_a',
          senderName: '岑野',
          senderAvatar: 'assets/chushitouxiang.jpg',
          timestamp: now - 3000,
          status: 'sent'
        },
        {
          role: 'ai',
          type: 'voice',
          content: '昨天那句是我说的',
          senderRoleId: 'role_b',
          senderName: '空空',
          senderAvatar: 'assets/chushitouxiang.jpg',
          timestamp: now - 2000,
          status: 'sent'
        },
        {
          role: 'ai',
          type: 'text',
          content: '我来接一下上句话',
          senderRoleId: 'role_b',
          senderName: '空空',
          senderAvatar: 'assets/chushitouxiang.jpg',
          quoteId: 'm_quote_target',
          quote: {
            name: '用户',
            text: '现在是谁在说话'
          },
          quoteText: '现在是谁在说话',
          timestamp: now - 1000,
          status: 'sent'
        }
      ]
    };

    window.chatUnread = { group_demo: 0 };
    window.chatBackgrounds = {};
    window.callLogs = {};

    if (typeof window.saveData === 'function') {
      await window.saveData();
    }
    if (typeof window.openChatApp === 'function') {
      window.openChatApp();
    }
    if (typeof window.loadWechatChatList === 'function') {
      window.loadWechatChatList(true);
    }
    if (typeof window.enterChatRoom === 'function') {
      window.enterChatRoom('group_demo');
    } else if (typeof window.enterChat === 'function') {
      window.enterChat('group_demo');
    }
  });

  await page.waitForTimeout(1200);

  const runtime = await page.evaluate(() => {
    return {
      currentChatRole: window.currentChatRole,
      isGroup: !!(window.GroupChat && window.GroupChat.isGroupChatRole && window.GroupChat.isGroupChatRole(window.currentChatRole)),
      groupProfile: window.charProfiles && window.charProfiles.group_demo,
      history: (window.chatData && window.chatData.group_demo ? window.chatData.group_demo : []).map((msg) => ({
        role: msg.role,
        type: msg.type,
        content: msg.content,
        senderRoleId: msg.senderRoleId || null,
        senderName: msg.senderName || null,
        quoteId: msg.quoteId || null
      }))
    };
  });

  const rows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.msg-row')).map((row) => {
      return {
        role: row.getAttribute('data-role'),
        senderRoleId: row.getAttribute('data-sender-role-id'),
        senderName: row.getAttribute('data-sender-name'),
        label: row.querySelector('.group-sender-label')?.textContent?.trim() || '',
        text: row.querySelector('.msg-text')?.textContent?.trim() || '',
        quote: row.querySelector('.quote-block')?.textContent?.trim() || '',
        avatar: row.querySelector('.msg-avatar img')?.getAttribute('src') || '',
        type: row.getAttribute('data-type')
      };
    });
  });

  const screenshotPath = path.join(__dirname, 'playwright-group-seed-check.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log('runtime=' + JSON.stringify(runtime, null, 2));
  console.log('rows=' + JSON.stringify(rows, null, 2));
  console.log('screenshot=' + screenshotPath);
  if (logs.length) {
    console.log('console=');
    logs.forEach((line) => console.log(line));
  } else {
    console.log('console=<clean>');
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
