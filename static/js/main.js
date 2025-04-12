document.addEventListener('DOMContentLoaded', function() {
    // 登陆相关元素
    const loginModal = document.getElementById('login-modal');
    const usernameInput = document.getElementById('username');
    const loginButton = document.getElementById('login-button');
    const mainContainer = document.getElementById('main-container');
    const currentUserSpan = document.getElementById('current-user');
    const logoutButton = document.getElementById('logout-button'); // 添加退出按钮引用

    // 用户名变量
    let currentUsername = '';
    let previousUsername = ''; // 添加变量记录之前的用户名

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
    vSlider.addEventListener('input', handleSliderChange);
    aSlider.addEventListener('input', handleSliderChange);

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
    
    // 添加键盘事件监听，用于空格键控制播放/暂停
    document.addEventListener('keydown', function(event) {
        // 如果按下的是空格键且不是在输入框内
        if (event.code === 'Space' && 
            document.activeElement.tagName !== 'INPUT' && 
            document.activeElement.tagName !== 'TEXTAREA' && 
            document.activeElement.tagName !== 'SELECT') {
            
            event.preventDefault(); // 阻止默认行为（如页面滚动）
            togglePlayPause();
        }
    });

     // 检查是否已登录（从localStorage获取）
     function checkLogin() {
        const savedUsername = localStorage.getItem('emotion_labeling_username');
        if (savedUsername) {
            currentUsername = savedUsername;
            currentUserSpan.textContent = currentUsername;
            loginModal.style.display = 'none';
            mainContainer.style.display = 'block';
            
            // 初始化应用
            initSpeakers();
        }
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

    // 修改检查登录函数
    function checkLogin() {
        const savedUsername = localStorage.getItem('emotion_labeling_username');
        if (savedUsername) {
            previousUsername = currentUsername; // 保存之前的用户名
            currentUsername = savedUsername;
            currentUserSpan.textContent = currentUsername;
            loginModal.style.display = 'none';
            mainContainer.style.display = 'block';
            
            // 初始化应用
            initSpeakers();
        } else {
            // 如果没有登录，确保正确显示登录框
            loginModal.style.display = 'flex';
            mainContainer.style.display = 'none';
        }
    }
    
    // 键盘事件：回车键登录
    usernameInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            loginButton.click();
        }
    });

    // 初始化检查登陆状态
    checkLogin();

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

        // 设置播放控制
        // setupPlayControls();
        
        // 启用按钮
        continueButton.disabled = false;
        saveButton.disabled = !isVaLabelingMode; // 只有在离散模式时才启用保存按钮
        nextButton.disabled = index >= audioList.length - 1;
        
        // 重置标注并设置为VA模式
        resetLabeling();
        switchToVaMode();
        isModified = false;
    }
    
    // 初始化播放控制
    // setupPlayControls();

    // 处理循环播放变化
    function handleLoopChange() {
        audioPlayer.loop = loopCheckbox.checked;
    }
    
    // 处理滑动条变化
    function handleSliderChange(event) {
        const slider = event.target;
        const valueElement = slider.id === 'v-slider' ? vValue : aValue;
        valueElement.textContent = Number(slider.value).toFixed(2);
        
        isModified = true;
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
            v_value: parseFloat(vSlider.value),
            a_value: parseFloat(aSlider.value),
            discrete_emotion: selectedDiscreteEmotion,
            username:currentUsername, // 添加用户名
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
        vSlider.value = 0;
        aSlider.value = 1;
        vValue.textContent = '0.00';
        aValue.textContent = '1.00';
        
        // 重置离散情感选择
        discreteEmotionRadios.forEach(radio => {
            radio.checked = false;
        });
        selectedDiscreteEmotion = null;
    }
});