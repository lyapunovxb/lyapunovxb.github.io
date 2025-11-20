/**
 * 为布局7添加渐变背景兼容性支持
 * 当文章没有封面图片或图片加载失败时，自动应用渐变背景
 */
(function() {
  function addGradientBackground() {
    const masonryPosts = document.querySelector('#recent-posts.masonry');
    if (!masonryPosts) return;
    
    const covers = masonryPosts.querySelectorAll('.recent-post-item .post_cover');
    covers.forEach(function(cover) {
      // 检查是否已经有no-cover-img类
      if (cover.classList.contains('no-cover-img')) return;
      
      const img = cover.querySelector('img.post-bg');
      const divBg = cover.querySelector('div.post-bg');
      
      // 如果没有图片，或者图片加载失败，添加类名
      if (!img) {
        // 如果有div背景，不需要添加（div背景会使用CSS渐变）
        if (!divBg) {
          cover.classList.add('no-cover-img');
        }
      } else {
        // 检查图片是否加载失败
        if (img.complete && img.naturalHeight === 0) {
          cover.classList.add('no-cover-img');
        } else {
          // 监听图片加载错误
          img.addEventListener('error', function() {
            cover.classList.add('no-cover-img');
          }, { once: true });
        }
      }
    });
  }
  
  // 页面加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addGradientBackground);
  } else {
    addGradientBackground();
  }
  
  // 如果使用 pjax，在页面切换后重新执行
  if (window.btf && window.btf.addGlobalFn) {
    window.btf.addGlobalFn('pjaxComplete', addGradientBackground, 'masonryGradientBg');
  }
})();

