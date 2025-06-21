/**
 * UI管理器类
 * 负责用户界面的交互、状态管理和视觉效果
 */
class UIManager {
  constructor(app) {
    this.app = app;
    this.currentTheme = 'dark';
    this.sidebarVisible = true;
    this.findDialogVisible = false;
    this.currentViewMode = 'editor';
    
    // UI元素引用
    this.elements = {
      sidebar: document.getElementById('sidebar'),
      mainContent: document.getElementById('main-content'),
      editorArea: document.getElementById('editor-area'),
      previewArea: document.getElementById('preview-area'),
      tabBar: document.getElementById('tab-bar'),
      findDialog: document.getElementById('find-dialog'),
      statusBar: document.getElementById('status-bar')
    };
    
    // 标签页管理
    this.tabs = new Map();
    this.activeTabId = null;
    
    this.init();
  }
  
  /**
   * 初始化UI管理器
   */
  init() {
    this.setupTheme();
    this.setupFindDialog();
    this.setupResizers();
    this.setupTooltips();
    this.setupAnimations();
    this.setupFontControls();
    
    console.log('UI管理器初始化完成');
  }
  
  /**
   * 设置主题
   */
  setupTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    
    // 监听系统主题变化
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addListener((e) => {
        if (this.currentTheme === 'auto') {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }
  
  /**
   * 设置查找对话框
   */
  setupFindDialog() {
    if (!this.elements.findDialog) {
      console.error('Find dialog element not found');
      return;
    }
    
    const findInput = this.elements.findDialog.querySelector('#find-input');
    const replaceInput = this.elements.findDialog.querySelector('#replace-input');
    const findNextBtn = this.elements.findDialog.querySelector('#find-next-btn');
    const findPrevBtn = this.elements.findDialog.querySelector('#find-prev-btn');
    const replaceBtn = this.elements.findDialog.querySelector('#replace-btn');
    const replaceAllBtn = this.elements.findDialog.querySelector('#replace-all-btn');
    const closeFindBtn = this.elements.findDialog.querySelector('#close-find-btn');
    
    console.log('Find dialog elements:', {
      findInput: !!findInput,
      replaceInput: !!replaceInput,
      findNextBtn: !!findNextBtn,
      findPrevBtn: !!findPrevBtn,
      replaceBtn: !!replaceBtn,
      replaceAllBtn: !!replaceAllBtn,
      closeFindBtn: !!closeFindBtn
    });
    
    // 查找输入事件
    findInput?.addEventListener('input', (e) => {
      this.handleFindInput(e.target.value);
    });
    
    findInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          this.findPrevious();
        } else {
          this.findNext();
        }
      }
    });
    
    // 替换输入事件
    replaceInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.replace();
      }
    });
    
    // 按钮事件
    findNextBtn?.addEventListener('click', () => this.findNext());
    findPrevBtn?.addEventListener('click', () => this.findPrevious());
    replaceBtn?.addEventListener('click', () => this.replace());
    replaceAllBtn?.addEventListener('click', () => this.replaceAll());
    closeFindBtn?.addEventListener('click', () => this.hideFindDialog());
  }
  
  /**
   * 设置调整器
   */
  setupResizers() {
    // 侧边栏调整器
    const sidebarResizer = document.querySelector('.sidebar-resizer');
    if (sidebarResizer) {
      this.setupResizer(sidebarResizer, 'sidebar', 'width', 200, 500);
    }
    
    // 编辑器/预览分割器
    const editorResizer = document.querySelector('.editor-resizer');
    if (editorResizer) {
      this.setupResizer(editorResizer, 'editor-area', 'width', 300, null);
    }
  }
  
  /**
   * 设置单个调整器
   */
  setupResizer(resizer, targetId, property, minSize, maxSize) {
    let isResizing = false;
    let startPos = 0;
    let startSize = 0;
    
    const target = document.getElementById(targetId);
    if (!target) return;
    
    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startPos = property === 'width' ? e.clientX : e.clientY;
      startSize = property === 'width' ? target.offsetWidth : target.offsetHeight;
      
      document.body.style.cursor = property === 'width' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      const currentPos = property === 'width' ? e.clientX : e.clientY;
      const delta = currentPos - startPos;
      let newSize = startSize + delta;
      
      // 应用大小限制
      if (minSize && newSize < minSize) newSize = minSize;
      if (maxSize && newSize > maxSize) newSize = maxSize;
      
      target.style[property] = newSize + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }
  
  /**
   * 设置工具提示
   */
  setupTooltips() {
    document.querySelectorAll('[title]').forEach(element => {
      this.createTooltip(element);
    });
  }
  
  /**
   * 创建工具提示
   */
  createTooltip(element) {
    const title = element.getAttribute('title');
    if (!title) return;
    
    // 移除原生title属性
    element.removeAttribute('title');
    
    let tooltip = null;
    
    element.addEventListener('mouseenter', () => {
      tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = title;
      document.body.appendChild(tooltip);
      
      // 定位工具提示
      const rect = element.getBoundingClientRect();
      tooltip.style.left = rect.left + rect.width / 2 + 'px';
      tooltip.style.top = rect.bottom + 5 + 'px';
      
      // 动画显示
      requestAnimationFrame(() => {
        tooltip.classList.add('visible');
      });
    });
    
    element.addEventListener('mouseleave', () => {
      if (tooltip) {
        tooltip.classList.remove('visible');
        setTimeout(() => {
          if (tooltip && tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
          }
        }, 200);
        tooltip = null;
      }
    });
  }
  
  /**
   * 设置动画
   */
  setupAnimations() {
    // 为按钮添加点击动画
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.createRippleEffect(e);
      });
    });
  }
  
  /**
   * 创建波纹效果
   */
  createRippleEffect(e) {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }
  
  /**
   * 标签页管理
   */
  
  /**
   * 创建标签页元素
   */
  createTabElement(tab) {
    if (!this.elements.tabBar) return;
    
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.dataset.tabId = tab.id;
    
    tabElement.innerHTML = `
      <span class="tab-icon">
        <i class="fas fa-file-alt"></i>
      </span>
      <span class="tab-name">${tab.name}</span>
      <span class="tab-modified" style="display: none">
        <i class="fas fa-circle"></i>
      </span>
      <button class="tab-close" title="关闭">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // 标签页点击事件
    tabElement.addEventListener('click', (e) => {
      if (!e.target.closest('.tab-close')) {
        this.app.switchToTab(tab.id);
      }
    });
    
    // 关闭按钮事件
    const closeBtn = tabElement.querySelector('.tab-close');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.app.closeTab(tab.id);
    });
    
    // 中键点击关闭
    tabElement.addEventListener('mousedown', (e) => {
      if (e.button === 1) { // 中键
        e.preventDefault();
        this.app.closeTab(tab.id);
      }
    });
    
    this.elements.tabBar.appendChild(tabElement);
    this.tabs.set(tab.id, tabElement);
  }
  
  /**
   * 移除标签页元素
   */
  removeTabElement(tabId) {
    const tabElement = this.tabs.get(tabId);
    if (tabElement && tabElement.parentNode) {
      tabElement.parentNode.removeChild(tabElement);
      this.tabs.delete(tabId);
    }
  }
  
  /**
   * 设置活动标签页
   */
  setActiveTab(tabId) {
    // 移除之前的活动状态
    this.tabs.forEach(tab => {
      tab.classList.remove('active');
    });
    
    // 设置新的活动标签页
    const tabElement = this.tabs.get(tabId);
    if (tabElement) {
      tabElement.classList.add('active');
      this.activeTabId = tabId;
      
      // 确保标签页可见
      this.scrollTabIntoView(tabElement);
    }
  }
  
  /**
   * 更新标签页名称
   */
  updateTabName(tabId, name) {
    const tabElement = this.tabs.get(tabId);
    if (tabElement) {
      const nameElement = tabElement.querySelector('.tab-name');
      if (nameElement) {
        nameElement.textContent = name;
      }
    }
  }
  
  /**
   * 标记标签页为已修改
   */
  markTabAsModified(tabId, isModified) {
    const tabElement = this.tabs.get(tabId);
    if (tabElement) {
      const modifiedIndicator = tabElement.querySelector('.tab-modified');
      if (modifiedIndicator) {
        modifiedIndicator.style.display = isModified ? 'inline' : 'none';
      }
    }
  }
  
  /**
   * 滚动标签页到可见区域
   */
  scrollTabIntoView(tabElement) {
    if (!this.elements.tabBar) return;
    
    const tabBarRect = this.elements.tabBar.getBoundingClientRect();
    const tabRect = tabElement.getBoundingClientRect();
    
    if (tabRect.left < tabBarRect.left) {
      this.elements.tabBar.scrollLeft -= tabBarRect.left - tabRect.left;
    } else if (tabRect.right > tabBarRect.right) {
      this.elements.tabBar.scrollLeft += tabRect.right - tabBarRect.right;
    }
  }
  
  /**
   * 视图模式管理
   */
  
  /**
   * 设置视图模式
   */
  setViewMode(mode) {
    this.currentViewMode = mode;
    
    const { editorArea, previewArea } = this.elements;
    if (!editorArea || !previewArea) return;
    
    // 移除所有视图模式类
    document.body.classList.remove('view-editor', 'view-split', 'view-preview');
    
    switch (mode) {
      case 'editor':
        document.body.classList.add('view-editor');
        editorArea.style.display = 'block';
        previewArea.style.display = 'none';
        break;
        
      case 'split':
        document.body.classList.add('view-split');
        editorArea.style.display = 'block';
        previewArea.style.display = 'block';
        break;
        
      case 'preview':
        document.body.classList.add('view-preview');
        editorArea.style.display = 'none';
        previewArea.style.display = 'block';
        break;
    }
    
    // 触发窗口调整事件
    window.dispatchEvent(new Event('resize'));
  }
  
  /**
   * 侧边栏管理
   */
  
  /**
   * 切换侧边栏
   */
  toggleSidebar(visible = null) {
    if (visible === null) {
      this.sidebarVisible = !this.sidebarVisible;
    } else {
      this.sidebarVisible = visible;
    }
    
    if (this.elements.sidebar) {
      this.elements.sidebar.style.display = this.sidebarVisible ? 'block' : 'none';
    }
    
    // 更新主内容区域
    if (this.elements.mainContent) {
      this.elements.mainContent.classList.toggle('sidebar-hidden', !this.sidebarVisible);
    }
    
    // 触发窗口调整事件
    window.dispatchEvent(new Event('resize'));
  }
  
  /**
   * 查找对话框管理
   */
  
  /**
   * 显示查找对话框
   */
  showFindDialog(showReplace = false) {
    if (!this.elements.findDialog) return;
    
    this.findDialogVisible = true;
    this.elements.findDialog.style.display = 'block';
    
    // 显示/隐藏替换区域
    const replaceArea = this.elements.findDialog.querySelector('.replace-input-group');
    if (replaceArea) {
      replaceArea.style.display = showReplace ? 'block' : 'none';
    }
    
    // 聚焦到查找输入框
    const findInput = this.elements.findDialog.querySelector('#find-input');
    if (findInput) {
      findInput.focus();
      findInput.select();
    }
    
    // 添加动画类
    this.elements.findDialog.classList.add('show');
  }
  
  /**
   * 隐藏查找对话框
   */
  hideFindDialog() {
    if (!this.elements.findDialog) return;
    
    this.findDialogVisible = false;
    this.elements.findDialog.classList.remove('show');
    
    setTimeout(() => {
      this.elements.findDialog.style.display = 'none';
    }, 200);
    
    // 清除搜索高亮
    this.clearSearchHighlights();
    
    // 重新聚焦编辑器
    if (this.app.editor) {
      this.app.editor.focus();
    }
  }
  
  /**
   * 查找功能
   */
  
  /**
   * 处理查找输入
   */
  handleFindInput(searchText) {
    if (!searchText) {
      this.clearSearchHighlights();
      return;
    }
    
    // 在编辑器中查找
    if (this.app.editor) {
      this.app.editor.find(searchText, this.getFindOptions());
    }
    
    // 在预览中查找
    if (this.app.preview) {
      this.app.preview.highlightText(searchText, this.getFindOptions());
    }
  }
  
  /**
   * 查找下一个
   */
  findNext() {
    const findInput = this.elements.findDialog?.querySelector('#find-input');
    const searchText = findInput?.value;
    
    if (searchText && this.app.editor) {
      this.app.editor.findNext(searchText, this.getFindOptions());
    }
  }
  
  /**
   * 查找上一个
   */
  findPrevious() {
    const findInput = this.elements.findDialog?.querySelector('#find-input');
    const searchText = findInput?.value;
    
    if (searchText && this.app.editor) {
      this.app.editor.findPrevious(searchText, this.getFindOptions());
    }
  }
  
  /**
   * 替换
   */
  replace() {
    const findInput = this.elements.findDialog?.querySelector('#find-input');
    const replaceInput = this.elements.findDialog?.querySelector('#replace-input');
    
    const searchText = findInput?.value;
    const replaceText = replaceInput?.value || '';
    
    console.log('=== REPLACE DEBUG ===');
    console.log('Search text:', searchText);
    console.log('Replace text:', replaceText);
    console.log('Editor exists:', !!this.app.editor);
    console.log('Editor element:', this.app.editor?.element);
    console.log('Current content:', this.app.editor?.getContent()?.substring(0, 100));
    console.log('Current selection:', window.getSelection().toString());
    
    if (searchText && this.app.editor) {
      const result = this.app.editor.replace(searchText, replaceText, this.getFindOptions());
      console.log('Replace result:', result);
      console.log('Content after replace:', this.app.editor?.getContent()?.substring(0, 100));
      
      if (result) {
        this.app.showSuccess('已替换 1 处');
      } else {
        this.app.showInfo('未找到匹配的文本');
      }
    } else {
      console.log('Missing search text or editor');
      if (!searchText) console.log('No search text provided');
      if (!this.app.editor) console.log('No editor instance');
    }
    console.log('=== END REPLACE DEBUG ===');
  }
  
  /**
   * 全部替换
   */
  replaceAll() {
    const findInput = this.elements.findDialog?.querySelector('#find-input');
    const replaceInput = this.elements.findDialog?.querySelector('#replace-input');
    
    const searchText = findInput?.value;
    const replaceText = replaceInput?.value || '';
    
    if (searchText && this.app.editor) {
      const count = this.app.editor.replaceAll(searchText, replaceText, this.getFindOptions());
      this.app.showSuccess(`已替换 ${count} 处`);
    }
  }
  
  /**
   * 获取查找选项
   */
  getFindOptions() {
    const caseSensitive = this.elements.findDialog?.querySelector('#case-sensitive')?.checked || false;
    const wholeWord = this.elements.findDialog?.querySelector('#whole-word')?.checked || false;
    const regex = this.elements.findDialog?.querySelector('#regex')?.checked || false;
    
    return { caseSensitive, wholeWord, regex };
  }
  
  /**
   * 清除搜索高亮
   */
  clearSearchHighlights() {
    // 清除编辑器高亮
    if (this.app.editor) {
      this.app.editor.clearHighlights();
    }
    
    // 清除预览高亮
    if (this.app.preview) {
      this.app.preview.clearHighlights();
    }
  }
  
  /**
   * 主题管理
   */
  
  /**
   * 切换主题
   */
  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }
  
  /**
   * 设置主题
   */
  setTheme(theme) {
    this.currentTheme = theme;
    this.applyTheme(theme);
    
    // 保存主题设置
    if (window.electronAPI && window.electronAPI.setTheme) {
      window.electronAPI.setTheme(theme);
    }
  }
  
  /**
   * 应用主题
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // 更新编辑器主题
    if (this.app.editor) {
      this.app.editor.updateSettings({ theme });
    }
    
    // 更新预览主题
    if (this.app.preview) {
      this.app.preview.setTheme(theme);
    }
  }
  
  /**
   * 状态栏管理
   */
  
  /**
   * 更新状态栏
   */
  updateStatusBar(info) {
    if (!this.elements.statusBar) return;
    
    const {
      line = 1,
      column = 1,
      length = 0,
      selection = 0,
      encoding = 'UTF-8',
      lineEnding = 'LF'
    } = info;
    
    // 更新各个状态项
    this.updateStatusItem('cursor-line', line);
    this.updateStatusItem('cursor-column', column);
    this.updateStatusItem('content-length', length);
    this.updateStatusItem('selection-length', selection);
    this.updateStatusItem('file-encoding', encoding);
    this.updateStatusItem('line-ending', lineEnding);
  }
  
  /**
   * 更新状态项
   */
  updateStatusItem(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }
  
  /**
   * 通知系统
   */
  
  /**
   * 显示通知
   */
  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${this.getNotificationIcon(type)}"></i>
      <span>${message}</span>
      <button class="notification-close">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示动画
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });
    
    // 关闭按钮事件
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.hideNotification(notification);
    });
    
    // 自动关闭
    if (duration > 0) {
      setTimeout(() => {
        this.hideNotification(notification);
      }, duration);
    }
    
    return notification;
  }
  
  /**
   * 隐藏通知
   */
  hideNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }
  
  /**
   * 获取通知图标
   */
  getNotificationIcon(type) {
    const icons = {
      info: 'info-circle',
      success: 'check-circle',
      warning: 'exclamation-triangle',
      error: 'times-circle'
    };
    return icons[type] || 'info-circle';
  }
  
  /**
   * 工具方法
   */
  
  /**
   * 防抖函数
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  /**
   * 节流函数
   */
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  /**
   * 设置字体控制
   */
  setupFontControls() {
    // 字体控制元素
    const fontFamilySelect = document.getElementById('font-family-select');
    const fontSizeDisplay = document.getElementById('font-size-display');
    const increaseFontBtn = document.getElementById('increase-font-btn');
    const decreaseFontBtn = document.getElementById('decrease-font-btn');
    
    // 字体设置
    this.fontSettings = {
      family: 'JetBrains Mono',
      size: 14,
      minSize: 8,
      maxSize: 72
    };
    
    // 初始化字体设置
    this.loadFontSettings();
    this.updateFontDisplay();
    
    // 字体族选择事件
    if (fontFamilySelect) {
      fontFamilySelect.value = this.fontSettings.family;
      fontFamilySelect.addEventListener('change', (e) => {
        this.changeFontFamily(e.target.value);
      });
    }
    
    // 增大字体按钮
    if (increaseFontBtn) {
      increaseFontBtn.addEventListener('click', () => {
        this.increaseFontSize();
      });
    }
    
    // 减小字体按钮
    if (decreaseFontBtn) {
      decreaseFontBtn.addEventListener('click', () => {
        this.decreaseFontSize();
      });
    }
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          this.increaseFontSize();
        } else if (e.key === '-') {
          e.preventDefault();
          this.decreaseFontSize();
        }
      }
    });
    
    console.log('字体控制初始化完成');
  }
  
  /**
   * 加载字体设置
   */
  loadFontSettings() {
    try {
      const saved = localStorage.getItem('fontSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.fontSettings = { ...this.fontSettings, ...settings };
      }
    } catch (error) {
      console.warn('加载字体设置失败:', error);
    }
  }
  
  /**
   * 保存字体设置
   */
  saveFontSettings() {
    try {
      localStorage.setItem('fontSettings', JSON.stringify(this.fontSettings));
    } catch (error) {
      console.warn('保存字体设置失败:', error);
    }
  }
  
  /**
   * 更改字体族
   */
  changeFontFamily(fontFamily) {
    this.fontSettings.family = fontFamily;
    this.updateEditorFont();
    this.saveFontSettings();
    
    console.log('字体族已更改为:', fontFamily);
  }
  
  /**
   * 增大字体
   */
  increaseFontSize() {
    if (this.fontSettings.size < this.fontSettings.maxSize) {
      this.fontSettings.size += 1;
      this.updateFontDisplay();
      this.updateEditorFont();
      this.saveFontSettings();
    }
  }
  
  /**
   * 减小字体
   */
  decreaseFontSize() {
    if (this.fontSettings.size > this.fontSettings.minSize) {
      this.fontSettings.size -= 1;
      this.updateFontDisplay();
      this.updateEditorFont();
      this.saveFontSettings();
    }
  }
  
  /**
   * 更新字体显示
   */
  updateFontDisplay() {
    const fontSizeDisplay = document.getElementById('font-size-display');
    if (fontSizeDisplay) {
      fontSizeDisplay.textContent = `${this.fontSettings.size}px`;
    }
  }
  
  /**
   * 更新编辑器字体
   */
  updateEditorFont() {
    const editor = document.querySelector('.editor');
    if (editor) {
      editor.style.fontFamily = `'${this.fontSettings.family}', var(--font-mono)`;
      editor.style.fontSize = `${this.fontSettings.size}px`;
    }
    
    // 更新行号字体大小
    const lineNumbers = document.querySelectorAll('.line-number');
    lineNumbers.forEach(lineNumber => {
      lineNumber.style.fontSize = `${Math.max(10, this.fontSettings.size - 2)}px`;
    });
    
    // 同步更新编辑器对象的字体设置
    if (this.app && this.app.editor && this.app.editor.updateFontSettings) {
      this.app.editor.updateFontSettings(
        `'${this.fontSettings.family}', var(--font-mono)`,
        this.fontSettings.size
      );
    }
  }
  
  /**
   * 重置字体设置
   */
  resetFontSettings() {
    this.fontSettings = {
      family: 'JetBrains Mono',
      size: 14,
      minSize: 8,
      maxSize: 72
    };
    
    const fontFamilySelect = document.getElementById('font-family-select');
    if (fontFamilySelect) {
      fontFamilySelect.value = this.fontSettings.family;
    }
    
    this.updateFontDisplay();
    this.updateEditorFont();
    this.saveFontSettings();
    
    console.log('字体设置已重置');
  }
}