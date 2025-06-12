import glob
import json
import os
import shutil
import random
from datetime import datetime

from flask import Flask, jsonify, render_template, request, send_from_directory
from pydub import AudioSegment  # 导入音频处理库
import pydub.exceptions
import glob
import re

def calculate_annotation_completeness(label):
    """计算标注的完整性状态
    
    Args:
        label: 标注数据字典
        
    Returns:
        str: 'none' - 无标注, 'va-only' - 仅VA标注, 'complete' - 完整标注
    """
    v_value = label.get('v_value', 0)
    a_value = label.get('a_value', 0)
    patient_status = label.get('patient_status')
    emotion_type = label.get('emotion_type')
    discrete_emotion = label.get('discrete_emotion')
    
    has_va = v_value != 0 or a_value != 0
    has_patient_status = patient_status is not None
    has_emotion_type = emotion_type is not None
    has_discrete_emotion = emotion_type == 'neutral' or (emotion_type == 'non-neutral' and discrete_emotion is not None)
    
    if not has_va and not has_patient_status and not has_emotion_type:
        return 'none'
    
    if has_va and has_patient_status and has_emotion_type and has_discrete_emotion:
        return 'complete'
    
    return 'va-only'

app = Flask(__name__)

# 配置
AUDIO_FOLDER = os.getenv(
    "AUDIO_FOLDER", "/mnt/shareEEx/liuyang/code/emotion_labeling/emotion_annotation"
)
LABEL_FOLDER = os.getenv(
    "LABEL_FOLDER", "/mnt/shareEEx/liuyang/code/emotion_labeling/labels"
)

# 确保标签保存目录存在
os.makedirs(LABEL_FOLDER, exist_ok=True)


