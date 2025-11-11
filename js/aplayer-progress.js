<link rel="stylesheet" class="aplayer-secondary-style-marker" href="\assets\css\APlayer.min.css"><script src="\assets\js\APlayer.min.js" class="aplayer-secondary-script-marker"></script>/**
 * APlayer 播放进度保存和恢复功能
 * 支持页面切换时保留音乐播放进度
 */
(function() {
  // 存储键名
  const STORAGE_KEY = 'aplayer_progress';
  const STORAGE_PLAYING_KEY = 'aplayer_playing';
  const STORAGE_URL_KEY = 'aplayer_url';
  
  // 获取播放器的音频 URL
  function getAudioUrl(aplayer) {
    if (!aplayer || !aplayer.audio) return null;
    // 优先使用 audio.src
    if (aplayer.audio.src) {
      return aplayer.audio.src.split('?')[0]; // 移除查询参数以便比较
    }
    return null;
  }
  
  // 保存播放进度
  function saveProgress(aplayer) {
    if (!aplayer || !aplayer.audio) return;
    
    const currentTime = aplayer.audio.currentTime;
    const duration = aplayer.audio.duration;
    const url = getAudioUrl(aplayer);
    const isPlaying = !aplayer.audio.paused;
    
    if (url && duration && duration > 0) {
      localStorage.setItem(STORAGE_KEY, currentTime.toString());
      localStorage.setItem(STORAGE_URL_KEY, url);
      localStorage.setItem(STORAGE_PLAYING_KEY, isPlaying.toString());
    }
  }
  
  // 恢复播放进度
  function restoreProgress(aplayer) {
    if (!aplayer || !aplayer.audio) return;
    
    const savedUrl = localStorage.getItem(STORAGE_URL_KEY);
    const currentUrl = getAudioUrl(aplayer);
    
    // 只有当前播放的歌曲与保存的歌曲一致时才恢复进度
    if (savedUrl && currentUrl && (savedUrl === currentUrl || savedUrl.includes(currentUrl) || currentUrl.includes(savedUrl))) {
      const savedProgress = parseFloat(localStorage.getItem(STORAGE_KEY) || '0');
      const wasPlaying = localStorage.getItem(STORAGE_PLAYING_KEY) === 'true';
      
      if (savedProgress > 0) {
        // 等待音频加载完成后恢复进度
        const restore = () => {
          if (aplayer.audio.duration > 0 && savedProgress < aplayer.audio.duration) {
            aplayer.audio.currentTime = savedProgress;
            // 如果之前是播放状态且当前是暂停状态，则继续播放
            if (wasPlaying && aplayer.audio.paused) {
              // 延迟一下确保 currentTime 已设置
              setTimeout(() => {
                aplayer.play().catch(() => {
                  // 忽略自动播放被阻止的错误
                });
              }, 100);
            }
          }
        };
        
        // 如果音频已经加载好，直接恢复
        if (aplayer.audio.readyState >= 2) {
          restore();
        } else if (aplayer.audio.readyState >= 1) {
          // 有元数据但可能还没加载完，等待 canplay
          aplayer.audio.addEventListener('canplay', restore, { once: true });
        } else {
          // 还没加载，等待 loadedmetadata
          aplayer.audio.addEventListener('loadedmetadata', function handler() {
            if (aplayer.audio.readyState >= 2) {
              restore();
            } else {
              aplayer.audio.addEventListener('canplay', restore, { once: true });
            }
            aplayer.audio.removeEventListener('loadedmetadata', handler);
          }, { once: true });
        }
      }
    }
  }
  
  // 存储已初始化的播放器，避免重复绑定
  let initializedPlayer = null;
  let saveTimer = null;
  
  // 初始化 APlayer 进度保存功能
  function initAplayerProgress() {
    // 如果已经初始化过，先清理旧的事件监听器
    if (initializedPlayer && initializedPlayer.audio) {
      // 注意：由于我们使用了匿名函数，无法完全移除，但可以通过标记来避免重复执行
      // 这里我们重新查找播放器，因为页面切换可能导致播放器重新创建
    }
    
    // 等待 APlayer 初始化完成
    const checkAplayer = setInterval(() => {
      if (window.aplayers && window.aplayers.length > 0) {
        clearInterval(checkAplayer);
        
        // 找到固定的播放器（通常是全局播放器）
        const fixedPlayer = window.aplayers.find(ap => ap.options && ap.options.fixed);
        if (fixedPlayer && fixedPlayer !== initializedPlayer) {
          initializedPlayer = fixedPlayer;
          
          // 恢复播放进度（延迟一下确保音频已开始加载）
          setTimeout(() => {
            restoreProgress(fixedPlayer);
          }, 300);
          
          // 监听时间更新，定期保存进度
          fixedPlayer.audio.addEventListener('timeupdate', () => {
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
              saveProgress(fixedPlayer);
            }, 1000); // 每秒保存一次
          });
          
          // 监听播放/暂停状态变化
          fixedPlayer.audio.addEventListener('play', () => {
            saveProgress(fixedPlayer);
          });
          
          fixedPlayer.audio.addEventListener('pause', () => {
            saveProgress(fixedPlayer);
          });
          
          // 监听音频结束，清除保存的进度
          fixedPlayer.audio.addEventListener('ended', () => {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_URL_KEY);
            localStorage.removeItem(STORAGE_PLAYING_KEY);
          });
          
          // 监听播放列表切换（播放列表模式）
          fixedPlayer.on('listswitch', () => {
            // 切换歌曲时，清除旧歌曲的进度，保存当前歌曲进度
            setTimeout(() => {
              if (fixedPlayer.audio) {
                saveProgress(fixedPlayer);
              }
            }, 500);
          });
        }
      }
    }, 100);
    
    // 10秒后停止检查，避免无限循环
    setTimeout(() => clearInterval(checkAplayer), 10000);
  }
  
  // 页面卸载前保存进度
  window.addEventListener('beforeunload', () => {
    if (initializedPlayer) {
      saveProgress(initializedPlayer);
    }
  });
  
  // 页面隐藏时保存进度（移动端切换应用时）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && initializedPlayer) {
      saveProgress(initializedPlayer);
    }
  });
  
  // 页面加载完成后初始化进度保存功能
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAplayerProgress);
  } else {
    initAplayerProgress();
  }
  
  // 如果使用 pjax，在页面切换后重新初始化
  if (window.btf && window.btf.addGlobalFn) {
    window.btf.addGlobalFn('pjaxComplete', initAplayerProgress, 'aplayerProgress');
  }
})();

