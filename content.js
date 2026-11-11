(() => {
    // --- КОНФИГУРАЦИЯ ЦЕЛЕЙ И ПРИВЯЗАННЫХ ВИДЕО ---
    const DEFAULT_GOALS = {
        "LAST TIPPER WIN CHEATING GANGBANG VIDEO": 55,
        "LAST TIPPER WIN 2 ANAL PLAY+CUMSHOT VIDS": 44,
        "LAST TIPPER WIN CUCKOLD CHEATING VIDEO": 30,
        "LAST TIPPER WIN HARD ANAL FUCK VIDEO": 65,
        "LAST TIPPER WIN SQUIRT HARD FUCK VIDEO": 46,
        "LAST TIPPER WIN DRIPPING SPERM CUM VIDEO": 48,
        "LAST TIPPER WIN 3 PVT RECORDINGS VIDEO": 49,
        "LAST TIPPER WIN 3 CREAMPIE+CUMSHOT VIDEO": 49,
    };

    const DEFAULT_VIDEO_TITLES = {
        "LAST TIPPER WIN CHEATING GANGBANG VIDEO": [
            "💔👩‍❤️‍💋‍👨 CHEATING SLUT GANGBANGED(2 dicks in mouth) 👨‍🦱👨‍🦰 ➝ Caught by Boyfriend 😱 ➝ Rough",
        ],
        "LAST TIPPER WIN 2 ANAL PLAY+CUMSHOT VIDS": [
            "FULL NAKED POLLY PVT DILDO RIDING+BLOWJOB+PUSSY TEASING+ ANAL PLUG",
            "4K TRY ON HAUL STRIPTEASE + ANAL PLUG",
        ],
        "LAST TIPPER WIN CUCKOLD CHEATING VIDEO": [
            "😎ANDREW FUCKED POLLY(MARCO CUCKOLD) BJ+SWALLOW💦",
        ],
        "LAST TIPPER WIN HARD ANAL FUCK VIDEO": [
            "🍑ANAL SEX FIRST TIME+🔥BUTTPLUG🍆+CUM EATING 💦",
        ],
        "LAST TIPPER WIN SQUIRT HARD FUCK VIDEO": [
            "💦BIG SQUIRT+DEEP FUCK (3 POSES CLOSE TO CAM)+YUMMY CUMSHOT😋",
        ],
        "LAST TIPPER WIN DRIPPING SPERM CUM VIDEO": [
            "CHIPS WITH SPERM SAUCE THAT FLOWS OUT OF THE PUSSY (AFTER CREAMPIE) +DIRTY TALKS+HOT FUCK+BLOWJOB🥵",
        ],
        "LAST TIPPER WIN 3 PVT RECORDINGS VIDEO": [
            "HOT FUCK+CUM IN MOUTH POV",
            "🔥HARD FACEFUCK + DIRTY TALK💦(WITHOUT MASK)",
            "CUM ON FACE + SUCK DICK",
        ],
        "LAST TIPPER WIN 3 CREAMPIE+CUMSHOT VIDEO": [
            "POV Creampie + swallow",
            "Slobbery blowjob + Facial",
            "TITS FUCK+HUGE CUMSHOT+SWALLOW",
        ],
    };

    let GOALS = { ...DEFAULT_GOALS };
    let GOALS_VIDEO_TITLES = { ...DEFAULT_VIDEO_TITLES };
    let GOALS_LIST = Object.keys(GOALS);

    function syncGoalData() {
        GOALS_LIST = Object.keys(GOALS);
    }

    function normalizeGoalsConfig(raw = {}) {
        const normalized = {};
        Object.entries(raw || {}).forEach(([key, value]) => {
            if (typeof key === "string" && Number.isFinite(Number(value)) && Number(value) > 0) {
                normalized[key] = Number(value);
            }
        });
        return normalized;
    }

    function normalizeVideoTitlesConfig(raw = {}) {
        const normalized = {};
        Object.entries(raw || {}).forEach(([key, value]) => {
            if (typeof key === "string" && Array.isArray(value)) {
                normalized[key] = value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean);
            }
        });
        return normalized;
    }

    async function loadGoalConfig() {
        const data = await chrome.storage.local.get(["goalsConfig", "videoTitlesConfig"]);
        GOALS = { ...DEFAULT_GOALS, ...normalizeGoalsConfig(data.goalsConfig) };
        GOALS_VIDEO_TITLES = { ...DEFAULT_VIDEO_TITLES, ...normalizeVideoTitlesConfig(data.videoTitlesConfig) };

        Object.keys(GOALS).forEach((goalKey) => {
            if (!GOALS_VIDEO_TITLES[goalKey]) {
                GOALS_VIDEO_TITLES[goalKey] = [];
            }
        });

        syncGoalData();
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local") return;
        if (changes.goalsConfig || changes.videoTitlesConfig) {
            const nextGoals = changes.goalsConfig ? changes.goalsConfig.newValue : GOALS;
            const nextTitles = changes.videoTitlesConfig ? changes.videoTitlesConfig.newValue : GOALS_VIDEO_TITLES;
            GOALS = { ...DEFAULT_GOALS, ...normalizeGoalsConfig(nextGoals) };
            GOALS_VIDEO_TITLES = { ...DEFAULT_VIDEO_TITLES, ...normalizeVideoTitlesConfig(nextTitles) };

            Object.keys(GOALS).forEach((goalKey) => {
                if (!GOALS_VIDEO_TITLES[goalKey]) {
                    GOALS_VIDEO_TITLES[goalKey] = [];
                }
            });

            syncGoalData();
            log(`⚙️ Конфиг обновлен: ${GOALS_LIST.length} целей`, "#60a5fa");
        }
    });

    const state = {
        isActive: false,
        priceTier: "medium",
        defaultTokens: 25,
        goalIndex: 0,
        processedTimestamps: new Set(),
        chatObserver: null,
        isProcessingGoal: false,
    };

    // --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    function log(msg, color = "#22c55e") {
        const time = new Date().toLocaleTimeString();
        console.log(
            `%c[GoalBot ${time}] ${msg}`,
            `color: ${color}; font-weight: bold;`,
        );

        const panelLogs = document.getElementById("bot-console-log");
        if (panelLogs) {
            const line = document.createElement("div");
            line.style.color = color;
            line.style.marginBottom = "2px";
            line.innerText = `[${time}] ${msg}`;
            panelLogs.prepend(line);
            if (panelLogs.childNodes.length > 40) {
                panelLogs.removeChild(panelLogs.lastChild);
            }
        }
    }

    function waitForElement(selector, timeout = 7000, context = document) {
        return new Promise((resolve, reject) => {
            const el = context.querySelector(selector);
            if (el) return resolve(el);

            const observer = new MutationObserver(() => {
                const found = context.querySelector(selector);
                if (found) {
                    observer.disconnect();
                    resolve(found);
                }
            });

            observer.observe(context.body || context, {
                childList: true,
                subtree: true,
            });
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout поиска: ${selector}`));
            }, timeout);
        });
    }

    function setReactInputValue(input, value) {
        input.focus();
        const descriptor = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
        );
        if (descriptor && descriptor.set) {
            descriptor.set.call(input, value);
        } else {
            input.value = value;
        }
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function calculateTokens(goalText) {
        const baseValue = GOALS[goalText];
        if (!baseValue) return state.defaultTokens;

        let calculated = baseValue;
        if (state.priceTier === "low") {
            calculated = Math.round(baseValue * (1 - (0.15 + Math.random() * 0.05)));
        } else if (state.priceTier === "high") {
            calculated = Math.round(baseValue * (1 + (0.3 + Math.random() * 0.05)));
        } else {
            calculated = Math.round(baseValue * (1 + (-0.05 + Math.random() * 0.1)));
        }
        return Math.max(1, calculated);
    }

    // --- УСТАНОВКА ЦЕЛЕЙ ---
    // --- УСТАНОВКА ЦЕЛЕЙ С ВОЗВРАТОМ СКРОЛЛА ---
    // --- УСТАНОВКА ЦЕЛЕЙ С ПРОВЕРКОЙ ВАЛИДАЦИИ И СКРОЛЛОМ ---

    // --- ГАРАНТИРОВАННОЕ ОТКРЫТИЕ ВКЛАДКИ НАСТРОЕК ЦЕЛИ ---
    async function ensureGoalSettingsOpen() {
        let container = document.querySelector(".broadcast-settings-block-content");
        if (container && container.offsetParent !== null) {
            return container;
        }

        log("Открываем вкладку настроек цели...", "#38bdf8");

        // 1. Если блок настроек вообще закрыт, кликаем по иконке/кнопке настроек внизу трансляции
        const settingsToggleBtn = document.querySelector(
            'button[aria-label*="настройк"], button[aria-label*="Settings"], .broadcast-controls__settings-btn',
        );
        if (settingsToggleBtn && !document.querySelector(".visible-items")) {
            settingsToggleBtn.click();
            await sleep(500);
        }

        // 2. Ищем вкладки настроек broadcast-settings
        await waitForElement(".visible-items, .broadcast-settings__nav", 4000);

        // Находим все элементы навигации
        const navElements = Array.from(
            document.querySelectorAll(
                ".visible-items .broadcast-settings__nav-item, " +
                ".broadcast-settings__nav-item a, " +
                ".broadcast-settings__nav-item",
            ),
        );

        // Ищем вкладку «Цель» / «Goal» или берем вторую
        let goalTab = navElements.find((el) => {
            const txt = (el.innerText || el.textContent || "").toLowerCase();
            return txt.includes("цель") || txt.includes("goal");
        });

        if (!goalTab && navElements.length > 1) {
            goalTab = navElements[1];
        }

        if (goalTab) {
            // Кликаем по самому кликабельному узлу (ссылка или сам элемент)
            const clickable = goalTab.querySelector("a, button") || goalTab;
            clickable.click();
            await sleep(700);
        }

        // 3. Ждем появления блока с полями цели
        container = await waitForElement(".broadcast-settings-block-content", 6000);
        return container;
    }

    async function setNewGoal(goalText, manualTokens = null) {
        const tokens =
            manualTokens !== null ? manualTokens : calculateTokens(goalText);
        log(
            `🎯 Установка цели: "${goalText}" | ${tokens} tk (${state.priceTier.toUpperCase()})`,
            "#e879f9",
        );

        const container = await ensureGoalSettingsOpen();

        const initialScrollY = window.scrollY || document.documentElement.scrollTop;

        // Прокручиваем страницу к настройкам цели
        container.scrollIntoView({
            behavior: "instant",
            block: "center"
        });

        await sleep(500);

        // Ищем все видимые поля ввода внутри блока настроек цели
        const inputs = Array.from(
            container.querySelectorAll("input:not([type='hidden'])"),
        );
        if (inputs.length < 2) {
            throw new Error(
                `Найдено только ${inputs.length} инпута вместо 2 (Цель и Токены)`,
            );
        }

        const descInput = inputs[0];
        const tokenInput = inputs[1];
        // Проверяем, что поля действительно доступны
        if (!descInput || !tokenInput) {
            throw new Error("Не удалось получить поля цели и токенов");
        }

        // Прокручиваем непосредственно к первому полю
        descInput.scrollIntoView({
            behavior: "instant",
            block: "center"
        });

        await sleep(300);
        // Заполнение цели
        descInput.focus();
        await sleep(50);
        setReactInputValue(descInput, goalText);
        descInput.dispatchEvent(new Event("blur", { bubbles: true }));
        await sleep(100);

        // Заполнение токенов
        tokenInput.focus();
        await sleep(50);
        setReactInputValue(tokenInput, tokens.toString());
        tokenInput.dispatchEvent(new Event("blur", { bubbles: true }));
        await sleep(200);

        // Поиск кнопки сохранения (учитываем все варианты разметки Stripchat)
        let saveBtn =
            container.querySelector('button[type="submit"]') ||
            container.querySelector('[class*="GoalSettings__buttons"] button') ||
            container.querySelector(".btn-apply") ||
            Array.from(container.querySelectorAll("button")).find((b) => {
                const t = (b.innerText || b.textContent || "").toLowerCase();
                return (
                    t.includes("сохран") || t.includes("save") || t.includes("применить")
                );
            });

        if (!saveBtn) {
            throw new Error("Кнопка 'Сохранить цель' не найдена!");
        }

        if (saveBtn.disabled) {
            log(
                "⚠️ Кнопка сохранить заблокирована (disabled), форсируем ввод...",
                "#facc15",
            );
            descInput.dispatchEvent(new Event("input", { bubbles: true }));
            tokenInput.dispatchEvent(new Event("input", { bubbles: true }));
            await sleep(200);
        }

        // Вызываем mousedown + click + mouseup для полного прохождения через React SyntheticEvents
        saveBtn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        saveBtn.click();
        saveBtn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

        log("✅ Кнопка 'Сохранить' нажата!", "#22c55e");

        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }
        await sleep(800);
        window.scrollTo({ top: initialScrollY, behavior: "instant" });
    }

    function dumpCurrentGoal(percent = 20) {
        const container = document.querySelector(
            ".broadcast-settings-block-content",
        );
        if (!container) return;
        const inputs = container.querySelectorAll("input");
        if (inputs.length < 2) return;

        const currentGoal = inputs[0].value || GOALS_LIST[state.goalIndex];
        const curTokens = parseInt(inputs[1].value, 10) || state.defaultTokens;
        const reduced = Math.max(1, Math.round(curTokens * (1 - percent / 100)));
        log(
            `💸 Дэмпинг: было ${curTokens} -> стало ${reduced} (-${percent}%)`,
            "#f87171",
        );
        setNewGoal(currentGoal, reduced);
    }

    // --- ЛОГИКА ОТКРЫТИЯ ДИАЛОГА С ПОБЕДИТЕЛЕМ ---
    async function openDialogueWithUser(username, messageId) {
        log(`Открываем диалог с ${username}...`, "#38bdf8");

        // 1. Поиск никнейма в сообщении чата
        let targetMsg = null;
        if (messageId) {
            targetMsg = document.querySelector(
                `div[data-message-id="${messageId}"] .user-levels-username-text`,
            );
        }
        if (!targetMsg) {
            // Запасной поиск по тексту имени в чате
            const allUsers = Array.from(
                document.querySelectorAll(".user-levels-username-text"),
            );
            targetMsg = allUsers
                .reverse()
                .find(
                    (el) =>
                        el.textContent.trim().toLowerCase() === username.toLowerCase(),
                );
        }

        if (!targetMsg) {
            throw new Error(
                `Сообщение/ник пользователя ${username} не найден в чате`,
            );
        }

        targetMsg.scrollIntoView({ block: "center", behavior: "smooth" });
        targetMsg.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        targetMsg.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
        await sleep(500);

        // 2. Клик на кнопку «Личное сообщение» в попапе
        const dmBtn = await waitForElement(
            '.user-info-popup button[aria-label="Личное сообщение"]',
            3500,
        );
        dmBtn.click();
        await sleep(800);

        // 3. Ждем раскрытия мессенджера
        await waitForElement(".messenger-chat.expanded", 4000);
    }

    // --- ОТПРАВКА ОДНОГО ВИДЕО ---
    async function sendSingleVideo(videoTitle) {
        log(`Ищем видео: "${videoTitle}"...`, "#93c5fd");

        const messenger =
            document.querySelector(".messenger-chat.expanded") || document;

        // 1. Нажимаем кнопку «Загрузить файл»
        const uploadBtn =
            messenger.querySelector('button[aria-label="Загрузить файл"]') ||
            document.querySelector('button[aria-label="Загрузить файл"]');
        if (!uploadBtn) throw new Error("Кнопка 'Загрузить файл' не найдена");
        uploadBtn.click();
        await sleep(600);

        // 2. Переключаемся на вкладку «Видео»
        const mediaModal = await waitForElement(".media-uploader", 4000);
        const videoTab = Array.from(
            mediaModal.querySelectorAll(".browse-tabs button"),
        ).find((b) => b.textContent.trim().includes("Видео"));

        if (videoTab && !videoTab.classList.contains("active")) {
            videoTab.click();
            await sleep(700);
        }

        // 3. Ищем карточку с нужным видео
        await waitForElement(".upload-video-media-gallery-v2", 5000);
        const galleryItems = Array.from(
            document.querySelectorAll(".upload-video-media-gallery-v2__item"),
        );

        const cleanStr = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();
        const targetClean = cleanStr(videoTitle);

        const matchedItem = galleryItems.find((item) => {
            const titleSpan = item.querySelector(".video-title-text");
            const titleAttr = titleSpan ? titleSpan.getAttribute("title") : "";
            const textVal = titleSpan ? titleSpan.innerText : "";
            return (
                cleanStr(titleAttr).includes(targetClean) ||
                cleanStr(textVal).includes(targetClean) ||
                targetClean.includes(cleanStr(textVal))
            );
        });

        if (!matchedItem) {
            throw new Error(`Видео "${videoTitle}" не найдено в списке!`);
        }

        // Кликаем по превью для перехода к настройке доступа
        const clickTarget =
            matchedItem.querySelector(".video-thumb") || matchedItem;
        clickTarget.scrollIntoView({ block: "center", behavior: "smooth" });
        await sleep(200);
        clickTarget.click();
        await sleep(700);

        // 4. Работа с выпадающим списком доступа (react-select)
        await waitForElement("#content-access-type", 4000);
        const accessContainer = document.getElementById("content-access-type");

        // Проверяем текущее значение
        const hiddenInput = accessContainer.querySelector(
            'input[name="accessMode"]',
        );
        const labelSpan = accessContainer.querySelector(".select-value-label");
        const isAlreadyFree =
            (hiddenInput && hiddenInput.value === "free") ||
            (labelSpan && labelSpan.textContent.trim() === "Бесплатно");

        if (!isAlreadyFree) {
            const selectControl = accessContainer.querySelector(".select-control");
            if (!selectControl) throw new Error("Не найден .select-control");

            // Открываем селектор
            selectControl.dispatchEvent(
                new MouseEvent("mousedown", { bubbles: true }),
            );
            selectControl.click();
            await sleep(350);

            // Ждем появление .select-menu-outer из скриншота
            const menuOuter = await waitForElement(
                "#content-access-type .select-menu-outer, .select-menu-outer",
                3000,
            );

            // Ищем вариант "Бесплатно" внутри выпадающего меню
            const options = Array.from(
                menuOuter.querySelectorAll(".select-option, [role='option'], div"),
            );
            const freeOption = options.find(
                (el) => el.textContent.trim() === "Бесплатно",
            );

            if (freeOption) {
                // react-select фиксирует выбор по mousedown
                freeOption.dispatchEvent(
                    new MouseEvent("mousedown", { bubbles: true }),
                );
                freeOption.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
                freeOption.click();
                log("Выбран пункт: Бесплатно", "#a7f3d0");
            } else {
                log(
                    "Опция 'Бесплатно' не найдена в списке, применяем прямой фоллбэк",
                    "#facc15",
                );
                if (hiddenInput) setReactInputValue(hiddenInput, "free");
            }
            await sleep(400);
        }

        // 5. Нажатие кнопки «Отправить»
        const submitBtn =
            document.querySelector('.media-uploader form button[type="submit"]') ||
            document.querySelector(".media-uploader button.btn-apply");
        if (!submitBtn) throw new Error("Кнопка отправки формы не найдена");

        submitBtn.click();
        log(
            `✅ Видео "${videoTitle.slice(0, 30)}..." успешно отправлено!`,
            "#22c55e",
        );
        await sleep(1500);
    }

    // --- ОБРАБОТКА ДОСТИЖЕНИЯ ЦЕЛИ (СНАЧАЛА ЦЕЛЬ, ЗАТЕМ ВИДЕО) ---
    async function handleGoalReached(goalData) {
        if (!state.isActive || state.isProcessingGoal) return;
        state.isProcessingGoal = true;

        const { username, closedGoal, dataMessageId } = goalData;
        log(`🔥 ЦЕЛЬ ЗАКРЫТА: ${username} | "${closedGoal}"`, "#f43f5e");

        // Определение следующей цели
        if (GOALS_LIST.includes(closedGoal)) {
            state.goalIndex = GOALS_LIST.indexOf(closedGoal);
        }
        log(`[GoalBot] Текущая цель: ${GOALS_LIST[state.goalIndex]} (индекс ${state.goalIndex})`, "color: #f472b6; font-weight: bold;");

        state.goalIndex = (state.goalIndex + 1) % GOALS_LIST.length;
        const nextGoal = GOALS_LIST[state.goalIndex];
        log(`Следующая цель: "${nextGoal}" (индекс ${state.goalIndex})`, "#38bdf8");

        // ШАГ 1: Сначала строго меняем цель
        try {
            log("⏳ Начинаем автоматическую установку цели...", "#38bdf8");

            await setNewGoal(nextGoal);

            log(`✅ Новая цель успешно обработана: "${nextGoal}"`, "#22c55e");

        } catch (err) {
            log(`❌ КРИТИЧЕСКАЯ ОШИБКА смены цели: ${err.message}`, "#ef4444");
            console.error("[GoalBot] Ошибка установки цели:", err);
        }

        // Даем серверу и сайту 2 секунды зафиксировать новую цель
        await sleep(2000);

        // ШАГ 2: Отправка видео
        const videosToSend = GOALS_VIDEO_TITLES[closedGoal] || [];
        if (videosToSend.length > 0) {
            try {
                await openDialogueWithUser(username, dataMessageId);
                await sleep(600);

                for (let i = 0; i < videosToSend.length; i++) {
                    const vid = videosToSend[i];
                    log(`Отправка видео [${i + 1}/${videosToSend.length}]...`, "#38bdf8");
                    await sendSingleVideo(vid);
                    await sleep(1200);
                }
                log(`🎉 Все видео отправлены (${videosToSend.length} шт.)!`, "#22c55e");
            } catch (err) {
                log(`❌ Ошибка отправки видео: ${err.message}`, "#ef4444");
            }
        }

        state.isProcessingGoal = false;
    }

    // --- ЧАТ-НАБЛЮДАТЕЛЬ (MUTATION OBSERVER) ---
    function startChatObserver() {
        if (state.chatObserver) state.chatObserver.disconnect();

        const chatContainer = document.querySelector(".messages") || document.body;
        state.chatObserver = new MutationObserver((mutations) => {
            if (!state.isActive || state.isProcessingGoal) return;

            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;

                    let goalElement = null;
                    if (node.matches && node.matches(".goal-message.goal-reached")) {
                        goalElement = node;
                    } else if (node.querySelector) {
                        goalElement = node.querySelector(".goal-message.goal-reached");
                    }

                    if (goalElement) {
                        const prevElement = goalElement.previousElementSibling;
                        if (prevElement) {
                            const username = prevElement.getAttribute("data-username");
                            const messageId = prevElement.getAttribute("data-message-id");
                            const descEl = goalElement.querySelector(
                                ".goal-description__message",
                            );
                            const closedGoalText = descEl ? descEl.innerText.trim() : "";

                            const key =
                                messageId || `${username}_${closedGoalText}_${Date.now()}`;
                            if (username && !state.processedTimestamps.has(key)) {
                                state.processedTimestamps.add(key);
                                handleGoalReached({
                                    username,
                                    closedGoal: closedGoalText,
                                    dataMessageId: messageId,
                                });
                            }
                        }
                    }
                }
            }
        });

        state.chatObserver.observe(chatContainer, {
            childList: true,
            subtree: true,
        });
    }

    function stopChatObserver() {
        if (state.chatObserver) {
            state.chatObserver.disconnect();
            state.chatObserver = null;
        }
    }

    function setBotState(isActive) {
        state.isActive = isActive;
        const toggleBtn = document.getElementById("btn-toggle-auto");
        if (toggleBtn) {
            toggleBtn.innerText = isActive ? "STATUS: ON" : "STATUS: OFF";
            toggleBtn.style.background = isActive ? "#16a34a" : "#dc2626";
        }

        if (isActive) {
            startChatObserver();
            log("▶️ Бот активирован", "#22c55e");
        } else {
            stopChatObserver();
            log("⏸️ Бот на паузе", "#f87171");
        }

        chrome.runtime
            .sendMessage({ action: "UPDATE_STATUS", active: isActive })
            .catch(() => { });
        chrome.storage.local.set({ botActive: isActive });
    }

    // --- DRAG & DROP ПЕРЕМЕЩЕНИЕ ОКНА ---
    function makeDraggable(panel, handle) {
        let offsetX = 0,
            offsetY = 0;
        let isDragging = false;
        handle.style.cursor = "grab";

        handle.addEventListener("mousedown", (e) => {
            if (e.target.tagName.toLowerCase() === "button") return;
            isDragging = true;
            handle.style.cursor = "grabbing";

            const rect = panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            panel.style.bottom = "auto";
            panel.style.right = "auto";
            panel.style.left = `${rect.left}px`;
            panel.style.top = `${rect.top}px`;

            function onMouseMove(moveEvent) {
                if (!isDragging) return;
                let left = moveEvent.clientX - offsetX;
                let top = moveEvent.clientY - offsetY;

                const maxLeft = window.innerWidth - panel.offsetWidth;
                const maxTop = window.innerHeight - panel.offsetHeight;

                panel.style.left = `${Math.max(0, Math.min(left, maxLeft))}px`;
                panel.style.top = `${Math.max(0, Math.min(top, maxTop))}px`;
            }

            function onMouseUp() {
                if (!isDragging) return;
                isDragging = false;
                handle.style.cursor = "grab";
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);

                chrome.storage.local.set({
                    botPanelPos: { left: panel.style.left, top: panel.style.top },
                });
            }

            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        });
    }

    // --- UI ИНТЕРФЕЙС ---
    function injectFloatingControlPanel() {
        if (document.getElementById("sc-bot-control-panel")) return;

        const panel = document.createElement("div");
        panel.id = "sc-bot-control-panel";
        panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 330px;
      background: #111827;
      border: 1px solid #374151;
      border-radius: 10px;
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      z-index: 9999999;
      box-shadow: 0 10px 25px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      user-select: none;
    `;

        panel.innerHTML = `
      <div id="sc-panel-header" style="background: #1f2937; padding: 10px 14px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #374151;">
        <span style="font-size: 13px; pointer-events: none;">🎯 Stripchat Goal Bot</span>
        <button id="btn-toggle-auto" style="cursor: pointer; background: #dc2626; border: none; color: white; padding: 3px 10px; border-radius: 5px; font-weight: bold; font-size: 11px;">STATUS: OFF</button>
      </div>
      <div style="padding: 10px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; gap: 5px; align-items: center;">
          <label style="color: #9ca3af; width: 45px;">Tier:</label>
          <button class="tier-btn" data-tier="low" style="flex:1; cursor: pointer; padding: 4px; background: #374151; border: none; color: white; border-radius: 4px;">Low</button>
          <button class="tier-btn" data-tier="medium" style="flex:1; cursor: pointer; padding: 4px; background: #2563eb; border: none; color: white; border-radius: 4px; font-weight: bold;">Mid</button>
          <button class="tier-btn" data-tier="high" style="flex:1; cursor: pointer; padding: 4px; background: #374151; border: none; color: white; border-radius: 4px;">High</button>
        </div>
        <div style="display: flex; gap: 6px;">
          <button id="btn-next-goal" style="flex: 2; cursor: pointer; background: #7c3aed; color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold;">Следующая цель ❯</button>
          <button id="btn-dump-20" style="flex: 1; cursor: pointer; background: #e11d48; color: white; border: none; padding: 6px; border-radius: 4px;">Dump -20%</button>
        </div>
        <div id="bot-console-log" style="height: 120px; background: #030712; padding: 6px; border-radius: 6px; overflow-y: auto; font-family: monospace; font-size: 10px; border: 1px solid #1f2937; margin-top: 8px;"></div>
      </div>
    `;

        document.body.appendChild(panel);

        const header = panel.querySelector("#sc-panel-header");
        makeDraggable(panel, header);

        chrome.storage.local.get("botPanelPos", (data) => {
            if (data.botPanelPos) {
                panel.style.bottom = "auto";
                panel.style.right = "auto";
                panel.style.left = data.botPanelPos.left;
                panel.style.top = data.botPanelPos.top;
            }
        });

        panel.querySelector("#btn-toggle-auto").onclick = () => {
            setBotState(!state.isActive);
        };

        panel.querySelectorAll(".tier-btn").forEach((btn) => {
            btn.onclick = () => {
                panel.querySelectorAll(".tier-btn").forEach((b) => {
                    b.style.background = "#374151";
                    b.style.fontWeight = "normal";
                });
                btn.style.background = "#2563eb";
                btn.style.fontWeight = "bold";
                state.priceTier = btn.getAttribute("data-tier");
                log(`Tier: ${state.priceTier.toUpperCase()}`, "#38bdf8");
            };
        });

        panel.querySelector("#btn-next-goal").onclick = async () => {
            state.goalIndex = (state.goalIndex + 1) % GOALS_LIST.length;

            const nextGoal = GOALS_LIST[state.goalIndex];

            try {
                log(`⏳ Ручная установка цели: "${nextGoal}"`, "#38bdf8");

                await setNewGoal(nextGoal);

                log(`✅ Цель установлена: "${nextGoal}"`, "#22c55e");

            } catch (err) {
                log(`❌ Ошибка ручной установки: ${err.message}`, "#ef4444");
                console.error(err);
            }
        };
    }

    // Слушатель переключения видимости панели
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "TOGGLE_PANEL_VISIBILITY") {
            const panel = document.getElementById("sc-bot-control-panel");
            if (panel) {
                panel.style.display = request.visible ? "flex" : "none";
            }
        }

        if (request.action === "TOGGLE_BOT_ACTIVE") {
            setBotState(Boolean(request.active));
        }
    });

    // Запуск
    async function init() {
        await loadGoalConfig();
        injectFloatingControlPanel();

        chrome.storage.local.get(["botVisible", "botActive"], (data) => {
            const panel = document.getElementById("sc-bot-control-panel");
            if (panel && data.botVisible === false) {
                panel.style.display = "none";
            }
            if (data.botActive) {
                setBotState(true);
            }
        });

        log("Готов к работе. Ожидание событий...", "#38bdf8");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
