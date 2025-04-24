/**
 * 音乐搜索网页版主要脚本
 */

// 全局变量
let currentAudio = null;
let isPlaying = false;
let currentSongId = null;
let currentSongTitle = null;
let updateProgressInterval = null;
let currentVolume = 0.7; // 默认音量为70%
let lastVolume = 0.7; // 记住上次的音量
let isSearching = false; // 标记搜索状态

// DOM元素
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const resultsList = document.getElementById('resultsList');
const pageTitle = document.getElementById('pageTitle');
const pageTitleContainer = document.getElementById('pageTitleContainer');
const songCount = document.getElementById('songCount');
const resultsContainer = document.getElementById('resultsContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const playerTitle = document.getElementById('playerTitle');
const progressBar = document.getElementById('progressBar');
const progressThumb = document.getElementById('progressThumb');
const progressContainer = document.getElementById('progressContainer');
const currentTime = document.getElementById('currentTime');
const totalTime = document.getElementById('totalTime');
const volumeProgress = document.getElementById('volumeProgress');
const volumeSlider = document.getElementById('volumeSlider');
const volumeIcon = document.getElementById('volumeIcon');
const statusBar = document.getElementById('statusBar');
const mainHeader = document.getElementById('mainHeader');
const musicPlayer = document.getElementById('musicPlayer');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 设置初始音量显示
    volumeProgress.style.width = `${currentVolume * 100}%`;
    
    // 注册事件监听器
    registerEventListeners();
    
    // 添加页面滚动效果
    initScrollEffects();
    
    // 显示页面元素（淡入效果）
    setTimeout(() => {
        pageTitleContainer.classList.add('visible');
        
        setTimeout(() => {
            resultsContainer.classList.add('visible');
        }, 200);
    }, 500);
    
    // 设置初始状态 - 隐藏加载指示器
    loadingIndicator.style.display = 'none';
    
    // 显示初始提示信息
    resultsList.innerHTML = '<div class="no-results"><i class="fas fa-music" style="font-size: 50px; margin-bottom: 20px; color: var(--primary-color); opacity: 0.8;"></i>请在上方搜索框中输入歌曲名或歌手名进行搜索</div>';
    
    // 根据URL参数自动搜索
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('query');
    
    if (query) {
        searchInput.value = query;
        searchMusic();
    }
    
    // 添加动态背景切换
    initDynamicBackground();
    
    // 添加音乐播放器波纹效果
    initAudioVisualizer();
    
    // 初始化主题切换
    initThemeToggle();
});

// 初始化滚动效果
function initScrollEffects() {
    // 监听页面滚动
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            mainHeader.classList.add('scrolled');
        } else {
            mainHeader.classList.remove('scrolled');
        }
    });
    
    // 添加滚动显示动画
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    
    // 监听歌曲项目
    document.querySelectorAll('.song-item').forEach(item => {
        observer.observe(item);
    });
}

