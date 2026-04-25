
var PeriodApp = (function() {
    var appInstance = null;
    var containerId = 'period-view-container';

    function injectStyles() {
        if (document.getElementById('period-styles')) return;
        var style = document.createElement('style');
        style.id = 'period-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
                animation: fadeIn 0.3s ease-out forwards;
            }
            .period-fade-enter-active, .period-fade-leave-active { transition: opacity 0.2s ease; }
            .period-fade-enter-from, .period-fade-leave-to { opacity: 0; }
            .period-fade-enter-to, .period-fade-leave-from { opacity: 1; }
            .period-sheet-enter-active, .period-sheet-leave-active { transition: transform 0.25s ease; }
            .period-sheet-enter-from, .period-sheet-leave-to { transform: translateY(100%); }
            .period-sheet-enter-to, .period-sheet-leave-from { transform: translateY(0); }
            .article-markdown p { margin: 0.75rem 0; }
            .article-markdown ul { margin: 0.75rem 0; padding-left: 1.25rem; list-style: disc; }
            .article-markdown li { margin: 0.25rem 0; }
            .article-markdown h3 { margin: 1.25rem 0 0.5rem; font-weight: 600; color: #111827; }
            .article-markdown strong { font-weight: 600; color: #111827; }
            .article-markdown .core-box { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 16px; padding: 14px 14px; margin: 0.75rem 0; }
            
            /* Toast */
            .toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
            .toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, -20px); }
            .toast-enter-to, .toast-leave-from { opacity: 1; transform: translate(-50%, 0); }

            /* Bubble */
            .bubble-fade-enter-active, .bubble-fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
            .bubble-fade-enter-from, .bubble-fade-leave-to { opacity: 0; transform: translateY(10px) scale(0.95); }
            .bubble-fade-enter-to, .bubble-fade-leave-from { opacity: 1; transform: translateY(0) scale(1); }

            .bubble-content-enter-active, .bubble-content-leave-active { transition: opacity 0.3s ease; }
            .bubble-content-enter-from, .bubble-content-leave-to { opacity: 0; }
            .bubble-content-enter-to, .bubble-content-leave-from { opacity: 1; }

            .typing-dot {
                animation: typing 1.4s infinite ease-in-out both;
                width: 4px; height: 4px; background-color: #999; border-radius: 50%; display: inline-block; margin: 0 1px;
            }
            .typing-dot:nth-child(1) { animation-delay: -0.32s; }
            .typing-dot:nth-child(2) { animation-delay: -0.16s; }
            @keyframes typing {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1); }
            }

            .companion-float-wrapper {
                position: relative;
                width: 60px;
                height: 60px;
            }

            .companion-float-avatar {
                width: 100%;
                height: 100%;
                border-radius: 9999px;
                overflow: hidden;
                border: 2px solid #ffffff;
                box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
                background: #f3f4f6;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 26px;
                user-select: none;
            }

            .companion-float-bubble {
                position: absolute;
                pointer-events: auto;
                --bg-color: #ffffff;
                background: var(--bg-color);
                border: 1px solid rgba(219, 203, 194, 0.65);
                border-radius: 18px;
                padding: 12px 14px;
                box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16);
                max-width: min(260px, calc(100vw - 120px));
                min-width: 140px;
                white-space: normal;
                word-break: break-word;
                text-align: left;
            }

            .companion-float-bubble.bubble-right {
                left: calc(100% + 12px);
                top: 50%;
                transform: translateY(-50%);
            }

            .companion-float-bubble.bubble-left {
                right: calc(100% + 12px);
                top: 50%;
                transform: translateY(-50%);
            }

            .companion-float-bubble.bubble-top {
                bottom: calc(100% + 12px);
                left: 50%;
                transform: translateX(-50%);
            }

            .companion-float-bubble.bubble-bottom {
                top: calc(100% + 12px);
                left: 50%;
                transform: translateX(-50%);
            }

            .companion-float-bubble.bubble-right::before {
                content: '';
                position: absolute;
                left: -10px;
                top: 50%;
                transform: translateY(-50%);
                border: 5px solid transparent;
                border-right-color: var(--bg-color);
            }

            .companion-float-bubble.bubble-left::before {
                content: '';
                position: absolute;
                right: -10px;
                top: 50%;
                transform: translateY(-50%);
                border: 5px solid transparent;
                border-left-color: var(--bg-color);
            }

            .companion-float-bubble.bubble-top::before {
                content: '';
                position: absolute;
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                border: 5px solid transparent;
                border-top-color: var(--bg-color);
            }

            .companion-float-bubble.bubble-bottom::before {
                content: '';
                position: absolute;
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                border: 5px solid transparent;
                border-bottom-color: var(--bg-color);
            }
        `;
        document.head.appendChild(style);
    }

    function init() {
        if (document.getElementById(containerId)) return;
        
        injectStyles();

        var el = document.createElement('div');
        el.id = containerId;
        document.body.appendChild(el);

        const App = {
            template: `
            <div class="fixed inset-0 bg-[#f9f7f6] z-[9999] flex flex-col font-sans text-[#666666] animate-fade-in">
                <header v-if="route.name === 'calendar'" class="flex items-center justify-between px-4 h-14 bg-white shadow-sm shrink-0 z-10">
                    <div class="flex items-center gap-1">
                        <div @click="goBack" class="text-2xl cursor-pointer p-2 hover:bg-gray-100 rounded-full transition">
                            <i class="bx bx-chevron-left"></i>
                        </div>
                        <div @click="openCompanionSheet" class="text-2xl cursor-pointer p-2 hover:bg-gray-100 rounded-full transition text-[#c49c99]">
                            <i :class="selectedCompanion ? 'bx bxs-heart' : 'bx bx-heart'"></i>
                        </div>
                    </div>
                    <div class="text-lg font-bold text-[#333333] flex items-center gap-2">
                        <span @click="prevMonth" class="cursor-pointer text-gray-400 hover:text-[#c49c99]">‹</span>
                        {{ currentYearMonth }}
                        <span @click="nextMonth" class="cursor-pointer text-gray-400 hover:text-[#c49c99]">›</span>
                    </div>
                    <div class="flex items-center">
                        <div @click="goToAnalysis" class="text-xl cursor-pointer p-2 hover:bg-gray-100 rounded-full transition">
                            <i class="bx bx-line-chart"></i>
                        </div>
                        <div @click="openSettings" class="text-xl cursor-pointer p-2 hover:bg-gray-100 rounded-full transition">
                            <i class="bx bx-cog"></i>
                        </div>
                    </div>
                </header>

                <header v-else-if="route.name === 'article'" class="flex items-center justify-between px-4 h-14 bg-white shadow-sm shrink-0 z-10">
                    <div @click="goBackFromArticle" class="text-2xl cursor-pointer p-2 hover:bg-gray-100 rounded-full transition">
                        <i class="bx bx-chevron-left"></i>
                    </div>
                    <div class="text-base font-bold text-[#333333] text-center truncate px-2">
                        {{ currentArticle ? currentArticle.title : '科普详情' }}
                    </div>
                    <div class="w-10"></div>
                </header>

                <header v-else class="flex items-center justify-between px-4 h-14 bg-white shadow-sm shrink-0 z-10">
                    <div @click="goBackFromAnalysis" class="text-2xl cursor-pointer p-2 hover:bg-gray-100 rounded-full transition">
                        <i class="bx bx-chevron-left"></i>
                    </div>
                    <div class="text-base font-bold text-[#333333] text-center truncate px-2">数据分析</div>
                    <div class="w-10"></div>
                </header>

                <main v-if="route.name === 'calendar'" class="flex-1 overflow-y-auto p-4">
                    <!-- Week Header -->
                    <div class="grid grid-cols-7 mb-4 text-center text-xs text-[#999999]">
                        <div v-for="day in weekDays" :key="day">{{ day }}</div>
                    </div>
                    
                    <!-- Days Grid -->
                    <div class="grid grid-cols-7 gap-y-4 text-center">
                        <div v-for="(dayObj, index) in calendarDays" :key="index" class="relative flex items-center justify-center h-10 mx-auto w-full">
                            
                            <div v-if="dayObj" 
                                :class="[
                                    'flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-all duration-300 relative select-none',
                                    getDayClasses(dayObj)
                                ]"
                                @click="selectDate(dayObj)"
                            >
                                {{ dayObj.date.getDate() }}
                                <div v-if="isToday(dayObj.date)" class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#b5a4a3] text-white text-[10px] flex items-center justify-center leading-none">
                                    今
                                </div>
                                <div v-if="isOvulationDay(dayObj.date)" class="absolute left-1/2 -translate-x-1/2 bottom-1 w-1 h-1 rounded-full bg-[#c7c1cb]"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Legend -->
                    <div class="mt-8 flex flex-wrap justify-center gap-4 text-xs text-[#666666]">
                        <div class="flex items-center gap-1.5">
                            <div class="w-2.5 h-2.5 rounded-full bg-[#c49c99]"></div>
                            <span>经期</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <div class="w-2.5 h-2.5 rounded-full bg-[#e8ddd8]"></div>
                            <span>预测</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <div class="w-2.5 h-2.5 rounded-full border border-dashed border-[#c7c1cb] bg-transparent"></div>
                            <span>排卵期</span>
                        </div>
                         <div class="flex items-center gap-1.5">
                            <div class="w-2.5 h-2.5 flex items-center justify-center">
                                <div class="w-1 h-1 rounded-full bg-[#c7c1cb]"></div>
                            </div>
                            <span>排卵日</span>
                        </div>
                    </div>

                    <!-- Status Card -->
                    <div class="mt-8 mx-2 bg-white rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(196,156,153,0.15)] border border-[#dbcbc2]/20">
                        <div class="flex items-center gap-3 mb-2">
                             <div class="text-2xl animate-bounce">{{ currentStatus.icon }}</div>
                             <div class="flex items-center gap-2 cursor-pointer select-none" @click="goToArticle(currentStatus.phaseId)">
                                <div class="font-bold text-[#c49c99] text-lg">{{ currentStatus.title }}</div>
                                <svg viewBox="0 0 24 24" class="w-4 h-4 text-[#6b7280]">
                                    <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 15a1 1 0 1 1 0 2a1 1 0 0 1 0-2Zm1-3.5V15h-2v-1.5c0-2.5 3-2.25 3-4.25c0-1.1-.9-1.75-2-1.75c-1.06 0-1.88.52-2.43 1.24L8.1 7.46C8.93 6.4 10.3 5.5 12 5.5c2.2 0 4 1.25 4 3.5c0 2.75-3 2.75-3 4.5Z"/>
                                </svg>
                             </div>
                        </div>
                        <div class="text-xs text-[#aaaaaa] mb-2">{{ selectedDateText }}</div>
                        <p class="text-sm text-[#888888] leading-relaxed pl-1">{{ currentStatus.desc }}</p>
                    </div>

                    <!-- Daily Record Card -->
                    <div class="mt-4 mx-2 bg-white rounded-2xl p-5 shadow-[0_10px_24px_-16px_rgba(0,0,0,0.18)] border border-[#dbcbc2]/20">
                        <div class="flex items-center justify-between">
                            <div class="text-sm font-semibold text-[#444444]">{{ periodToggleLabel }}</div>
                            <button
                                type="button"
                                class="w-12 h-7 rounded-full transition relative"
                                :class="[
                                    periodToggleOn ? 'bg-[#c49c99]' : 'bg-gray-200',
                                    isFutureSelected ? 'opacity-60 cursor-not-allowed' : ''
                                ]"
                                @click="togglePeriodStarted"
                                :aria-pressed="periodToggleOn ? 'true' : 'false'"
                                :disabled="isFutureSelected"
                            >
                                <span
                                    class="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform"
                                    :class="periodToggleOn ? 'translate-x-[22px]' : 'translate-x-0'"
                                ></span>
                            </button>
                        </div>

                        <div v-if="isFutureSelected" class="mt-2 text-xs text-[#999999]">不能记录未来的日期哦</div>

                        <div v-if="isPeriodDay" class="mt-4 space-y-3">
                            <div class="flex items-center justify-between">
                                <div class="text-sm text-[#666666]">流量</div>
                                <div class="flex items-center gap-2">
                                    <button
                                        v-for="n in 3"
                                        :key="'flow-'+n"
                                        type="button"
                                        class="w-7 h-7 flex items-center justify-center"
                                        :class="isFutureSelected ? 'opacity-60 cursor-not-allowed' : ''"
                                        :disabled="isFutureSelected"
                                        @click="setFlow(n)"
                                    >
                                        <svg viewBox="0 0 24 24" class="w-5 h-5" :class="flowLevel >= n ? 'text-[#c49c99]' : 'text-[#cfcfcf]'" fill="currentColor">
                                            <path d="M12 2s-7 8-7 13a7 7 0 0014 0c0-5-7-13-7-13z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="text-sm text-[#666666]">痛经</div>
                                <div class="flex items-center gap-2">
                                    <button
                                        v-for="n in 3"
                                        :key="'pain-'+n"
                                        type="button"
                                        class="w-7 h-7 flex items-center justify-center"
                                        :class="isFutureSelected ? 'opacity-60 cursor-not-allowed' : ''"
                                        :disabled="isFutureSelected"
                                        @click="setPain(n)"
                                    >
                                        <svg viewBox="0 0 24 24" class="w-5 h-5" :class="painLevel >= n ? 'text-[#c49c99]' : 'text-[#cfcfcf]'" fill="currentColor">
                                            <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            class="mt-5 w-full flex items-center justify-between text-left"
                            :class="isFutureSelected ? 'opacity-60 cursor-not-allowed' : ''"
                            :disabled="isFutureSelected"
                            @click="toggleSymptoms"
                        >
                            <div class="text-sm font-semibold text-[#444444]">身体症状</div>
                            <div class="text-[#999999] transition-transform" :class="symptomsOpen ? 'rotate-180' : ''">▾</div>
                        </button>

                        <div v-if="symptomsOpen" class="mt-4 space-y-4">
                            <div v-for="group in symptomGroups" :key="group.key">
                                <div class="text-xs text-[#999999] mb-2">{{ group.label }}</div>
                                <div class="grid grid-cols-4 gap-2">
                                    <button
                                        v-for="opt in group.options"
                                        :key="group.key + ':' + opt"
                                        type="button"
                                        class="px-2 py-1.5 rounded-full text-xs transition border"
                                        :class="isSymptomSelected(group.key + ':' + opt) ? 'bg-[#c49c99] text-white border-[#c49c99]' : 'bg-gray-100 text-[#666666] border-gray-200'"
                                        :disabled="isFutureSelected"
                                        @click="toggleSymptom(group.key + ':' + opt)"
                                    >
                                        {{ opt }}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="button"
                                class="w-full h-10 rounded-xl bg-[#c49c99] text-white font-semibold active:scale-[0.99] transition"
                                :class="isFutureSelected ? 'opacity-60 cursor-not-allowed' : ''"
                                :disabled="isFutureSelected"
                                @click="saveSymptoms"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </main>

                <!-- Settings Bottom Sheet -->
                <div v-if="route.name === 'calendar'" class="fixed inset-0 z-[300] pointer-events-none">
                    <transition name="period-fade">
                        <div v-if="settingsOpen" class="absolute inset-0 bg-black/30 pointer-events-auto" @click="closeSettings"></div>
                    </transition>
                    <transition name="period-sheet">
                        <div v-if="settingsOpen" class="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl shadow-2xl p-5 pb-7 max-h-[55vh] overflow-y-auto pointer-events-auto">
                        <div class="flex items-center justify-between mb-4">
                            <div class="text-base font-bold text-[#333333]">设置</div>
                            <button type="button" class="w-8 h-8 rounded-full hover:bg-gray-100 text-xl leading-none flex items-center justify-center" @click="closeSettings">×</button>
                        </div>

                        <div class="space-y-5">
                            <div>
                                <div class="flex items-center justify-between mb-2">
                                    <div class="text-sm font-semibold text-[#444444]">经期持续天数</div>
                                    <div class="text-sm text-[#666666]">{{ draftPeriodLength }} 天</div>
                                </div>
                                <input type="range" min="2" max="10" step="1" v-model.number="draftPeriodLength" class="w-full accent-[#c49c99]" />
                            </div>

                            <div>
                                <div class="flex items-center justify-between mb-2">
                                    <div class="text-sm font-semibold text-[#444444]">经期间隔天数</div>
                                    <div class="text-sm text-[#666666]">{{ draftCycleLength }} 天</div>
                                </div>
                                <input type="range" min="20" max="40" step="1" v-model.number="draftCycleLength" class="w-full accent-[#c49c99]" />
                            </div>

                            <div class="text-xs text-[#999999]">💡 提示：一般女性的经期间隔约为 28 天</div>
                        </div>

                        <button type="button" class="mt-6 w-full h-11 rounded-xl bg-[#c49c99] text-white font-semibold active:scale-[0.99] transition" @click="saveSettings">
                            保存
                        </button>
                        <button type="button" class="mt-3 w-full h-11 rounded-xl border border-[#e7c3c3] text-[#7a3b3b] font-semibold active:scale-[0.99] transition" @click="resetAllRecords">
                            重置所有记录
                        </button>
                        </div>
                    </transition>
                </div>

                <!-- Companion Bottom Sheet -->
                <div v-if="route.name === 'calendar'" class="fixed inset-0 z-[300] pointer-events-none">
                    <transition name="period-fade">
                        <div v-if="companionSheetOpen" class="absolute inset-0 bg-black/50 pointer-events-auto" @click="closeCompanionSheet"></div>
                    </transition>
                    <transition name="period-sheet">
                        <div v-if="companionSheetOpen" class="absolute left-0 right-0 bottom-0 bg-white rounded-t-[20px] shadow-2xl p-5 pb-7 max-h-[60vh] overflow-y-auto pointer-events-auto flex flex-col">
                            <div class="flex items-center justify-between mb-4 shrink-0">
                                <div class="text-base font-bold text-[#333333]">请选择陪伴你的角色</div>
                                <button type="button" class="w-8 h-8 rounded-full hover:bg-gray-100 text-xl leading-none flex items-center justify-center" @click="closeCompanionSheet">×</button>
                            </div>
                            
                            <div class="space-y-3 overflow-y-auto">
                                <div v-for="char in companions" :key="char.role_id || char.id" 
                                    @click="selectCompanion(char)"
                                    class="flex items-center gap-4 p-3 rounded-xl border transition cursor-pointer"
                                    :class="(selectedCompanion && (selectedCompanion.role_id || selectedCompanion.id) === (char.role_id || char.id)) ? 'border-[#c49c99] bg-[#fff5f5]' : 'border-gray-100 hover:border-[#c49c99]/50'"
                                >
                                    <div class="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-2xl border border-gray-200">
                                        <img v-if="char.avatar" :src="char.avatar" class="w-full h-full object-cover" />
                                        <span v-else>{{ char.emoji || '👤' }}</span>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="font-bold text-[#333333] truncate">{{ char.name }}</div>
                                        <div class="text-xs text-[#999999] mt-1 truncate">{{ char.persona }}</div>
                                    </div>
                                    <div class="text-[#c49c99] shrink-0" v-if="selectedCompanion && (selectedCompanion.role_id || selectedCompanion.id) === (char.role_id || char.id)">
                                        <i class="bx bxs-check-circle text-xl"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </transition>
                </div>

                <!-- Toast -->
                <transition name="toast">
                    <div v-if="toastVisible" class="fixed top-20 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm z-[400] shadow-lg pointer-events-none whitespace-nowrap">
                        {{ toastMessage }}
                    </div>
                </transition>

                <!-- Companion Bubble -->
                <transition name="bubble-fade">
                    <div 
                        v-if="selectedCompanion && route.name === 'calendar'" 
                        ref="draggableRef"
                        class="fixed z-[150] touch-none select-none cursor-move"
                        :style="dragStyle"
                        @mousedown="startDrag"
                        @touchstart="startDrag"
                    >
                        <div class="companion-float-wrapper">
                            <div class="companion-float-avatar" @click.stop="handleAvatarClick">
                                <img v-if="selectedCompanion.avatar" :src="selectedCompanion.avatar" class="w-full h-full object-cover" />
                                <span v-else>{{ selectedCompanion.emoji }}</span>
                            </div>

                        <div 
                            v-if="bubbleVisible" 
                            ref="bubbleRef"
                            class="companion-float-bubble" 
                            :class="bubblePositionClasses"
                            :style="bubbleStyle"
                        >
                                <transition name="bubble-content" mode="out-in">
                                    <div v-if="isTyping" class="flex items-center gap-1 h-5">
                                        <div class="typing-dot"></div>
                                        <div class="typing-dot"></div>
                                        <div class="typing-dot"></div>
                                    </div>
                                    <div v-else :key="currentBubbleMessage" class="text-sm text-[#444] leading-relaxed">
                                        {{ currentBubbleMessage }}
                                    </div>
                                </transition>
                            </div>
                        </div>
                    </div>
                </transition>

                <main v-if="route.name === 'article'" class="flex-1 overflow-y-auto bg-white">
                    <div class="px-4 py-5">
                        <div v-if="!currentArticle" class="text-sm text-[#888888]">未找到对应的科普文章。</div>
                        <div v-else class="text-[#333333] leading-[1.7]">
                            <div class="text-xs text-[#9ca3af] mb-3">{{ currentArticle.category }}</div>
                            <div class="text-xl font-bold mb-4">{{ currentArticle.title }}</div>
                            <div class="text-sm article-markdown" v-html="currentArticleHtml"></div>
                        </div>
                    </div>
                </main>

                <main v-else-if="route.name === 'analysis'" class="flex-1 overflow-y-auto p-4">
                    <div class="mx-2 bg-white rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(196,156,153,0.15)] border border-[#dbcbc2]/20">
                        <div class="text-xs text-[#9ca3af] mb-2">周期概览 (Cycle Averages)</div>
                        <div class="flex items-end justify-between gap-6">
                            <div>
                                <div class="text-4xl font-extrabold text-[#333333]">{{ averageCycleLength }}</div>
                                <div class="text-xs text-[#999999] mt-1">平均周期天数</div>
                            </div>
                            <div class="text-right">
                                <div class="text-4xl font-extrabold text-[#333333]">{{ averagePeriodLength }}</div>
                                <div class="text-xs text-[#999999] mt-1">平均经期天数</div>
                                <div class="text-xs text-[#9ca3af] mt-1">当前设置：{{ periodLength }} 天</div>
                            </div>
                        </div>
                        <div class="mt-4 text-sm text-[#888888]">
                            你的周期波动范围为 ± {{ cycleVariation }} 天。临床上，成年女性波动在 7 天内均属正常。
                        </div>
                        <button type="button" class="mt-4 h-10 px-4 rounded-xl border border-gray-200 text-[#666666] font-semibold" @click="goToArticle('analysis_cycle_overview')">
                            了解这些指标
                        </button>
                    </div>

                    <div class="mt-4 mx-2 bg-white rounded-2xl p-5 shadow-[0_10px_24px_-16px_rgba(0,0,0,0.18)] border border-[#dbcbc2]/20">
                        <div class="text-xs text-[#9ca3af] mb-4">你的身体模式 (Your Body Patterns)</div>
                        <div v-if="mostFrequentSymptomsWithPercent.length === 0" class="text-sm text-[#888888]">暂无症状数据。</div>
                        <div v-else class="space-y-4">
                            <div v-for="item in mostFrequentSymptomsWithPercent" :key="item.symptom">
                                <div class="flex items-center justify-between mb-2">
                                    <div class="text-sm font-semibold text-[#444444]">{{ item.label }}</div>
                                    <div class="text-xs text-[#999999]">{{ item.count }} 次</div>
                                </div>
                                <div class="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <div class="h-2 rounded-full bg-[#c49c99]" :style="{ width: item.percent + '%' }"></div>
                                </div>
                            </div>
                        </div>
                        <button type="button" class="mt-5 h-10 px-4 rounded-xl border border-gray-200 text-[#666666] font-semibold" @click="goToArticle('analysis_symptom_patterns')">
                            了解症状统计
                        </button>
                    </div>

                    <div class="mt-4 mx-2 rounded-2xl p-5 shadow-[0_10px_24px_-16px_rgba(0,0,0,0.18)] border"
                        :class="averageCycleLength > 35 || averageCycleLength < 21 ? 'bg-[#fff7f7] border-[#e7c3c3]' : 'bg-[#f7faf9] border-[#cfe3db]'"
                    >
                        <div class="text-xs text-[#9ca3af] mb-3">健康洞察 (Health Insights)</div>
                        <div v-if="averageCycleLength > 35 || averageCycleLength < 21">
                            <div class="text-sm font-semibold text-[#7a3b3b] mb-2">
                                你的平均周期为 {{ averageCycleLength }} 天，超出了 21-35 天的常规临床范围。
                            </div>
                            <div class="text-sm text-[#7a3b3b] leading-relaxed">
                                这可能是多囊卵巢综合征 (PCOS) 或甲状腺问题的信号。
                            </div>
                            <button type="button" class="mt-4 h-10 px-4 rounded-xl bg-[#c49c99] text-white font-semibold" @click="goToArticle('analysis_irregular_cycles')">
                                阅读相关科普
                            </button>
                        </div>
                        <div v-else>
                            <div class="text-sm font-semibold text-[#2f5b4e] mb-2">你的周期长度非常稳定。</div>
                            <div class="text-sm text-[#2f5b4e] leading-relaxed">持续记录有助于及早发现未来的潜在变化。</div>
                            <button type="button" class="mt-4 h-10 px-4 rounded-xl border border-[#cfe3db] text-[#2f5b4e] font-semibold" @click="goToArticle('analysis_stable_cycles')">
                                了解如何继续追踪
                            </button>
                        </div>
                    </div>
                </main>
            </div>
            `,
            setup() {
                const { ref, computed, watch, onMounted } = Vue;

                const STORAGE_KEYS = {
                    cycleLength: 'period_cycle_length',
                    periodLength: 'period_period_length',
                    dailyRecords: 'period_daily_records'
                };

                const formatDate = (date) => {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                };

                const parseDateKey = (key) => {
                    const [y, m, d] = key.split('-').map((v) => Number(v));
                    return new Date(y, m - 1, d);
                };

                const addDays = (date, days) => {
                    const d = new Date(date);
                    d.setDate(d.getDate() + days);
                    return d;
                };

                const addMonths = (date, months) => {
                    const d = new Date(date);
                    d.setMonth(d.getMonth() + months);
                    return d;
                };

                const diffDays = (a, b) => {
                    const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
                    const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
                    return Math.round((a0.getTime() - b0.getTime()) / 86400000);
                };

                const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

                const route = ref({ name: 'calendar', id: null });

                const parseHashRoute = () => {
                    const raw = window.location.hash || '';
                    const hash = raw.startsWith('#') ? raw.slice(1) : raw;
                    if (hash.startsWith('/article/')) {
                        const id = decodeURIComponent(hash.slice('/article/'.length));
                        route.value = { name: 'article', id };
                        return;
                    }
                    if (hash === '/analysis' || hash.startsWith('/analysis')) {
                        route.value = { name: 'analysis', id: null };
                        return;
                    }
                    route.value = { name: 'calendar', id: null };
                };

                const articleLibrary = Array.isArray(window.articleLibrary) ? window.articleLibrary : [];

                const currentArticle = computed(() => {
                    if (route.value.name !== 'article') return null;
                    return articleLibrary.find((a) => a && a.id === route.value.id) || null;
                });

                const escapeHtml = (s) => {
                    return String(s)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
                };

                const renderInline = (s) => {
                    return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                };

                const isStandaloneStrongLine = (line) => {
                    const t = line.trim();
                    if (!(t.startsWith('**') && t.endsWith('**'))) return false;
                    const inner = t.slice(2, -2);
                    return inner.indexOf('**') === -1;
                };

                const renderMarkdown = (md) => {
                    const src = String(md || '').replace(/\r\n/g, '\n');
                    const lines = src.split('\n');
                    let html = '';
                    let inList = false;
                    let inCore = false;

                    const closeList = () => {
                        if (!inList) return;
                        html += '</ul>';
                        inList = false;
                    };

                    const closeCore = () => {
                        if (!inCore) return;
                        closeList();
                        html += '</div>';
                        inCore = false;
                    };

                    for (const line of lines) {
                        const t = line.trim();
                        if (!t) {
                            closeList();
                            continue;
                        }

                        if (t.startsWith('💡') && t.includes('核心要点')) {
                            closeCore();
                            html += '<div class="core-box">';
                            inCore = true;
                            html += `<div class="font-semibold mb-2">${renderInline(t)}</div>`;
                            continue;
                        }

                        if (t === '**身体正在经历什么？**' && inCore) {
                            closeCore();
                        }

                        if (isStandaloneStrongLine(t)) {
                            closeList();
                            if (inCore) closeCore();
                            html += `<h3>${escapeHtml(t.slice(2, -2))}</h3>`;
                            continue;
                        }

                        if (t.startsWith('* ')) {
                            if (!inList) {
                                html += '<ul>';
                                inList = true;
                            }
                            html += `<li>${renderInline(t.slice(2))}</li>`;
                            continue;
                        }

                        closeList();
                        html += `<p>${renderInline(t)}</p>`;
                    }

                    closeCore();
                    closeList();
                    return html;
                };

                const currentArticleHtml = computed(() => {
                    if (!currentArticle.value) return '';
                    return renderMarkdown(currentArticle.value.content);
                });

                const symptomLabel = (key) => {
                    if (!key) return '';
                    if (key.indexOf(':') !== -1) {
                        return key.split(':')[1];
                    }
                    const map = {
                        cramps: '痛经',
                        fatigue: '疲劳',
                        headache: '头痛',
                        bloating: '腹胀',
                        cravings: '食欲增加',
                        acne: '痘痘',
                        mood_swings: '情绪波动',
                        tender_breasts: '乳房胀痛'
                    };
                    return map[key] || key;
                };

                const derivedCycleHistory = computed(() => {
                    const cycles = periodCycles.value;
                    const items = [];
                    if (!cycles.length) return items;

                    for (let i = 0; i < cycles.length; i++) {
                        const cycle = cycles[i];
                        const start = parseDateKey(cycle.startKey);
                        const end = parseDateKey(cycle.endKey);
                        const periodLen = Math.max(1, diffDays(end, start) + 1);

                        let cycleLen = 0;
                        if (i < cycles.length - 1) {
                            const nextStart = parseDateKey(cycles[i + 1].startKey);
                            cycleLen = diffDays(nextStart, start);
                        } else {
                            cycleLen = cycleLength.value;
                        }

                        const symptomCounts = {};
                        let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                        while (cursor.getTime() <= end.getTime()) {
                            const key = formatDate(cursor);
                            const rec = recordsByDate.value[key];
                            const list = rec && Array.isArray(rec.symptoms) ? rec.symptoms : [];
                            for (const s of list) {
                                if (!s) continue;
                                symptomCounts[s] = (symptomCounts[s] || 0) + 1;
                            }
                            cursor = addDays(cursor, 1);
                        }

                        const topSymptoms = Object.entries(symptomCounts)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([s]) => s);

                        items.push({
                            id: i + 1,
                            startDate: cycle.startKey,
                            endDate: cycle.endKey,
                            cycleLength: cycleLen,
                            periodLength: periodLen,
                            topSymptoms
                        });
                    }

                    return items;
                });

                const averageCycleLength = computed(() => {
                    const history = derivedCycleHistory.value;
                    if (!history.length) return 0;
                    const total = history.reduce((sum, r) => sum + (Number(r.cycleLength) || 0), 0);
                    return Math.round(total / history.length);
                });

                const averagePeriodLength = computed(() => {
                    const history = derivedCycleHistory.value;
                    if (!history.length) return Number(periodLength.value) || 0;
                    const total = history.reduce((sum, r) => sum + (Number(r.periodLength) || 0), 0);
                    return Math.round(total / history.length);
                });

                const cycleVariation = computed(() => {
                    const history = derivedCycleHistory.value;
                    if (!history.length) return 0;
                    const values = history.map((r) => Number(r.cycleLength) || 0).filter((n) => n > 0);
                    if (!values.length) return 0;
                    return Math.max(...values) - Math.min(...values);
                });

                const mostFrequentSymptoms = computed(() => {
                    const history = derivedCycleHistory.value;
                    if (history.length) {
                        const counts = {};
                        for (const r of history) {
                            const list = Array.isArray(r.topSymptoms) ? r.topSymptoms : [];
                            for (const s of list) {
                                if (!s) continue;
                                counts[s] = (counts[s] || 0) + 1;
                            }
                        }
                        return Object.entries(counts)
                            .map(([symptom, count]) => ({ symptom, count }))
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 3);
                    }

                    const counts = {};
                    const recMap = recordsByDate.value || {};
                    const keys = Object.keys(recMap);
                    const today = new Date();
                    const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    for (const key of keys) {
                        const rec = recMap[key];
                        if (!rec || typeof rec !== 'object') continue;
                        const list = Array.isArray(rec.symptoms) ? rec.symptoms : [];
                        if (!list.length) continue;

                        const d = parseDateKey(key);
                        const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        const delta = diffDays(today0, d0);
                        if (delta < 0 || delta > 60) continue;

                        for (const s of list) {
                            if (!s) continue;
                            counts[s] = (counts[s] || 0) + 1;
                        }
                    }

                    return Object.entries(counts)
                        .map(([symptom, count]) => ({ symptom, count }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 3);
                });

                const mostFrequentSymptomsWithPercent = computed(() => {
                    const list = mostFrequentSymptoms.value;
                    const max = list.reduce((m, x) => Math.max(m, x.count), 0) || 1;
                    return list.map((x) => ({
                        symptom: x.symptom,
                        label: symptomLabel(x.symptom),
                        count: x.count,
                        percent: Math.round((x.count / max) * 100)
                    }));
                });

                const currentDate = ref(new Date());
                const selectedDate = ref(new Date());
                const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

                const cycleLength = ref(clamp(Number(localStorage.getItem(STORAGE_KEYS.cycleLength)) || 28, 20, 40));
                const periodLength = ref(clamp(Number(localStorage.getItem(STORAGE_KEYS.periodLength)) || 5, 2, 10));

                const loadDailyRecords = () => {
                    try {
                        const raw = localStorage.getItem(STORAGE_KEYS.dailyRecords);
                        const obj = raw ? JSON.parse(raw) : {};
                        return obj && typeof obj === 'object' ? obj : {};
                    } catch (e) {
                        return {};
                    }
                };

                const recordsByDate = ref(loadDailyRecords());

                const persistDailyRecords = () => {
                    try {
                        localStorage.setItem(STORAGE_KEYS.dailyRecords, JSON.stringify(recordsByDate.value));
                    } catch (e) {}
                };

                const selectedKey = computed(() => formatDate(selectedDate.value));
                const todayKey = computed(() => formatDate(new Date()));

                const ensureRecord = (key) => {
                    const prev = recordsByDate.value[key];
                    if (prev && typeof prev === 'object') return prev;
                    const next = { periodStarted: false, periodEnded: false, flowLevel: 0, painLevel: 0, symptoms: [] };
                    recordsByDate.value = { ...recordsByDate.value, [key]: next };
                    return next;
                };

                const updateRecord = (patch) => {
                    const key = selectedKey.value;
                    const prev = ensureRecord(key);
                    const next = { ...prev, ...patch };
                    // 确保响应式更新
                    recordsByDate.value = Object.assign({}, recordsByDate.value, { [key]: next });
                    persistDailyRecords();
                };

                const updateRecordForKey = (key, patch) => {
                    const prev = ensureRecord(key);
                    const next = { ...prev, ...patch };
                    recordsByDate.value = Object.assign({}, recordsByDate.value, { [key]: next });
                    persistDailyRecords();
                };

                const periodStarts = computed(() => {
                    const keys = Object.keys(recordsByDate.value || {});
                    return keys
                        .filter((k) => recordsByDate.value[k] && recordsByDate.value[k].periodStarted)
                        .sort((a, b) => parseDateKey(a).getTime() - parseDateKey(b).getTime());
                });

                const periodTimeline = computed(() => {
                    const keys = Object.keys(recordsByDate.value || {}).sort(
                        (a, b) => parseDateKey(a).getTime() - parseDateKey(b).getTime()
                    );
                    const cycles = [];
                    let openStart = null;

                    for (const key of keys) {
                        const rec = recordsByDate.value[key];
                        if (!rec || typeof rec !== 'object') continue;

                        if (rec.periodStarted) {
                            if (openStart) {
                                const startDate = parseDateKey(openStart);
                                const implicitEnd = addDays(startDate, periodLength.value - 1);
                                const beforeNextStart = addDays(parseDateKey(key), -1);
                                const safeBefore = beforeNextStart.getTime() < startDate.getTime() ? startDate : beforeNextStart;
                                const finalEnd = implicitEnd.getTime() < safeBefore.getTime() ? implicitEnd : safeBefore;
                                const endKey = formatDate(finalEnd);
                                cycles.push({ startKey: openStart, endKey });
                            }
                            openStart = key;
                        }

                        if (rec.periodEnded && openStart) {
                            const startDate = parseDateKey(openStart);
                            const endDate = parseDateKey(key);
                            const safeEnd = endDate.getTime() < startDate.getTime() ? startDate : endDate;
                            const endKey = formatDate(safeEnd);
                            cycles.push({ startKey: openStart, endKey });
                            openStart = null;
                        }
                    }

                    return { cycles, activeStartKey: openStart };
                });

                const periodCycles = computed(() => periodTimeline.value.cycles);
                const activePeriodStartKey = computed(() => periodTimeline.value.activeStartKey);

                const lastPeriodStartKey = computed(() => {
                    const starts = periodStarts.value;
                    if (starts.length) return starts[starts.length - 1];
                    return formatDate(addDays(new Date(), -10));
                });

                const actualPeriodSet = computed(() => {
                    const set = new Set();
                    for (const cycle of periodCycles.value) {
                        const start = parseDateKey(cycle.startKey);
                        const end = parseDateKey(cycle.endKey);
                        let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                        while (cursor.getTime() <= end.getTime()) {
                            set.add(formatDate(cursor));
                            cursor = addDays(cursor, 1);
                        }
                    }
                    if (activePeriodStartKey.value) {
                        const start = parseDateKey(activePeriodStartKey.value);
                        const implicitEnd = addDays(start, periodLength.value - 1);
                        const today = parseDateKey(todayKey.value);
                        const end = implicitEnd.getTime() > today.getTime() ? implicitEnd : today;
                        let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                        while (cursor.getTime() <= end.getTime()) {
                            set.add(formatDate(cursor));
                            cursor = addDays(cursor, 1);
                        }
                    }
                    return set;
                });

                const predictedCycleStarts = computed(() => {
                    const lastStart = parseDateKey(lastPeriodStartKey.value);
                    const end = addMonths(new Date(), 3);
                    const starts = [];
                    let cursor = addDays(lastStart, cycleLength.value);
                    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
                    while (cursor.getTime() <= end.getTime()) {
                        starts.push(new Date(cursor));
                        cursor = addDays(cursor, cycleLength.value);
                    }
                    return starts;
                });

                const predictedPeriodDates = computed(() => {
                    const dates = [];
                    for (const start of predictedCycleStarts.value) {
                        for (let i = 0; i < periodLength.value; i++) {
                            dates.push(formatDate(addDays(start, i)));
                        }
                    }
                    return dates;
                });

                const predictedPeriodSet = computed(() => new Set(predictedPeriodDates.value));

                const allCycleStartsForPhase = computed(() => {
                    const lastStart = parseDateKey(lastPeriodStartKey.value);
                    const list = [lastStart, ...predictedCycleStarts.value];
                    return list.sort((a, b) => a.getTime() - b.getTime());
                });

                const ovulationDaySet = computed(() => {
                    const set = new Set();
                    for (const start of allCycleStartsForPhase.value) {
                        const ovulation = addDays(start, cycleLength.value - 14);
                        set.add(formatDate(ovulation));
                    }
                    return set;
                });

                const ovulationWindowSet = computed(() => {
                    const set = new Set();
                    for (const start of allCycleStartsForPhase.value) {
                        const ovulation = addDays(start, cycleLength.value - 14);
                        for (let i = -4; i <= 5; i++) {
                            set.add(formatDate(addDays(ovulation, i)));
                        }
                    }
                    return set;
                });

                const currentYearMonth = computed(() => {
                    return `${currentDate.value.getFullYear()}年${currentDate.value.getMonth() + 1}月`;
                });

                const calendarDays = computed(() => {
                    const year = currentDate.value.getFullYear();
                    const month = currentDate.value.getMonth();

                    const firstDayOfMonth = new Date(year, month, 1);
                    const lastDayOfMonth = new Date(year, month + 1, 0);

                    const days = [];
                    let startDay = firstDayOfMonth.getDay();
                    if (startDay === 0) startDay = 7;

                    for (let i = 1; i < startDay; i++) {
                        days.push(null);
                    }

                    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
                        days.push({ date: new Date(year, month, i), day: i });
                    }

                    const remaining = days.length % 7;
                    if (remaining !== 0) {
                        for (let i = 0; i < 7 - remaining; i++) days.push(null);
                    }

                    return days;
                });

                const selectedDateText = computed(() => {
                    const d = selectedDate.value;
                    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
                });

                const isFutureSelected = computed(() => {
                    const today = new Date();
                    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const s = selectedDate.value;
                    const s0 = new Date(s.getFullYear(), s.getMonth(), s.getDate());
                    return s0.getTime() > t0.getTime();
                });

                const isToday = (date) => {
                    const today = new Date();
                    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
                };

                const isSelected = (date) => formatDate(date) === selectedKey.value;
                const isPeriod = (date) => actualPeriodSet.value.has(formatDate(date));
                const isPredicted = (date) => predictedPeriodSet.value.has(formatDate(date));
                const isOvulationDay = (date) => ovulationDaySet.value.has(formatDate(date));
                const isOvulationWindow = (date) => ovulationWindowSet.value.has(formatDate(date));

                const currentStatus = computed(() => {
                    const key = selectedKey.value;
                    const selected = new Date(selectedDate.value);

                    if (actualPeriodSet.value.has(key)) {
                        return { phaseId: 'phase_menstrual', icon: '🩸', title: '当前状态：经期', desc: '请注意保暖与休息，多喝温水，避免生冷食物。' };
                    }

                    if (predictedPeriodSet.value.has(key)) {
                        return { phaseId: 'phase_menstrual', icon: '🩸', title: '当前状态：预测经期', desc: '这是根据你的设置推算的日期，可用于提前安排作息与备用品。' };
                    }

                    if (ovulationDaySet.value.has(key)) {
                        return { phaseId: 'phase_ovulation_day', icon: '🥚', title: '当前状态：排卵日', desc: '今天是排卵高峰日，受孕概率更高，注意身体信号。' };
                    }

                    if (ovulationWindowSet.value.has(key)) {
                        return { phaseId: 'phase_ovulation', icon: '🌱', title: '当前状态：排卵期', desc: '精力更充沛、状态更稳定，适合运动与安排重要事项。' };
                    }

                    const lastStart = parseDateKey(lastPeriodStartKey.value);
                    const delta = diffDays(selected, lastStart);
                    const steps = delta >= 0 ? Math.floor(delta / cycleLength.value) : -Math.ceil(Math.abs(delta) / cycleLength.value);
                    const cycleStart = addDays(lastStart, steps * cycleLength.value);
                    const dayInCycle = diffDays(selected, cycleStart);

                    const ovulationIndex = cycleLength.value - 14;
                    const ovulationWindowStartIndex = ovulationIndex - 4;
                    const ovulationWindowEndIndex = ovulationIndex + 5;

                    if (dayInCycle >= 0 && dayInCycle < ovulationWindowStartIndex) {
                        return { phaseId: 'phase_follicular', icon: '🌱', title: '当前状态：卵泡期', desc: '激素水平逐步上升，状态更清爽，适合建立好习惯。' };
                    }

                    return { phaseId: 'phase_luteal', icon: '🍂', title: '当前状态：黄体期', desc: '更易疲惫或情绪波动，注意休息、补水与温和运动。' };
                });

                const getDayClasses = (dayObj) => {
                    const dateStr = formatDate(dayObj.date);
                    const selectedRing = isSelected(dayObj.date) ? 'ring-1 ring-[#b5a4a3] ring-offset-2 ring-offset-[#f9f7f6]' : '';

                    if (actualPeriodSet.value.has(dateStr)) {
                        return `bg-[#c49c99] text-white shadow-md shadow-[#c49c99]/40 ${selectedRing}`;
                    }
                    if (predictedPeriodSet.value.has(dateStr)) {
                        return `bg-[#e8ddd8] text-[#4b3f3e] shadow-sm ${selectedRing}`;
                    }
                    if (ovulationWindowSet.value.has(dateStr)) {
                        return `border-2 border-dashed border-[#c7c1cb] text-[#8f8796] ${selectedRing}`;
                    }
                    if (isToday(dayObj.date)) {
                        return `text-[#c49c99] font-bold ${selectedRing}`;
                    }
                    return `text-[#666666] hover:bg-gray-100 ${selectedRing}`;
                };

                const prevMonth = () => {
                    const d = new Date(currentDate.value);
                    d.setMonth(d.getMonth() - 1);
                    currentDate.value = d;
                };

                const nextMonth = () => {
                    const d = new Date(currentDate.value);
                    d.setMonth(d.getMonth() + 1);
                    currentDate.value = d;
                };

                const selectDate = (dayObj) => {
                    selectedDate.value = dayObj.date;
                    const clickedKey = formatDate(dayObj.date);
                    if (!activePeriodStartKey.value) return;
                    if (parseDateKey(clickedKey).getTime() < parseDateKey(activePeriodStartKey.value).getTime()) return;
                    if (parseDateKey(clickedKey).getTime() > parseDateKey(todayKey.value).getTime()) return;
                    if (!actualPeriodSet.value.has(clickedKey)) return;
                    const ok = clickedKey === activePeriodStartKey.value
                        ? window.confirm(`将 ${clickedKey} 的经期标记取消吗？`)
                        : window.confirm(`将 ${clickedKey} 设为经期结束日吗？`);
                    if (!ok) return;
                    endPeriodByKey(clickedKey);
                };

                const goBack = () => {
                    const container = document.getElementById(containerId);
                    if (container) container.style.display = 'none';
                };

                const resetView = () => {
                    currentDate.value = new Date();
                    selectedDate.value = new Date();
                };

                // Companion Logic
                const companionSheetOpen = ref(false);
                const selectedCompanion = ref(null);
                const COMPANION_KEY = 'period_selected_companion';

                const companions = ref([]);

                const readProfilesFromGlobalOrStorage = () => {
                    if (window.charProfiles && typeof window.charProfiles === 'object') {
                        const ids = Object.keys(window.charProfiles);
                        if (ids.length > 0) return window.charProfiles;
                    }
                    try {
                        const saved = localStorage.getItem('wechat_charProfiles');
                        if (!saved) return {};
                        const parsed = JSON.parse(saved);
                        return parsed && typeof parsed === 'object' ? parsed : {};
                    } catch (e) {
                        return {};
                    }
                };

                const normalizeCompanion = (roleId, profile) => {
                    const p = profile && typeof profile === 'object' ? profile : {};
                    const name = (p.remark || p.nickName || roleId || '').trim();
                    const persona = String(p.desc || p.persona || '').trim();
                    const avatar = String(p.avatar || '').trim();
                    const emoji = String(p.emoji || '').trim();
                    const id = String(roleId || '').trim();
                    return {
                        id,
                        role_id: id,
                        name: name || id || '未知角色',
                        avatar,
                        emoji,
                        persona,
                        rawProfile: p
                    };
                };

                const loadCompanions = () => {
                    const profiles = readProfilesFromGlobalOrStorage();
                    const ids = Object.keys(profiles || {});
                    companions.value = ids.map((id) => normalizeCompanion(id, profiles[id]));
                };

                const openCompanionSheet = () => {
                    companionSheetOpen.value = true;
                };

                const closeCompanionSheet = () => {
                    companionSheetOpen.value = false;
                };

                const selectCompanion = (char) => {
                    const normalized = char && typeof char === 'object'
                        ? normalizeCompanion(char.role_id || char.id, char.rawProfile || char)
                        : null;
                    selectedCompanion.value = normalized;
                    try {
                        localStorage.setItem(COMPANION_KEY, JSON.stringify(normalized));
                    } catch (e) {}
                    closeCompanionSheet();
                };

                // Toast
                const toastVisible = ref(false);
                const toastMessage = ref('');
                let toastTimer = null;
                const showToast = (msg) => {
                    toastMessage.value = msg;
                    toastVisible.value = true;
                    if (toastTimer) clearTimeout(toastTimer);
                    toastTimer = setTimeout(() => {
                        toastVisible.value = false;
                    }, 2000);
                };

                // Companion Reaction Logic
                const bubbleVisible = ref(false);
                const isTyping = ref(false);
                const currentBubbleMessage = ref('');
                let reactionTimer = null;

                const FALLBACK_REACTIONS = ['乖，我在这里陪你。', '好好休息。'];
                let lastAiErrorToastAt = 0;
                const REACTION_HISTORY_LIMIT = 30;

                const reactionHistory = ref([]);
                const reactionHistoryKeyForCompanion = computed(() => {
                    const id = selectedCompanion.value && selectedCompanion.value.id ? String(selectedCompanion.value.id) : '';
                    return id ? `period_reaction_history_v1_${id}` : '';
                });

                const loadReactionHistory = () => {
                    const key = reactionHistoryKeyForCompanion.value;
                    if (!key) {
                        reactionHistory.value = [];
                        return;
                    }
                    try {
                        const raw = localStorage.getItem(key);
                        const arr = raw ? JSON.parse(raw) : [];
                        reactionHistory.value = Array.isArray(arr) ? arr.map((x) => String(x)).filter(Boolean) : [];
                    } catch (e) {
                        reactionHistory.value = [];
                    }
                };

                const pushReactionHistory = (text) => {
                    const key = reactionHistoryKeyForCompanion.value;
                    const t = String(text || '').trim();
                    if (!key || !t) return;
                    const prev = Array.isArray(reactionHistory.value) ? reactionHistory.value : [];
                    const next = [...prev, t].slice(-REACTION_HISTORY_LIMIT);
                    reactionHistory.value = next;
                    try {
                        localStorage.setItem(key, JSON.stringify(next));
                    } catch (e) {}
                };

                watch(reactionHistoryKeyForCompanion, loadReactionHistory, { immediate: true });

                const extractJsonArrayFromText = (raw) => {
                    if (Array.isArray(raw)) return raw;
                    let text = String(raw || '').trim();
                    if (!text) throw new Error('empty');

                    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
                    if (fenced && fenced[1]) text = String(fenced[1]).trim();

                    const objStart = text.indexOf('{');
                    const objEnd = text.lastIndexOf('}');
                    if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
                        try {
                            const obj = JSON.parse(text.slice(objStart, objEnd + 1));
                            if (obj && typeof obj === 'object') {
                                if (obj.reply != null) {
                                    if (Array.isArray(obj.reply)) return obj.reply.map((s) => String(s));
                                    text = String(obj.reply);
                                }
                                else if (obj.content != null) text = String(obj.content);
                                else if (obj.message != null) text = String(obj.message);
                                else if (obj.text != null) text = String(obj.text);
                                else if (Array.isArray(obj.sentences)) return obj.sentences.map((s) => String(s));
                                else if (Array.isArray(obj.messages)) return obj.messages.map((s) => String(s));
                            }
                        } catch (e) {}
                    }

                    const start = text.indexOf('[');
                    const end = text.lastIndexOf(']');
                    if (start !== -1 && end !== -1 && end > start) {
                        text = text.slice(start, end + 1);
                    }

                    const normalized = text
                        .replace(/^\s*json\s*/i, '')
                        .replace(/[“”]/g, '"')
                        .replace(/[‘’]/g, "'")
                        .replace(/,\s*([\]\}])/g, '$1');

                    try {
                        const parsed = JSON.parse(normalized);
                        if (Array.isArray(parsed)) return parsed.map((s) => String(s));
                        if (parsed && typeof parsed === 'object') {
                            const candidates = [parsed.sentences, parsed.messages, parsed.data, parsed.result, parsed.output];
                            const arr = candidates.find((v) => Array.isArray(v));
                            if (arr) return arr.map((s) => String(s));
                        }
                    } catch (e) {}

                    const s = normalized;
                    const items = [];
                    const strRe = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|“([^”]*)”/g;
                    let m;
                    while ((m = strRe.exec(s))) {
                        const dbl = m[1];
                        const sgl = m[2];
                        const cnq = m[3];
                        try {
                            if (dbl !== undefined) {
                                items.push(JSON.parse(`"${dbl}"`));
                            } else if (sgl !== undefined) {
                                const safe = sgl.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                                items.push(JSON.parse(`"${safe}"`));
                            } else if (cnq !== undefined) {
                                items.push(String(cnq));
                            }
                        } catch (e) {}
                    }
                    if (items.length > 0) return items.map((x) => String(x));
                    if (normalized) return [normalized];
                    throw new Error('parse_failed');
                };

                const callModelForReaction = (systemPrompt, prompt) => {
                    return new Promise((resolve, reject) => {
                        const fn =
                            (typeof window !== 'undefined' && typeof window.callAI === 'function')
                                ? window.callAI
                                : (typeof callAI === 'function' ? callAI : null);
                        if (!fn) {
                            reject(new Error('callAI_not_found'));
                            return;
                        }
                        let hasPrevRole = false;
                        let prevRole;
                        try {
                            prevRole = window.currentChatRole;
                            hasPrevRole = true;
                            if (selectedCompanion.value && selectedCompanion.value.id) window.currentChatRole = selectedCompanion.value.id;
                        } catch (e) {}
                        const restore = () => {
                            try {
                                if (hasPrevRole) window.currentChatRole = prevRole;
                            } catch (e) {}
                        };
                        fn(
                            String(systemPrompt || ''),
                            [],
                            String(prompt || ''),
                            (text) => {
                                restore();
                                resolve(text);
                            },
                            (err) => {
                                restore();
                                reject(err);
                            }
                        );
                    });
                };

                const fetchReaction = async (actionName, severity) => {
                    const persona = selectedCompanion.value && selectedCompanion.value.persona ? selectedCompanion.value.persona : '';
                    const roleId = selectedCompanion.value && selectedCompanion.value.id ? selectedCompanion.value.id : '';
                    const systemPrompt = (typeof window.buildRoleLitePrompt === 'function' && roleId)
                        ? window.buildRoleLitePrompt('period_reaction', roleId, {
                            includeContinuity: true,
                            maxSummaryLines: 10,
                            sceneIntro: '当前场景是经期记录页面里的轻量关心回复。',
                            taskGuidance: '你正在和用户在经期记录页面聊天，需要根据她刚记录的经期状态做出符合人设的关心反应。',
                            outputInstructions: '回复要求：1-2句自然中文；不要输出 Markdown/代码块/JSON；不要输出思考过程或解释。如果你要说两句，请用分隔符“|||”把两句隔开，不要换行，不要编号。'
                        })
                        : `【角色名称】${selectedCompanion.value && selectedCompanion.value.name ? selectedCompanion.value.name : ''}\n【角色设定】${persona}\n你正在和用户在经期记录页面聊天。回复要求：1-2句自然中文；不要输出Markdown/代码块/JSON；不要输出思考过程或解释。\n如果你要说两句，请用分隔符“|||”把两句隔开（例如：第一句|||第二句），不要换行，不要编号。`;
                    let prompt = '';
                    if (actionName === '生理期开始') {
                        prompt = '用户刚刚标记了生理期开始。请以你符合人设的口吻对用户展开关心，只输出正文。';
                    } else if (actionName === '经期流量与痛经') {
                        prompt = `用户刚刚记录了经期数据：${String(severity || '').trim()}。请围绕这些数据作出反应与关心，一定要符合人设，只输出正文。`;
                    } else if (actionName === '经期症状') {
                        prompt = `用户刚刚记录了经期相关症状：${String(severity || '').trim()}。请你必须逐一回应用户选择的每个症状（每个都要提到一次，不要只挑其中一个）。用符合人设的口吻关心用户并给出温柔建议，只输出正文。`;
                    } else {
                        prompt = `用户刚刚在经期APP记录了：动作【${actionName}】，内容【${severity}】。请用你的人设口吻关心用户，只输出正文。`;
                    }
                    try {
                        const rawText = await callModelForReaction(systemPrompt, prompt);
                        try {
                            if (localStorage.getItem('period_reaction_debug') === '1') {
                                console.log('[period_reaction_raw]', rawText);
                            }
                        } catch (e) {}
                        const parsed = extractJsonArrayFromText(rawText);
                        return parsed.length > 0 ? parsed : FALLBACK_REACTIONS;
                    } catch (e) {
                        const now = Date.now();
                        if (now - lastAiErrorToastAt > 3000) {
                            lastAiErrorToastAt = now;
                            const msg = (typeof e === 'string' ? e : (e && e.message ? e.message : '大模型调用失败'));
                            if (msg === 'callAI_not_found') {
                                showToast('未加载大模型API方法(callAI)');
                            } else if (typeof msg === 'string' && msg.indexOf('未配置 API') !== -1) {
                                showToast('未配置 API，请到【设置】填写地址和Key');
                            } else {
                                showToast('大模型调用失败，已使用保底回复');
                            }
                        }
                        return FALLBACK_REACTIONS;
                    }
                };

                const splitReactionText = (text) => {
                    const raw = String(text || '').trim();
                    if (!raw) return [];
                    const parts = raw
                        .split(/\s*\|\|\|\s*/g)
                        .map((x) => String(x || '').trim())
                        .filter(Boolean);
                    if (parts.length > 1) return parts;

                    const lines = raw
                        .split(/[\r\n]+/g)
                        .map((x) => String(x || '').trim())
                        .filter(Boolean);
                    return lines.length > 1 ? lines : [raw];
                };

                const triggerCharacterReaction = async (actionName, severity) => {
                    if (!selectedCompanion.value) {
                        showToast('请先点击顶部爱心选择陪伴角色');
                        return;
                    }

                    if (reactionTimer) clearTimeout(reactionTimer);
                    bubbleVisible.value = true;
                    isTyping.value = true;

                    try {
                        const messages = await fetchReaction(actionName, severity);
                        isTyping.value = false;

                        let segments = [];
                        if (Array.isArray(messages)) {
                            for (const item of messages) {
                                segments = segments.concat(splitReactionText(item));
                            }
                        } else {
                            segments = splitReactionText(messages);
                        }
                        segments = segments.map((s) => String(s).replace(/\|\|\|/g, '').trim()).filter(Boolean);
                        if (!segments.length) segments = [FALLBACK_REACTIONS[0]];

                        const play = (idx) => {
                            if (!segments[idx]) {
                                bubbleVisible.value = false;
                                return;
                            }
                            bubbleVisible.value = true;
                            isTyping.value = false;
                            currentBubbleMessage.value = segments[idx];
                            pushReactionHistory(currentBubbleMessage.value);
                            reactionTimer = setTimeout(() => {
                                bubbleVisible.value = false;
                                reactionTimer = setTimeout(() => {
                                    play(idx + 1);
                                }, 180);
                            }, 5000);
                        };

                        play(0);
                    } catch (e) {
                        isTyping.value = false;
                        bubbleVisible.value = false;
                    }
                };

                const showRandomHistoryMessage = () => {
                    const list = Array.isArray(reactionHistory.value) ? reactionHistory.value : [];
                    if (!list.length) return false;
                    const pick = list[Math.floor(Math.random() * list.length)];
                    if (!pick) return false;
                    if (reactionTimer) clearTimeout(reactionTimer);
                    bubbleVisible.value = true;
                    isTyping.value = false;
                    currentBubbleMessage.value = String(pick);
                    reactionTimer = setTimeout(() => {
                        bubbleVisible.value = false;
                    }, 5000);
                    return true;
                };

                const settingsOpen = ref(false);
                const draftPeriodLength = ref(periodLength.value);
                const draftCycleLength = ref(cycleLength.value);

                const openSettings = () => {
                    draftPeriodLength.value = periodLength.value;
                    draftCycleLength.value = cycleLength.value;
                    settingsOpen.value = true;
                };

                const closeSettings = () => {
                    settingsOpen.value = false;
                };

                const saveSettings = () => {
                    periodLength.value = clamp(Number(draftPeriodLength.value) || 5, 2, 10);
                    cycleLength.value = clamp(Number(draftCycleLength.value) || 28, 20, 40);
                    try {
                        localStorage.setItem(STORAGE_KEYS.periodLength, String(periodLength.value));
                        localStorage.setItem(STORAGE_KEYS.cycleLength, String(cycleLength.value));
                    } catch (e) {}
                    settingsOpen.value = false;
                };

                const resetAllRecords = () => {
                    const ok = window.confirm('确定要重置所有经期记录吗？此操作不可撤销。');
                    if (!ok) return;

                    try {
                        localStorage.removeItem(STORAGE_KEYS.dailyRecords);
                        localStorage.removeItem(STORAGE_KEYS.cycleLength);
                        localStorage.removeItem(STORAGE_KEYS.periodLength);
                    } catch (e) {}

                    recordsByDate.value = {};
                    cycleLength.value = 28;
                    periodLength.value = 5;
                    draftCycleLength.value = cycleLength.value;
                    draftPeriodLength.value = periodLength.value;

                    currentDate.value = new Date();
                    selectedDate.value = new Date();
                    symptomsOpen.value = false;
                    symptomDraft.value = [];

                    settingsOpen.value = false;
                    showToast('已重置所有记录，请重新设置');
                };

                const goToArticle = (phaseId) => {
                    if (!phaseId) return;
                    settingsOpen.value = false;
                    window.location.hash = `/article/${encodeURIComponent(phaseId)}`;
                };

                const goBackFromArticle = () => {
                    window.location.hash = '';
                };

                const goToAnalysis = () => {
                    settingsOpen.value = false;
                    window.location.hash = '/analysis';
                };

                const goBackFromAnalysis = () => {
                    window.location.hash = '';
                };

                watch(
                    () => route.value.name,
                    (name) => {
                        if (name !== 'calendar') settingsOpen.value = false;
                    },
                    { immediate: true }
                );

                const isPeriodDay = computed(() => {
                    return actualPeriodSet.value.has(selectedKey.value);
                });

                const periodToggleOn = computed(() => {
                    if (!activePeriodStartKey.value) return false;
                    return parseDateKey(selectedKey.value).getTime() >= parseDateKey(activePeriodStartKey.value).getTime();
                });

                const periodToggleLabel = computed(() => {
                    return periodToggleOn.value ? '经期结束了吗？' : '经期开始了吗？';
                });

                const flowLevel = computed(() => {
                    const rec = recordsByDate.value[selectedKey.value];
                    return rec && typeof rec.flowLevel === 'number' ? rec.flowLevel : 0;
                });

                const painLevel = computed(() => {
                    const rec = recordsByDate.value[selectedKey.value];
                    return rec && typeof rec.painLevel === 'number' ? rec.painLevel : 0;
                });

                const flowLabel = (n) => {
                    const v = Number(n) || 0;
                    if (v === 1) return '少';
                    if (v === 2) return '中';
                    if (v === 3) return '多';
                    return '';
                };

                const painLabel = (n) => {
                    const v = Number(n) || 0;
                    if (v === 1) return '轻';
                    if (v === 2) return '中';
                    if (v === 3) return '重';
                    return '';
                };

                const lastFlowPainTrigger = ref({ key: '', flow: 0, pain: 0 });
                const maybeTriggerFlowPainReaction = (nextFlow, nextPain) => {
                    const f = Number(nextFlow) || 0;
                    const p = Number(nextPain) || 0;
                    if (f <= 0 || p <= 0) return;
                    const key = selectedKey.value;
                    const prev = lastFlowPainTrigger.value || { key: '', flow: 0, pain: 0 };
                    if (prev.key === key && prev.flow === f && prev.pain === p) return;
                    lastFlowPainTrigger.value = { key, flow: f, pain: p };
                    triggerCharacterReaction('经期流量与痛经', `流量：${flowLabel(f)}；痛经：${painLabel(p)}`);
                };

                const lastSymptomsTrigger = ref({ key: '', hash: '' });
                const buildSymptomsText = (list) => {
                    const arr = Array.isArray(list) ? list.map((x) => String(x)).filter(Boolean) : [];
                    const byGroup = {};
                    const flat = [];
                    for (const id of arr) {
                        if (id.indexOf(':') === -1) {
                            flat.push(id);
                            continue;
                        }
                        const [g, opt] = id.split(':');
                        if (!g || !opt) {
                            flat.push(id);
                            continue;
                        }
                        flat.push(opt);
                        if (!byGroup[g]) byGroup[g] = [];
                        byGroup[g].push(opt);
                    }
                    const parts = Object.keys(byGroup).map((g) => `${g}：${byGroup[g].join('、')}`);
                    const grouped = parts.length ? parts.join('；') : '';
                    const flatText = flat.filter(Boolean).join('、');
                    if (grouped && flatText) return `${grouped}（具体：${flatText}）`;
                    return grouped || flatText || arr.join('；');
                };

                const readStepsForDateKey = (dateKey) => {
                    const storageKey = `sports_my_steps_${String(dateKey || '').trim()}`;
                    try {
                        const raw = localStorage.getItem(storageKey);
                        if (raw == null || raw === '') return null;
                        const n = Number(raw);
                        if (!isFinite(n) || n < 0) return null;
                        return Math.floor(n);
                    } catch (e) {
                        return null;
                    }
                };

                const buildPeriodStatusSystemPrompt = (startKey, day, total, steps) => {
                    const d = Math.max(1, Number(day) || 1);
                    const t = Math.max(1, Number(total) || 5);
                    const s = steps == null ? null : Math.max(0, Math.floor(Number(steps) || 0));
                    const head = s == null
                        ? `[系统内部提示：用户刚刚标记了生理期开始（开始日：${startKey}；第 ${d}/${t} 天）。你需要在后续对话中记住用户正处于生理期，给予更贴合的关心与建议。]`
                        : `[系统内部提示：用户刚刚标记了生理期开始（开始日：${startKey}；第 ${d}/${t} 天）；并且用户今天的真实步数为 ${s} 步。请在你的下一次回复中结合经期状态与步数自然地关心TA；步数只需提及一次，不要之后反复提。]`;
                    return [
                        head,
                        '互动规则：',
                        '1. 必须保持人设，语气要自然，不要像机器人播报。',
                        '2. 经期建议以“保暖/补水/休息/情绪照顾”为主，运动建议要温和。'
                    ].join('\n');
                };

                const computePeriodExpiresAt = (startKey, total) => {
                    const start = parseDateKey(startKey);
                    const t = Math.max(1, Number(total) || 5);
                    if (!start) return Date.now() + 86400000;
                    const end = addDays(start, t - 1);
                    const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
                    return endOfDay.getTime();
                };

                const enqueuePeriodStatusSystemContextForAllRoles = (startKey, day, total, steps) => {
                    const profiles = readProfilesFromGlobalOrStorage();
                    const ids = Object.keys(profiles || {});
                    if (!ids.length) return false;

                    const now = Date.now();
                    const content = buildPeriodStatusSystemPrompt(startKey, day, total, steps);
                    const expiresAt = computePeriodExpiresAt(startKey, total);
                    let wrote = false;

                    for (const roleId of ids) {
                        const id = String(roleId || '').trim();
                        if (!id) continue;
                        const pendingKey = `wechat_pending_system_context_v1_${id}`;
                        try {
                            localStorage.setItem(pendingKey, JSON.stringify({
                                id: now.toString(36) + '_' + Math.random().toString(36).slice(2, 10),
                                content,
                                createdAt: now,
                                type: 'period_status',
                                startKey: String(startKey || ''),
                                expiresAt
                            }));
                            wrote = true;
                        } catch (e) {}
                    }

                    return wrote;
                };

                const startPeriodOnSelected = () => {
                    if (isFutureSelected.value) return;
                    if (!selectedCompanion.value) {
                        showToast('请先点击顶部爱心选择陪伴角色');
                        return;
                    }
                    if (activePeriodStartKey.value) {
                        showToast('已有进行中的经期，请先结束');
                        return;
                    }

                    const startKey = selectedKey.value;
                    const total = Math.max(1, Number(periodLength.value) || 5);
                    const day = 1;
                    const steps = startKey === todayKey.value ? readStepsForDateKey(startKey) : null;

                    updateRecord({ periodStarted: true, periodEnded: false });
                    triggerCharacterReaction('生理期开始', '用户标记了生理期开始');
                    enqueuePeriodStatusSystemContextForAllRoles(startKey, day, total, steps);
                };

                const cancelPeriodStartByKey = (startKey) => {
                    if (!startKey) return;
                    updateRecordForKey(startKey, { periodStarted: false, periodEnded: false, flowLevel: 0, painLevel: 0 });
                    showToast('已取消经期记录');
                };

                const endPeriodByKey = (endKey) => {
                    if (!endKey) return;
                    if (parseDateKey(endKey).getTime() > parseDateKey(todayKey.value).getTime()) return;
                    if (!selectedCompanion.value) {
                        showToast('请先点击顶部爱心选择陪伴角色');
                        return;
                    }
                    const startKey = activePeriodStartKey.value;
                    if (!startKey) return;
                    if (parseDateKey(endKey).getTime() < parseDateKey(startKey).getTime()) return;

                    if (endKey === startKey) {
                        cancelPeriodStartByKey(startKey);
                        return;
                    }

                    updateRecordForKey(endKey, { periodEnded: true });

                    const startDate = parseDateKey(startKey);
                    const endDate = parseDateKey(endKey);
                    const actualLen = diffDays(endDate, startDate) + 1;
                    const nextLen = clamp(actualLen, 2, 10);
                    periodLength.value = nextLen;
                    draftPeriodLength.value = nextLen;
                    try {
                        localStorage.setItem(STORAGE_KEYS.periodLength, String(periodLength.value));
                    } catch (e) {}

                    showToast(`已设置结束日：${endKey}（${actualLen}天）`);
                };

                const togglePeriodStarted = () => {
                    if (isFutureSelected.value) return;
                    if (!selectedCompanion.value) {
                        showToast('请先点击顶部爱心选择陪伴角色');
                        return;
                    }
                    if (!activePeriodStartKey.value) {
                        startPeriodOnSelected();
                        return;
                    }
                    if (parseDateKey(selectedKey.value).getTime() < parseDateKey(activePeriodStartKey.value).getTime()) {
                        showToast('请选择开始日当天或之后来设置结束日');
                        return;
                    }
                    if (selectedKey.value === activePeriodStartKey.value) {
                        const ok = window.confirm('该天已标为经期开始，是否取消本次经期记录？');
                        if (!ok) return;
                    }
                    endPeriodByKey(selectedKey.value);
                };

                const setFlow = (n) => {
                    if (isFutureSelected.value) return;
                    if (!selectedCompanion.value) {
                        showToast('请先点击顶部爱心选择陪伴角色');
                        return;
                    }
                    const next = flowLevel.value === n ? 0 : n;
                    updateRecord({ flowLevel: next });
                    maybeTriggerFlowPainReaction(next, painLevel.value);
                };

                const setPain = (n) => {
                    if (isFutureSelected.value) return;
                    if (!selectedCompanion.value) {
                        showToast('请先点击顶部爱心选择陪伴角色');
                        return;
                    }
                    const next = painLevel.value === n ? 0 : n;
                    updateRecord({ painLevel: next });
                    maybeTriggerFlowPainReaction(flowLevel.value, next);
                };

                const symptomsOpen = ref(false);
                const toggleSymptoms = () => {
                    if (isFutureSelected.value) return;
                    symptomsOpen.value = !symptomsOpen.value;
                };

                const symptomDraft = ref([]);

                const symptomGroups = [
                    { key: '情绪', label: '情绪', options: ['开心', '敏感', '易怒', '伤心', '焦虑'] },
                    { key: '精力', label: '精力', options: ['充满活力', '疲惫', '提不起劲', '注意力不集中'] },
                    { key: '消化', label: '消化', options: ['正常', '腹胀', '便秘'] },
                    { key: '睡眠', label: '睡眠', options: ['好', '失眠', '一般'] }
                ];

                const isSymptomSelected = (id) => {
                    const list = Array.isArray(symptomDraft.value) ? symptomDraft.value : [];
                    return list.includes(id);
                };

                const toggleSymptom = (id) => {
                    if (isFutureSelected.value) return;
                    if (!selectedCompanion.value) {
                        showToast('请先点击顶部爱心选择陪伴角色');
                        return;
                    }
                    const list = Array.isArray(symptomDraft.value) ? symptomDraft.value : [];
                    symptomDraft.value = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
                };

                const loadSymptomsDraftForSelected = () => {
                    const rec = recordsByDate.value[selectedKey.value];
                    const list = rec && Array.isArray(rec.symptoms) ? rec.symptoms : [];
                    symptomDraft.value = [...list];
                };

                const saveSymptoms = () => {
                    if (isFutureSelected.value) return;
                    if (!selectedCompanion.value) {
                        showToast('请先点击顶部爱心选择陪伴角色');
                        return;
                    }
                    const list = Array.isArray(symptomDraft.value) ? symptomDraft.value : [];
                    updateRecord({ symptoms: [...list] });
                    showToast('症状已保存');
                    const normalized = list.map((x) => String(x)).filter(Boolean).slice().sort().join('|');
                    if (normalized) {
                        const key = selectedKey.value;
                        const prev = lastSymptomsTrigger.value || { key: '', hash: '' };
                        if (!(prev.key === key && prev.hash === normalized)) {
                            lastSymptomsTrigger.value = { key, hash: normalized };
                            triggerCharacterReaction('经期症状', buildSymptomsText(list));
                        }
                    }
                };

                watch(selectedKey, loadSymptomsDraftForSelected, { immediate: true });

                onMounted(() => {
                    loadCompanions();
                    try {
                        const savedComp = localStorage.getItem(COMPANION_KEY);
                        if (savedComp) {
                            const parsed = JSON.parse(savedComp);
                            if (parsed && typeof parsed === 'object') {
                                selectedCompanion.value = normalizeCompanion(parsed.role_id || parsed.id, parsed.rawProfile || parsed);
                            }
                        }
                    } catch (e) {}

                    parseHashRoute();
                    window.addEventListener('hashchange', parseHashRoute);
                });

                // Drag Logic
                const draggableRef = ref(null);
                const bubbleRef = ref(null);
                const position = ref(null);
                const isDragging = ref(false);
                const isPressed = ref(false);
                const startPosition = ref({ x: 0, y: 0 });
                const initialPosition = ref({ x: 0, y: 0 });
                const bubbleDirection = ref('right');
                const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 0);
                const bubbleOffsetX = ref(0);

                const WRAPPER_SIZE = 60;
                const EDGE_MARGIN = 8;
                const RELEASE_SNAP_DURATION_MS = 220;
                const DRAG_THRESHOLD_PX = 5;

                const bubblePositionClasses = computed(() => {
                    const dir = bubbleDirection.value || 'right';
                    return {
                        'bubble-left': dir === 'left',
                        'bubble-right': dir === 'right',
                        'bubble-top': dir === 'top',
                        'bubble-bottom': dir === 'bottom'
                    };
                });

                const clampToViewport = (x, y) => {
                    const vw = window.innerWidth || 0;
                    const vh = window.innerHeight || 0;
                    const maxX = Math.max(EDGE_MARGIN, vw - WRAPPER_SIZE - EDGE_MARGIN);
                    const maxY = Math.max(EDGE_MARGIN, vh - WRAPPER_SIZE - EDGE_MARGIN);
                    return {
                        x: clamp(Number(x) || 0, EDGE_MARGIN, maxX),
                        y: clamp(Number(y) || 0, EDGE_MARGIN, maxY)
                    };
                };

                const updateBubbleDirectionByPosition = (x, y) => {
                    const cx = (Number(x) || 0) + WRAPPER_SIZE / 2;
                    const vw = window.innerWidth || 0;
                    bubbleDirection.value = cx < vw / 2 ? 'right' : 'left';
                };

                let rafId = 0;
                let pendingX = 0;
                let pendingY = 0;

                const schedulePosition = (x, y) => {
                    pendingX = x;
                    pendingY = y;
                    if (rafId) return;
                    rafId = window.requestAnimationFrame(() => {
                        rafId = 0;
                        position.value = { x: pendingX, y: pendingY };
                        updateBubbleDirectionByPosition(pendingX, pendingY);
                        adjustBubbleHorizontalOverflow();
                    });
                };

                const dragStyle = computed(() => {
                    const x = position.value ? position.value.x : 0;
                    const y = position.value ? position.value.y : 0;
                    const scale = isPressed.value ? 0.95 : 1;
                    return {
                        left: '0px',
                        top: '0px',
                        width: WRAPPER_SIZE + 'px',
                        height: WRAPPER_SIZE + 'px',
                        opacity: isPressed.value ? 0.8 : 1,
                        transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
                        transition: isPressed.value ? 'none' : `transform ${RELEASE_SNAP_DURATION_MS}ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 180ms ease`,
                        willChange: 'transform'
                    };
                });

                const bubbleStyle = computed(() => {
                    const dir = bubbleDirection.value;
                    const style = {};
                    if (dir === 'left' || dir === 'right') {
                        const vh = viewportHeight.value || (typeof window !== 'undefined' ? window.innerHeight : 0);
                        const maxHeight = vh ? Math.max(120, vh - 120) : 220;
                        style.maxHeight = maxHeight + 'px';
                        style.overflowY = 'auto';
                    }
                    if (dir === 'top' || dir === 'bottom') {
                        style.marginLeft = bubbleOffsetX.value + 'px';
                    }
                    return style;
                });

                const adjustBubbleHorizontalOverflow = () => {
                    if (!bubbleRef.value) return;
                    bubbleOffsetX.value = 0;
                    window.requestAnimationFrame(() => {
                        const el = bubbleRef.value;
                        if (!el) return;
                        const rect = el.getBoundingClientRect();
                        const vw = window.innerWidth || 0;
                        const SAFE = 8;
                        let offset = 0;
                        if (rect.left < SAFE) {
                            offset = SAFE - rect.left;
                        } else if (rect.right > vw - SAFE) {
                            offset = (vw - SAFE) - rect.right;
                        }
                        bubbleOffsetX.value = offset;
                    });
                };

                const startDrag = (e) => {
                    if (e.type === 'mousedown' && e.button !== 0) return;
                    
                    isPressed.value = true;
                    isDragging.value = false;

                    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

                    startPosition.value = { x: clientX, y: clientY };

                    if (!position.value && draggableRef.value) {
                        const rect = draggableRef.value.getBoundingClientRect();
                        const init = clampToViewport(rect.left, rect.top);
                        position.value = init;
                        updateBubbleDirectionByPosition(init.x, init.y);
                    }

                    if (position.value) {
                        initialPosition.value = { x: position.value.x, y: position.value.y };
                    }

                    window.addEventListener('mousemove', onDrag);
                    window.addEventListener('touchmove', onDrag, { passive: false });
                    window.addEventListener('mouseup', stopDrag);
                    window.addEventListener('touchend', stopDrag);
                };

                const onDrag = (e) => {
                    if (!isPressed.value) return;

                    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

                    const deltaX = clientX - startPosition.value.x;
                    const deltaY = clientY - startPosition.value.y;

                    if (Math.abs(deltaX) > DRAG_THRESHOLD_PX || Math.abs(deltaY) > DRAG_THRESHOLD_PX) {
                        isDragging.value = true;
                    }

                    if (isDragging.value) {
                        if (e.cancelable) e.preventDefault();
                        
                        const next = clampToViewport(initialPosition.value.x + deltaX, initialPosition.value.y + deltaY);
                        schedulePosition(next.x, next.y);
                    }
                };

                const stopDrag = () => {
                    isPressed.value = false;

                    if (rafId) {
                        window.cancelAnimationFrame(rafId);
                        rafId = 0;
                    }

                    if (isDragging.value && position.value) {
                        const cx = position.value.x + WRAPPER_SIZE / 2;
                        const snapX = cx < window.innerWidth / 2 ? EDGE_MARGIN : (window.innerWidth - WRAPPER_SIZE - EDGE_MARGIN);
                        const snapped = clampToViewport(snapX, position.value.y);
                        position.value = snapped;
                        updateBubbleDirectionByPosition(snapped.x, snapped.y);
                    } else if (position.value) {
                        const clamped = clampToViewport(position.value.x, position.value.y);
                        position.value = clamped;
                        updateBubbleDirectionByPosition(clamped.x, clamped.y);
                    }

                    setTimeout(() => {
                        isDragging.value = false;
                    }, 0);
                    
                    window.removeEventListener('mousemove', onDrag);
                    window.removeEventListener('touchmove', onDrag);
                    window.removeEventListener('mouseup', stopDrag);
                    window.removeEventListener('touchend', stopDrag);
                };

                const handleAvatarClick = () => {
                    if (isDragging.value) return;
                    if (!selectedCompanion.value) {
                        openCompanionSheet();
                        return;
                    }
                    if (!bubbleVisible.value) {
                        if (showRandomHistoryMessage()) return;
                    }
                    openCompanionSheet();
                };

                const handleResize = () => {
                    if (typeof window !== 'undefined') {
                        viewportHeight.value = window.innerHeight || 0;
                    }
                    if (!position.value) return;
                    const clamped = clampToViewport(position.value.x, position.value.y);
                    position.value = clamped;
                    updateBubbleDirectionByPosition(clamped.x, clamped.y);
                    adjustBubbleHorizontalOverflow();
                };

                onMounted(() => {
                    if (typeof window !== 'undefined') {
                        viewportHeight.value = window.innerHeight || 0;
                    }
                    window.addEventListener('resize', handleResize);
                    window.requestAnimationFrame(() => {
                        if (position.value) {
                            const clamped = clampToViewport(position.value.x, position.value.y);
                            position.value = clamped;
                            updateBubbleDirectionByPosition(clamped.x, clamped.y);
                            adjustBubbleHorizontalOverflow();
                            return;
                        }
                        const initial = clampToViewport(window.innerWidth - WRAPPER_SIZE - EDGE_MARGIN, window.innerHeight - WRAPPER_SIZE - 80);
                        position.value = initial;
                        updateBubbleDirectionByPosition(initial.x, initial.y);
                        adjustBubbleHorizontalOverflow();
                    });
                });

                return {
                    route,
                    currentArticle,
                    currentArticleHtml,
                    averageCycleLength,
                    averagePeriodLength,
                    cycleVariation,
                    mostFrequentSymptomsWithPercent,
                    periodLength,
                    currentDate,
                    selectedDate,
                    weekDays,
                    currentYearMonth,
                    calendarDays,
                    currentStatus,
                    selectedDateText,
                    isFutureSelected,
                    prevMonth,
                    nextMonth,
                    getDayClasses,
                    selectDate,
                    goBack,
                    goBackFromArticle,
                    goBackFromAnalysis,
                    goToArticle,
                    goToAnalysis,
                    isToday,
                    isPeriod,
                    isOvulationDay,
                    settingsOpen,
                    draftPeriodLength,
                    draftCycleLength,
                    openSettings,
                    closeSettings,
                    saveSettings,
                    resetAllRecords,
                    isPeriodDay,
                    periodToggleOn,
                    periodToggleLabel,
                    flowLevel,
                    painLevel,
                    togglePeriodStarted,
                    setFlow,
                    setPain,
                    symptomsOpen,
                    toggleSymptoms,
                    symptomGroups,
                    isSymptomSelected,
                    toggleSymptom,
                    saveSymptoms,
                    resetView,
                    companionSheetOpen,
                    selectedCompanion,
                    companions,
                    openCompanionSheet,
                    closeCompanionSheet,
                    selectCompanion,
                    toastVisible,
                    toastMessage,
                    showToast,
                    bubbleVisible,
                    isTyping,
                    currentBubbleMessage,
                    triggerCharacterReaction,
                    draggableRef,
                    bubbleRef,
                    bubblePositionClasses,
                    dragStyle,
                    bubbleStyle,
                    startDrag,
                    handleAvatarClick
                };
            }
        };

        appInstance = Vue.createApp(App).mount(el);
    }

    function show() {
        var container = document.getElementById(containerId);
        if (!container) {
            init();
        } else {
            container.style.display = 'block';
            if (appInstance && typeof appInstance.resetView === 'function') {
                appInstance.resetView();
            }
        }
    }

    return {
        show: show
    };
})();

window.PeriodApp = PeriodApp;