# 获取音频文件长度的函数
def get_audio_duration(file_path):
    """获取音频文件的时长（秒）"""
    try:
        audio = AudioSegment.from_file(file_path)
        return len(audio) / 1000.0  # 毫秒转换为秒
    except pydub.exceptions.CouldntDecodeError:
        print(f"无法解码音频文件: {file_path}")
        return 0.0
    except Exception as e:
        print(f"获取音频时长时出错: {e}")
        return 0.0

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/audio_list/<speaker>")
def get_audio_list(speaker):
    """获取指定说话人组的所有音频文件列表，并随机排序"""
    # 检查是否为分组的说话人（如spk2）
    if re.match(r'spk\d+$', speaker):
        # 获取该组下的所有子说话人文件夹
        all_speakers = [
            d for d in os.listdir(AUDIO_FOLDER)
            if os.path.isdir(os.path.join(AUDIO_FOLDER, d)) and d.startswith(speaker + '-')
        ]
        
        if not all_speakers:
            return jsonify({"error": f"找不到说话人组 {speaker} 的文件夹"}), 404
        
        # 收集所有子说话人的音频文件
        audio_files = []
        for sub_speaker in all_speakers:
            speaker_folder = os.path.join(AUDIO_FOLDER, sub_speaker)
            for ext in ["wav"]:
                found_files = glob.glob(os.path.join(speaker_folder, f"*.{ext}"))
                audio_files.extend(found_files)
    else:
        # 处理单个说话人文件夹
        speaker_folder = os.path.join(AUDIO_FOLDER, speaker)
        if not os.path.exists(speaker_folder):
            return jsonify({"error": f"找不到说话人 {speaker} 的文件夹"}), 404
        
        audio_files = []
        for ext in ["wav"]:
            found_files = glob.glob(os.path.join(speaker_folder, f"*.{ext}"))
            audio_files.extend(found_files)

    # 获取已标注的文件列表和完整性状态
    username = request.args.get('username', '')
    labeled_files = set()
    annotation_completeness = {}
    
    if username:
        user_label_dir = os.path.join(LABEL_FOLDER, username)
        if os.path.exists(user_label_dir):
            # 对于分组说话人，需要检查所有相关的标签文件
            if re.match(r'spk\d+$', speaker):
                all_speakers = [
                    d for d in os.listdir(AUDIO_FOLDER)
                    if os.path.isdir(os.path.join(AUDIO_FOLDER, d)) and d.startswith(speaker + '-')
                ]
                for sub_speaker in all_speakers:
                    label_path = os.path.join(user_label_dir, f"{sub_speaker}_labels.json")
                    if os.path.exists(label_path):
                        with open(label_path, "r", encoding="utf-8") as f:
                            try:
                                labels = json.load(f)
                                for item in labels:
                                    audio_file = item["audio_file"]
                                    labeled_files.add(audio_file)
                                    annotation_completeness[audio_file] = calculate_annotation_completeness(item)
                            except json.JSONDecodeError:
                                pass
            else:
                label_path = os.path.join(user_label_dir, f"{speaker}_labels.json")
                if os.path.exists(label_path):
                    with open(label_path, "r", encoding="utf-8") as f:
                        try:
                            labels = json.load(f)
                            for item in labels:
                                audio_file = item["audio_file"]
                                labeled_files.add(audio_file)
                                annotation_completeness[audio_file] = calculate_annotation_completeness(item)
                        except json.JSONDecodeError:
                            pass
    
    # 基于用户名和说话人生成固定的音频文件排序
    # 检查是否已存在该用户该说话人的音频顺序文件
    if username:
        user_order_dir = os.path.join("order_list", username)
        os.makedirs(user_order_dir, exist_ok=True)
        audio_order_file = os.path.join(user_order_dir, f"{speaker}_audio_order.json")
        
        # 获取所有音频文件名（不包含路径）
        audio_file_names = [os.path.basename(f) for f in audio_files]
        
        if os.path.exists(audio_order_file):
            # 如果顺序文件存在，按照保存的顺序排列
            try:
                with open(audio_order_file, "r", encoding="utf-8") as f:
                    saved_order = json.load(f)
                
                # 按照保存的顺序重新排列音频文件
                sorted_audio_files = []
                saved_names = set(saved_order)
                current_names = set(audio_file_names)
                
                # 首先添加保存顺序中存在的文件
                for name in saved_order:
                    if name in current_names:
                        # 找到对应的完整路径
                        for full_path in audio_files:
                            if os.path.basename(full_path) == name:
                                sorted_audio_files.append(full_path)
                                break
                
                # 添加新增的文件（如果有的话）
                new_files = current_names - saved_names
                if new_files:
                    new_file_paths = [f for f in audio_files if os.path.basename(f) in new_files]
                    # 对新文件使用固定的随机排序
                    seed_string = f"{username}_{speaker}_new"
                    random.seed(hash(seed_string) % (2**32))
                    random.shuffle(new_file_paths)
                    random.seed()
                    sorted_audio_files.extend(new_file_paths)
                    
                    # 更新保存的顺序文件
                    updated_order = [os.path.basename(f) for f in sorted_audio_files]
                    with open(audio_order_file, "w", encoding="utf-8") as f:
                        json.dump(updated_order, f, ensure_ascii=False, indent=2)
                        
            except (json.JSONDecodeError, Exception):
                # 如果文件损坏，重新生成
                seed_string = f"{username}_{speaker}"
                random.seed(hash(seed_string) % (2**32))
                random.shuffle(audio_files)
                random.seed()
                sorted_audio_files = audio_files
                
                # 保存新的顺序
                audio_order = [os.path.basename(f) for f in sorted_audio_files]
                with open(audio_order_file, "w", encoding="utf-8") as f:
                    json.dump(audio_order, f, ensure_ascii=False, indent=2)
        else:
            # 如果顺序文件不存在，生成新的固定随机排序并保存
            seed_string = f"{username}_{speaker}"
            random.seed(hash(seed_string) % (2**32))
            random.shuffle(audio_files)
            random.seed()
            sorted_audio_files = audio_files
            
            # 保存音频文件顺序
            audio_order = [os.path.basename(f) for f in sorted_audio_files]
            with open(audio_order_file, "w", encoding="utf-8") as f:
                json.dump(audio_order, f, ensure_ascii=False, indent=2)
    else:
        # 如果没有用户名，使用默认的随机排序（不保存）
        random.shuffle(audio_files)
        sorted_audio_files = audio_files
    
    # 格式化返回数据
    result = []
    for audio_file in sorted_audio_files:
        file_name = os.path.basename(audio_file)
        result.append(
            {
                "file_name": file_name,
                "path": f"/api/audio/{speaker}/{file_name}",
                "labeled": file_name in labeled_files,
                "annotation_completeness": annotation_completeness.get(file_name, 'none'),
            }
        )

    return jsonify(result)