// 注册事件监听器
function registerEventListeners() {
    // 搜索表单提交
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        searchMusic();
    });
    
    // 播放按钮
    playButton.addEventListener('click', togglePlay);
    
    // 停止按钮
    stopButton.addEventListener('click', stopMusic);
    
    // 进度条点击和拖动
    progressContainer.addEventListener('click', (e) => {
        if (!currentAudio) return;
        
        const rect = progressContainer.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        seekTo(position);
    });
    
    // 进度条鼠标移动效果
    progressContainer.addEventListener('mousemove', (e) => {
        if (!currentAudio) return;
        
        const rect = progressContainer.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        const time = currentAudio.duration * position;
        
        // 进度条预览
        progressThumb.style.left = `${position * 100}%`;
    });
    
    // 音量滑块点击和拖动
    volumeSlider.addEventListener('click', (e) => {
        const rect = volumeSlider.getBoundingClientRect();
        const volume = (e.clientX - rect.left) / rect.width;
        setVolume(volume);
    });
    
    // 音量滑块拖动
    let isDraggingVolume = false;
    
    volumeSlider.addEventListener('mousedown', () => {
        isDraggingVolume = true;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDraggingVolume) return;
        
        const rect = volumeSlider.getBoundingClientRect();
        let volume = (e.clientX - rect.left) / rect.width;
        
        // 限制在滑块范围内
        volume = Math.max(0, Math.min(1, volume));
        setVolume(volume);
    });
    
    document.addEventListener('mouseup', () => {
        isDraggingVolume = false;
    });
    
    // 音量图标点击切换静音
    volumeIcon.addEventListener('click', toggleMute);
    
    // 添加键盘快捷键
    document.addEventListener('keydown', (e) => {
        // 空格键 - 播放/暂停
        if (e.code === 'Space' && !isInputFocused()) {
            e.preventDefault();
            togglePlay();
        }
        
        // ESC键 - 停止播放
        if (e.code === 'Escape') {
            stopMusic();
        }
        
        // 上下箭头 - 调整音量
        if (e.code === 'ArrowUp' && !isInputFocused()) {
            e.preventDefault();
            setVolume(Math.min(1, currentVolume + 0.1));
        }
        
        if (e.code === 'ArrowDown' && !isInputFocused()) {
            e.preventDefault();
            setVolume(Math.max(0, currentVolume - 0.1));
        }
        
        // 左右箭头 - 调整进度
        if (e.code === 'ArrowLeft' && currentAudio && !isInputFocused()) {
            e.preventDefault();
            seekTo(Math.max(0, currentAudio.currentTime - 5) / currentAudio.duration);
        }
        
        if (e.code === 'ArrowRight' && currentAudio && !isInputFocused()) {
            e.preventDefault();
            seekTo(Math.min(currentAudio.duration, currentAudio.currentTime + 5) / currentAudio.duration);
        }
    });
    
    // 点击曲目栏外部区域关闭其他曲目的操作区
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.song-item')) {
            document.querySelectorAll('.song-item').forEach(item => {
                if (item.classList.contains('expanded')) {
                    item.classList.remove('expanded');
                }
            });
        }
    });
}

// 判断是否有输入框处于焦点状态
function isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
}

