// 应急初始化函数 - 当模块化加载失败时使用

function initAppFallback() {
    console.log("使用应急初始化方法");
    
    // 获取DOM元素
    const speakerSelect = document.getElementById('speaker-select');
    const audioListContainer = document.getElementById('audio-list-container');
    const audioPlayer = document.getElementById('audio-player');
    const loopCheckbox = document.getElementById('loop-checkbox');
    const vSlider = document.getElementById('v-slider');
    const aSlider = document.getElementById('a-slider');
    const vValue = document.getElementById('v-value');
    const aValue = document.getElementById('a-value');
    const saveButton = document.getElementById('save-button');
    const nextButton = document.getElementById('next-button');
    const prevButton = document.getElementById('prev-button');
    const continueButton = document.getElementById('continue-button');
    const backButton = document.getElementById('back-button');
    const vaLabeling = document.getElementById('va-labeling');
    const discreteLabeling = document.getElementById('discrete-labeling');
    
    // 获取标准值单选按钮
    const vStandardRadios = document.querySelectorAll('input[name="v-standard"]');
    const aStandardRadios = document.querySelectorAll('input[name="a-standard"]');
    
    // 获取离散情感选项
    const discreteEmotionRadios = document.querySelectorAll('input[name="discrete-emotion"]');
    
    // 标准值到滑动条值的映射
    const vStandardToSliderMap = {
        '-2': -2, '-1': -1, '0': 0, '1': 1, '2': 2
    };
    
    const aStandardToSliderMap = {
        '1': 1, '2': 2, '3': 3, '4': 4, '5': 5
    };
    
    // 状态变量
    let currentSpeaker = '';
    let audioList = [];
    let currentAudioIndex = -1;
    let isModified = false;
    let isVaLabelingMode = true;
    let selectedDiscreteEmotion = null;
    
    // 初始化说话人列表
    initSpeakers();
    
    // 设置事件监听器
    speakerSelect.addEventListener('change', handleSpeakerChange);
    loopCheckbox.addEventListener('change', () => { audioPlayer.loop = loopCheckbox.checked; });
    vSlider.addEventListener('input', handleSliderChange);
    aSlider.addEventListener('input', handleSliderChange);
    saveButton.addEventListener('click', handleSave);
    nextButton.addEventListener('click', handleNext);
    prevButton.addEventListener('click', handlePrev);
    continueButton.addEventListener('click', handleContinue);
    backButton.addEventListener('click', handleBack);
    
    // 设置V和A滑动条标准值radio事件
    setupStandardRadioListeners();
    
    // 设置离散情感选项事件
    setupDiscreteEmotionListeners();
    
    // 设置键盘快捷键
    setupKeyboardShortcuts();
    
    // 函数定义...（此处展开原main.js中的所有函数）
    
    // 初始化说话人下拉列表
    function initSpeakers() {
        fetch('/api/speakers')
            .then(response => response.json())
            .then(speakers => {
                speakerSelect.innerHTML = '<option value="">-- 请选择 --</option>';
                speakers.forEach(speaker => {
                    const option = document.createElement('option');
                    option.value = speaker;
                    option.textContent = speaker;
                    speakerSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('获取说话人列表失败:', error);
                alert('获取说话人列表失败，请刷新页面重试');
            });
    }
    
    // 其他函数实现，与main.js保持一致
}

// 检测模块加载是否失败，如果失败则使用应急初始化
window.addEventListener('error', function(event) {
    if (event.filename && event.filename.includes('/static/js/app.js')) {
        console.error('模块加载失败，启用应急初始化');
        document.addEventListener('DOMContentLoaded', initAppFallback);
    }
}, true);

// 如果一段时间后app.js未能正确初始化，启用应急方案
setTimeout(function() {
    if (!window.appInitialized) {
        console.warn('应用在5秒内未能正确初始化，启用应急方案');
        initAppFallback();
    }
}, 5000);