@app.route("/api/speakers")
def get_speakers():
    """获取所有说话人列表，按spk编号分组，使用固定的随机排序"""
    # 获取用户名，用于创建用户专属的排序文件
    username = request.args.get('username', 'default')
    print(f"DEBUG: 接收到的用户名参数: {username}")  # 添加调试日志
    
    if not os.path.exists(AUDIO_FOLDER):
        return jsonify({"error": f"音频文件夹不存在: {AUDIO_FOLDER}"}), 404

    # 获取所有说话人目录
    all_speakers = [
        d
        for d in os.listdir(AUDIO_FOLDER)
        if os.path.isdir(os.path.join(AUDIO_FOLDER, d))
    ]
    
    # 按spk编号分组
    speaker_groups = {}
    for speaker in all_speakers:
        # 解析格式: spk<id>-<part>-<section>
        match = re.match(r'(spk)(\d+)-(\d+)-(\d+)', speaker)
        if match:
            prefix, spk_id, part, section = match.groups()
            spk_group = f"spk{spk_id}"
            if spk_group not in speaker_groups:
                speaker_groups[spk_group] = []
            speaker_groups[spk_group].append(speaker)
        else:
            # 如果不符合格式，直接作为独立的说话人
            speaker_groups[speaker] = [speaker]
    
    # 使用固定的随机排序，只在第一次时随机排序
    # 获取用户名，用于创建用户专属的排序文件
    username = request.args.get('username', 'default')
    order_dir = os.path.join(os.path.dirname(LABEL_FOLDER), "order_list", username)
    os.makedirs(order_dir, exist_ok=True)
    speaker_order_file = os.path.join(order_dir, "speakers_order.json")

    
    if os.path.exists(speaker_order_file):
        # 如果排序文件存在，使用保存的顺序
        try:
            with open(speaker_order_file, "r", encoding="utf-8") as f:
                saved_order = json.load(f)
                # 按保存的顺序重新排列说话人组
                sorted_speaker_groups = []
                existing_groups = set(speaker_groups.keys())
                for group in saved_order:
                    if group in existing_groups:
                        sorted_speaker_groups.append(group)
                        existing_groups.remove(group)
                # 添加新增的说话人组（如果有的话）
                sorted_speaker_groups.extend(list(existing_groups))
        except (json.JSONDecodeError, Exception):
            # 如果文件损坏，重新进行基于用户名的个性化随机排序
            speaker_group_list = list(speaker_groups.keys())
            # 使用用户名作为随机种子，确保每个用户有不同但固定的排序
            random.seed(hash(username) % (2**32))
            random.shuffle(speaker_group_list)
            sorted_speaker_groups = speaker_group_list
            # 重置随机种子
            random.seed()
            # 保存新的排序
            with open(speaker_order_file, "w", encoding="utf-8") as f:
                json.dump(sorted_speaker_groups, f, ensure_ascii=False, indent=2)

    else:
        # 如果排序文件不存在，进行基于用户名的个性化随机排序并保存
        speaker_group_list = list(speaker_groups.keys())
        # 使用用户名作为随机种子，确保每个用户有不同但固定的排序
        random.seed(hash(username) % (2**32))
        random.shuffle(speaker_group_list)
        sorted_speaker_groups = speaker_group_list
        # 重置随机种子
        random.seed()
        # 保存排序结果
        with open(speaker_order_file, "w", encoding="utf-8") as f:
            json.dump(sorted_speaker_groups, f, ensure_ascii=False, indent=2)

    return jsonify(sorted_speaker_groups)

@app.route("/api/audio/<speaker>/<filename>")
def get_audio(speaker, filename):
    """提供音频文件下载"""
    # 检查是否为分组的说话人（如spk2）
    if re.match(r'spk\d+$', speaker):
        # 需要在所有子说话人文件夹中查找该音频文件
        all_speakers = [
            d for d in os.listdir(AUDIO_FOLDER)
            if os.path.isdir(os.path.join(AUDIO_FOLDER, d)) and d.startswith(speaker + '-')
        ]
        
        for sub_speaker in all_speakers:
            file_path = os.path.join(AUDIO_FOLDER, sub_speaker, filename)
            if os.path.exists(file_path):
                directory = os.path.join(AUDIO_FOLDER, sub_speaker)
                return send_from_directory(directory, filename)
        
        # 如果没有找到文件，返回404
        return jsonify({"error": f"找不到音频文件 {filename}"}), 404
    else:
        # 处理单个说话人文件夹
        directory = os.path.join(AUDIO_FOLDER, speaker)
        return send_from_directory(directory, filename)

