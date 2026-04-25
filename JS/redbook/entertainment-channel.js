(function (global) {
    'use strict';

    const ENTERTAINMENT_CHANNEL_ID = 'entertainment';
    const FIXED_POST_COUNT = 8;

    function asString(value) {
        return String(value == null ? '' : value).trim();
    }

    function isEntertainmentChannel(channelId) {
        return asString(channelId) === ENTERTAINMENT_CHANNEL_ID;
    }

    function buildEntertainmentPostPrompt(context) {
        context = context || {};
        const currentTime = asString(context.currentTime);
        const userName = asString(context.userName) || '用户';
        const roleBlocks = asString(context.roleBlocks);
        const communityContext = asString(context.communityContext);

        const systemPrompt = [
            '[[PROMPT_CLASS:TOOL_JSON]]',
            '[[PROMPT_OUTPUT:plain_json_task]]',
            '# 你的任务',
            '你是一个虚拟社区的吃瓜推手。你的任务是生成一批“路人偶遇贴”或“内部人员爆料贴”。',
            '这些帖子必须【深度结合下方角色列表中的世界书背景】，而不是强行把他们写成娱乐圈明星。',
            '你要营造出一种“路人/NPC 都在疯狂磕角色和真实用户（' + userName + '）的CP”的氛围。',
            '',
            '# 核心规则',
            '1. 【楼主设定与背景贴合】：发帖人（楼主）必须是符合角色世界书设定的 NPC。',
            '   - 如果角色是医生，楼主就是同医院的护士、实习生或病人家属。',
            '   - 如果角色是校园学长，楼主就是同校的学弟学妹、表白墙皮下。',
            '   - 如果角色是总裁，楼主就是公司前台、秘书或对家公司员工。',
            '2. 【吃瓜磕CP属性】：楼主的发帖内容必须是“偷拍”、“偶遇”或“无意中发现了”该角色与用户“' + userName + '”之间极其暧昧、甜度爆表或打破角色平时人设的互动瞬间。',
            '3. 【封面与标题】：',
            '- coverText：用一句话总结高甜瞬间或反差感，例如“救命！万年冰山铁树开花了🍬”',
            '- postTitle：带有一种吃瓜、震惊或磕到了的论坛标题风格。',
            '4. 【首轮评论】：每篇笔记必须同步生成 6 到 8 条评论。',
            '5. 【评论区生态】：',
            '- 【NPC 同僚/吃瓜路人】：疯狂磕CP，表示“kswl”、“这还不结婚很难收场”、“我当时就在旁边，亲眼看到了！”。',
            '- 【设定角色本人】：必须让设定的角色亲自下场评论（或被路人艾特出来）。角色要用符合自己人设的方式回应这个爆料（如：霸道护短、害羞掩饰、暗戳戳宣示主权、或者直接大方承认）。',
            '6. 【禁止扮演用户】：你绝对不能生成作者名或评论者名为用户昵称“' + userName + '”的发言。用户只是活在 NPC 爆料的传说中。',
            '7. 当前时间：' + (currentTime || '未知') + '。只作为语境参考。',
            '',
            '# 八卦主题参考',
            '- 职场/校园双标：对所有人都冷脸，唯独对某人（用户）温柔双标。',
            '- 掉马甲瞬间：平时高高在上的大佬，私下里却在给某人提包/买奶茶。',
            '- 占有欲爆发：看到某人和其他异性说话，直接黑脸把人拉走。',
            '',
            '# 输出 JSON 结构（严格按照此数组格式）',
            '[',
            '  {',
            '    "coverText": "15字以内封面文案，极具八卦噱头，带表情包🍉",',
            '    "postTitle": "【吃瓜】标题",',
            '    "authorName": "圈内扒皮大叔 / 随机吃瓜网名",',
            '    "sectionName": "娱乐八卦/星闻吃瓜",',
            '    "content": "正文。必须将换行转义为 \\\\n。详细描述爆料细节，越真越好，要像微博爆料或小红书吃瓜贴。",',
            '    "tags": ["吃瓜", "娱乐圈", "爆料"],',
            '    "likesCount": 8762,',
            '    "favoriteCount": 0,',
            '    "commentsCount": 6,',
            '    "comments": [',
            '      { "authorName": "楼主网名", "content": "楼主回应网友追问或补充线索", "likes": 88 },',
            '      { "authorName": "吃瓜网友", "content": "卧槽前排吃瓜，坐等反转", "likes": 120 },',
            '      { "authorName": "角色名", "content": "符合角色人设的娱乐区评论", "likes": 90 }',
            '    ],',
            '    "timestamp": "刚刚"',
            '  }',
            ']',
            '',
            '# 数量要求',
            '请精确生成 ' + FIXED_POST_COUNT + ' 篇笔记。',
            '',
            '# 社区设定参考',
            communityContext || '(没有额外社区世界书)',
            '',
            '# 角色列表参考（请严格维持他们的性格底色去评价娱乐八卦）',
            '<data_reference>',
            roleBlocks || '(空)',
            '</data_reference>',
            '',
            '严格输出 JSON 数组。禁止 Markdown，禁止解释，禁止 thought 字段。'
        ].join('\n');

        const userMessage = [
            '请立即生成娱乐吃瓜专区的 8 篇路人爆料贴。',
            '每篇笔记必须带 6 到 8 条首轮评论，并且发帖人（楼主）的身份必须和设定的角色处于同一世界观（如护士爆料医生、员工爆料总裁）。',
            '评论区要有路人疯狂磕CP、以及设定角色的亲自下场。',
            '严格输出 JSON 数组，禁止任何额外文字。'
        ].join('\n');

        return {
            exactCount: FIXED_POST_COUNT,
            systemPrompt: systemPrompt,
            userMessage: userMessage,
            options: {
                temperature: 0.92,
                max_tokens: 8192,
                maxTokens: 8192
            }
        };
    }

    function buildEntertainmentMoreCommentsPrompt(context) {
        context = context || {};
        const userName = asString(context.userName) || '用户';
        const roleBlocks = asString(context.roleBlocks);
        const postSummary = asString(context.postSummary);
        const existingCommentsText = asString(context.existingCommentsText);

        const systemPrompt = [
            '[[PROMPT_CLASS:TOOL_JSON]]',
            '[[PROMPT_OUTPUT:plain_json_task]]',
            '# 你的任务',
            '你现在是一个吃瓜论坛的 AI 导演。',
            '下面提供了一个正在发酵的【路人磕CP爆料贴】以及【目前的评论区状态】。',
            '你要生成 8-12 条新评论，模拟一群 NPC 围观角色和用户“' + userName + '”互动的盛况。',
            '',
            '# 角色分配与逻辑（极其重要）',
            '你生成的评论必须包含以下几类人的发言：',
            '1. 【各路 NPC 同僚/路人】：',
            '- 必须符合角色的世界书背景。如果是医院背景，就是同院护士/病人；如果是校园，就是同学。',
            '- 吃瓜路人：大喊“卧槽”、“打卡”、“前排吃瓜”、“kswl”、“这门婚事我同意了”。',
            '- 懂哥/福尔摩斯网友：从蛛丝马迹中扒出真相，比如“你们没发现照片里那个女生的包，昨天 ' + userName + ' 刚背过同款吗？”',
            '2. 【特定的设定角色（见下文引用）】：你必须严格扮演这些指定的角色参与讨论。',
            '- 角色要用符合人设的方式回应爆料帖（例如傲娇否认、吃醋发疯、或者直接大方承认）。',
            '- 如果用户 ' + userName + ' 发言了，角色必须对用户进行互动、保护或暧昧的回应。',
            '',
            '# 互动规则',
            '- 整个评论区必须是一场大型吃瓜现场！大量使用磕CP的用语（kswl、笑死、配一脸）。',
            '- 不要生成 authorName 为“' + userName + '”的评论。',
            '',
            '# 角色列表参考（请严格维持他们的性格底色去评价这个八卦帖子）',
            '<data_reference>',
            roleBlocks || '(空)',
            '</data_reference>',
            '',
            '# 输出 JSON 结构',
            '[',
            '  {',
            '    "authorName": "粉丝/路人/懂哥/角色名",',
            '    "content": "评论内容",',
            '    "reply": { "authorName": "被回复人", "content": "原评论摘要（可选）" }',
            '  }',
            ']',
            '',
            '严格输出 JSON 数组。禁止 Markdown，禁止解释，禁止 thought 字段。'
        ].join('\n');

        const userMessage = [
            '--- 爆料吃瓜贴 ---',
            postSummary || '(空)',
            '',
            '--- 目前的评论区状态 ---',
            existingCommentsText || '(暂无评论)',
            '',
            '请继续生成 8-12 条新评论，必须包含符合世界书背景的NPC路人、懂哥网友和设定角色，展现大家疯狂磕CP的氛围。'
        ].join('\n');

        return {
            systemPrompt: systemPrompt,
            userMessage: userMessage,
            options: {
                temperature: 0.9,
                max_tokens: 4096,
                maxTokens: 4096
            }
        };
    }

    global.RedbookForumEntertainment = {
        CHANNEL_ID: ENTERTAINMENT_CHANNEL_ID,
        FIXED_POST_COUNT: FIXED_POST_COUNT,
        isEntertainmentChannel: isEntertainmentChannel,
        buildPostPrompt: buildEntertainmentPostPrompt,
        buildMoreCommentsPrompt: buildEntertainmentMoreCommentsPrompt
    };
})(window);
