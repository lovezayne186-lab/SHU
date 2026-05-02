(function (global) {
    'use strict';

    const HORROR_CHANNEL_ID = 'horror';
    const FIXED_POST_COUNT = 6;

    const CHANNELS = [
        { id: 'recommend', label: '推荐' },
        { id: HORROR_CHANNEL_ID, label: '恐怖' },
        { id: 'entertainment', label: '娱乐' },
        { id: 'nsfw', label: 'nsfw' },
        { id: 'abo', label: 'abo' },
        { id: 'fanfic', label: '同人' }
    ];

    function asString(value) {
        return String(value == null ? '' : value).trim();
    }

    function isHorrorChannel(channelId) {
        return asString(channelId) === HORROR_CHANNEL_ID;
    }

    function buildHorrorPostPrompt(context) {
        context = context || {};
        const currentTime = asString(context.currentTime);
        const userName = asString(context.userName) || '用户';
        const displayName = asString(context.displayName) || userName;
        const roleBlocks = asString(context.roleBlocks);
        const communityContext = asString(context.communityContext);

        const systemPrompt = [
            '[[PROMPT_CLASS:TOOL_JSON]]',
            '[[PROMPT_OUTPUT:plain_json_task]]',
            '# 你的任务',
            '你是一个顶级悬疑/规则怪谈/恐怖小说编剧。你的任务是生成一批“匿名论坛求助帖”风格的帖子。',
            '这些帖子表面上看似日常，但细看却充满违和感，是恐怖故事的“引子（Hook）”。',
            '',
            '# 核心规则',
            '1. 【楼主设定】：发帖人（楼主）必须是一个普通的不知情网友。他可能遇到了奇怪的室友、捡到了诡异的规则纸条、或者发现家里多了一样东西。楼主的语气要极度真实、口语化。',
            '2. 【悬念留白】：正文绝对不要直接出现“鬼”、“怪物”等字眼，也不要直接点明真相。要通过环境描写、诡异的对话或不符合常理的现象来制造“细思极恐”的感觉。',
            '3. 【封面与标题】：',
            '- coverText：用一句话总结诡异点，符合NPC发帖语气，不需要强制加表情包。',
            '- postTitle：带有一种求助或猎奇的论坛标题风格。',
            '4. 【预埋线索】：正文里必须预埋1-2个只有在评论区才会被网友发现的致命漏洞（例如：楼主说室友在做饭，但前文提过室友出差了）。',
            '5. 【首轮评论】：每篇帖子必须同步生成 6 到 8 条评论，不能留空。评论区信息量要大，但不能一次性揭露全部真相。',
            '6. 【首轮评论角色分配】：每篇帖子的 comments 必须包含以下三类人的发言：',
            '- 【楼主（发帖人本人）】：必须出现 1-2 次。楼主需要回应网友质疑，或者提供进一步的惊悚进展。',
            '- 【路人网友（NPC）】：负责发现主贴里的恐怖盲点，或者科普背景设定。',
            '- 【特定设定角色】：必须让下方角色列表中的角色参与评论，严格符合人设，绝不能 OOC。',
            '7. 【禁止认错人】（最高优先级）：发帖人（楼主）是一个随机的虚拟NPC，绝对不是真实用户“' + userName + '”！',
            '8. 在生成首轮评论时，所有设定角色必须把楼主当成【陌生的发帖网友】，绝对不能用对真实用户的专属称呼（如主人、宝宝等）去称呼楼主。角色们只是在网上冲浪时偶然刷到了这个恐怖帖子，起到和其他网友一起围观、分析或推动剧情的作用，必须保持自身人设（不OOC）。',
            '9. 【禁止扮演用户】：用户的真名/论坛称呼是“' + userName + '”，显示昵称是“' + displayName + '”。绝对不能生成作者名或评论者名为这俩名字的发言。用户只是围观者。',
            '10. 当前时间：' + (currentTime || '未知') + '。只作为背景氛围参考，不要在正文里机械播报。',
            '',
            '# 恐怖主题参考（随机应用以下风格）',
            '- 规则怪谈：奇怪的入职手册、合租守则。',
            '- 民间民俗：老家的奇怪祭祀、不能回头的夜路。',
            '- 空间异常：多出来的一间房、无法到达的4楼。',
            '',
            '# 输出 JSON 结构（严格按照此数组格式）',
            '[',
            '  {',
            '    "coverText": "15字以内封面文案，制造反差恐怖，不强制带Emoji",',
            '    "postTitle": "【求助】标题",',
            '    "authorName": "楼主的随机网名，如：熬夜掉头发",',
            '    "sectionName": "都市传说/深夜求助",',
            '    "content": "正文。必须将换行转义为 \\\\n。详细描述他遇到的诡异日常。",',
            '    "tags": ["求助", "深夜树洞", "有点慌"],',
            '    "likesCount": 123,',
            '    "favoriteCount": 0,',
            '    "commentsCount": 6,',
            '    "comments": [',
            '      { "authorName": "楼主网名", "content": "楼主补充进展", "likes": 12 },',
            '      { "authorName": "路人网友名", "content": "指出致命漏洞", "likes": 30 },',
            '      { "authorName": "角色名", "content": "符合角色人设的评论", "likes": 20 }',
            '    ],',
            '    "timestamp": "刚刚"',
            '  }',
            ']',
            '',
            '# 数量要求',
            '请精确生成 ' + FIXED_POST_COUNT + ' 篇帖子。',
            '',
            '# 社区设定参考',
            communityContext || '(没有额外社区世界书)',
            '',
            '# 角色列表参考（请严格维持他们的性格底色去评价恐怖帖子）',
            '<data_reference>',
            roleBlocks || '(空)',
            '</data_reference>',
            '',
            '严格输出 JSON 数组。禁止 Markdown，禁止解释，禁止 thought 字段。'
        ].join('\n');

        const userMessage = [
            '请立即生成恐怖专区的 6 篇匿名论坛求助帖。',
            '每篇帖子必须带 6 到 8 条首轮评论，并且评论必须同时包含：楼主、路人网友、指定角色。',
            '楼主评论要推动故事进展；网友评论要发现盲点；角色评论要符合角色人设。',
            '严格输出 JSON 数组，禁止任何额外文字。'
        ].join('\n');

        return {
            exactCount: FIXED_POST_COUNT,
            systemPrompt: systemPrompt,
            userMessage: userMessage,
            options: {
                temperature: 0.9,
                max_tokens: 8192,
                maxTokens: 8192
            }
        };
    }

    function buildHorrorMoreCommentsPrompt(context) {
        context = context || {};
        const userName = asString(context.userName) || '用户';
        const displayName = asString(context.displayName) || userName;
        const roleBlocks = asString(context.roleBlocks);
        const postSummary = asString(context.postSummary);
        const existingCommentsText = asString(context.existingCommentsText);

        const systemPrompt = [
            '[[PROMPT_CLASS:TOOL_JSON]]',
            '[[PROMPT_OUTPUT:plain_json_task]]',
            '# 你的任务',
            '你现在是一个悬疑文字游戏的 AI 导演。',
            '下面提供了一个正在发生的【恐怖求助帖】以及【目前的评论区状态】。',
            '你要生成 8-12 条新评论，推动这个恐怖故事的发展，最终让真相浮出水面。',
            '',
            '# 角色分配与逻辑（极其重要）',
            '你生成的评论必须包含以下三类人的发言：',
            '1. 【楼主（发帖人本人）】：必须出现 1-2 次。楼主需要回应网友的质疑，或者提供进一步的惊悚进展（例如：“听你们的去看了眼床底，但是……”）。',
            '2. 【路人网友（NPC）】：负责发现主贴里的恐怖盲点，或者科普背景设定（例如：“楼主快跑！那个小区十年前就拆了！”）。',
            '3. 【特定的设定角色（见下文引用）】：你必须严格扮演这些指定的角色参与讨论。他们绝不能 OOC，要用符合自己人设的方式面对恐怖事件，并且可以和真实用户互动。',
            '',
            '# 故事推进规则',
            '1. 【楼主绝不是用户】：发帖的楼主是虚拟NPC，绝对不是真实用户“' + userName + '”！角色在回复楼主或其他网友时，必须保持“网上冲浪刷到陌生人求助帖”的吃瓜/围观态度，绝对不能对楼主使用专属用户的亲昵称呼。',
            '2. 【互动触发条件】：只有当【目前的评论区状态】中明确出现了真实用户（昵称：' + userName + '）的留言时，设定的角色们才能“认出”用户，并针对用户的留言进行直接回复或调侃互动。如果用户尚未发言，角色们只能像普通网友一样讨论剧情，不能OOC。',
            '3. 不要一次性把真相全说出来，要有层层递进的毛骨悚然感。',
            '4. 【禁止扮演用户】：绝对不能生成 authorName 为用户“' + userName + '”或昵称“' + displayName + '”的评论。',
            '',
            '# 角色列表参考（请严格维持他们的性格底色去评价这个恐怖帖子）',
            '<data_reference>',
            roleBlocks || '(空)',
            '</data_reference>',
            '',
            '# 输出 JSON 结构',
            '[',
            '  {',
            '    "authorName": "角色名 或 楼主名 或 随机网友名",',
            '    "content": "评论内容",',
            '    "reply": { "authorName": "被回复人", "content": "原评论摘要（可选）" }',
            '  }',
            ']',
            '',
            '严格输出 JSON 数组。禁止 Markdown，禁止解释，禁止 thought 字段。'
        ].join('\n');

        const userMessage = [
            '--- 恐怖求助帖 ---',
            postSummary || '(空)',
            '',
            '--- 目前的评论区状态 ---',
            existingCommentsText || '(暂无评论)',
            '',
            '请继续生成 8-12 条新评论，必须包含楼主、路人网友和设定角色。'
        ].join('\n');

        return {
            systemPrompt: systemPrompt,
            userMessage: userMessage,
            options: {
                temperature: 0.88,
                max_tokens: 4096,
                maxTokens: 4096
            }
        };
    }

    global.RedbookForumHorror = {
        CHANNELS: CHANNELS,
        HORROR_CHANNEL_ID: HORROR_CHANNEL_ID,
        FIXED_POST_COUNT: FIXED_POST_COUNT,
        isHorrorChannel: isHorrorChannel,
        buildPostPrompt: buildHorrorPostPrompt,
        buildMoreCommentsPrompt: buildHorrorMoreCommentsPrompt
    };
})(window);
