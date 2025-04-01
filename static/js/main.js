document.addEventListener('DOMContentLoaded', function() {
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
    
    // 获取V和A的标准值单选按钮
    const vStandardRadios = document.querySelectorAll('input[name="v-standard"]');
    const aStandardRadios = document.querySelectorAll('input[name="a-standard"]');
    
    // 获取离散情感选项
    const discreteEmotionRadios = document.querySelectorAll('input[name="discrete-emotion"]');
    
    // 标准值到滑动条值的直接映射
    const vStandardToSliderMap = {
        '-2': -2,  // 直接使用标准值
        '-1': -1,
        '0': 0,
        '1': 1,
        '2': 2
    };
    
    const aStandardToSliderMap = {
        '1': 1,  // 直接使用标准值
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5
    };
    
    // 状态变量
    let currentSpeaker = '';
    let audioList = [];
    let currentAudioIndex = -1;
    let isModified = false;
    let isVaLabelingMode = true; // 当前是否处于VA标注模式
    let selectedDiscreteEmotion = null;
    
    // 初始化
    initSpeakers();
    setupSliderAlignment();
    setupKeyboardControls(); // 添加键盘控制初始化
    
    // 事件监听器
    speakerSelect.addEventListener('change', handleSpeakerChange);
    loopCheckbox.addEventListener('change', handleLoopChange);
    vSlider.addEventListener('input', handleSliderChange);
    aSlider.addEventListener('input', handleSliderChange);
    saveButton.addEventListener('click', handleSave);
    nextButton.addEventListener('click', handleNext);
    prevButton.addEventListener('click', handlePrev);
    continueButton.addEventListener('click', handleContinue);
    backButton.addEventListener('click', handleBack);
    
    // 标准值单选按钮的事件监听 - V值
    vStandardRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const value = this.value;
            const sliderValue = vStandardToSliderMap[value];
            
            // 设置滑动条值
            vSlider.value = sliderValue;
            vValue.textContent = sliderValue;
            
            // 清除其他选中状态并选中当前按钮
            vStandardRadios.forEach(r => r.checked = false);
            this.checked = true;
            
            isModified = true;
            
            // 选择后立即失去焦点
            this.blur();
        });
    });
    
    // 标准值单选按钮的事件监听 - A值
    aStandardRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const value = this.value;
            const sliderValue = aStandardToSliderMap[value];
            
            // 设置滑动条值
            aSlider.value = sliderValue;
            aValue.textContent = sliderValue;
            
            // 清除其他选中状态并选中当前按钮
            aStandardRadios.forEach(r => r.checked = false);
            this.checked = true;
            
            isModified = true;
            
            // 选择后立即失去焦点
            this.blur();
        });
    });
    
    // 离散情感选项的事件监听
    discreteEmotionRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            selectedDiscreteEmotion = this.value;
            isModified = true;
            
            // 选择后立即失去焦点
            this.blur();
        });
    });
    
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
    
    // 处理说话人选择变化
    function handleSpeakerChange() {
        currentSpeaker = speakerSelect.value;
        if (currentSpeaker) {
            loadAudioList(currentSpeaker);
        } else {
            audioListContainer.innerHTML = '<p>请先选择说话人</p>';
            resetPlayer();
            resetLabeling();
        }
    }
    
    // 加载音频列表
    function loadAudioList(speaker) {
        fetch(`/api/audio_list/${speaker}`)
            .then(response => response.json())
            .then(data => {
                audioList = data;
                renderAudioList();
            })
            .catch(error => {
                console.error('获取音频列表失败:', error);
                alert('获取音频列表失败，请重试');
                audioListContainer.innerHTML = '<p>加载失败，请重试</p>';
            });
    }
    
    // 渲染音频列表
    function renderAudioList() {
        if (audioList.length === 0) {
            audioListContainer.innerHTML = '<p>没有可用的音频文件</p>';
            return;
        }
        
        audioListContainer.innerHTML = '';
        audioList.forEach((audio, index) => {
            const audioItem = document.createElement('div');
            audioItem.className = 'audio-item';
            if (audio.labeled) {
                audioItem.classList.add('labeled');
            }
            if (index === currentAudioIndex) {
                audioItem.classList.add('active');
            }
            
            audioItem.textContent = audio.file_name;
            audioItem.dataset.index = index;
            
            audioItem.addEventListener('click', () => {
                if (isModified && currentAudioIndex !== -1) {
                    if (confirm('当前标注未保存，是否继续？')) {
                        selectAudio(index);
                    }
                } else {
                    selectAudio(index);
                }
            });
            
            audioListContainer.appendChild(audioItem);
        });
    }
    
    // 选择音频
    function selectAudio(index) {
        // 更新UI
        const previousActive = document.querySelector('.audio-item.active');
        if (previousActive) {
            previousActive.classList.remove('active');
        }
        
        const newActive = document.querySelector(`.audio-item[data-index="${index}"]`);
        if (newActive) {
            newActive.classList.add('active');
            newActive.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        currentAudioIndex = index;
        const audioFile = audioList[index];
        
        // 设置音频播放器
        audioPlayer.src = audioFile.path;
        audioPlayer.load();
        audioPlayer.play();
        
        // 启用按钮
        continueButton.disabled = false;
        saveButton.disabled = !isVaLabelingMode; // 只有在离散模式时才启用保存按钮
        nextButton.disabled = index >= audioList.length - 1;
        prevButton.disabled = index <= 0; // 禁用"上一条"按钮，如果当前是第一条
        
        // 重置标注并设置为VA模式
        resetLabeling();
        switchToVaMode();
        isModified = false;
    }
    
    // 处理循环播放变化
    function handleLoopChange() {
        audioPlayer.loop = loopCheckbox.checked;
    }
    
    // 处理滑动条变化
    function handleSliderChange(event) {
        const slider = event.target;
        const valueElement = slider.id === 'v-slider' ? vValue : aValue;
        
        // 显示当前值，保留两位小数
        const currentValue = parseFloat(slider.value);
        valueElement.textContent = currentValue.toFixed(2);
        
        // 当滑动条值变化时，先清除所有单选按钮的选中状态
        const radios = slider.id === 'v-slider' ? vStandardRadios : aStandardRadios;
        radios.forEach(radio => {
            radio.checked = false;
        });
        
        // 仅当滑动条值恰好等于某个标准值时，才选中对应单选按钮
        if (slider.id === 'v-slider') {
            checkExactVMatch(currentValue);
        } else {
            checkExactAMatch(currentValue);
        }
        
        isModified = true;
        
        // 添加mouseup事件处理，使滑动条在拖动结束后失去焦点
        slider.addEventListener('mouseup', function() {
            slider.blur();
        }, { once: true });
    }
    
    // 检查V值是否恰好匹配某个标准值
    function checkExactVMatch(value) {
        // 由于精度问题，使用一个小的容差值
        const epsilon = 0.1;
        
        // 检查每个标准值，只有完全匹配才选中
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
    function checkExactAMatch(value) {
        // 由于精度问题，使用一个小的容差值
        const epsilon = 0.1;
        
        // 检查每个标准值，只有完全匹配才选中
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
    
    // 滑动条结束拖动后的事件处理 - 不再吸附到标准值
    vSlider.addEventListener('change', function() {
        // 只检查是否恰好等于标准值，不做吸附
        checkExactVMatch(parseFloat(this.value));
    });
    
    aSlider.addEventListener('change', function() {
        // 只检查是否恰好等于标准值，不做吸附
        checkExactAMatch(parseFloat(this.value));
    });
    
    // 移除滑动条改变完成事件的吸附行为，使其完全独立
    vSlider.addEventListener('change', function() {
        // 不吸附，仅检查是否恰好等于标准值
        checkExactVMatch(parseFloat(this.value));
    });
    
    aSlider.addEventListener('change', function() {
        // 不吸附，仅检查是否恰好等于标准值
        checkExactAMatch(parseFloat(this.value));
    });
    
    // 不再使用 snapToStandardValue 函数，确保滑动条不会自动吸附
    
    // 更新V值标准值单选按钮选择 - 不再使用，由新的checkExactVMatch替代
    function updateVStandardRadio(radios, sliderValue) {
        // 此函数不再需要，保留为空以避免错误
    }
    
    // 更新A值标准值单选按钮选择 - 不再使用，由新的checkExactAMatch替代
    function updateAStandardRadio(radios, sliderValue) {
        // 此函数不再需要，保留为空以避免错误
    }
    
    // 处理"继续"按钮点击，从VA标注切换到离散标注
    function handleContinue() {
        if (currentAudioIndex === -1) return;
        
        // 如果VA标注已修改但未保存，提示用户
        if (isModified && isVaLabelingMode) {
            // 切换到离散情感标注模式
            switchToDiscreteMode();
        } else {
            // 直接切换到离散情感标注模式
            switchToDiscreteMode();
        }
    }
    
    // 处理"返回"按钮点击，从离散标注返回到VA标注
    function handleBack() {
        if (isModified && !isVaLabelingMode) {
            if (confirm('离散情感标注未保存，是否返回VA标注？')) {
                switchToVaMode();
            }
        } else {
            switchToVaMode();
        }
    }
    
    // 切换到VA标注模式
    function switchToVaMode() {
        isVaLabelingMode = true;
        vaLabeling.style.display = 'block';
        discreteLabeling.style.display = 'none';
        continueButton.style.display = 'inline-block';
        backButton.style.display = 'none';
        saveButton.disabled = true;
    }
    
    // 切换到离散情感标注模式
    function switchToDiscreteMode() {
        isVaLabelingMode = false;
        vaLabeling.style.display = 'none';
        discreteLabeling.style.display = 'block';
        continueButton.style.display = 'none';
        backButton.style.display = 'inline-block';
        saveButton.disabled = false;
        isModified = false;
    }
    
    // 保存标注
    function handleSave() {
        if (currentAudioIndex === -1) return;
        
        const audioFile = audioList[currentAudioIndex];
        const labelData = {
            speaker: currentSpeaker,
            audio_file: audioFile.file_name,
            v_value: parseFloat(vSlider.value).toFixed(2),
            a_value: parseFloat(aSlider.value).toFixed(2),
            discrete_emotion: selectedDiscreteEmotion
        };
        
        saveButton.disabled = true;
        saveButton.textContent = '保存中...';
        
        fetch('/api/save_label', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(labelData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                audioList[currentAudioIndex].labeled = true;
                renderAudioList();
                isModified = false;
                saveButton.textContent = '已保存';
                setTimeout(() => {
                    saveButton.textContent = '保存';
                    saveButton.disabled = false;
                }, 1000);
            } else {
                throw new Error(data.error || '保存失败');
            }
        })
        .catch(error => {
            console.error('保存标注失败:', error);
            alert('保存标注失败，请重试');
            saveButton.textContent = '保存';
            saveButton.disabled = false;
        });
    }
    
    // 处理下一条
    function handleNext() {
        if (currentAudioIndex >= audioList.length - 1) return;
        
        if (isModified) {
            if (confirm('当前标注未保存，是否继续？')) {
                selectAudio(currentAudioIndex + 1);
            }
        } else {
            selectAudio(currentAudioIndex + 1);
        }
    }
    
    // 处理上一条
    function handlePrev() {
        if (currentAudioIndex <= 0) return;
        
        if (isModified) {
            if (confirm('当前标注未保存，是否继续？')) {
                selectAudio(currentAudioIndex - 1);
            }
        } else {
            selectAudio(currentAudioIndex - 1);
        }
    }
    
    // 重置播放器
    function resetPlayer() {
        audioPlayer.src = '';
        currentAudioIndex = -1;
        continueButton.disabled = true;
        saveButton.disabled = true;
        nextButton.disabled = true;
        prevButton.disabled = true; // 同时禁用上一条按钮
    }
    
    // 重置标注
    function resetLabeling() {
        // 重置VA标注
        vSlider.value = 0;
        aSlider.value = 3;  // A值的中间值是3
        vValue.textContent = '0.00';
        aValue.textContent = '3.00';
        
        // 重置标准值单选按钮
        vStandardRadios.forEach(radio => radio.checked = false);
        aStandardRadios.forEach(radio => radio.checked = false);
        document.getElementById('v-0').checked = true;
        document.getElementById('a-3').checked = true;
        
        // 重置离散情感选择
        discreteEmotionRadios.forEach(radio => {
            radio.checked = false;
        });
        selectedDiscreteEmotion = null;
    }
    
    // 设置滑动条与标准值单选按钮的对齐
    function setupSliderAlignment() {
        // 调整V值滑动条对齐
        const vSliderWidth = vSlider.offsetWidth;
        const vRadios = document.querySelectorAll('input[name="v-standard"]');
        const vStep = vSliderWidth / (vRadios.length - 1);
        
        // 为V滑动条添加标记点
        const vSliderContainer = vSlider.parentElement;
        const vTicksContainer = document.createElement('div');
        vTicksContainer.className = 'slider-ticks';
        vTicksContainer.style.width = '100%';
        vTicksContainer.style.position = 'relative';
        vTicksContainer.style.height = '5px';
        vTicksContainer.style.marginTop = '-15px';
        vTicksContainer.style.marginBottom = '10px';
        
        // 调整A值滑动条对齐
        const aSliderWidth = aSlider.offsetWidth;
        const aRadios = document.querySelectorAll('input[name="a-standard"]');
        const aStep = aSliderWidth / (aRadios.length - 1);
        
        // 为A滑动条添加标记点
        const aSliderContainer = aSlider.parentElement;
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
    
    // 添加键盘控制功能
    function setupKeyboardControls() {
        document.addEventListener('keydown', function(event) {
            // 获取当前焦点元素的tagName和type
            const activeElement = document.activeElement;
            const isInputFocused = activeElement.tagName === 'INPUT' &&
                                  !['radio', 'checkbox', 'range'].includes(activeElement.type);
            const isTextAreaFocused = activeElement.tagName === 'TEXTAREA';
            const isSelectFocused = activeElement.tagName === 'SELECT';
            
            // 如果是文本输入框、文本区域或下拉菜单，不执行快捷键
            if (isInputFocused || isTextAreaFocused || isSelectFocused) {
                return;
            }
            
            // 如果按下空格键
            if (event.code === 'Space') {
                // 阻止默认行为（如滚动页面）
                event.preventDefault();
                
                // 如果音频已加载，切换播放/暂停状态
                if (audioPlayer.src) {
                    if (audioPlayer.paused) {
                        audioPlayer.play();
                    } else {
                        audioPlayer.pause();
                    }
                }
            }
            
            // Q键 - 继续/返回按钮
            if (event.code === 'KeyQ') {
                event.preventDefault();
                if (isVaLabelingMode && !continueButton.disabled) {
                    continueButton.click();
                } else if (!isVaLabelingMode && backButton.style.display !== 'none') {
                    backButton.click();
                }
            }
            
            // W键 - 保存按钮
            if (event.code === 'KeyW') {
                event.preventDefault();
                if (!saveButton.disabled) {
                    saveButton.click();
                }
            }
            
            // E键 - 上一条按钮
            if (event.code === 'KeyE') {
                event.preventDefault();
                if (!prevButton.disabled) {
                    prevButton.click();
                }
            }
            
            // R键 - 下一条按钮
            if (event.code === 'KeyR') {
                event.preventDefault();
                if (!nextButton.disabled) {
                    nextButton.click();
                }
            }
        });
        
        // 为按钮添加点击处理，确保点击时所有控件失去焦点
        [continueButton, backButton, saveButton, prevButton, nextButton].forEach(button => {
            button.addEventListener('click', function() {
                // 强制移除所有可能的焦点
                document.activeElement.blur();
            });
        });
    }
});