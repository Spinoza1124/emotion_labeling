import os
import socket
import sys
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler

# 创建日志目录
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

# 配置日志
def setup_logging():
    """配置详细的日志记录"""
    # 创建日志文件名（按日期）
    log_file = os.path.join(LOG_DIR, f"emotion_labeling_{datetime.now().strftime('%Y%m%d')}.log")
    
    # 获取根日志记录器
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # 创建控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.WARNING)  # 控制台只显示警告及以上级别
    console_format = logging.Formatter('%(levelname)s: %(message)s')
    console_handler.setFormatter(console_format)
    
    # 创建文件处理器（滚动日志，最大10MB，保留5个备份）
    file_handler = RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5)
    file_handler.setLevel(logging.INFO)  # 文件记录INFO及以上级别
    file_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(file_format)
    
    # 添加处理器到根日志记录器
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    
    # 禁用werkzeug默认日志
    werkzeug_logger = logging.getLogger('werkzeug')
    werkzeug_logger.disabled = True
    
    return root_logger

# 导入标准版本应用
def import_app():
    """导入应用"""
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    
    # 只使用标准版本
    from app import app
    return app, "标准版本 (app.py)"

def get_local_ip():
    """获取本机非回环IP地址"""
    try:
        # 创建一个临时套接字来获取本机IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # 连接到一个外部地址（不会真实发送数据）
        s.connect(("8.8.8.8", 80))
        # 获取本机IP
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "0.0.0.0"

if __name__ == "__main__":
    # 设置日志
    logger = setup_logging()
    logger.info("正在启动情感标注系统...")
    
    # 导入应用（只使用标准版本）
    app, version_info = import_app()
    logger.info(f"已加载应用: {version_info}")
    
    # 获取本机IP
    ip_address = get_local_ip()
    port = 5000
    
    # 显示自定义启动消息
    print("\n" + "=" * 60)
    print(f"情感标注系统已启动! ({version_info})")
    print(f"请访问: http://{ip_address}:{port}")
    print(f"日志保存在: {LOG_DIR}")
    print("按Ctrl+C停止服务器")
    print("=" * 60 + "\n")
    
    # 记录应用启动信息
    logger.info(f"服务器正在监听: {ip_address}:{port}")
    
    try:
        # 运行Flask应用
        app.run(host=ip_address, port=port, debug=True, use_reloader=False)
    except Exception as e:
        # 记录异常
        logger.error(f"服务器错误: {str(e)}", exc_info=True)
        print(f"\n发生错误: {str(e)}")
    finally:
        # 记录关闭信息
        logger.info("服务器关闭")