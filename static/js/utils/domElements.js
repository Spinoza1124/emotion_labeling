// 集中管理所有DOM元素引用
export const elements = {
    // 初始化为null，将在DOMContentLoaded后获取实际元素
    speakerSelect: null,
    audioListContainer: null,
    audioPlayer: null,
    loopCheckbox: null,
    vSlider: null,
    aSlider: null,
    vValue: null,
    aValue: null,
    saveButton: null,
    nextButton: null,
    prevButton: null,
    continueButton: null,
    backButton: null,
    vaLabeling: null,
    discreteLabeling: null,
    neutralCheckbox: null,
    vStandardRadios: null,
    aStandardRadios: null,
    discreteEmotionRadios: null
};

// 在DOMContentLoaded事件中调用此函数初始化所有元素引用
export function initElements() {
    elements.speakerSelect = document.getElementById('speaker-select');
    elements.audioListContainer = document.getElementById('audio-list-container');
    elements.audioPlayer = document.getElementById('audio-player');
    elements.loopCheckbox = document.getElementById('loop-checkbox');
    elements.vSlider = document.getElementById('v-slider');
    elements.aSlider = document.getElementById('a-slider');
    elements.vValue = document.getElementById('v-value');
    elements.aValue = document.getElementById('a-value');
    elements.saveButton = document.getElementById('save-button');
    elements.nextButton = document.getElementById('next-button');
    elements.prevButton = document.getElementById('prev-button');
    elements.continueButton = document.getElementById('continue-button');
    elements.backButton = document.getElementById('back-button');
    elements.vaLabeling = document.getElementById('va-labeling');
    elements.discreteLabeling = document.getElementById('discrete-labeling');
    // 修复：中性复选框可能不存在
    elements.neutralCheckbox = document.getElementById('neutral-checkbox') || null;
    elements.vStandardRadios = document.querySelectorAll('input[name="v-standard"]');
    elements.aStandardRadios = document.querySelectorAll('input[name="a-standard"]');
    elements.discreteEmotionRadios = document.querySelectorAll('input[name="discrete-emotion"]');
}
