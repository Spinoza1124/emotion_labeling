# 情感标注系统

/emotion_annotation :存放的是需要标注的数据

/labels :存放的是保存的标记结果

/static 存放的是css和js文件

/templates : 存放的是html文件

app.py :flask后端程序

README.md ：项目的说明文档

requirements.txt : 项目环境配置文件

start_server.py: 项目启动程序

包含的功能有：
1.循环播放音频数据

2.按下空格，暂停播放

3.继续/返回（快捷键Q）:连续情感标注完后，点击按Q键或者点击继续，系统跳转到离散情感界面，再点击Q键返回连续情感界面，点击W键保存结果，点击E键回到上一条数据，点击R键去下一条数据。



启动项目：

python 3.10.6

把需要标注的数据解压放在emotion_annotation文件夹下


第一步：

```bash
python -r requirement.txt
```

第二步：
修改app.py里AUDIO_FOLDER和LABEL_FOLDER路径位置

举例：
AUDIO_FOLDER = os.getenv(
    "AUDIO_FOLDER", "/mnt/shareEEx/liuyang/code/emotion_labeling/emotion_annotation"
)
LABEL_FOLDER = os.getenv(
    "LABEL_FOLDER", "/mnt/shareEEx/liuyang/code/emotion_labeling/labels"
)
这是我目录下的AUDIO_FOLDER和LABEL_FOLDER，如果你需要在本地部署，将其修改成你的路径。

第三步：

```bash
python start_server.py
```

第四步：

点击Running on http://10.10.1.213:5000/ (Press CTRL+C to quit)，这个地址，自动弹出网页界面。
