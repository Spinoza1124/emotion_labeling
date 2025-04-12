document.addEventListener('DOMContentLoaded', function() {
    // 登陆相关元素
    const loginModal = document.getElementById('login-modal');
    const usernameInput = document.getElementById('username');
    const loginButton = document.getElementById('login-button');
    const mainContainer = document.getElementById('main-container');
    const currentUserSpan = document.getElementById('current-user');
    const logoutButton = document.getElementById('logout-button'); // 添加退出按钮引用
    const neutralType = document.getElementById('neutral-type');
    const nonNeutralType = document.getElementById('non-neutral-type');
    const specificEmotions = document.getElementById('specific-emotions');

    // 用户名变量
    let currentUsername = '';
    let previousUsername = ''; // 添加变量记录之前的用户名
    let emotionType = 'neutral'; // 默认情感类型为中性

    // 优先检查登录状态
    checkLogin();

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
    const continueButton = document.getElementById('continue-button');
    const backButton = document.getElementById('back-button');
    const vaLabeling = document.getElementById('va-labeling');
    const discreteLabeling = document.getElementById('discrete-labeling');
    const prevButton = document.getElementById('prev-button');

    // 修改检查登录函数
    function checkLogin() {
        const savedUsername = localStorage.getItem('emotion_labeling_username');
        
        // 检查URL是否有强制登录参数
        const urlParams = new URLSearchParams(window.location.search);
        const forceLogin = !urlParams.has('keep_login'); // 除非有keep_login参数，否则都强制登录
        
        if (savedUsername && !forceLogin) {
            previousUsername = currentUsername; // 保存之前的用户名
            currentUsername = savedUsername;
            currentUserSpan.textContent = currentUsername;
            loginModal.style.display = 'none';
            mainContainer.style.display = 'block';
            
            // 初始化应用
            initSpeakers();
        } else {
            // 如果没有登录或需要强制登录，确保正确显示登录框
            loginModal.style.display = 'flex'; 
            mainContainer.style.display = 'none';
            
            // 给用户名输入框设置焦点
            setTimeout(() => {
                usernameInput.focus();
            }, 100);
        }
    }


    // 获取患者状态单选按钮
    const patientRadios = document.querySelectorAll('input[name="patient-status"]');

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
    let patientStatus = 'patient'; // 默认为患者
    
    // 初始化
    // initSpeakers();
    
    // 事件监听器
    speakerSelect.addEventListener('change', handleSpeakerChange);
    loopCheckbox.addEventListener('change', handleLoopChange);
    vSlider.addEventListener('input', handleSliderChange);
    aSlider.addEventListener('input', handleSliderChange);
    prevButton.addEventListener('click', handlePrevious);

    // 监听患者状态变化
    patientRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            patientStatus = this.value;
            isModified = true;
        });
    });

    // 初始化滑动条的默认值
    vSlider.min = -2;
    vSlider.max = 2;
    vSlider.step = 0.25;
    vSlider.value = 0;

    aSlider.min = 1;
    aSlider.max = 5;
    aSlider.step = 0.25;
    aSlider.value = 1;

    // 更新滑动条值显示
    vValue.textContent = Number(vSlider.value).toFixed(2);
    aValue.textContent = Number(aSlider.value).toFixed(2);

    saveButton.addEventListener('click', handleSave);
    nextButton.addEventListener('click', handleNext);
    continueButton.addEventListener('click', handleContinue);
    backButton.addEventListener('click', handleBack);
    
    // 离散情感选项的事件监听
    discreteEmotionRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            selectedDiscreteEmotion = this.value;
            isModified = true;
        });
    });
    
    // 添加键盘事件监听，用于快捷键操作
    document.addEventListener('keydown', function(event) {

        // 只有在真正需要输入的元素上时才禁用快捷键
        // 包括文本框、文本区域、下拉选择框以及有contentEditable属性的元素
        const isInputElement = 
        document.activeElement.tagName === 'INPUT' && 
        (document.activeElement.type === 'text' || 
         document.activeElement.type === 'password' || 
         document.activeElement.type === 'email' ||
         document.activeElement.type === 'search') ||
        document.activeElement.tagName === 'TEXTAREA' || 
        (document.activeElement.tagName === 'SELECT') ||
        document.activeElement.isContentEditable;

        if (!isInputElement) {
            // 空格控制播放/暂停
            if (event.code === 'Space') {
                event.preventDefault(); // 阻止默认行为（如页面滚动）
                togglePlayPause();
            }
            
            // E键 - 上一条
            if (event.key === 'e' || event.key === 'E') {
                event.preventDefault();
                if (!prevButton.disabled) {
                    handlePrevious();
                }
            }
            
            // R键 - 下一条
            if (event.key === 'r' || event.key === 'R') {
                event.preventDefault();
                if (!nextButton.disabled) {
                    handleNext();
                }
            }
            
            // W键 - 保存
            if (event.key === 'w' || event.key === 'W') {
                event.preventDefault();
                if (!saveButton.disabled) {
                    handleSave();
                }
            }
            
            // Q键 - 继续/返回
            if (event.key === 'q' || event.key === 'Q') {
                event.preventDefault();
                if (isVaLabelingMode && !continueButton.disabled) {
                    handleContinue();
                } else if (!isVaLabelingMode) {
                    handleBack();
                }
            }
        }
    });

    // 在各个操作后重置焦点到主容器
    function resetFocus() {
        // 将焦点设置到主容器，确保快捷键可用
        document.getElementById('main-container').focus();
    }
    
    // 处理退出登录
    logoutButton.addEventListener('click', function() {
        if(confirm('确定要退出登录吗？')) {
            localStorage.removeItem('emotion_labeling_username');
            loginModal.style.display = 'flex';
            mainContainer.style.display = 'none';
            currentUsername = '';
            resetPlayer();

            // 重置滚动位置
            window.scrollTo(0, 0);
        }
    });
    
    // 修改登录按钮点击处理函数
    loginButton.addEventListener('click', function() {
        const username = usernameInput.value.trim();
        if (username) {
            previousUsername = currentUsername; // 保存之前的用户名
            currentUsername = username;
            
            // 如果之前有登录过且用户名变了，则更新所有标签中的用户名
            if (previousUsername && previousUsername !== currentUsername) {
                updateUsernameInLabels(previousUsername, currentUsername);
            }
            
            localStorage.setItem('emotion_labeling_username', username);
            currentUserSpan.textContent = username;
            loginModal.style.display = 'none';
            mainContainer.style.display = 'block';
            
            // 初始化应用
            initSpeakers();
            
            // 如果已经选择了speaker，重新加载音频列表
            if (currentSpeaker) {
                loadAudioList(currentSpeaker);
            }
        } else {
            alert('请输入您的姓名！');
        }
    });
    
    // 修改 updateUsernameInLabels 函数，移动文件夹
    function updateUsernameInLabels(oldUsername, newUsername) {
        if (!oldUsername || !newUsername) return;
        
        fetch('/api/update_username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                old_username: oldUsername,
                new_username: newUsername
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log(`已移动 ${data.moved_files} 个文件到新用户目录`);
                
                // 如果当前有选择的speaker，则刷新音频列表
                if (currentSpeaker) {
                    loadAudioList(currentSpeaker);
                }
            } else {
                console.error('更新用户名失败:', data.error);
            }
        })
        .catch(error => {
            console.error('更新用户名请求失败:', error);
        });
    }
    
    // 键盘事件：回车键登录
    usernameInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            loginButton.click();
        }
    });

    // 添加播放/暂停控制函数
    function togglePlayPause() {
        if (audioPlayer.src) {
            if (audioPlayer.paused) {
                audioPlayer.play();
            } else {
                audioPlayer.pause();
            }
        }
    }

    // 初始化数值点
    generateSliderTicks('a-slider', 'a-slider-ticks', 1, 5, 0.25);
    generateSliderTicks('v-slider', 'v-slider-ticks', -2, 2, 0.25);

    // 生成滑动条数值点
    function generateSliderTicks(sliderId, ticksContainerId, min, max, step) {
        const ticksContainer = document.getElementById(ticksContainerId);
        const range = max - min;
        const steps = range / step;
        for (let i = 0; i <= steps; i++) {
            const value = (min + i * step).toFixed(2);
            const tick = document.createElement('span');
            tick.textContent = value;
            ticksContainer.appendChild(tick);
        }
    }
    
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
    
    // 修改 handleSpeakerChange 函数，确保用户已登录
    function handleSpeakerChange() {
        currentSpeaker = speakerSelect.value;
        if (currentSpeaker && currentUsername) {
            loadAudioList(currentSpeaker);
        } else {
            audioListContainer.innerHTML = '<p>请先选择说话人</p>';
            resetPlayer();
            resetLabeling();
        }
    }
    
    // 修改 loadAudioList 函数，添加用户名参数
    function loadAudioList(speaker) {
        fetch(`/api/audio_list/${speaker}?username=${encodeURIComponent(currentUsername)}`)
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

        // 更新按钮状态
        if (currentAudioIndex !== -1) {
            prevButton.disabled = currentAudioIndex <= 0;
            nextButton.disabled = currentAudioIndex >= audioList.length - 1;
        } else {
            prevButton.disabled = true;
            nextButton.disabled = true;
        }
    }
    
        // 为音频播放器添加专门的播放/暂停按钮（可选）
        function setupPlayerControls() {
            const playerControls = document.querySelector('.player-controls');
            
            // 如果播放控制区域已存在但没有播放/暂停按钮，则添加
            if (playerControls && !document.getElementById('play-pause-button')) {
                const playPauseButton = document.createElement('button');
                playPauseButton.id = 'play-pause-button';
                playPauseButton.className = 'play-button'; // 初始状态为播放按钮样式
                playPauseButton.textContent = '暂停 (空格)';
                playPauseButton.addEventListener('click', togglePlayPause);
                
                // 将按钮插入到循环控制前面
                playerControls.insertBefore(playPauseButton, playerControls.firstChild);
                
                // 监听音频播放状态变化，更新按钮文本
                audioPlayer.addEventListener('play', function() {
                    playPauseButton.textContent = '暂停 (空格)';
                    playPauseButton.className = 'pause-button';
                });
                
                audioPlayer.addEventListener('pause', function() {
                    playPauseButton.textContent = '播放 (空格)';
                    playPauseButton.className = 'play-button';
                });
            }
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

        // 音频加载完成后，可以获取时长
        audioPlayer.addEventListener('loadedmetadata', function() {
            const duration = audioPlayer.duration;
            console.log(`音频时长: ${duration.toFixed(2)}秒`);
        });
        
        
        // 启用按钮
        continueButton.disabled = false;
        saveButton.disabled = false; // 只有在VA模式时才启用保存按钮
        prevButton.disabled = index <= 0; // 如果是第一条，则禁用"上一条"按钮
        nextButton.disabled = index >= audioList.length - 1; // 如果是最后一条，则禁用"下一条"按钮
        
        // 重置标注并设置为VA模式
        resetLabeling();
        switchToVaMode();

        // 如果该音频有之前的标注数据，则加载显示
        if (audioFile.labeled) {
            console.log("加载已保存的标注数据...");
            loadSavedLabel(currentSpeaker, audioFile.file_name);
        } else {
            isModified = false;
        }
        
        resetFocus();
    }

       // 修改加载已保存标注数据的函数
       function loadSavedLabel(speaker, filename) {
        if (!currentUsername || !speaker || !filename) return;
        
        fetch(`/api/get_label/${encodeURIComponent(currentUsername)}/${encodeURIComponent(speaker)}/${encodeURIComponent(filename)}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data) {
                    const label = data.data;
                    
                    // 设置VA值
                    if (label.v_value !== undefined) {
                        vSlider.value = label.v_value;
                        vValue.textContent = Number(label.v_value).toFixed(2);
                    }
                    
                    if (label.a_value !== undefined) {
                        aSlider.value = label.a_value;
                        aValue.textContent = Number(label.a_value).toFixed(2);
                    }
                    
                    // 设置患者状态
                    if (label.patient_status) {
                        if (label.patient_status === 'patient') {
                            document.getElementById('is-patient').checked = true;
                            document.getElementById('not-patient').checked = false;
                            patientStatus = 'patient';
                        } else {
                            document.getElementById('is-patient').checked = false;
                            document.getElementById('not-patient').checked = true;
                            patientStatus = 'non-patient';
                        }
                    }
                    
                    // 设置情感类型和具体情感标签
                    if (label.emotion_type) {
                        emotionType = label.emotion_type;
                        if (emotionType === 'neutral') {
                            neutralType.checked = true;
                            nonNeutralType.checked = false;
                            specificEmotions.style.display = 'none';
                        } else if (emotionType === 'non-neutral') {
                            neutralType.checked = false;
                            nonNeutralType.checked = true;
                            specificEmotions.style.display = 'block';
                            
                            // 设置具体情感
                            if (label.discrete_emotion) {
                                selectedDiscreteEmotion = label.discrete_emotion;
                                const radioElement = document.getElementById(`emotion-${label.discrete_emotion}`);
                                if (radioElement) {
                                    radioElement.checked = true;
                                }
                            }
                        }
                    } else if (label.discrete_emotion) {
                        // 兼容旧数据
                        neutralType.checked = false;
                        nonNeutralType.checked = true;
                        emotionType = 'non-neutral';
                        specificEmotions.style.display = 'block';
                        
                        selectedDiscreteEmotion = label.discrete_emotion;
                        const radioElement = document.getElementById(`emotion-${label.discrete_emotion}`);
                        if (radioElement) {
                            radioElement.checked = true;
                        }
                    }
                    
                    console.log("已加载之前的标注数据");
                    isModified = false; // 重置修改标志
                }
            })
            .catch(error => {
                console.error('获取标注数据失败:', error);
            });
    }

    // 处理循环播放变化
    function handleLoopChange() {
        audioPlayer.loop = loopCheckbox.checked;
    }
    
    // 在 handleSliderChange 函数后添加启用保存按钮的逻辑
    function handleSliderChange(event) {
        const slider = event.target;
        const valueElement = slider.id === 'v-slider' ? vValue : aValue;
        valueElement.textContent = Number(slider.value).toFixed(2);
        
        isModified = true;
        saveButton.disabled = false; // 确保滑动条变化后保存按钮被启用
    }
    
    // 处理"继续"按钮点击，从VA标注切换到离散标注
    function handleContinue() {
        if (currentAudioIndex === -1) return;
        
        // 如果VA标注已修改但未保存，提示用户
        if (isModified && isVaLabelingMode) {
            if(confirm('VA标注已修改但未保存，是否继续？可以先点保存，再继续')) {
                switchToDiscreteMode();
            }
        } else {
            // 直接切换到离散情感标注模式
            switchToDiscreteMode();
        }
        
        // 重置焦点确保快捷键可用
        resetFocus();
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
        
        // 重置焦点确保快捷键可用
        resetFocus();
    }
    
    // 切换到VA标注模式
    function switchToVaMode() {
        isVaLabelingMode = true;
        vaLabeling.style.display = 'block';
        discreteLabeling.style.display = 'none';
        continueButton.style.display = 'inline-block';
        backButton.style.display = 'none';
        saveButton.disabled = false; // 在VA模式下启用保存按钮
    }
    
    // 切换到离散情感标注模式时的额外处理
    function switchToDiscreteMode() {
        isVaLabelingMode = false;
        vaLabeling.style.display = 'none';
        discreteLabeling.style.display = 'block';
        continueButton.style.display = 'none';
        backButton.style.display = 'inline-block';
        saveButton.disabled = false;
        
        // 根据情感类型控制界面显示
        if (emotionType === 'non-neutral' && !selectedDiscreteEmotion) {
            saveButton.disabled = true; // 如果是非中性但没选具体情感，禁用保存按钮
        }
        
        isModified = false;
    }
    
        // 监听情感类型变化
        document.querySelectorAll('input[name="emotion-type"]').forEach(radio => {
            radio.addEventListener('change', function() {
                emotionType = this.value;
                isModified = true;
                
                // 显示/隐藏具体情感选择区域
                if (emotionType === 'non-neutral') {
                    specificEmotions.style.display = 'block';
                    // 如果之前没有选择过具体情感，则需要选择
                    if (!selectedDiscreteEmotion) {
                        saveButton.disabled = true;
                    } else {
                        saveButton.disabled = false;
                    }
                } else {
                    specificEmotions.style.display = 'none';
                    selectedDiscreteEmotion = null;
                    // 中性情感可以直接保存
                    saveButton.disabled = false;
                    // 清除所有具体情感的选择
                    discreteEmotionRadios.forEach(radio => {
                        radio.checked = false;
                    });
                }
            });
        });
        
        // 监听具体情感选择变化
        discreteEmotionRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                selectedDiscreteEmotion = this.value;
                isModified = true;
                saveButton.disabled = false;
            });
        });

    // 保存标注
    function handleSave() {
        if (currentAudioIndex === -1) return;
        
        const audioFile = audioList[currentAudioIndex];
        const labelData = {
            speaker: currentSpeaker,
            audio_file: audioFile.file_name,
            v_value: parseFloat(vSlider.value),
            a_value: parseFloat(aSlider.value),
            emotion_type: emotionType,  // 添加情感类型字段
            discrete_emotion: emotionType === 'neutral' ? null : selectedDiscreteEmotion,
            username:currentUsername, // 添加用户名
            patient_status: patientStatus // 添加患者状态
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

            // 重置焦点确保快捷键可用
            resetFocus();
        })
        .catch(error => {
            console.error('保存标注失败:', error);
            alert('保存标注失败，请重试');
            saveButton.textContent = '保存';
            saveButton.disabled = false;
            // 即使出错也重置焦点
            resetFocus();
        });
    }

    // 处理"上一条"功能
    function handlePrevious() {
        if (currentAudioIndex <= 0) return; // 如果已经是第一条，不执行操作
        
        if (isModified) {
            if (confirm('当前标注未保存，是否继续？')) {
                selectAudio(currentAudioIndex - 1);
            }
        } else {
            selectAudio(currentAudioIndex - 1);
        }
        // 在函数末尾添加重置焦点
        resetFocus();
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

        // 在函数末尾添加重置焦点
        resetFocus();
    }
    
    // 重置播放器
    function resetPlayer() {
        audioPlayer.src = '';
        currentAudioIndex = -1;
        continueButton.disabled = true;
        saveButton.disabled = true;
        nextButton.disabled = true;
        prevButton.disabled = true;
    }
    
    // 修改重置标注函数
    function resetLabeling() {
        vSlider.value = 0;
        aSlider.value = 1;
        vValue.textContent = '0.00';
        aValue.textContent = '1.00';
        
        // 重置患者状态为默认值（患者）
        document.getElementById('is-patient').checked = true;
        document.getElementById('not-patient').checked = false;
        patientStatus = 'patient';
        
        // 重置情感类型为中性
        neutralType.checked = true;
        nonNeutralType.checked = false;
        emotionType = 'neutral';
        specificEmotions.style.display = 'none';
        
        // 重置离散情感选择
        discreteEmotionRadios.forEach(radio => {
            radio.checked = false;
        });
        selectedDiscreteEmotion = null;
    }
});