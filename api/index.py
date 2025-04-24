from flask import Flask, render_template, request, jsonify, send_file, url_for, redirect
import os
import requests
import re
import json
import urllib.parse
import tempfile
import time
import traceback
from utils.music_crawler import search_music, get_play_url, get_play_id

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here'

# Vercel的函数环境不支持本地文件系统持久化，需要修改下载逻辑
# 对于Vercel环境，我们将直接返回音乐链接，而不进行中间文件下载

@app.route('/')
def index():
    """重定向到主页"""
    return redirect('/')

@app.route('/search')
def search():
    """搜索音乐接口"""
    query = request.args.get('query', '')
    if not query:
        return jsonify({'error': '请输入搜索关键词', 'songs': []})
    
    try:
        songs = search_music(query)
        return jsonify({'success': True, 'songs': songs})
    except Exception as e:
        app.logger.error(f"搜索失败: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'搜索失败: {str(e)}', 'songs': []})

@app.route('/play/<song_id>')
def play(song_id):
    """获取播放链接"""
    try:
        play_id = get_play_id(song_id)
        if not play_id:
            return jsonify({'error': '无法获取播放ID'})
        
        play_url = get_play_url(play_id, song_id)
        if not play_url:
            return jsonify({'error': '无法获取播放链接'})
            
        return jsonify({'success': True, 'url': play_url})
    except Exception as e:
        app.logger.error(f"获取播放链接失败: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'获取播放链接失败: {str(e)}'})

@app.route('/download/<song_id>/<title>')
def download(song_id, title):
    """修改为返回直接下载链接"""
    try:
        # 获取播放URL
        play_id = get_play_id(song_id)
        if not play_id:
            return jsonify({'error': '无法获取播放ID'})
        
        play_url = get_play_url(play_id, song_id)
        if not play_url:
            return jsonify({'error': '无法获取播放链接'})
            
        # 在Vercel上直接返回URL供前端处理
        safe_title = re.sub(r'[\\/*?:"<>|]', "", title)
        return jsonify({
            'success': True, 
            'url': play_url, 
            'filename': f"{safe_title}.mp3"
        })
    except Exception as e:
        app.logger.error(f"获取下载链接失败: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'获取下载链接失败: {str(e)}'})

# 需要处理所有路由请求
@app.route('/<path:path>')
def catch_all(path):
    return redirect('/')

# Vercel要求创建handler函数
def handler(event, context):
    return app(event, context)

# 本地开发使用
if __name__ == '__main__':
    app.run(debug=True)