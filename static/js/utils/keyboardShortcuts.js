import { elements } from './domElements.js';
import { toggleAudioPlayPause } from './audioControl.js';

export function setupKeyboardShortcuts() {
    // 添加键盘快捷键
    document.addEventListener('keydown', function(event) {
        // 只有在未输入状态下才触发快捷键
        if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
            switch(event.key.toUpperCase()) {
                case 'Q':
                    // 继续/返回按钮
                    if (elements.continueButton.style.display !== 'none' && 
                        !elements.continueButton.disabled) {
                        elements.continueButton.click();
                    } else if (elements.backButton.style.display !== 'none') {
                        elements.backButton.click();
                    }
                    break;
                case 'W':
                    // 保存按钮
                    if (!elements.saveButton.disabled) {
                        elements.saveButton.click();
                    }
                    break;
                case 'E':
                    // 修改：上一条按钮
                    if (!elements.prevButton.disabled) {
                        elements.prevButton.click();
                    }
                    break;
                case 'R':
                    // 修改：下一条按钮
                    if (!elements.nextButton.disabled) {
                        elements.nextButton.click();
                    }
                    break;
                case ' ': // 空格键
                    // 播放/暂停音频
                    event.preventDefault(); // 防止页面滚动
                    toggleAudioPlayPause();
                    break;
            }
        }
    });
}
