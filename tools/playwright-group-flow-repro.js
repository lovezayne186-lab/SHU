const fs = require('fs');
const { chromium } = require('playwright');

const LOG_PATH = 'tools/playwright-group-flow-repro.log';

function logLine(text) {
  fs.appendFileSync(LOG_PATH, `${text}\n`);
  console.log(text);
}

async function safeClick(locator, label) {
  const count = await locator.count().catch(() => 0);
  logLine(`step click-check ${label}: count=${count}`);
  if (!count) return false;
  try {
    await locator.first().click({ timeout: 1500 });
    logLine(`step clicked ${label}`);
    return true;
  } catch (error) {
    logLine(`step click-failed ${label}: ${error && error.message ? error.message : error}`);
    return false;
  }
}

async function run() {
  fs.writeFileSync(LOG_PATH, '');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(1500);

  const logs = [];
  page.on('console', (msg) => {
    const line = `[${msg.type()}] ${msg.text()}`;
    logs.push(line);
    logLine(line);
  });

  logLine('step goto start');
  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(1200);
  logLine('step loaded home');

  await page.evaluate(() => {
    const now = Date.now();
    window.charProfiles = window.charProfiles || {};
    window.chatData = window.chatData || {};
    window.userPersonas = window.userPersonas || {};
    window.currentUserProfile = window.currentUserProfile || {
      name: '用户',
      nickname: '用户',
      avatar: 'assets/chushitouxiang.jpg'
    };

    const ensureRole = (id, name, persona) => {
      window.charProfiles[id] = Object.assign({}, window.charProfiles[id] || {}, {
        name,
        nickName: name,
        avatar: 'assets/chushitouxiang.jpg',
        persona: persona || `${name}的人设`
      });
      if (!Array.isArray(window.chatData[id])) {
        window.chatData[id] = [];
      }
      if (!window.chatData[id].length) {
        window.chatData[id].push({
          role: 'ai',
          type: 'text',
          content: `我是${name}`,
          timestamp: now
        });
      }
    };

    ensureRole('role_cenye', '岑野', '冷静、直接、会接话');
    ensureRole('role_kongkong', '空空', '语气跳脱、会补充吐槽');
    ensureRole('role_anan', '安安', '温柔、会缓和气氛');

    try {
      if (typeof saveData === 'function') saveData();
    } catch (e) {}
  });

  await safeClick(page.locator('text=微信').first(), '微信入口');
  await page.waitForTimeout(1500);
  logLine('step opened wechat');

  await page.evaluate(() => {
    if (typeof window.renderChatList === 'function') {
      window.renderChatList();
    }
    if (typeof window.refreshChatList === 'function') {
      window.refreshChatList();
    }
    if (typeof window.renderChatPage === 'function') {
      window.renderChatPage();
    }
  });
  await page.waitForTimeout(1000);

  const wechatState = await page.evaluate(() => {
    return {
      bodyText: document.body.innerText,
      globals: Object.keys(window).filter((k) => /group|chat|forward|contact|create/i.test(k)).sort().slice(0, 200)
    };
  });
  logLine('wechatState=' + JSON.stringify({
    bodyText: wechatState.bodyText.slice(0, 300),
    globals: wechatState.globals.slice(0, 80)
  }, null, 2));

  let plusClicked = await safeClick(page.locator('#top-plus-btn'), '微信右上角加号');
  if (!plusClicked) {
    await page.evaluate(() => {
      if (typeof window.openChatCreationMenu === 'function') {
        window.openChatCreationMenu();
      }
    });
    logLine('step fallback openChatCreationMenu');
  }
  await page.waitForTimeout(1000);

  const afterPlus = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('button, div, span, li'))
      .map((el) => ({
        text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(),
        cls: el.className || '',
        id: el.id || ''
      }))
      .filter((x) => x.text && x.text.length < 40)
      .slice(0, 400);
    return { nodes, bodyText: document.body.innerText };
  });
  logLine('afterPlus=' + JSON.stringify({
    bodyText: afterPlus.bodyText.slice(0, 300),
    nodes: afterPlus.nodes.filter((x) => /创建|群聊|联系人|完成|取消|选择|群/.test(x.text)).slice(0, 60)
  }, null, 2));

  const groupBtn = page.locator('.group-chat-action-btn.primary[data-action="group"]');
  if (await groupBtn.count()) {
    await safeClick(groupBtn, '创建群聊入口');
  } else {
    await page.evaluate(() => {
      if (typeof window.openGroupCreator === 'function') {
        window.openGroupCreator();
      } else if (typeof window.startGroupChatCreationFlow === 'function') {
        window.startGroupChatCreationFlow();
      }
    });
  }
  await page.waitForTimeout(1200);

  const afterOpenCreator = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('input, label, button, div, span'))
      .map((el) => ({
        text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(),
        cls: el.className || '',
        id: el.id || '',
        type: el.tagName
      }))
      .filter((x) => x.text && x.text.length < 80)
      .slice(0, 500);
    return { candidates, bodyText: document.body.innerText };
  });
  logLine('afterOpenCreator=' + JSON.stringify({
    bodyText: afterOpenCreator.bodyText.slice(0, 300),
    candidates: afterOpenCreator.candidates.filter((x) => /创建|群聊|联系人|完成|取消|选择|群|岑野|空空|安安/.test(x.text)).slice(0, 100)
  }, null, 2));

  const names = ['岑野', '空空', '安安'];
  for (const name of names) {
    const item = page
      .locator('#forward-modal .forward-item')
      .filter({ has: page.locator('.forward-name', { hasText: name }) });
    await safeClick(item, `选择联系人-${name}`);
    await page.waitForTimeout(200);
  }

  await safeClick(page.locator('#forward-select-confirm'), '群聊联系人确认');
  await page.waitForTimeout(1800);
  const roomState = await page.evaluate(() => ({
    currentChatRole: window.currentChatRole || null,
    currentChatName: (document.getElementById('current-chat-name') || {}).textContent || '',
    bodyText: document.body.innerText.slice(0, 500)
  }));
  logLine('roomState=' + JSON.stringify(roomState, null, 2));

  const promptPreview = await page.evaluate(() => {
    const roleId = window.currentChatRole || '';
    const prompt = window.GroupChat && typeof window.GroupChat.getGroupPrompt === 'function'
      ? String(window.GroupChat.getGroupPrompt(roleId) || '')
      : '';
    window.__mockedGroupPromptPreview = prompt;
    window.callAI = function (systemPrompt, apiHistory, userMessage, onSuccess, onError) {
      try {
        const tsMatch = String(userMessage || '').match(/\[ts=([^\]]+)\]/);
        const targetTs = tsMatch ? tsMatch[1] : '';
        const payload = [
          {
            type: 'thought_chain',
            analysis: '先让一个角色接住用户的话，再让另一个角色补充，形成真实群聊感。',
            strategy: '两个人先后回应，不刷屏。',
            character_thoughts: {
              '岑野': '先直接回应用户',
              '空空': '补一句带点情绪的接话'
            }
          },
          {
            type: 'text',
            name: '岑野',
            senderRoleId: 'role_cenye',
            message: '你突然在群里这么问，是想确认刚刚谁回你的？'
          },
          targetTs
            ? {
                type: 'quote_reply',
                name: '空空',
                senderRoleId: 'role_kongkong',
                target_timestamp: targetTs,
                reply_content: '刚那句是我接的，你继续说。'
              }
            : {
                type: 'text',
                name: '空空',
                senderRoleId: 'role_kongkong',
                message: '我在，你继续说。'
              }
        ];
        setTimeout(() => onSuccess(JSON.stringify(payload)), 300);
      } catch (error) {
        if (typeof onError === 'function') onError(error);
      }
    };
    return {
      promptPreview: prompt.slice(0, 1200),
      hasThoughtChainRule: prompt.includes('thought_chain'),
      hasGroupDirector: prompt.includes('群聊AI导演') || prompt.includes('群聊导演')
    };
  });
  logLine('promptPreview=' + JSON.stringify(promptPreview, null, 2));
  logLine('step created group maybe');

  const input = page.locator('#msg-input');
  if (await input.count()) {
    try {
      await input.fill('hello，看看你们怎么聊', { timeout: 1500 });
      logLine('step filled input');
      await page.keyboard.press('Enter').catch(() => {});
    } catch (e) {
      logLine(`step input-fill-failed: ${e && e.message ? e.message : e}`);
    }
  }

  const sendBtn = page.locator('button:has-text(\"发送\"), text=发送').first();
  if (await sendBtn.count()) {
    await safeClick(sendBtn, '发送');
  }
  await page.waitForTimeout(4500);
  logLine('step waited for reply');

  const finalState = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.msg-row')).map((row) => ({
      role: row.getAttribute('data-role'),
      type: row.getAttribute('data-type'),
      senderRoleId: row.getAttribute('data-sender-role-id'),
      senderName: row.getAttribute('data-sender-name'),
      label: ((row.querySelector('.group-sender-label') || {}).textContent || '').trim(),
      text: ((row.querySelector('.msg-text') || {}).textContent || '').trim(),
      quote: ((row.querySelector('.quote-block') || {}).textContent || '').replace(/\s+/g, ' ').trim()
    }));
    return {
      titleText: document.body.innerText,
      rows,
      currentChatRole: window.currentChatRole || null,
      currentChatProfile: window.currentChatRole && window.charProfiles ? window.charProfiles[window.currentChatRole] : null,
      history: window.currentChatRole && window.chatData ? window.chatData[window.currentChatRole] : null
    };
  });
  logLine('finalState=' + JSON.stringify(finalState, null, 2));

  await page.screenshot({ path: 'tools/playwright-group-flow-repro.png', fullPage: true });
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