// 搜索音乐
function searchMusic() {
    const query = searchInput.value.trim();
    
    if (!query) {
        showToast('请输入搜索关键词');
        return;
    }
    
    // 防止重复搜索
    if (isSearching) return;
    isSearching = true;
    
    // 显示加载指示器
    loadingIndicator.style.display = 'flex';
    resultsList.innerHTML = '';
    
    // 更新页面标题和URL
    pageTitle.textContent = `${query} 搜索结果`;
    updateURL(query);
    
    // 添加淡入效果
    resultsContainer.classList.add('searching');
    
    // 添加加载时的动画效果
    document.body.classList.add('is-searching');
    
    // 发送搜索请求
    fetch(`/search?query=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            loadingIndicator.style.display = 'none';
            resultsContainer.classList.remove('searching');
            document.body.classList.remove('is-searching');
            isSearching = false;
            
            if (data.error) {
                showToast(data.error);
                resultsList.innerHTML = `<div class="no-results"><i class="fas fa-exclamation-circle" style="font-size: 50px; margin-bottom: 20px; color: var(--danger-color); opacity: 0.8;"></i>搜索出错: ${data.error}</div>`;
                songCount.textContent = '0';
                return;
            }
            
            if (!data.songs || data.songs.length === 0) {
                resultsList.innerHTML = '<div class="no-results"><i class="fas fa-search" style="font-size: 50px; margin-bottom: 20px; color: var(--text-secondary); opacity: 0.8;"></i>没有找到相关结果</div>';
                songCount.textContent = '0';
                return;
            }
            
            // 显示结果数量
            songCount.textContent = data.songs.length;
            
            // 渲染结果列表
            renderResults(data.songs);
            
            // 添加动画观察器
            initScrollEffects();
            
            // 滚动到结果区域
            setTimeout(() => {
                scrollToResults();
            }, 300);
            
            // 显示搜索成功消息
            showToast(`🎵 找到 ${data.songs.length} 首关于 "${query}" 的歌曲`);
        })
        .catch(error => {
            loadingIndicator.style.display = 'none';
            resultsContainer.classList.remove('searching');
            document.body.classList.remove('is-searching');
            isSearching = false;
            
            showToast(`搜索出错: ${error.message}`);
            resultsList.innerHTML = `<div class="no-results"><i class="fas fa-exclamation-triangle" style="font-size: 50px; margin-bottom: 20px; color: var(--warning-color); opacity: 0.8;"></i>搜索出错: ${error.message}</div>`;
            songCount.textContent = '0';
            console.error('搜索出错:', error);
        });
}

// 滚动到结果区域
function scrollToResults() {
    const offsetTop = resultsContainer.getBoundingClientRect().top + window.pageYOffset - 100;
    window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
    });
}

// 渲染搜索结果
function renderResults(songs) {
    resultsList.innerHTML = '';
    
    songs.forEach((song, index) => {
        const isCurrentSong = song.id === currentSongId;
        const songItem = document.createElement('div');
        songItem.className = `song-item ${isCurrentSong && isPlaying ? 'playing' : ''}`;
        songItem.setAttribute('data-id', song.id);
        songItem.setAttribute('data-index', index);
        
        const artistText = song.artist ? `<div class="song-artist">${song.artist}</div>` : '';
        const playingAnimation = isCurrentSong && isPlaying ? 
            `<div class="playing-animation">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
            </div>` : '';
        
        songItem.innerHTML = `
            <div class="song-info">
                <div class="song-icon"><i class="fas fa-music"></i></div>
                <div class="song-details">
                    <div class="song-title">${song.title} ${playingAnimation}</div>
                    ${artistText}
                </div>
            </div>
            <div class="song-actions">
                <button class="btn btn-play" data-id="${song.id}" data-title="${song.title} ${song.artist ? '- ' + song.artist : ''}" aria-label="播放">
                    <i class="fas ${isCurrentSong && isPlaying ? 'fa-pause' : 'fa-play'}"></i> ${isCurrentSong && isPlaying ? '暂停' : '播放'}
                </button>
                <button class="btn btn-browser" data-id="${song.id}" data-title="${song.title} ${song.artist ? '- ' + song.artist : ''}" aria-label="在浏览器中打开">
                    <i class="fas fa-globe"></i> 浏览器
                </button>
                <button class="btn btn-download" data-id="${song.id}" data-title="${song.title} ${song.artist ? '- ' + song.artist : ''}" aria-label="下载">
                    <i class="fas fa-download"></i> 下载
                </button>
            </div>
        `;
        
        // 添加动画延迟
        songItem.style.animationDelay = `${index * 0.05}s`;
        
        // 添加到结果列表
        resultsList.appendChild(songItem);
        
        // 添加鼠标悬停效果
        songItem.addEventListener('mouseenter', () => {
            const icon = songItem.querySelector('.song-icon i');
            icon.classList.add('fa-spin');
        });
        
        songItem.addEventListener('mouseleave', () => {
            const icon = songItem.querySelector('.song-icon i');
            icon.classList.remove('fa-spin');
        });
    });
    
    // 添加点击事件
    document.querySelectorAll('.btn-play').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // 添加点击波纹效果
            createRippleEffect(button, e);
            
            const songId = button.getAttribute('data-id');
            const songTitle = button.getAttribute('data-title');
            
            if (songId === currentSongId && isPlaying) {
                // 如果点击当前播放的歌曲，则暂停
                togglePlay();
            } else {
                // 否则播放新歌曲
                playInApp(songId, songTitle);
            }
        });
    });
    
    document.querySelectorAll('.btn-browser').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // 添加点击波纹效果
            createRippleEffect(button, e);
            
            const songId = button.getAttribute('data-id');
            const songTitle = button.getAttribute('data-title');
            playInBrowser(songId, songTitle);
        });
    });
    
    document.querySelectorAll('.btn-download').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // 添加点击波纹效果
            createRippleEffect(button, e);
            
            const songId = button.getAttribute('data-id');
            const songTitle = button.getAttribute('data-title');
            downloadMusic(songId, songTitle);
        });
    });
    
    // 添加歌曲项点击事件（展开/收起）
    document.querySelectorAll('.song-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.song-item').forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('expanded')) {
                    otherItem.classList.remove('expanded');
                }
            });
            
            item.classList.toggle('expanded');
        });
    });
}

// 创建波纹效果
function createRippleEffect(element, event) {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-effect');
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    element.appendChild(ripple);
    
    // 动画结束后移除元素
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// 应用内播放
function playInApp(songId, songTitle) {
    showToast(`正在加载: ${songTitle}`);
    
    // 播放按钮添加加载动画
    const playBtns = document.querySelectorAll(`.btn-play[data-id="${songId}"]`);
    playBtns.forEach(btn => {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中';
        btn.disabled = true;
    });
    
    // 先停止当前播放的音乐
    stopMusic();
    
    // 更新播放器状态
    playerTitle.textContent = `正在加载: ${songTitle}`;
    currentSongId = songId;
    currentSongTitle = songTitle;
    
    // 获取播放URL
    fetch(`/play/${songId}`)
        .then(response => response.json())
        .then(data => {
            // 恢复按钮状态
            playBtns.forEach(btn => {
                btn.disabled = false;
            });
            
            if (data.error) {
                showToast(data.error);
                playerTitle.textContent = '未播放任何歌曲';
                return;
            }
            
            // 播放音乐
            const audioUrl = data.url;
            playAudio(audioUrl, songTitle);
            
            // 更新搜索结果中的播放状态
            updatePlayingState();
        })
        .catch(error => {
            // 恢复按钮状态
            playBtns.forEach(btn => {
                btn.innerHTML = '<i class="fas fa-play"></i> 播放';
                btn.disabled = false;
            });
            
            showToast(`获取播放链接失败: ${error.message}`);
            playerTitle.textContent = '未播放任何歌曲';
            console.error('获取播放链接失败:', error);
        });
}

// 在浏览器中播放
function playInBrowser(songId, songTitle) {
    showToast(`正在浏览器中打开: ${songTitle}`);
    
    const browserBtns = document.querySelectorAll(`.btn-browser[data-id="${songId}"]`);
    browserBtns.forEach(btn => {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中';
        btn.disabled = true;
    });
    
    fetch(`/play/${songId}`)
        .then(response => response.json())
        .then(data => {
            // 恢复按钮状态
            browserBtns.forEach(btn => {
                btn.innerHTML = '<i class="fas fa-globe"></i> 浏览器';
                btn.disabled = false;
            });
            
            if (data.error) {
                showToast(data.error);
                return;
            }
            
            // 在新窗口打开
            window.open(data.url, '_blank');
        })
        .catch(error => {
            // 恢复按钮状态
            browserBtns.forEach(btn => {
                btn.innerHTML = '<i class="fas fa-globe"></i> 浏览器';
                btn.disabled = false;
            });
            
            showToast(`获取播放链接失败: ${error.message}`);
            console.error('获取播放链接失败:', error);
        });
}

// 下载音乐
function downloadMusic(songId, songTitle) {
    showToast(`正在准备下载: ${songTitle}`);
    
    const downloadBtns = document.querySelectorAll(`.btn-download[data-id="${songId}"]`);
    downloadBtns.forEach(btn => {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 下载中';
        btn.disabled = true;
    });
    
    // 获取下载链接
    fetch(`/download/${songId}/${encodeURIComponent(songTitle)}`)
        .then(response => response.json())
        .then(data => {
            // 恢复按钮状态
            downloadBtns.forEach(btn => {
                btn.innerHTML = '<i class="fas fa-download"></i> 下载';
                btn.disabled = false;
            });
            
            if (data.error) {
                showToast(data.error);
                return;
            }
            
            // 创建一个隐藏的a标签触发下载
            const downloadLink = document.createElement('a');
            downloadLink.href = data.url;
            downloadLink.download = data.filename || `${songTitle}.mp3`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            showToast(`${songTitle} 下载已开始`);
        })
        .catch(error => {
            // 恢复按钮状态
            downloadBtns.forEach(btn => {
                btn.innerHTML = '<i class="fas fa-download"></i> 下载';
                btn.disabled = false;
            });
            
            showToast(`获取下载链接失败: ${error.message}`);
            console.error('获取下载链接失败:', error);
        });
}


// 添加播放特效
function addPlayingEffects() {
    // 添加音乐播放器特效
    musicPlayer.classList.add('playing');
    
    // 平滑滚动到当前播放项
    const currentItem = document.querySelector(`.song-item[data-id="${currentSongId}"]`);
    if (currentItem) {
        currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 添加突出显示动画
        currentItem.classList.add('highlight-animation');
        setTimeout(() => {
            currentItem.classList.remove('highlight-animation');
        }, 1000);
    }
}

// 开始更新进度条
function startProgressUpdate() {
    // 清除已有的计时器
    if (updateProgressInterval) {
        clearInterval(updateProgressInterval);
    }
    
    // 设置新的计时器
    updateProgressInterval = setInterval(() => {
        if (!currentAudio || !isPlaying) return;
        
        const currentPos = currentAudio.currentTime;
        const duration = currentAudio.duration;
        
        // 更新进度条
        const progress = (currentPos / duration) * 100;
        progressBar.style.width = `${progress}%`;
        
        // 更新当前时间
        currentTime.textContent = formatTime(currentPos);
    }, 100);
}

// 切换播放/暂停
function togglePlay() {
    if (!currentAudio) return;
    
    if (isPlaying) {
        // 暂停播放
        currentAudio.pause();
        isPlaying = false;
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        musicPlayer.classList.remove('playing');
        
        // 清除进度条更新计时器
        if (updateProgressInterval) {
            clearInterval(updateProgressInterval);
            updateProgressInterval = null;
        }
    } else {
        // 继续播放
        currentAudio.play();
        isPlaying = true;
        playButton.innerHTML = '<i class="fas fa-pause"></i>';
        musicPlayer.classList.add('playing');
        
        // 重新开始更新进度条
        startProgressUpdate();
    }
    
    updatePlayingState();
}

// 停止音乐播放
function stopMusic() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    
    isPlaying = false;
    currentSongId = null;
    currentSongTitle = null;
    
    // 更新UI
    playButton.innerHTML = '<i class="fas fa-play"></i>';
    playerTitle.textContent = '未播放任何歌曲';
    progressBar.style.width = '0%';
    currentTime.textContent = '00:00';
    totalTime.textContent = '00:00';
    musicPlayer.classList.remove('playing');
    
    // 清除进度条更新计时器
    if (updateProgressInterval) {
        clearInterval(updateProgressInterval);
        updateProgressInterval = null;
    }
    
    updatePlayingState();
}

// 跳转到指定位置
function seekTo(position) {
    if (!currentAudio) return;
    
    currentAudio.currentTime = position * currentAudio.duration;
    
    // 更新进度条
    progressBar.style.width = `${position * 100}%`;
    
    // 更新当前时间
    currentTime.textContent = formatTime(currentAudio.currentTime);
}

// 设置音量
function setVolume(volume) {
    // 限制音量在0-1之间
    volume = Math.max(0, Math.min(1, volume));
    currentVolume = volume;
    
    // 更新UI
    volumeProgress.style.width = `${volume * 100}%`;
    
    // 设置当前音频音量
    if (currentAudio) {
        currentAudio.volume = volume;
    }
    
    // 更新音量图标
    updateVolumeIcon();
}

// 切换静音
function toggleMute() {
    if (currentVolume > 0) {
        // 记住当前音量，然后设置为0
        lastVolume = currentVolume;
        setVolume(0);
    } else {
        // 恢复之前的音量
        setVolume(lastVolume || 0.7);
    }
}

// 更新音量图标
function updateVolumeIcon() {
    if (currentVolume === 0) {
        volumeIcon.innerHTML = '<i class="fas fa-volume-mute"></i>';
    } else if (currentVolume < 0.5) {
        volumeIcon.innerHTML = '<i class="fas fa-volume-down"></i>';
    } else {
        volumeIcon.innerHTML = '<i class="fas fa-volume-up"></i>';
    }
}

// 更新播放状态
function updatePlayingState() {
    // 更新所有歌曲项的播放状态
    document.querySelectorAll('.song-item').forEach(item => {
        const id = item.getAttribute('data-id');
        const isCurrentPlaying = id === currentSongId && isPlaying;
        
        // 更新播放状态类
        item.classList.toggle('playing', isCurrentPlaying);
        
        // 更新播放按钮
        const playBtn = item.querySelector('.btn-play');
        if (playBtn) {
            if (isCurrentPlaying) {
                playBtn.innerHTML = '<i class="fas fa-pause"></i> 暂停';
            } else {
                playBtn.innerHTML = '<i class="fas fa-play"></i> 播放';
            }
        }
        
        // 更新音波动画
        const songTitle = item.querySelector('.song-title');
        if (songTitle) {
            if (isCurrentPlaying) {
                if (!songTitle.querySelector('.playing-animation')) {
                    songTitle.innerHTML = `${songTitle.textContent.replace(/🎵 播放中/, '')}
                        <div class="playing-animation">
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                        </div>`;
                }
            } else {
                songTitle.innerHTML = songTitle.textContent.replace(/🎵 播放中/, '');
            }
        }
    });
}

// 格式化时间为mm:ss
function formatTime(seconds) {
    seconds = Math.round(seconds);
    const minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 显示提示消息
function showToast(message) {
    // 创建新的状态条元素，允许多个消息同时显示
    const newStatusBar = document.createElement('div');
    newStatusBar.className = 'status-bar';
    newStatusBar.textContent = message;
    document.body.appendChild(newStatusBar);
    
    // 添加延迟使CSS转换生效
    setTimeout(() => {
        newStatusBar.classList.add('active');
    }, 10);
    
    // 3秒后自动消失
    setTimeout(() => {
        newStatusBar.classList.remove('active');
        
        // 500ms后完全移除元素（等待过渡动画完成）
        setTimeout(() => {
            document.body.removeChild(newStatusBar);
        }, 500);
    }, 3000);
    
    console.log(message);
}

// 更新URL参数
function updateURL(query) {
    const url = new URL(window.location);
    url.searchParams.set('query', query);
    window.history.pushState({}, '', url);
}

// 初始化动态背景
function initDynamicBackground() {
    const backgrounds = [
        'https://source.unsplash.com/random/1920x1080/?music,concert',
        'https://source.unsplash.com/random/1920x1080/?music,piano',
        'https://source.unsplash.com/random/1920x1080/?music,guitar',
        'https://source.unsplash.com/random/1920x1080/?music,vinyl',
        'https://source.unsplash.com/random/1920x1080/?music,headphones',
        'https://source.unsplash.com/random/1920x1080/?music,dj'
    ];
    
    let currentBg = 0;
    
    // 预加载图片
    const preloadImages = () => {
        backgrounds.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    };
    
    preloadImages();
    
    // 每隔一段时间更换背景
    setInterval(() => {
        currentBg = (currentBg + 1) % backgrounds.length;
        
        const newBgImg = new Image();
        newBgImg.src = backgrounds[currentBg];
        
        newBgImg.onload = () => {
            document.body.style.backgroundImage = `url('${backgrounds[currentBg]}')`;
        };
    }, 30000); // 每30秒切换一次
}

// 初始化音频可视化器
function initAudioVisualizer() {
    if (!musicPlayer) return;
    
    const visualizerContainer = document.createElement('div');
    visualizerContainer.className = 'audio-visualizer';
    
    // 添加可视化元素
    for (let i = 0; i < 20; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        visualizerContainer.appendChild(bar);
    }
    
    // 添加到音乐播放器中
    const playerContent = musicPlayer.querySelector('.player-content');
    if (playerContent) {
        playerContent.appendChild(visualizerContainer);
    }
    
    // 更新可视化效果
    function updateVisualizer() {
        if (!currentAudio || !isPlaying) {
            // 当没有播放时，随机生成波形以实现静态效果
            visualizerContainer.querySelectorAll('.visualizer-bar').forEach(bar => {
                const height = Math.random() * 20 + 5;
                bar.style.height = `${height}px`;
                bar.style.opacity = '0.3';
            });
            return;
        }
        
        // 模拟音频波形效果，由于没有实际访问音频数据，这里使用随机值
        visualizerContainer.querySelectorAll('.visualizer-bar').forEach(bar => {
            const height = Math.random() * 40 + 10;
            bar.style.height = `${height}px`;
            bar.style.opacity = '1';
        });
    }
    
    // 初始化更新器
    setInterval(updateVisualizer, 100);
}

// 初始化主题切换功能
function initThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    const root = document.documentElement;
    
    // 检查本地存储中的主题设置
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // 应用初始主题
    if (isDarkMode) {
        root.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // 添加主题切换事件
    themeToggle.addEventListener('click', () => {
        // 切换主题类
        root.classList.toggle('dark-theme');
        
        // 更新图标
        const isDark = root.classList.contains('dark-theme');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        // 保存到本地存储
        localStorage.setItem('darkMode', isDark);
        
        // 显示提示
        showToast(isDark ? '🌙 已切换到深色模式' : '☀️ 已切换到浅色模式');
        
        // 添加过渡动画
        document.body.classList.add('theme-transition');
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 1000);
    });
} 