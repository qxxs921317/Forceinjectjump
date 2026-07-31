import { eventSource, event_types, saveSettingsDebounced } from "../../../../script.js";
import { extension_settings } from "../../../extensions.js";

const MODULE_NAME = "force_inject_jump";

const defaultSettings = {
    enabled: true,
    delayMs: 300,
};

function getSettings() {
    if (!extension_settings[MODULE_NAME]) {
        extension_settings[MODULE_NAME] = structuredClone(defaultSettings);
    }
    // 누락된 키 보정 (구버전 설정 호환)
    for (const key of Object.keys(defaultSettings)) {
        if (extension_settings[MODULE_NAME][key] === undefined) {
            extension_settings[MODULE_NAME][key] = defaultSettings[key];
        }
    }
    return extension_settings[MODULE_NAME];
}

// 채팅창 안에서 mesid가 가장 큰(=가장 마지막) 메시지 엘리먼트를 찾음
function getLastMessageElement() {
    const chat = document.getElementById("chat");
    if (!chat) return null;
    const messages = chat.querySelectorAll(".mes[mesid]");
    if (!messages.length) return null;
    return messages[messages.length - 1];
}

function scrollToLastMessageStart() {
    const settings = getSettings();
    if (!settings.enabled) return;

    const el = getLastMessageElement();
    if (!el) return;

    // 메시지 상단이 화면 위쪽에 오도록 스크롤 (block: "start")
    el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scheduleScroll() {
    const settings = getSettings();
    const delay = Math.max(0, parseInt(settings.delayMs, 10) || 0);
    // 스트리밍/렌더링이 끝난 뒤 DOM이 안정되도록 약간의 딜레이
    setTimeout(scrollToLastMessageStart, delay);
}

function bindEvents() {
    // 새 AI 메시지 수신 시
    if (event_types.MESSAGE_RECEIVED) {
        eventSource.on(event_types.MESSAGE_RECEIVED, scheduleScroll);
    }
    // 스와이프로 답장이 바뀔 때
    if (event_types.MESSAGE_SWIPED) {
        eventSource.on(event_types.MESSAGE_SWIPED, scheduleScroll);
    }
    // 스트리밍 종료 시점이 따로 있는 버전 대비 (있으면 더 정확한 타이밍)
    if (event_types.GENERATION_ENDED) {
        eventSource.on(event_types.GENERATION_ENDED, scheduleScroll);
    }
    if (event_types.CHARACTER_MESSAGE_RENDERED) {
        eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, scheduleScroll);
    }
}

function renderSettingsHtml() {
    const settings = getSettings();
    return `
    <div class="force-inject-jump-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Force Inject Jump</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label class="checkbox_label" for="fij_enabled">
                    <input id="fij_enabled" type="checkbox" ${settings.enabled ? "checked" : ""} />
                    <span>활성화</span>
                </label>
                <label for="fij_delay">딜레이 (ms)</label>
                <input id="fij_delay" type="number" min="0" step="50" value="${settings.delayMs}" class="text_pole" />
                <div class="fij_hint" style="opacity:0.7; font-size: 0.85em; margin-top: 4px;">
                    AI 응답(스와이프 포함) 발생 시, 매크로/QR 없이 마지막 메시지 시작 부분으로 자동 스크롤합니다.
                </div>
            </div>
        </div>
    </div>
    `;
}

function bindSettingsUi() {
    const settings = getSettings();

    document.getElementById("fij_enabled").addEventListener("change", (e) => {
        settings.enabled = e.target.checked;
        saveSettingsDebounced();
    });

    document.getElementById("fij_delay").addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        settings.delayMs = Number.isFinite(val) ? val : defaultSettings.delayMs;
        saveSettingsDebounced();
    });
}

jQuery(async () => {
    const settingsHtml = renderSettingsHtml();
    $("#extensions_settings2").append(settingsHtml);
    bindSettingsUi();
    bindEvents();
});
