import { elements } from '../utils/domElements.js';
import { state } from '../core/state.js';
import { loadExistingLabel } from '../api/dataService.js';
import { switchToVaMode } from './emotionUI.js';

// 渲染音频列表
export function renderAudioList() {
    const { audioList, currentAudioIndex } = state;
    
    console.log(`正在渲染 ${audioList.length} 个音频项目`);
    
    if (audioList.length === 0) {
        elements.audioListContainer.innerHTML = '<p>没有可用的音频文件</p>';
        return;
    }
    
    elements.audioListContainer.innerHTML = '';
    
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
            if (state.isModified && state.currentAudioIndex !== -1) {
                if (confirm('当前标注未保存，是否继续？')) {
                    selectAudio(index);
                }
            } else {
                selectAudio(index);
            }
        });
        
        elements.audioListContainer.appendChild(audioItem);
    });
    
    console.log("音频列表渲染完成");
}

// 选择音频
export function selectAudio(index) {
    console.log(`选择音频索引: ${index}`);
    
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
    
    state.currentAudioIndex = index;
    const audioFile = state.audioList[index];
    
    console.log(`加载音频文件: ${audioFile.file_name}, 路径: ${audioFile.path}`);
    
    // 设置音频播放器
    elements.audioPlayer.src = audioFile.path;
    elements.audioPlayer.load();
    
    // 尝试播放音频（如果不成功，会显示控件让用户手动播放）
    elements.audioPlayer.play().catch(err => {
        console.warn("自动播放失败，用户需要手动播放:", err);
    });
    
    // 启用按钮
    elements.continueButton.disabled = false;
    elements.backButton.disabled = false;
    elements.saveButton.disabled = true; // 初始时保存按钮禁用，在离散模式中启用
    elements.nextButton.disabled = index >= state.audioList.length - 1;
    elements.prevButton.disabled = index <= 0; // 如果是第一条则禁用上一条按钮
    
    // 重置标注并设置为VA模式
    resetLabeling();
    switchToVaMode();
    
    // 在加载音频时尝试获取已有标注
    loadExistingLabel(state.currentSpeaker, audioFile.file_name);
    
    state.isModified = false;
}

// 重置播放器
export function resetPlayer() {
    elements.audioPlayer.src = '';
    state.currentAudioIndex = -1;
    elements.continueButton.disabled = true;
    elements.backButton.disabled = true;
    elements.saveButton.disabled = true;
    elements.nextButton.disabled = true;
    elements.prevButton.disabled = true;
}

// 重置标注
export function resetLabeling() {
    // 重置VA标注
    elements.vSlider.value = 0;
    elements.aSlider.value = 3;  // A值的中间值是3
    elements.vValue.textContent = '0.00';
    elements.aValue.textContent = '3.00';
    
    // 重置标准值单选按钮
    document.getElementById('v-0').checked = true;
    document.getElementById('a-3').checked = true;
    
    // 重置离散情感选择
    elements.discreteEmotionRadios.forEach(radio => {
        radio.checked = false;
    });
    state.selectedDiscreteEmotion = null;
}
