import { elements } from '../utils/domElements.js';
import { state } from '../core/state.js';
import { renderAudioList, resetPlayer, resetLabeling } from '../ui/audioUI.js';
import { checkExactVMatch, checkExactAMatch } from '../ui/sliderSetup.js';

// 加载说话人列表
export function loadSpeakers() {
    console.log("正在加载说话人列表...");
    fetch('/api/speakers')
        .then(response => {
            if (!response.ok) {
                throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(speakers => {
            console.log("成功获取说话人列表:", speakers);
            if (!Array.isArray(speakers)) {
                console.error("说话人数据格式不正确:", speakers);
                throw new Error("说话人数据格式不正确");
            }
            
            elements.speakerSelect.innerHTML = '<option value="">-- 请选择 --</option>';
            speakers.forEach(speaker => {
                const option = document.createElement('option');
                option.value = speaker;
                option.textContent = speaker;
                elements.speakerSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('获取说话人列表失败:', error);
            alert('获取说话人列表失败: ' + error.message);
        });
}

// 加载音频列表
export function loadAudioList(speaker) {
    console.log(`正在加载说话人 ${speaker} 的音频列表...`);
    elements.audioListContainer.innerHTML = '<p>正在加载音频列表...</p>';
    
    fetch(`/api/audio_list/${encodeURIComponent(speaker)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`获取到 ${data.length} 个音频文件数据:`, data);
            state.audioList = data;
            
            if (data.length === 0) {
                elements.audioListContainer.innerHTML = '<p>未找到音频文件，请检查服务器设置</p>';
                console.warn("未找到音频文件，音频列表为空");
            } else {
                renderAudioList();
            }
        })
        .catch(error => {
            console.error('获取音频列表失败:', error);
            elements.audioListContainer.innerHTML = `<p>加载失败: ${error.message}</p>`;
            alert('获取音频列表失败: ' + error.message);
        });
}

// 加载已有的标注数据
export function loadExistingLabel(speaker, audioFileName) {
    fetch(`/api/get_label?speaker=${encodeURIComponent(speaker)}&audio_file=${encodeURIComponent(audioFileName)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.label) {
                console.log("找到已有标注:", data.label);
                
                // 设置VA值
                if (data.label.v_value !== undefined) {
                    elements.vSlider.value = data.label.v_value;
                    elements.vValue.textContent = parseFloat(data.label.v_value).toFixed(2);
                    checkExactVMatch(parseFloat(data.label.v_value));
                }
                
                if (data.label.a_value !== undefined) {
                    elements.aSlider.value = data.label.a_value;
                    elements.aValue.textContent = parseFloat(data.label.a_value).toFixed(2);
                    checkExactAMatch(parseFloat(data.label.a_value));
                }
                
                // 设置离散情感
                if (data.label.discrete_emotion) {
                    state.selectedDiscreteEmotion = data.label.discrete_emotion;
                    const discreteRadio = document.querySelector(`input[name="discrete-emotion"][value="${data.label.discrete_emotion}"]`);
                    if (discreteRadio) {
                        discreteRadio.checked = true;
                    }
                }
                
                // 设置中性复选框
                if (elements.neutralCheckbox && data.label.is_neutral !== undefined) {
                    elements.neutralCheckbox.checked = data.label.is_neutral;
                }
                
                // 标记音频已标注
                if (state.audioList[state.currentAudioIndex]) {
                    state.audioList[state.currentAudioIndex].labeled = true;
                }
            } else {
                console.log("没有找到已有标注");
            }
        })
        .catch(error => {
            console.error('获取已有标注失败:', error);
        });
}

// 保存标注
export function saveLabel() {
    if (state.currentAudioIndex === -1) return;
    
    const audioFile = state.audioList[state.currentAudioIndex];
    const labelData = {
        speaker: state.currentSpeaker,
        audio_file: audioFile.file_name,
        v_value: parseFloat(elements.vSlider.value).toFixed(2),
        a_value: parseFloat(elements.aSlider.value).toFixed(2),
        discrete_emotion: state.selectedDiscreteEmotion
    };
    
    // 只有当neutralCheckbox存在时才添加is_neutral属性
    if (elements.neutralCheckbox) {
        labelData.is_neutral = elements.neutralCheckbox.checked;
    }
    
    elements.saveButton.disabled = true;
    elements.saveButton.textContent = '保存中...';
    
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
            state.audioList[state.currentAudioIndex].labeled = true;
            renderAudioList();
            state.isModified = false;
            elements.saveButton.textContent = '已保存';
            setTimeout(() => {
                elements.saveButton.textContent = '保存(W)';
                elements.saveButton.disabled = false;
            }, 1000);
        } else {
            throw new Error(data.error || '保存失败');
        }
    })
    .catch(error => {
        console.error('保存标注失败:', error);
        alert('保存标注失败，请重试');
        elements.saveButton.textContent = '保存(W)';
        elements.saveButton.disabled = false;
    });
}
