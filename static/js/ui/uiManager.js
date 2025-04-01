import { loadSpeakers } from '../api/dataService.js';
import { setupSliderAlignment } from './sliderSetup.js';
import { elements, initElements } from '../utils/domElements.js';
import { state } from '../core/state.js';

export function initUI() {
    // 初始化DOM元素引用
    initElements();
    
    // 初始化说话人下拉列表
    loadSpeakers();
    
    // 设置滑动条对齐
    setupSliderAlignment();
    
    // 添加全局点击事件处理，确保任何空白区域点击都移除焦点
    document.addEventListener('click', handleGlobalClick);
}

function handleGlobalClick(event) {
    // 如果点击的是空白区域或非特定交互元素
    if (event.target.tagName !== 'INPUT' && 
        event.target.tagName !== 'BUTTON' && 
        event.target.tagName !== 'SELECT' && 
        event.target.tagName !== 'LABEL') {
        // 释放所有焦点
        document.activeElement.blur();
        elements.vSlider.blur();
        elements.aSlider.blur();
    }
}
