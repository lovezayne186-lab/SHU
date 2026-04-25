(function () {
    'use strict';

    async function generatePartnerAnswer(roleId, questionText, userAnswer) {
        const bridge = window.CoupleSpaceParentBridge;
        if (!bridge) throw new Error('情侣空间桥接层未初始化');
        const pw = bridge.getParentWindow();
        const rid = String(roleId || '').trim();
        if (!rid) throw new Error('尚未绑定情侣角色');

        const prevRole = pw.currentChatRole;
        pw.__offlineSyncInProgress = true;
        pw.currentChatRole = rid;
        try {
            const extraSystem =
                '场景：你正在进行「情侣问答」。\n' +
                '请你以恋人身份、第一人称，温柔自然地回应我刚刚的回答。\n' +
                '输出时只输出你的回答正文，不要加任何前缀、解释或格式标记。\n' +
                '字数控制在 60~160 字，避免使用列点。';

            let systemPrompt = bridge.buildRoleLitePrompt('couple_qa_answer', rid, {
                includeContinuity: true,
                maxSummaryLines: 10,
                sceneIntro: '当前场景是情侣问答里的角色回答。',
                taskGuidance: extraSystem,
                outputInstructions: '只输出你的回答正文，不要加前缀、解释、JSON、代码块或格式标记。字数控制在 60~160 字。'
            });

            if (!systemPrompt) {
                const fallback = bridge.buildRoleSystemPrompt(rid);
                systemPrompt = fallback ? (fallback + '\n\n' + extraSystem) : extraSystem;
            }

            const rawHistory = bridge.readWechatHistory(rid);
            const cleanHistory = bridge.cleanHistory(rawHistory);
            const history = bridge.buildHistoryForApi(rid, cleanHistory);
            const userPrompt =
                '今日问题：\n' + String(questionText || '').trim() + '\n\n' +
                '我的回答：\n' + String(userAnswer || '').trim();

            return await bridge.callAI(systemPrompt, history, userPrompt);
        } finally {
            pw.__offlineSyncInProgress = false;
            pw.currentChatRole = prevRole;
        }
    }

    window.CoupleQaScene = {
        generatePartnerAnswer: generatePartnerAnswer
    };
})();
