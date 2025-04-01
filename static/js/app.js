import { initUI } from './ui/uiManager.js';
import { setupEventListeners } from './core/eventHandlers.js';
import { setupKeyboardShortcuts } from './utils/keyboardShortcuts.js';
import './utils/audioControl.js'; // 导入音频控制模块

// 全局异常处理
window.addEventListener('error', function(event) {
    console.error('应用错误:', event.message, event);
    const errorInfo = `发生错误: ${event.message} (${event.filename}:${event.lineno})`;
    alert(`应用加载出错: ${errorInfo}。请刷新页面或联系管理员。`);
});

// 声明一个全局变量，表示应用已初始化
window.appInitialized = false;

// 应用初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM 已加载，正在初始化应用...");
    
    try {
        // 初始化UI组件
        initUI();
        
        // 设置事件监听器
        setupEventListeners();
        
        // 设置键盘快捷键
        setupKeyboardShortcuts();
        
        // 标记应用初始化完成
        window.appInitialized = true;
        
        console.log("应用初始化完成");
    } catch (error) {
        console.error("应用初始化失败:", error);
        alert(`应用初始化失败: ${error.message}\n请刷新页面或联系管理员。`);
    }
});

// 导入 fallbackInit.js 作为应急初始化方案
import './core/fallbackInit.js';
