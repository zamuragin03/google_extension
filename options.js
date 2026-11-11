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

const DEFAULT_TITLES = {
  "LAST TIPPER WIN CHEATING GANGBANGED VIDEO": [
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

const goalsInput = document.getElementById('goals-json');
const titlesInput = document.getElementById('titles-json');
const statusNode = document.getElementById('status');
const goalsError = document.getElementById('goals-error');
const titlesError = document.getElementById('titles-error');

function markError(input, hasError) {
  input.classList.toggle('error', hasError);
}

function setFieldError(input, message) {
  const errorNode = input.id === 'goals-json' ? goalsError : titlesError;
  errorNode.textContent = message || '';
  markError(input, !!message);
}

function showStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.style.color = isError ? '#f87171' : '#22c55e';
}

function parseJsonSafe(input, fallback, fieldLabel) {
  const raw = input.value.trim();
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    setFieldError(input, `${fieldLabel}: ${error.message}`);
    throw new Error(`${fieldLabel}: ${error.message}`);
  }
}

function validateGoalsStructure(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('Поле "Цели и суммы" должно быть объектом JSON.');
  }

  for (const [key, value] of Object.entries(obj)) {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Каждый ключ цели должен быть непустой строкой.');
    }
    if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
      throw new Error(`Для цели "${key}" нужно указать положительное число.`);
    }
  }

  return obj;
}

function validateTitlesStructure(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('Поле "Видео для каждой цели" должно быть объектом JSON.');
  }

  for (const [key, value] of Object.entries(obj)) {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Каждый ключ цели должен быть непустой строкой.');
    }
    if (!Array.isArray(value)) {
      throw new Error(`Для цели "${key}" значение должно быть массивом строк.`);
    }
    if (!value.every((item) => typeof item === 'string')) {
      throw new Error(`Для цели "${key}" в массиве должны быть только строки.`);
    }
    if (value.some((item) => item.trim() === '')) {
      throw new Error(`Для цели "${key}" не должно быть пустых строк в массиве.`);
    }
  }

  return obj;
}

function normalizeGoals(obj) {
  const normalized = {};
  Object.entries(obj || {}).forEach(([key, value]) => {
    if (typeof key === 'string' && Number.isFinite(Number(value))) {
      normalized[key] = Number(value);
    }
  });
  return normalized;
}

function normalizeTitles(obj) {
  const normalized = {};
  Object.entries(obj || {}).forEach(([key, value]) => {
    if (typeof key === 'string' && Array.isArray(value)) {
      normalized[key] = value.filter((item) => typeof item === 'string');
    }
  });
  return normalized;
}

function applyFieldValidation() {
  const validation = [
    { input: goalsInput, label: 'Поля целей', validate: () => parseJsonSafe(goalsInput, DEFAULT_GOALS, 'Цели и суммы') },
    { input: titlesInput, label: 'Поля видео', validate: () => parseJsonSafe(titlesInput, DEFAULT_TITLES, 'Видео для каждой цели') },
  ];

  let isValid = true;

  validation.forEach(({ input, validate, label }) => {
    try {
      const parsed = validate();
      if (input.id === 'goals-json') {
        validateGoalsStructure(parsed);
      }
      if (input.id === 'titles-json') {
        validateTitlesStructure(parsed);
      }
      setFieldError(input, '');
      markError(input, false);
    } catch (error) {
      isValid = false;
      setFieldError(input, error.message || `${label} содержит ошибку.`);
      markError(input, true);
    }
  });

  if (!isValid) {
    showStatus('Есть синтаксические ошибки в JSON. Исправьте их перед сохранением.', true);
  } else {
    showStatus('JSON корректен.', false);
  }

  return isValid;
}

function getStoredConfigOrDefault(data, fallback) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) {
    return fallback;
  }
  return data;
}

function loadSettings() {
  chrome.storage.local.get(['goalsConfig', 'videoTitlesConfig'], (data) => {
    const goals = normalizeGoals(getStoredConfigOrDefault(data.goalsConfig, DEFAULT_GOALS));
    const titles = normalizeTitles(getStoredConfigOrDefault(data.videoTitlesConfig, DEFAULT_TITLES));
    goalsInput.value = JSON.stringify(goals, null, 2);
    titlesInput.value = JSON.stringify(titles, null, 2);
    applyFieldValidation();
  });
}

