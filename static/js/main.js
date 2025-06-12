/**
 * 音频情感标注系统前端脚本
 * 主要功能:
 * 1. 用户登录/退出管理
 * 2. 音频列表加载与播放控制
 * 3. 情感标注功能 (VA值和离散情感)
 * 4. 标注结果保存与加载
 */

document.addEventListener('DOMContentLoaded', function() {

    //==============================================
    // 1. DOM元素获取与变量初始化
    //==============================================

    // 登陆相关元素
    const loginModal = document.getElementById('login-modal');
    const usernameInput = document.getElementById('username');
    const loginButton = document.getElementById('login-button');
    const mainContainer = document.getElementById('main-container');
    const currentUserSpan = document.getElementById('current-user');
    const logoutButton = document.getElementById('logout-button'); // 添加退出按钮引用


    // 说话人与音频列表元素
    const speakerSelect = document.getElementById('speaker-select');
    const audioListContainer = document.getElementById('audio-list-container');

    // 音乐播放器元素
    const audioPlayer = document.getElementById('audio-player');
    const loopCheckbox = document.getElementById('loop-checkbox');

    // VA值标注元素
    const vSlider = document.getElementById('v-slider');
    const aSlider = document.getElementById('a-slider');
    const vValue = document.getElementById('v-value');
    const aValue = document.getElementById('a-value');

    // 情感类型选择元素
    const neutralType = document.getElementById('neutral-type');
    const nonNeutralType = document.getElementById('non-neutral-type');
    const specificEmotions = document.getElementById('specific-emotions');

    // 获取患者状态单选按钮
    const patientRadios = document.querySelectorAll('input[name="patient-status"]');

    // 获取离散情感选项
    const discreteEmotionRadios = document.querySelectorAll('input[name="discrete-emotion"]');

    // 操作按钮元素
    const saveButton = document.getElementById('save-button');
    const nextButton = document.getElementById('next-button');
    const continueButton = document.getElementById('continue-button');
    const backButton = document.getElementById('back-button');
    const prevButton = document.getElementById('prev-button');

    // 标注模式区域元素
    const vaLabeling = document.getElementById('va-labeling');
    const discreteLabeling = document.getElementById('discrete-labeling');

    // 在DOM元素获取部分添加
    const playCountValue = document.getElementById('play-count-value');

    // 状态变量
    let currentUsername = '';    // 当前用户名
    let previousUsername = '';   // 添加变量记录之前的用户名
    let emotionType = 'neutral'; // 默认情感类型为中性
    let currentSpeaker = '';     // 当前选中的说话人
    let audioList = [];          // 音频列表数据
    let currentAudioIndex = -1;  // 当前选中音频的索引
    let isModified = false;      // 标注是否已修改但未保存
    let isVaLabelingMode = true; // 当前是否处于VA标注模式
    let selectedDiscreteEmotion = null;  // 选中的离散情感类型
    let patientStatus = 'patient'; // 默认为患者

    // 在文件开头的变量声明部分添加
    let currentPlayCount = 0; // 当前音频播放次数

    // 标准值到滑动条值的映射
    const standardToSliderMap = {
        '-2': -80,
        '-1': -40,
        '0': 0,
        '1': 40,
        '2': 80
    };

    //==============================================
    // 2. 用户登录与认证
    //==============================================
    
    /**
     * 检查用户登录状态
     * 从localStorage获取保存的用户名，决定显示登录框还是主界面
     */

    // 优先检查登录状态
    checkLogin();

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
            
            // 播放器控件将在选择音频时设置
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
    
    // 事件监听器
    speakerSelect.addEventListener('change', handleSpeakerChange);
    loopCheckbox.addEventListener('change', handleLoopChange);
    vSlider.addEventListener('input', handleSliderChange);
    aSlider.addEventListener('input', handleSliderChange);
    prevButton.addEventListener('click', handlePrevious);

    // 修改患者状态变化监听器
    patientRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            patientStatus = this.value;
            isModified = true;
            
            saveButton.textContent = '保存(W)';
            saveButton.disabled = false;
            saveButton.classList.remove('saved-va', 'saved-complete');
        });
    });

    // 初始化滑动条的默认值
    vSlider.min = -2;
    vSlider.max = 2;
    vSlider.step = 0.5;
    vSlider.value = 0;

    aSlider.min = 1;
    aSlider.max = 5;
    aSlider.step = 0.5;
    aSlider.value = 3;

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
    
    // 初始化说话人下拉列表
    function initSpeakers() {
        fetch(`/api/speakers?username=${encodeURIComponent(currentUsername)}`)
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
            
            // 根据标注完整性设置不同的样式类
            if (audio.labeled) {
                if (audio.annotation_completeness === 'va-only') {
                    audioItem.classList.add('labeled-va'); // 红色 - 仅VA标注
                } else if (audio.annotation_completeness === 'complete') {
                    audioItem.classList.add('labeled-complete'); // 绿色 - 完整标注
                } else {
                    audioItem.classList.add('labeled'); // 默认绿色（向后兼容）
                }
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
    console.log('setupPlayerControls called');

    // 修改 selectAudio 函数，确保加载新音频时正确设置按钮状态
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
        
        // 加载播放次数
        loadPlayCount(currentSpeaker, audioFile.file_name);
        
        // 设置音频播放器
        audioPlayer.src = audioFile.path;
        audioPlayer.load();
        
        // 移除之前的播放事件监听器，避免重复绑定
        audioPlayer.removeEventListener('play', handleAudioPlay);
        
        // 添加播放事件监听器来处理播放计数
        function handleAudioPlay() {
            console.log('Audio play event triggered, calling incrementPlayCount');
            incrementPlayCount();
        }
        
        audioPlayer.addEventListener('play', handleAudioPlay);
        
        audioPlayer.play();

        // 音频加载完成后，可以获取时长
        audioPlayer.addEventListener('loadedmetadata', function() {
            const duration = audioPlayer.duration;
            console.log(`音频时长: ${duration.toFixed(2)}秒`);
        });
        
        // 启用按钮
        continueButton.disabled = false;
        // 重置保存按钮状态
        saveButton.textContent = '保存(W)';
        saveButton.disabled = false;
        saveButton.classList.remove('saved-va', 'saved-complete');
        prevButton.disabled = index <= 0;
        nextButton.disabled = index >= audioList.length - 1;
        
        // 重置标注并设置为VA模式
        resetLabeling();
        switchToVaMode();

        // 如果该音频有之前的标注数据，则加载显示
        if (audioFile.labeled) {
            console.log("加载已保存的标注数据...");
            loadSavedLabel(currentSpeaker, audioFile.file_name);
        } else {
            isModified = false;
            // 对于新标注的音频，保持保存按钮为"保存"状态
            saveButton.textContent = '保存(W)';
            saveButton.disabled = false;
            saveButton.classList.remove('saved-va', 'saved-complete');
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

                    // 使用新的状态更新函数设置保存按钮
                    updateSaveButtonStatus(true);
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
    
    /**
     * 判断当前标注是否完整
     * @returns {string} 'none' - 无标注, 'va-only' - 仅VA标注, 'complete' - 完整标注
     */
    function getAnnotationCompleteness() {
        const hasVA = vSlider.value !== '0' || aSlider.value !== '0';
        const hasPatientStatus = patientStatus !== null;
        
        // 如果当前在VA标注模式，只考虑VA值
        if (isVaLabelingMode) {
            if (hasVA) {
                return 'va-only';
            } else {
                return 'none';
            }
        }
        
        // 如果在离散情感标注模式，考虑完整性
        const hasEmotionType = emotionType !== null;
        const hasDiscreteEmotion = emotionType === 'neutral' || (emotionType === 'non-neutral' && selectedDiscreteEmotion !== null);
        
        if (!hasVA && !hasPatientStatus && !hasEmotionType) {
            return 'none';
        }
        
        if (hasVA && hasPatientStatus && hasEmotionType && hasDiscreteEmotion) {
            return 'complete';
        }
        
        return 'va-only';
    }
    
    /**
     * 更新保存按钮的状态和样式
     * @param {boolean} isSaved - 是否已保存
     */
    function updateSaveButtonStatus(isSaved = false) {
        // 清除所有状态类
        saveButton.classList.remove('saved-va', 'saved-complete');
        
        if (isSaved) {
            const completeness = getAnnotationCompleteness();
            
            if (completeness === 'complete') {
                saveButton.textContent = '已保存(W)';
                saveButton.classList.add('saved-complete');
                saveButton.disabled = true;
            } else if (completeness === 'va-only') {
                saveButton.textContent = '已保存(W)';
                saveButton.classList.add('saved-va');
                saveButton.disabled = true;
            } else {
                saveButton.textContent = '保存(W)';
                saveButton.disabled = false;
            }
        } else {
            saveButton.textContent = '保存(W)';
            saveButton.disabled = false;
            saveButton.classList.remove('saved-va', 'saved-complete');
        }
    }
    
    // 修改 handleSliderChange 函数，更新保存按钮状态
    function handleSliderChange(event) {
        const slider = event.target;
        const valueElement = slider.id === 'v-slider' ? vValue : aValue;
        valueElement.textContent = Number(slider.value).toFixed(2);
        
        isModified = true;
        saveButton.textContent = '保存(W)';
        saveButton.disabled = false;
        saveButton.classList.remove('saved-va', 'saved-complete');
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
        saveButton.textContent = '保存(W)';
        saveButton.disabled = false;
        saveButton.classList.remove('saved-va', 'saved-complete'); // 在VA模式下启用保存按钮
    }
    
    // 切换到离散情感标注模式时的额外处理
    function switchToDiscreteMode() {
        isVaLabelingMode = false;
        vaLabeling.style.display = 'none';
        discreteLabeling.style.display = 'block';
        continueButton.style.display = 'none';
        backButton.style.display = 'inline-block';
        // 根据情感类型控制界面显示
        if (emotionType === 'non-neutral' && !selectedDiscreteEmotion) {
            saveButton.disabled = true; // 如果是非中性但没选具体情感，禁用保存按钮
        } else {
            saveButton.textContent = '保存(W)';
            saveButton.disabled = false;
            saveButton.classList.remove('saved-va', 'saved-complete');
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
                    saveButton.textContent = '保存(W)';
                    saveButton.disabled = false;
                    saveButton.classList.remove('saved-va', 'saved-complete');
                }
            } else {
                specificEmotions.style.display = 'none';
                selectedDiscreteEmotion = null;
                // 中性情感可以直接保存
                saveButton.textContent = '保存(W)';
                saveButton.disabled = false;
                saveButton.classList.remove('saved-va', 'saved-complete');
                // 清除所有具体情感的选择
                discreteEmotionRadios.forEach(radio => {
                    radio.checked = false;
                });
            }
        });
    });
        
    // 修改具体情感选择变化监听器
    discreteEmotionRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            selectedDiscreteEmotion = this.value;
            isModified = true;
            
            saveButton.textContent = '保存(W)';
            saveButton.disabled = false;
            saveButton.classList.remove('saved-va', 'saved-complete');
        });
    });

    // 修改保存标注函数
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
                // 根据当前标注的完整性设置状态
                const completeness = getAnnotationCompleteness();
                audioList[currentAudioIndex].annotation_completeness = completeness;
                renderAudioList();
                isModified = false;
                updateSaveButtonStatus(true); // 使用新的状态更新函数
                // 不再设置自动恢复为"保存"的定时器
            } else {
                throw new Error(data.error || '保存失败');
            }

            // 重置焦点确保快捷键可用
            resetFocus();
        })
        .catch(error => {
            console.error('保存标注失败:', error);
            alert('保存标注失败，请重试');
            saveButton.textContent = '保存(W)';
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
        aSlider.value = 3;
        vValue.textContent = '0.00';
        aValue.textContent = '3.00';
        
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

            // 重置播放计数显示
        currentPlayCount = 0;
        updatePlayCountDisplay();
    }

    // 添加播放计数相关函数
    //增加播放次数计数
    function incrementPlayCount() {
        if (currentAudioIndex === -1 || !currentUsername || !currentSpeaker) {
            console.log('播放计数条件不满足:', {
                currentAudioIndex,
                currentUsername,
                currentSpeaker
            });
            return;
        }
        
        const audioFile = audioList[currentAudioIndex];
        const requestData = {
            username: currentUsername,
            speaker: currentSpeaker,
            audio_file: audioFile.file_name
        };
        
        console.log('发送播放计数请求:', requestData);
        
        fetch('/api/save_play_count', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            console.log('播放计数响应状态:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('播放计数响应数据:', data);
            if (data.success) {
                currentPlayCount = data.play_count;
                updatePlayCountDisplay();
            } else {
                console.error('保存播放计数失败:', data.error || '未知错误');
            }
        })
        .catch(error => {
            console.error('保存播放计数请求失败:', error);
            console.error('错误详情:', {
                message: error.message,
                stack: error.stack
            });
        });
    }


    //更新播放次数
    function updatePlayCountDisplay() {
        if (playCountValue) {
            playCountValue.textContent = currentPlayCount;
        }
    }

    // 加载音频播放次数
    function loadPlayCount(speaker, filename) {
        if (!currentUsername || !speaker || !filename) {
            currentPlayCount = 0;
            updatePlayCountDisplay();
            return;
        }
        
        fetch(`/api/get_play_count/${encodeURIComponent(currentUsername)}/${encodeURIComponent(speaker)}/${encodeURIComponent(filename)}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    currentPlayCount = data.play_count || 0;
                    updatePlayCountDisplay();
                }
            })
            .catch(error => {
                console.error('获取播放计数失败:', error);
                currentPlayCount = 0;
                updatePlayCountDisplay();
            });
    }

});