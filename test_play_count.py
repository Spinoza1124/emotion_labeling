#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试播放次数记录功能
验证是否能正确记录多个不同音频文件的播放次数
"""

import json
import os
import sys
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def simulate_play_count_save(username, speaker, audio_file, label_folder):
    """
    模拟保存播放次数的功能
    """
    # 创建用户专属目录
    user_label_dir = os.path.join(label_folder, username)
    os.makedirs(user_label_dir, exist_ok=True)
    
    # 播放计数文件路径
    play_count_file = os.path.join(user_label_dir, f"{speaker}_play_counts.json")
    
    # 加载现有播放计数数据
    play_counts = {}
    if os.path.exists(play_count_file):
        try:
            with open(play_count_file, "r", encoding="utf-8") as f:
                play_counts = json.load(f)
        except json.JSONDecodeError:
            play_counts = {}
    
    # 更新播放计数
    if audio_file not in play_counts:
        play_counts[audio_file] = {
            "total_plays": 0,
            "latest_session": {
                "play_count": 0,
                "timestamp": None
            }
        }
    
    # 增加总播放次数
    play_counts[audio_file]["total_plays"] += 1
    
    # 更新当前会话的播放次数
    current_timestamp = datetime.now().isoformat()
    if (play_counts[audio_file]["latest_session"]["timestamp"] is None or 
        play_counts[audio_file]["latest_session"]["timestamp"][:10] != current_timestamp[:10]):
        # 如果是新的一天或者第一次播放，重置会话播放次数
        play_counts[audio_file]["latest_session"]["play_count"] = 1
    else:
        # 同一天内，增加会话播放次数
        play_counts[audio_file]["latest_session"]["play_count"] += 1
    
    play_counts[audio_file]["latest_session"]["timestamp"] = current_timestamp
    
    # 保存播放计数数据
    try:
        with open(play_count_file, "w", encoding="utf-8") as f:
            json.dump(play_counts, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 成功保存 {audio_file} 的播放次数: {play_counts[audio_file]['total_plays']}")
        return True
    except Exception as e:
        print(f"❌ 保存播放计数失败: {str(e)}")
        return False

def test_multiple_audio_files():
    """
    测试多个音频文件的播放次数记录
    """
    print("🧪 开始测试多个音频文件的播放次数记录功能...\n")
    
    # 测试参数
    username = "test"
    speaker = "spk81"
    label_folder = "labels"
    
    # 测试音频文件列表
    test_audio_files = [
        "spk81-3-1-370.wav",
        "spk81-4-1-370.wav", 
        "spk81-5-1-370.wav",
        "spk81-3-1-371.wav"
    ]
    
    # 模拟播放不同音频文件
    for i, audio_file in enumerate(test_audio_files):
        print(f"📻 播放音频文件: {audio_file}")
        
        # 每个音频播放2-3次
        play_times = 2 if i % 2 == 0 else 3
        for j in range(play_times):
            print(f"  第 {j+1} 次播放...")
            simulate_play_count_save(username, speaker, audio_file, label_folder)
        
        print()
    
    # 读取并显示最终结果
    play_count_file = os.path.join(label_folder, username, f"{speaker}_play_counts.json")
    if os.path.exists(play_count_file):
        with open(play_count_file, "r", encoding="utf-8") as f:
            final_data = json.load(f)
        
        print("📊 最终播放次数记录:")
        print(json.dumps(final_data, ensure_ascii=False, indent=2))
        
        # 验证结果
        print("\n✅ 验证结果:")
        expected_counts = [2, 3, 2, 3]  # 对应每个音频文件的预期播放次数
        
        for i, audio_file in enumerate(test_audio_files):
            if audio_file in final_data:
                actual_count = final_data[audio_file]["total_plays"]
                expected_count = expected_counts[i]
                if actual_count == expected_count:
                    print(f"  ✅ {audio_file}: {actual_count} 次播放 (符合预期)")
                else:
                    print(f"  ❌ {audio_file}: {actual_count} 次播放 (预期 {expected_count} 次)")
            else:
                print(f"  ❌ {audio_file}: 未找到播放记录")
        
        print(f"\n🎯 总共记录了 {len(final_data)} 个不同音频文件的播放次数")
        
    else:
        print("❌ 播放次数文件不存在")

if __name__ == "__main__":
    test_multiple_audio_files()