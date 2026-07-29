import { eventSource, event_types, saveSettingsDebounced } from "../../../../script.js";
import { extension_settings } from "../../../extensions.js";

const MODULE_NAME = "force_inject_jump";

const defaultSettings = {
    enabled: true,
    delayMs: 700,
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

function buildCommand() {
    const settings = getSettings();
    const delay = Math.max(0, parseInt(settings.delayMs, 10) || 0);
    return `/delay ${delay} | /chat-jump {{lastMessageId}}`;
}

function injectToInput() {
    const settings = getSettings();
    if (!settings.enabled) return;

    const textarea = document.getElementById("send_textarea");
    if (!textarea) return;

    textarea.value = buildCommand();
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function bindEvents() {
    // 채팅 전환 / 새 채팅 생성 시 자동 주입
    eventSource.on(event_types.CHAT_CHANGED, injectToInput);

    // 버전에 따라 이 이벤트가 없을 수 있어 존재 여부 체크 후 바인딩
    if (event_types.NEW_CHAT_CREATED) {
        eventSource.on(event_types.NEW_CHAT_CREATED, injectToInput);
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
                    채팅 전환/새 채팅 생성 시 입력창에 자동으로 <code>/delay N | /chat-jump {{lastMessageId}}</code> 를 주입합니다.
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
