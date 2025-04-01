// 集中管理应用状态
export const state = {
    currentSpeaker: '',
    audioList: [],
    currentAudioIndex: -1,
    isModified: false,
    isVaLabelingMode: true,
    selectedDiscreteEmotion: null,
    
    // 标准值映射
    vStandardToSliderMap: {
        '-2': -2,
        '-1': -1,
        '0': 0,
        '1': 1,
        '2': 2
    },
    
    aStandardToSliderMap: {
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5
    }
};

// 重置状态
export function resetState() {
    state.currentSpeaker = '';
    state.audioList = [];
    state.currentAudioIndex = -1;
    state.isModified = false;
    state.isVaLabelingMode = true;
    state.selectedDiscreteEmotion = null;
}
