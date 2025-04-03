import { initUI } from './ui/uiManager.js';
import { setupEventListeners } from './core/eventHandlers.js';
import { setupKeyboardShortcuts } from './utils/keyboardShortcuts.js';
import './utils/audioControl.js'; // 导入音频控制模块

// 全局异常处理
window.addEventListener('error', function(event) {
    console.error('应用错误:', event.message, event);
    console.error('错误文件:', event.filename);
    console.error('错误行号:', event.lineno);
    console.error('错误列号:', event.colno);
    console.error('错误对象:', event.error);
    
    // 显示更详细的错误信息
    let errorInfo = `发生错误: ${event.message} (${event.filename}:${event.lineno})`;
    document.body.innerHTML += `<div style="color:red;padding:20px;background:#f8d7da;margin:20px;border-radius:5px">
        <h3>应用加载错误</h3>
        <p>${errorInfo}</p>
        <p>请检查控制台获取详细信息并刷新页面</p>
    </div>`;
});

// 应用初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM 已加载，正在初始化应用...");
    
    try {
        // 逐步初始化，便于定位问题
        console.log("步骤1: 初始化DOM元素...");
        const initModule = './utils/domElements.js';
        import(initModule)
            .then(module => {
                console.log("DOM元素模块加载成功");
                module.initElements();
                
                console.log("步骤2: 初始化UI组件...");
                return import('./ui/uiManager.js');
            })
            .then(module => {
                console.log("UI管理器加载成功");
                module.initUI();
                
                console.log("步骤3: 设置事件监听器...");
                return import('./core/eventHandlers.js');
            })
            .then(module => {
                console.log("事件处理模块加载成功");
                module.setupEventListeners();
                
                console.log("步骤4: 设置键盘快捷键...");
                return import('./utils/keyboardShortcuts.js');
            })
            .then(module => {
                console.log("键盘快捷键模块加载成功");
                module.setupKeyboardShortcuts();
                
                // 标记应用初始化完成
                window.appInitialized = true;
                console.log("应用初始化完成");
            })
            .catch(error => {
                console.error("模块加载失败:", error);
                console.error("错误堆栈:", error.stack);
                alert(`模块加载失败: ${error.message}\n请检查控制台获取详细信息`);
                
                // 尝试进入应急模式
                console.log("尝试应急初始化...");
                import('./core/fallbackInit.js')
                    .then(() => console.log("应急初始化模块已加载"))
                    .catch(e => console.error("应急初始化失败:", e));
            });
    } catch (error) {
        console.error("应用初始化过程中出现异常:", error);
        console.error("错误堆栈:", error.stack);
        alert(`应用初始化失败: ${error.message}\n请检查控制台获取详细信息`);
    }
});
