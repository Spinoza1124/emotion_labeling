import { elements } from '../utils/domElements.js';
import { state } from './state.js';
import { loadAudioList } from '../api/dataService.js';
import { selectAudio, resetPlayer, resetLabeling } from '../ui/audioUI.js';
import { saveLabel } from '../api/dataService.js';
import { switchToVaMode, switchToDiscreteMode } from '../ui/emotionUI.js';
import { checkExactVMatch, checkExactAMatch, moveSliderToStandardValue } from '../ui/sliderSetup.js';

// 设置所有事件监听器
export function setupEventListeners() {
    // 基本控件事件
    elements.speakerSelect.addEventListener('change', handleSpeakerChange);
    elements.loopCheckbox.addEventListener('change', handleLoopChange);
    elements.vSlider.addEventListener('input', handleSliderChange);
    elements.aSlider.addEventListener('input', handleSliderChange);
    elements.saveButton.addEventListener('click', handleSave);
    elements.nextButton.addEventListener('click', handleNext);
    elements.prevButton.addEventListener('click', handlePrev);
    elements.continueButton.addEventListener('click', handleContinue);
    elements.backButton.addEventListener('click', handleBack);
    
    // 标准值单选按钮的事件监听
    setupStandardRadioListeners();
    
    // 离散情感选项的事件监听
    setupDiscreteEmotionListeners();
    
    // 滑动条特定事件
    setupSliderEvents();
}

// 设置标准值单选按钮的事件监听
function setupStandardRadioListeners() {
    // V值标准单选按钮
    elements.vStandardRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const value = this.value;
            const sliderValue = state.vStandardToSliderMap[value];
            
            // 将滑动条移动到选中的标准值位置
            moveSliderToStandardValue('v', sliderValue);
            
            state.isModified = true;
        });
    });
    
    // A值标准单选按钮
    elements.aStandardRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const value = this.value;
            const sliderValue = state.aStandardToSliderMap[value];
            
            // 将滑动条移动到选中的标准值位置
            moveSliderToStandardValue('a', sliderValue);
            
            state.isModified = true;
        });
    });
}

// 设置离散情感选项的事件监听
function setupDiscreteEmotionListeners() {
    elements.discreteEmotionRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            state.selectedDiscreteEmotion = this.value;
            state.isModified = true;
            
            // 在离散情感标注模式下，选择标签后立即启用保存按钮
            if (!state.isVaLabelingMode) {
                elements.saveButton.disabled = false;
            }
            
            // 关键修改：选择后立即释放焦点
            this.blur();
            
            // 额外确保父元素和label也不会保持焦点状态
            const parentLabel = this.closest('label');
            if (parentLabel) parentLabel.blur();
            
            // 移除所有可能的焦点和活动状态
            document.querySelectorAll('.emotion-option').forEach(option => {
                option.blur();
            });
        });
        
        // 为radio按钮添加单击事件，确保在点击后立即释放焦点
        radio.addEventListener('click', function(event) {
            // 防止事件冒泡导致其他元素获得焦点
            event.stopPropagation();
            
            // 短暂延迟后释放焦点，确保选中状态已经应用
            setTimeout(() => {
                this.blur();
                document.activeElement.blur();
            }, 10);
        });
    });
    
    // 在整个离散情感容器上添加点击事件处理
    document.getElementById('discrete-labeling').addEventListener('click', function(event) {
        // 如果点击的不是radio按钮或label，就释放所有焦点
        if (event.target.type !== 'radio' && event.target.tagName !== 'LABEL') {
            // 移除所有焦点
            document.activeElement.blur();
            
            // 确保保存按钮可点击（如果已选择情感）
            if (state.selectedDiscreteEmotion !== null && !state.isVaLabelingMode) {
                elements.saveButton.disabled = false;
                elements.saveButton.focus();  // 可选：将焦点转移到保存按钮
                elements.saveButton.blur();   // 然后释放焦点，避免快捷键问题
            }
        }
    });
}

// 设置滑动条特定事件
function setupSliderEvents() {
    // 滑动条改变事件 - 仅检查是否恰好等于某个标准值
    elements.vSlider.addEventListener('input', function() {
        checkExactVMatch(parseFloat(this.value));
    });
    
    elements.aSlider.addEventListener('input', function() {
        checkExactAMatch(parseFloat(this.value));
    });
    
    // 滑动条松开鼠标或触摸结束时释放焦点
    elements.vSlider.addEventListener('mouseup', function() {
        setTimeout(() => this.blur(), 10);
    });
    
    elements.aSlider.addEventListener('mouseup', function() {
        setTimeout(() => this.blur(), 10);
    });
    
    elements.vSlider.addEventListener('touchend', function() {
        setTimeout(() => this.blur(), 10);
    });
    
    elements.aSlider.addEventListener('touchend', function() {
        setTimeout(() => this.blur(), 10);
    });
}

// 处理说话人选择变化
function handleSpeakerChange() {
    state.currentSpeaker = elements.speakerSelect.value;
    if (state.currentSpeaker) {
        loadAudioList(state.currentSpeaker);
    } else {
        elements.audioListContainer.innerHTML = '<p>请先选择说话人</p>';
        resetPlayer();
        resetLabeling();
    }
}

// 处理循环播放变化
function handleLoopChange() {
    elements.audioPlayer.loop = elements.loopCheckbox.checked;
}

// 处理滑动条变化
function handleSliderChange(event) {
    const slider = event.target;
    const valueElement = slider.id === 'v-slider' ? elements.vValue : elements.aValue;
    
    // 显示当前值（保留两位小数）
    const roundedValue = parseFloat(slider.value).toFixed(2);
    valueElement.textContent = roundedValue;
    
    state.isModified = true;
}

// 处理"继续"按钮点击，从VA标注切换到离散标注
function handleContinue() {
    if (state.currentAudioIndex === -1) return;
    
    // 确保释放所有元素的焦点
    document.activeElement.blur();
    elements.vSlider.blur();
    elements.aSlider.blur();
    
    // 如果VA标注已修改但未保存，提示用户
    if (state.isModified && state.isVaLabelingMode) {
        // 切换到离散情感标注模式
        switchToDiscreteMode();
    } else {
        // 直接切换到离散情感标注模式
        switchToDiscreteMode();
    }
}

// 处理"返回"按钮点击，从离散标注返回到VA标注
function handleBack() {
    if (state.isModified && !state.isVaLabelingMode) {
        if (confirm('离散情感标注未保存，是否返回VA标注？')) {
            switchToVaMode();
        }
    } else {
        switchToVaMode();
    }
}

// 保存标注
function handleSave() {
    saveLabel();
}

// 处理下一条
function handleNext() {
    if (state.currentAudioIndex >= state.audioList.length - 1) return;
    
    if (state.isModified) {
        if (confirm('当前标注未保存，是否继续？')) {
            selectAudio(state.currentAudioIndex + 1);
        }
    } else {
        selectAudio(state.currentAudioIndex + 1);
    }
}

// 处理上一条
function handlePrev() {
    if (state.currentAudioIndex <= 0 || elements.prevButton.disabled) return;
    
    if (state.isModified) {
        if (confirm('当前标注未保存，是否继续？')) {
            selectAudio(state.currentAudioIndex - 1);
        }
    } else {
        selectAudio(state.currentAudioIndex - 1);
    }
}