function collectAndValidate() {
  const goals = validateGoalsStructure(parseJsonSafe(goalsInput, DEFAULT_GOALS, 'Цели и суммы'));
  const titles = validateTitlesStructure(parseJsonSafe(titlesInput, DEFAULT_TITLES, 'Видео для каждой цели'));

  const keys = Object.keys(goals);
  if (!keys.length) {
    throw new Error('Нужно хотя бы одно название цели.');
  }

  for (const key of Object.keys(titles)) {
    if (!goals[key]) {
      throw new Error(`Видео для цели "${key}" не найдено в списке целей. Добавьте её в блок "Цели и суммы".`);
    }
    if (!Array.isArray(titles[key]) || titles[key].length === 0) {
      throw new Error(`Для цели "${key}" нужен непустой массив видео.`);
    }
  }

  return { goals, titles };
}

['input', 'change'].forEach((eventName) => {
  goalsInput.addEventListener(eventName, applyFieldValidation);
  titlesInput.addEventListener(eventName, applyFieldValidation);
});

document.getElementById('save-btn').addEventListener('click', () => {
  try {
    const repaired = prepareJsonFieldsForSave();
    if (!repaired.valid) {
      return;
    }

    saveCurrentSettings();
  } catch (err) {
    showStatus(err.message, true);
  }
});

document.getElementById('reset-btn').addEventListener('click', () => {
  goalsInput.value = JSON.stringify(DEFAULT_GOALS, null, 2);
  titlesInput.value = JSON.stringify(DEFAULT_TITLES, null, 2);
  markError(goalsInput, false);
  markError(titlesInput, false);
  setFieldError(goalsInput, '');
  setFieldError(titlesInput, '');
  chrome.storage.local.set({
    goalsConfig: DEFAULT_GOALS,
    videoTitlesConfig: DEFAULT_TITLES,
  }, () => {
    showStatus('Сброшено к значениям по умолчанию.');
    loadSettings();
  });
});

