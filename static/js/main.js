document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const speakerSelect = document.getElementById('speaker-select');
    const audioListContainer = document.getElementById('audio-list-container');
    const audioPlayer = document.getElementById('audio-player');
    const loopCheckbox = document.getElementById('loop-checkbox');
    const neutralCheckbox = document.getElementById('neutral-checkbox');
    const vSlider = document.getElementById('v-slider');
    const aSlider = document.getElementById('a-slider');
    const vValue = document.getElementById('v-value');
    const aValue = document.getElementById('a-value');
    const saveButton = document.getElementById('save-button');
    const nextButton = document.getElementById('next-button');
    const continueButton = document.getElementById('continue-button');
    const backButton = document.getElementById('back-button');
    const vaLabeling = document.getElementById('va-labeling');
    const discreteLabeling = document.getElementById('discrete-labeling');
    
    // 获取V和A的标准值单选按钮
    const vStandardRadios = document.querySelectorAll('input[name="v-standard"]');
    const aStandardRadios = document.querySelectorAll('input[name="a-standard"]');
    
    // 获取离散情感选项
    const discreteEmotionRadios = document.querySelectorAll('input[name="discrete-emotion"]');
    
    // 标准值到滑动条值的映射
    const standardToSliderMap = {
        '-2': -80,
        '-1': -40,
        '0': 0,
        '1': 40,
        '2': 80
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
    
    // 事件监听器
    speakerSelect.addEventListener('change', handleSpeakerChange);
    loopCheckbox.addEventListener('change', handleLoopChange);
    neutralCheckbox.addEventListener('change', handleNeutralChange);
    vSlider.addEventListener('input', handleSliderChange);
    aSlider.addEventListener('input', handleSliderChange);
    saveButton.addEventListener('click', handleSave);
    nextButton.addEventListener('click', handleNext);
    continueButton.addEventListener('click', handleContinue);
    backButton.addEventListener('click', handleBack);
    
    // 标准值单选按钮的事件监听
    vStandardRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const value = standardToSliderMap[this.value];
            vSlider.value = value;
            vValue.textContent = value;
            if (value !== 0) {
                neutralCheckbox.checked = false;
            } else if (aSlider.value === '0') {
                neutralCheckbox.checked = true;
            }
            isModified = true;
        });
    });
    
    aStandardRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const value = standardToSliderMap[this.value];
            aSlider.value = value;
            aValue.textContent = value;
            if (value !== 0) {
                neutralCheckbox.checked = false;
            } else if (vSlider.value === '0') {
                neutralCheckbox.checked = true;
            }
            isModified = true;
        });
    });
    
    // 离散情感选项的事件监听
    discreteEmotionRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            selectedDiscreteEmotion = this.value;
            isModified = true;
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
        
        // 重置标注并设置为VA模式
        resetLabeling();
        switchToVaMode();
        isModified = false;
    }
    
    // 处理循环播放变化
    function handleLoopChange() {
        audioPlayer.loop = loopCheckbox.checked;
    }
    
    // 处理"平静"复选框变化
    function handleNeutralChange() {
        if (neutralCheckbox.checked) {
            vSlider.value = 0;
            aSlider.value = 0;
            vValue.textContent = '0';
            aValue.textContent = '0';
            // 重置标准值单选按钮
            document.getElementById('v-0').checked = true;
            document.getElementById('a-0').checked = true;
        }
        isModified = true;
    }
    
    // 处理滑动条变化
    function handleSliderChange(event) {
        const slider = event.target;
        const valueElement = slider.id === 'v-slider' ? vValue : aValue;
        valueElement.textContent = slider.value;
        
        // 根据滑动条值选择最接近的标准值单选按钮
        if (slider.id === 'v-slider') {
            updateStandardRadio(vStandardRadios, slider.value);
        } else {
            updateStandardRadio(aStandardRadios, slider.value);
        }
        
        // 如果滑动条不是0，取消"平静"复选框
        if (slider.value !== '0') {
            neutralCheckbox.checked = false;
        } else if (vSlider.value === '0' && aSlider.value === '0') {
            neutralCheckbox.checked = true;
        }
        
        isModified = true;
    }
    
    // 更新标准值单选按钮选择
    function updateStandardRadio(radios, sliderValue) {
        const value = parseInt(sliderValue);
        let closestRadio = null;
        let minDiff = Infinity;
        
        // 查找最接近的标准值
        for (const radio of radios) {
            const standardValue = standardToSliderMap[radio.value];
            const diff = Math.abs(value - standardValue);
            if (diff < minDiff) {
                minDiff = diff;
                closestRadio = radio;
            }
        }
        
        if (closestRadio) {
            closestRadio.checked = true;
        }
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
            v_value: parseInt(vSlider.value),
            a_value: parseInt(aSlider.value),
            is_neutral: neutralCheckbox.checked,
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
    
    // 重置播放器
    function resetPlayer() {
        audioPlayer.src = '';
        currentAudioIndex = -1;
        continueButton.disabled = true;
        saveButton.disabled = true;
        nextButton.disabled = true;
    }
    
    // 重置标注
    function resetLabeling() {
        // 重置VA标注
        vSlider.value = 0;
        aSlider.value = 0;
        vValue.textContent = '0';
        aValue.textContent = '0';
        neutralCheckbox.checked = true;
        
        // 重置标准值单选按钮
        document.getElementById('v-0').checked = true;
        document.getElementById('a-0').checked = true;
        
        // 重置离散情感选择
        discreteEmotionRadios.forEach(radio => {
            radio.checked = false;
        });
        selectedDiscreteEmotion = null;
    }
});