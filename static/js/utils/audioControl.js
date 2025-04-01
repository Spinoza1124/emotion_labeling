import { elements } from './domElements.js';

/**
 * 切换音频的播放和暂停状态
 */
export function toggleAudioPlayPause() {
    const audioPlayer = elements.audioPlayer;
    
    // 检查音频是否已加载
    if (!audioPlayer.src) {
        console.log("没有加载音频文件");
        return;
    }
    
    if (audioPlayer.paused) {
        // 如果当前是暂停状态，开始播放
        audioPlayer.play().catch(err => {
            console.warn("无法播放音频:", err);
        });
    } else {
        // 如果当前是播放状态，暂停播放
        audioPlayer.pause();
    }
}

/**
 * 播放音频
 */
export function playAudio() {
    const audioPlayer = elements.audioPlayer;
    if (audioPlayer.src) {
        audioPlayer.play().catch(err => {
            console.warn("无法播放音频:", err);
        });
    }
}

/**
 * 暂停音频
 */
export function pauseAudio() {
    const audioPlayer = elements.audioPlayer;
    if (!audioPlayer.paused) {
        audioPlayer.pause();
    }
}