@app.route("/api/save_label", methods=["POST"])
def save_label():
    """保存情感标注结果"""
    data = request.json
    speaker = data.get("speaker")
    audio_file = data.get("audio_file")
    v_value = data.get("v_value")
    a_value = data.get("a_value")
    emotion_type = data.get("emotion_type", "non-neutral")  # 获取情感类型
    discrete_emotion = data.get("discrete_emotion")
    username = data.get("username")
    patient_status = data.get("patient_status", "patient")

    if not all([speaker, audio_file, v_value is not None, a_value is not None, username]):
        return jsonify({"error": "缺少必要参数"}), 400

    # 获取音频文件完整路径
    # 检查是否为分组的说话人（如spk2）
    if re.match(r'spk\d+$', speaker):
        # 需要在所有子说话人文件夹中查找该音频文件
        all_speakers = [
            d for d in os.listdir(AUDIO_FOLDER)
            if os.path.isdir(os.path.join(AUDIO_FOLDER, d)) and d.startswith(speaker + '-')
        ]
        
        audio_path = None
        actual_speaker = None
        for sub_speaker in all_speakers:
            file_path = os.path.join(AUDIO_FOLDER, sub_speaker, audio_file)
            if os.path.exists(file_path):
                audio_path = file_path
                actual_speaker = sub_speaker
                break
        
        if audio_path is None:
            return jsonify({"error": f"找不到音频文件 {audio_file}"}), 404
    else:
        audio_path = os.path.join(AUDIO_FOLDER, speaker, audio_file)
        actual_speaker = speaker
    
    # 获取音频时长
    audio_duration = get_audio_duration(audio_path)

    # 创建用户专属目录
    user_label_dir = os.path.join(LABEL_FOLDER, username)
    os.makedirs(user_label_dir, exist_ok=True)

    # 加载现有标签，使用实际的说话人文件夹名称
    label_path = os.path.join(user_label_dir, f"{actual_speaker}_labels.json")
    labels = []
    if os.path.exists(label_path):
        with open(label_path, "r", encoding="utf-8") as f:
            try:
                labels = json.load(f)
            except json.JSONDecodeError:
                labels = []

    # 检查是否已存在该音频的标签
    existing_index = next(
        (i for i, item in enumerate(labels) if item["audio_file"] == audio_file), None
    )

    label_data = {
        "audio_file": audio_file,
        "v_value": v_value,
        "a_value": a_value,
        "emotion_type": emotion_type,  # 添加情感类型字段
        "discrete_emotion": discrete_emotion,
        "username": username,
        "patient_status": patient_status,
        "audio_duration": audio_duration,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    if existing_index is not None:
        labels[existing_index] = label_data
    else:
        labels.append(label_data)

    # 保存标签
    with open(label_path, "w", encoding="utf-8") as f:
        json.dump(labels, f, ensure_ascii=False, indent=2)

    return jsonify({"success": True})

@app.route("/api/update_username", methods=["POST"])
def update_username():
    """更新用户名和移动用户文件夹"""
    data = request.json
    old_username = data.get("old_username")
    new_username = data.get("new_username")
    
    if not old_username or not new_username:
        return jsonify({"error": "缺少必要参数"}), 400
    
    old_user_dir = os.path.join(LABEL_FOLDER, old_username)
    new_user_dir = os.path.join(LABEL_FOLDER, new_username)
    
    # 如果旧目录存在，则迁移数据
    if os.path.exists(old_user_dir):
        os.makedirs(new_user_dir, exist_ok=True)
        
        # 获取旧目录下的所有文件
        files = glob.glob(os.path.join(old_user_dir, "*.json"))
        moved_count = 0
        
        # 移动每个文件到新目录，并更新用户名
        for file_path in files:
            file_name = os.path.basename(file_path)
            new_file_path = os.path.join(new_user_dir, file_name)
            
            # 读取文件内容，更新用户名
            with open(file_path, "r", encoding="utf-8") as f:
                try:
                    labels = json.load(f)
                    for label in labels:
                        if label.get("username") == old_username:
                            label["username"] = new_username
                    
                    # 写入到新位置
                    with open(new_file_path, "w", encoding="utf-8") as f_write:
                        json.dump(labels, f_write, ensure_ascii=False, indent=2)
                    
                    moved_count += 1
                except json.JSONDecodeError:
                    # 如果文件损坏，直接复制过去
                    shutil.copy2(file_path, new_file_path)
                    moved_count += 1
            
        # 删除旧目录
        if moved_count > 0:
            shutil.rmtree(old_user_dir)
        
        return jsonify({"success": True, "moved_files": moved_count})
    
    return jsonify({"success": True, "moved_files": 0})

@app.route("/clear_login", methods=["GET"])
def clear_login():
    """清除登录状态，用于测试"""
    html = """
    <html>
    <head>
        <title>清除登录状态</title>
        <script>
            localStorage.removeItem('emotion_labeling_username');
            setTimeout(function() {
                window.location.href = '/';
            }, 1000);
        </script>
    </head>
    <body>
        <p>登录状态已清除，正在跳转...</p>
    </body>
    </html>
    """
    return html

@app.route("/api/get_label/<username>/<speaker>/<filename>")
def get_label(username, speaker, filename):
    """获取特定音频的标注数据"""
    if not username or not speaker or not filename:
        return jsonify({"error": "缺少必要参数"}), 400
        
    user_label_dir = os.path.join(LABEL_FOLDER, username)
    
    if not os.path.exists(user_label_dir):
        return jsonify({"error": "未找到用户标注目录"}), 404
    
    # 检查是否为分组的说话人（如spk2）
    if re.match(r'spk\d+$', speaker):
        # 需要在所有子说话人的标签文件中查找
        all_speakers = [
            d for d in os.listdir(AUDIO_FOLDER)
            if os.path.isdir(os.path.join(AUDIO_FOLDER, d)) and d.startswith(speaker + '-')
        ]
        
        for sub_speaker in all_speakers:
            label_path = os.path.join(user_label_dir, f"{sub_speaker}_labels.json")
            if os.path.exists(label_path):
                try:
                    with open(label_path, "r", encoding="utf-8") as f:
                        labels = json.load(f)
                        
                        # 查找特定音频文件的标注
                        for label in labels:
                            if label.get("audio_file") == filename:
                                # 计算标注完整性
                                completeness = calculate_annotation_completeness(label)
                                label["annotation_completeness"] = completeness
                                return jsonify({"success": True, "data": label})
                except Exception as e:
                    continue
        
        return jsonify({"error": "未找到该音频的标注数据"}), 404
    else:
        # 处理单个说话人
        label_path = os.path.join(user_label_dir, f"{speaker}_labels.json")
        
        if not os.path.exists(label_path):
            return jsonify({"error": "未找到标注文件"}), 404
            
        try:
            with open(label_path, "r", encoding="utf-8") as f:
                labels = json.load(f)
                
                # 查找特定音频文件的标注
                for label in labels:
                    if label.get("audio_file") == filename:
                        # 计算标注完整性
                        completeness = calculate_annotation_completeness(label)
                        label["annotation_completeness"] = completeness
                        return jsonify({"success": True, "data": label})
                        
                return jsonify({"error": "未找到该音频的标注数据"}), 404
                
        except Exception as e:
            return jsonify({"error": f"读取标注数据时出错: {str(e)}"}), 500

@app.route("/api/save_play_count", methods=["POST"])
def save_play_count():
    """保存音频播放次数"""
    data = request.json
    username = data.get("username")
    speaker = data.get("speaker")
    audio_file = data.get("audio_file")
    
    if not all([username, speaker, audio_file]):
        return jsonify({"error": "缺少必要参数"}), 400
    
    # 创建用户专属目录
    user_label_dir = os.path.join(LABEL_FOLDER, username)
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
            "latest_session": None
        }
    
    play_counts[audio_file]["total_plays"] += 1
    play_counts[audio_file]["latest_session"] = {
        "play_count": play_counts[audio_file]["total_plays"],
        "timestamp": datetime.now().isoformat()
    }
    
    # 保存播放计数数据
    try:
        with open(play_count_file, "w", encoding="utf-8") as f:
            json.dump(play_counts, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "success": True, 
            "play_count": play_counts[audio_file]["total_plays"]
        })
    except Exception as e:
        return jsonify({"error": f"保存播放计数失败: {str(e)}"}), 500

