import { elements } from '../utils/domElements.js';
import { state } from '../core/state.js';

// 切换到VA标注模式
export function switchToVaMode() {
    state.isVaLabelingMode = true;
    elements.vaLabeling.style.display = 'block';
    elements.discreteLabeling.style.display = 'none';
    elements.continueButton.style.display = 'inline-block';
    elements.continueButton.disabled = false;
    elements.backButton.style.display = 'none';
    elements.saveButton.disabled = true;
    
    // 确保释放所有焦点
    document.activeElement.blur();
    elements.vSlider.blur();
    elements.aSlider.blur();
}

// 切换到离散情感标注模式
export function switchToDiscreteMode() {
    state.isVaLabelingMode = false;
    elements.vaLabeling.style.display = 'none';
    elements.discreteLabeling.style.display = 'block';
    elements.continueButton.style.display = 'none';
    elements.backButton.style.display = 'inline-block';
    elements.backButton.disabled = false;
    // 如果已经选择了离散情感，立即启用保存按钮
    elements.saveButton.disabled = state.selectedDiscreteEmotion === null;
    // 确保没有元素保持焦点状态
    document.activeElement.blur();
    elements.vSlider.blur();
    elements.aSlider.blur();
    state.isModified = false;
}