function normalizeBrokenValue(value) {
  return String(value || '')
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripBrokenJsonNoise(raw) {
  let fixed = String(raw || '').trim();

  if (!fixed) {
    return fixed;
  }

  fixed = fixed
    .replace(/^\s*['"]?\s*\{\s*['"]?/g, '{')
    .replace(/\}\s*['"]?\s*$/g, '}')
    .replace(/\\/g, '')
    .replace(/\s*,\s*([}\]])/g, '$1')
    .replace(/([\[{])\s*,/g, '$1')
    .replace(/,\s*,+/g, ',')
    .replace(/:\s*\[\s*,/g, ': [')
    .replace(/\[\s*,/g, '[')
    .replace(/\s*,\s*\]/g, ']')
    .replace(/\{\s*,/g, '{');

  return fixed;
}

function repairGoalsObject(raw) {
  const cleaned = stripBrokenJsonNoise(raw);
  const entries = {};

  for (const line of cleaned.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '{' || trimmed === '}' || trimmed === ',') {
      continue;
    }

    const match = trimmed.match(/^"?([^"\n:]+)"?\s*:\s*(-?\d+(?:\.\d+)?)/);
    if (!match) {
      continue;
    }

    const key = normalizeBrokenValue(match[1]);
    const number = Number(match[2]);
    if (key && Number.isFinite(number)) {
      entries[key] = number;
    }
  }

  return Object.keys(entries).length ? entries : null;
}

function repairTitlesObject(raw) {
  const cleaned = stripBrokenJsonNoise(raw);
  const entries = {};
  let currentKey = null;
  let currentValues = [];

  for (const line of cleaned.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '{' || trimmed === '}' || trimmed === ',') {
      continue;
    }

    const keyMatch = trimmed.match(/^"?([^"\n:]+)"?\s*:\s*(\[|$)/);
    if (keyMatch) {
      if (currentKey && currentValues.length) {
        entries[currentKey] = currentValues;
      }

      currentKey = normalizeBrokenValue(keyMatch[1]);
      currentValues = [];

      if (trimmed.includes('[')) {
        const inner = trimmed.slice(trimmed.indexOf('[')).replace(/^\[|\]$/g, '').trim();
        const items = [...inner.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((item) => normalizeBrokenValue(item[1]));
        currentValues.push(...items);
        if (trimmed.includes(']')) {
          if (currentKey && currentValues.length) {
            entries[currentKey] = currentValues;
          }
          currentKey = null;
          currentValues = [];
        }
      }
      continue;
    }

    if (currentKey) {
      const items = [...trimmed.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((item) => normalizeBrokenValue(item[1]));
      if (items.length) {
        currentValues.push(...items);
      }
      if (trimmed.includes(']')) {
        entries[currentKey] = currentValues;
        currentKey = null;
        currentValues = [];
      }
    }
  }

  if (currentKey && currentValues.length) {
    entries[currentKey] = currentValues;
  }

  return Object.keys(entries).length ? entries : null;
}

function saveCurrentSettings() {
  const goals = validateGoalsStructure(parseJsonSafe(goalsInput, DEFAULT_GOALS, 'Цели и суммы'));
  const titles = validateTitlesStructure(parseJsonSafe(titlesInput, DEFAULT_TITLES, 'Видео для каждой цели'));

  const keys = Object.keys(goals);
  if (!keys.length) {
    throw new Error('Нужно хотя бы одно название цели.');
  }

  for (const key of Object.keys(titles)) {
    if (!goals[key]) {
      throw new Error(`Видео для цели "${key}" не найдено в списке целей. Добавьте её в блок "Цели и суммы".`);
    }
    if (!Array.isArray(titles[key]) || titles[key].length === 0) {
      throw new Error(`Для цели "${key}" нужен непустой массив видео.`);
    }
  }

  goalsInput.value = JSON.stringify(goals, null, 2);
  titlesInput.value = JSON.stringify(titles, null, 2);

  chrome.storage.local.set({
    goalsConfig: goals,
    videoTitlesConfig: titles,
  }, () => {
    if (chrome.runtime.lastError) {
      showStatus(`Не удалось сохранить: ${chrome.runtime.lastError.message}`, true);
      return;
    }

    goalsInput.value = JSON.stringify(goals, null, 2);
    titlesInput.value = JSON.stringify(titles, null, 2);
    markError(goalsInput, false);
    markError(titlesInput, false);
    setFieldError(goalsInput, '');
    setFieldError(titlesInput, '');
    showStatus('Сохранено! Настройки применятся при следующем обновлении страницы.');
    loadSettings();
  });
}

function prepareJsonFieldsForSave() {
  const goalsResult = fixJsonField(goalsInput, DEFAULT_GOALS, 'goals');
  const titlesResult = fixJsonField(titlesInput, DEFAULT_TITLES, 'titles');
  const valid = applyFieldValidation();

  return { valid, goalsResult, titlesResult };
}

function autoFixJsonFields() {
  const summary = buildAutofixSummary();

  const goalsOriginal = goalsInput.value;
  const titlesOriginal = titlesInput.value;

  const { valid: nextValid, goalsResult, titlesResult } = prepareJsonFieldsForSave();

  summary.goalsFixed = goalsResult.fixed || goalsInput.value !== goalsOriginal;
  summary.titlesFixed = titlesResult.fixed || titlesInput.value !== titlesOriginal;

  if (nextValid) {
    showStatus('JSON автоматически исправлен и теперь проходит валидацию.', false);
  } else {
    showStatus('Автоисправление выполнено, но поля всё ещё содержат ошибки. Проверьте значения вручную.', true);
  }

  if (summary.goalsFixed) {
    summary.details.push('Исправлены лишние запятые, сломанные кавычки и закрывающие скобки в блоке целей');
  }
  if (summary.titlesFixed) {
    summary.details.push('Исправлены лишние запятые, сломанные кавычки и закрывающие скобки в блоке видео');
  }

  return summary;
}

function fixJsonField(input, fallback, kind) {
  const raw = input.value.trim();
  if (!raw) {
    input.value = JSON.stringify(fallback, null, 2);
    setFieldError(input, '');
    markError(input, false);
    return { fixed: true, value: input.value };
  }

  try {
    JSON.parse(raw);
    setFieldError(input, '');
    markError(input, false);
    return { fixed: false, value: raw };
  } catch (error) {
    const repaired = kind === 'goals' ? repairGoalsObject(raw) : repairTitlesObject(raw);
    if (repaired) {
      input.value = JSON.stringify(repaired, null, 2);
      setFieldError(input, '');
      markError(input, false);
      return { fixed: true, value: input.value };
    }

    input.value = JSON.stringify(fallback, null, 2);
    setFieldError(input, '');
    markError(input, false);
    return { fixed: true, value: input.value };
  }
}

(document.getElementById('autofix-btn') || {}).addEventListener('click', () => {
  autoFixJsonFields();
});
