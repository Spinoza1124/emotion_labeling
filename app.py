import glob
import json
import os
import shutil
from datetime import datetime

from flask import Flask, jsonify, render_template, request, send_from_directory
from pydub import AudioSegment  # 导入音频处理库
import pydub.exceptions

app = Flask(__name__)

# 配置
AUDIO_FOLDER = os.getenv(
    "AUDIO_FOLDER", "/home/spinoza/code/projects/my_python_project/emotion_labeling/emotion_annotation"
)
LABEL_FOLDER = os.getenv(
    "LABEL_FOLDER", "/home/spinoza/code/projects/my_python_project/emotion_labeling/labels"
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
    """获取指定说话人的所有音频文件列表"""
    speaker_folder = os.path.join(AUDIO_FOLDER, speaker)
    print(f"正在查找说话人文件夹: {speaker_folder}")

    if not os.path.exists(speaker_folder):
        print(f"找不到说话人文件夹: {speaker_folder}")
        return jsonify({"error": f"找不到说话人 {speaker} 的文件夹"}), 404

    audio_files = []
    for ext in ["wav", "mp3", "ogg"]:
        found_files = glob.glob(os.path.join(speaker_folder, f"*.{ext}"))
        print(f"找到 {ext} 文件: {len(found_files)} 个")
        audio_files.extend(found_files)

    print(f"总共找到音频文件: {len(audio_files)} 个")

    # 获取已标注的文件列表
    username = request.args.get('username', '')
    labeled_files = set()
    
    if username:
        user_label_dir = os.path.join(LABEL_FOLDER, username)
        if os.path.exists(user_label_dir):
            label_path = os.path.join(user_label_dir, f"{speaker}_labels.json")
            if os.path.exists(label_path):
                with open(label_path, "r", encoding="utf-8") as f:
                    try:
                        labels = json.load(f)
                        labeled_files = {item["audio_file"] for item in labels}
                    except json.JSONDecodeError:
                        pass

    # 格式化返回数据
    result = []
    for audio_file in sorted(audio_files):
        file_name = os.path.basename(audio_file)
        result.append(
            {
                "file_name": file_name,
                "path": f"/api/audio/{speaker}/{file_name}",
                "labeled": file_name in labeled_files,
            }
        )

    return jsonify(result)


@app.route("/api/speakers")
def get_speakers():
    """获取所有说话人列表"""
    if not os.path.exists(AUDIO_FOLDER):
        print(f"音频文件夹不存在: {AUDIO_FOLDER}")
        return jsonify({"error": f"音频文件夹不存在: {AUDIO_FOLDER}"}), 404

    speakers = [
        d
        for d in os.listdir(AUDIO_FOLDER)
        if os.path.isdir(os.path.join(AUDIO_FOLDER, d))
    ]
    print(f"找到的说话人: {speakers}")
    return jsonify(speakers)


@app.route("/api/audio/<speaker>/<filename>")
def get_audio(speaker, filename):
    """提供音频文件下载"""
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
    discrete_emotion = data.get("discrete_emotion")
    username = data.get("username")  # 获取用户名
    patient_status = data.get("patient_status", "patient")  # 获取患者状态，默认为"患者"

    if not all([speaker, audio_file, v_value is not None, a_value is not None, username]):
        return jsonify({"error": "缺少必要参数"}), 400

    # 获取音频文件完整路径
    audio_path = os.path.join(AUDIO_FOLDER, speaker, audio_file)
    
    # 获取音频时长
    audio_duration = get_audio_duration(audio_path)

    # 创建用户专属目录
    user_label_dir = os.path.join(LABEL_FOLDER, username)
    os.makedirs(user_label_dir, exist_ok=True)

    # 加载现有标签
    label_path = os.path.join(user_label_dir, f"{speaker}_labels.json")
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
        "discrete_emotion": discrete_emotion,
        "username": username, # 添加用户名字段
        "patient_status": patient_status,  # 添加患者状态
        "audio_duration": audio_duration,  # 添加音频时长
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S") # 添加时间戳
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
        
    label_path = os.path.join(user_label_dir, f"{speaker}_labels.json")
    
    if not os.path.exists(label_path):
        return jsonify({"error": "未找到标注文件"}), 404
        
    try:
        with open(label_path, "r", encoding="utf-8") as f:
            labels = json.load(f)
            
            # 查找特定音频文件的标注
            for label in labels:
                if label.get("audio_file") == filename:
                    return jsonify({"success": True, "data": label})
                    
            return jsonify({"error": "未找到该音频的标注数据"}), 404
            
    except Exception as e:
        return jsonify({"error": f"读取标注数据时出错: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)