import { elements } from '../utils/domElements.js';

// 设置滑动条与标准值单选按钮的对齐
export function setupSliderAlignment() {
    // 调整V值滑动条对齐
    const vSliderWidth = elements.vSlider.offsetWidth;
    const vRadios = document.querySelectorAll('input[name="v-standard"]');
    const vStep = vSliderWidth / (vRadios.length - 1);
    
    // 为V滑动条添加标记点
    const vSliderContainer = elements.vSlider.parentElement;
    const vTicksContainer = document.createElement('div');
    vTicksContainer.className = 'slider-ticks';
    vTicksContainer.style.width = '100%';
    vTicksContainer.style.position = 'relative';
    vTicksContainer.style.height = '5px';
    vTicksContainer.style.marginTop = '-15px';
    vTicksContainer.style.marginBottom = '10px';
    
    // 调整A值滑动条对齐
    const aSliderWidth = elements.aSlider.offsetWidth;
    const aRadios = document.querySelectorAll('input[name="a-standard"]');
    const aStep = aSliderWidth / (aRadios.length - 1);
    
    // 为A滑动条添加标记点
    const aSliderContainer = elements.aSlider.parentElement;
    const aTicksContainer = document.createElement('div');
    aTicksContainer.className = 'slider-ticks';
    aTicksContainer.style.width = '100%';
    aTicksContainer.style.position = 'relative';
    aTicksContainer.style.height = '5px';
    aTicksContainer.style.marginTop = '-15px';
    aTicksContainer.style.marginBottom = '10px';
    
    // 添加窗口大小变化时的重新调整
    window.addEventListener('resize', setupSliderAlignment);
}

// 检查V值是否恰好匹配某个标准值
export function checkExactVMatch(value) {
    // 由于浮点数精度问题，使用一个极小的容差值
    const epsilon = 0.001;
    if (Math.abs(value - (-2)) < epsilon) {
        document.getElementById('v-m2').checked = true;
    } else if (Math.abs(value - (-1)) < epsilon) {
        document.getElementById('v-m1').checked = true;
    } else if (Math.abs(value - 0) < epsilon) {
        document.getElementById('v-0').checked = true;
    } else if (Math.abs(value - 1) < epsilon) {
        document.getElementById('v-p1').checked = true;
    } else if (Math.abs(value - 2) < epsilon) {
        document.getElementById('v-p2').checked = true;
    }
}

// 检查A值是否恰好匹配某个标准值
export function checkExactAMatch(value) {
    // 由于浮点数精度问题，使用一个极小的容差值
    const epsilon = 0.001;
    if (Math.abs(value - 1) < epsilon) {
        document.getElementById('a-1').checked = true;
    } else if (Math.abs(value - 2) < epsilon) {
        document.getElementById('a-2').checked = true;
    } else if (Math.abs(value - 3) < epsilon) {
        document.getElementById('a-3').checked = true;
    } else if (Math.abs(value - 4) < epsilon) {
        document.getElementById('a-4').checked = true;
    } else if (Math.abs(value - 5) < epsilon) {
        document.getElementById('a-5').checked = true;
    }
}