@app.route("/api/get_play_count/<username>/<speaker>/<filename>")
def get_play_count(username, speaker, filename):
    """获取指定音频文件的播放次数"""
    user_label_dir = os.path.join(LABEL_FOLDER, username)
    play_count_file = os.path.join(user_label_dir, f"{speaker}_play_counts.json")
    
    if not os.path.exists(play_count_file):
        return jsonify({"success": True, "play_count": 0})
    
    try:
        with open(play_count_file, "r", encoding="utf-8") as f:
            play_counts = json.load(f)
            
        if filename in play_counts:
            return jsonify({
                "success": True, 
                "play_count": play_counts[filename]["total_plays"]
            })
        else:
            return jsonify({"success": True, "play_count": 0})
            
    except Exception as e:
        return jsonify({"error": f"获取播放计数失败: {str(e)}"}), 500

#==============================================
# 测试相关路由
#==============================================

@app.route('/test')
def test_page():
    """测试页面"""
    return render_template('test.html')

@app.route('/api/test/questions')
def get_test_questions():
    """获取测试题目"""
    try:
        test_examples_dir = os.path.join(AUDIO_FOLDER, '..', 'test_examples')
        test_examples_dir = os.path.abspath(test_examples_dir)
        
        questions = []
        
        # 处理离散情感测试题目
        discrete_dir = os.path.join(test_examples_dir, 'discrete_emotions')
        if os.path.exists(discrete_dir):
            for filename in os.listdir(discrete_dir):
                if filename.endswith('.wav') or filename.endswith('.MP3'):
                    # 从文件名提取正确答案 (例如: 愤怒-2.wav -> 愤怒)
                    correct_answer = filename.split('-')[0]
                    questions.append({
                        'filename': filename,
                        'type': 'discrete',
                        'correct_answer': correct_answer,
                        'folder': 'discrete_emotions'
                    })
        
        # 处理效价测试题目（V值标注）
        potency_dir = os.path.join(test_examples_dir, 'potency')
        if os.path.exists(potency_dir):
            for filename in os.listdir(potency_dir):
                if filename.endswith('.wav'):
                    # 从文件名提取正确答案 (例如: V0-2.wav -> V0, V负1-2.wav -> V负1)
                    label_part = filename.split('-')[0]
                    if label_part.startswith('V'):
                        # 处理V负数格式
                        if '负' in label_part:
                            v_value = -float(label_part.replace('V负', ''))  # V负1 -> -1
                        else:
                            v_value = float(label_part[1:])  # V0 -> 0, V1 -> 1, etc.
                        questions.append({
                            'filename': filename,
                            'type': 'potency',  # 专门的效价测试类型
                            'correct_answer': v_value,  # 只需要V值
                            'folder': 'potency'
                        })
        
        # 处理唤醒测试题目（A值标注）
        wake_up_dir = os.path.join(test_examples_dir, 'wake_up')
        if os.path.exists(wake_up_dir):
            for filename in os.listdir(wake_up_dir):
                if filename.endswith('.wav'):
                    # 从文件名提取正确答案 (例如: A2-1.wav -> A2)
                    label_part = filename.split('-')[0]
                    if label_part.startswith('A'):
                        a_value = float(label_part[1:])  # A2 -> 2, A1 -> 1, etc.
                        questions.append({
                            'filename': filename,
                            'type': 'arousal',  # 专门的唤醒测试类型
                            'correct_answer': a_value,  # 只需要A值
                            'folder': 'wake_up'
                        })
        
        # 随机打乱题目顺序
        import random
        random.shuffle(questions)
        
        # 限制题目数量（例如最多10题）
        questions = questions[:10]
        
        return jsonify({
            'success': True,
            'questions': questions
        })
        
    except Exception as e:
        print(f"获取测试题目失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/test/audio/<filename>')
def get_test_audio(filename):
    """获取测试音频文件"""
    try:
        test_examples_dir = os.path.join(AUDIO_FOLDER, '..', 'test_examples')
        test_examples_dir = os.path.abspath(test_examples_dir)
        
        # 在各个子目录中查找文件
        for subfolder in ['discrete_emotions', 'potency', 'wake_up']:
            file_path = os.path.join(test_examples_dir, subfolder, filename)
            if os.path.exists(file_path):
                return send_from_directory(os.path.dirname(file_path), filename)
            # 也尝试查找.MP3文件
            if filename.endswith('.wav'):
                mp3_filename = filename.replace('.wav', '.MP3')
                mp3_file_path = os.path.join(test_examples_dir, subfolder, mp3_filename)
                if os.path.exists(mp3_file_path):
                    return send_from_directory(os.path.dirname(mp3_file_path), mp3_filename)
        
        return jsonify({'error': '音频文件不存在'}), 404
        
    except Exception as e:
        print(f"获取测试音频失败: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)