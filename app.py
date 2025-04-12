import glob
import json
import os
from datetime import datetime

from flask import Flask, jsonify, render_template, request, send_from_directory

app = Flask(__name__)

# 配置
AUDIO_FOLDER = os.getenv(
    "AUDIO_FOLDER", "/mnt/shareEEx/liuyang/code/funasr/emotion_labeling/emotion_annotation"
)
LABEL_FOLDER = os.getenv(
    "LABEL_FOLDER", "/mnt/shareEEx/liuyang/code/funasr/emotion_labeling/labels"
)

# 确保标签保存目录存在
os.makedirs(LABEL_FOLDER, exist_ok=True)


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
    labeled_files = set()
    label_path = os.path.join(LABEL_FOLDER, f"{speaker}_labels.json")
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
    username = data.get("username")  # 添加获取用户名

    if not all([speaker, audio_file, v_value is not None, a_value is not None]):
        return jsonify({"error": "缺少必要参数"}), 400

    # 加载现有标签
    label_path = os.path.join(LABEL_FOLDER, f"{speaker}_labels.json")
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
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S") # 可选：添加时间戳
    }

    if existing_index is not None:
        labels[existing_index] = label_data
    else:
        labels.append(label_data)

    # 保存标签
    with open(label_path, "w", encoding="utf-8") as f:
        json.dump(labels, f, ensure_ascii=False, indent=2)

    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

