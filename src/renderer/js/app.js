/**
 * 主应用程序类
 * 负责应用的初始化、状态管理和核心功能协调
 */
class NotepadApp {
  constructor() {
    this.currentFile = null;
    this.isModified = false;
    this.viewMode = 'editor'; // editor, split, preview
    this.sidebarVisible = true;
    this.tabs = new Map();
    this.activeTabId = null;
    this.tabCounter = 0;
    
    // 性能监控
    this.performanceMarks = new Map();
    
    // 初始化组件
    this.editor = null;
    this.preview = null;
    this.fileManager = null;
    this.uiManager = null;
    
    // 延迟初始化，确保DOM已加载
    this.init();
  }
  
  /**
   * 初始化应用
   */
  async init() {
    try {
      this.markPerformance('app-init-start');
      
      // 初始化UI管理器
      this.uiManager = new UIManager(this);
      
      // 初始化编辑器
      this.editor = new Editor(this);
      
      // 初始化预览器
      this.preview = new Preview(this);
      
      // 初始化文件管理器
      this.fileManager = new FileManager(this);
      
      // 设置事件监听
      this.setupEventListeners();
      
      // 设置键盘快捷键
      this.setupKeyboardShortcuts();
      
      // 创建默认标签页
      this.createNewTab();
      
      // 应用初始视图模式
      this.setViewMode(this.viewMode);
      
      this.markPerformance('app-init-end');
      this.measurePerformance('app-init', 'app-init-start', 'app-init-end');
      
      console.log('Notepad++ 应用初始化完成');
      
    } catch (error) {
      console.error('应用初始化失败:', error);
      this.showError('应用初始化失败', error.message);
    }
  }
  
  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 窗口控制事件
    document.getElementById('minimize-btn')?.addEventListener('click', () => {
      window.windowAPI?.minimize();
    });
    
    document.getElementById('maximize-btn')?.addEventListener('click', () => {
      window.windowAPI?.maximize();
    });
    
    document.getElementById('close-btn')?.addEventListener('click', () => {
      this.handleAppClose();
    });
    
    // 工具栏事件
    document.getElementById('new-file-btn')?.addEventListener('click', () => {
      this.createNewTab();
    });
    
    document.getElementById('open-file-btn')?.addEventListener('click', () => {
      this.fileManager.openFile();
    });
    
    document.getElementById('open-folder-btn')?.addEventListener('click', () => {
      this.fileManager.openFolder();
    });
    
    document.getElementById('save-file-btn')?.addEventListener('click', () => {
      this.saveCurrentFile();
    });
    
    document.getElementById('undo-btn')?.addEventListener('click', () => {
      this.editor.undo();
    });
    
    document.getElementById('redo-btn')?.addEventListener('click', () => {
      this.editor.redo();
    });
    
    document.getElementById('find-btn')?.addEventListener('click', () => {
      this.showFindDialog();
    });
    
    document.getElementById('toolbar-replace-btn')?.addEventListener('click', () => {
      this.showReplaceDialog();
    });
    
    // 视图模式切换
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.setViewMode(mode);
      });
    });
    
    // 侧边栏切换
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      this.toggleSidebar();
    });
    
    // 标签页事件
    document.getElementById('new-tab-btn')?.addEventListener('click', () => {
      this.createNewTab();
    });
    
    // Electron IPC 事件
    if (window.electronAPI) {
      // 菜单事件
      window.electronAPI.onMenuNewFile(() => this.createNewTab());
      window.electronAPI.onMenuSaveFile(() => this.saveCurrentFile());
      window.electronAPI.onMenuSaveAs(() => this.saveCurrentFileAs());
      window.electronAPI.onMenuUndo(() => this.editor.undo());
      window.electronAPI.onMenuRedo(() => this.editor.redo());
      window.electronAPI.onMenuFind(() => this.showFindDialog());
      window.electronAPI.onMenuReplace(() => this.showReplaceDialog());
      window.electronAPI.onMenuViewMode((event, mode) => this.setViewMode(mode));
      window.electronAPI.onMenuToggleSidebar(() => this.toggleSidebar());
      
      // 文件系统事件
      window.electronAPI.onFileOpened((event, fileData) => {
        this.openFileFromData(fileData);
      });
      
      window.electronAPI.onFolderOpened((event, folderData) => {
        this.fileManager.openFolder(folderData);
      });
      
      window.electronAPI.onFileChanged((event, filePath) => {
        this.handleFileChanged(filePath);
      });
    }
    
    // 窗口事件
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
    
    // 拖拽事件
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      this.handleFileDrop(e);
    });
  }
  
  /**
   * 设置键盘快捷键
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      
      // 阻止某些默认行为
      if (ctrl && (e.key === 's' || e.key === 'o' || e.key === 'n')) {
        e.preventDefault();
      }
      
      // 文件操作
      if (ctrl && !shift && !alt) {
        switch (e.key) {
          case 'n':
            this.createNewTab();
            break;
          case 'o':
            this.fileManager.openFile();
            break;
          case 's':
            this.saveCurrentFile();
            break;
          case 'f':
            this.showFindDialog();
            break;
          case 'h':
            this.showReplaceDialog();
            break;
          case 'z':
            this.editor.undo();
            break;
          case 'y':
            this.editor.redo();
            break;
          case 'b':
            this.toggleSidebar();
            break;
          case '1':
            this.setViewMode('editor');
            break;
          case '2':
            this.setViewMode('split');
            break;
          case '3':
            this.setViewMode('preview');
            break;
          case 'w':
            this.closeCurrentTab();
            break;
        }
      }
      
      // 带Shift的快捷键
      if (ctrl && shift && !alt) {
        switch (e.key) {
          case 'O':
            this.fileManager.openFolder();
            break;
          case 'S':
            this.saveCurrentFileAs();
            break;
        }
      }
      
      // 标签页切换
      if (ctrl && !shift && !alt && e.key >= '1' && e.key <= '9') {
        const tabIndex = parseInt(e.key) - 1;
        this.switchToTabByIndex(tabIndex);
      }
      
      // ESC键关闭对话框
      if (e.key === 'Escape') {
        this.closeFindDialog();
      }
    });
  }
  
  /**
   * 创建新标签页
   */
  createNewTab(fileName = '未命名文档', content = '', filePath = null) {
    const tabId = `tab-${++this.tabCounter}`;
    const tab = {
      id: tabId,
      name: fileName,
      content: content,
      filePath: filePath,
      isModified: false,
      cursorPosition: { line: 0, column: 0 },
      scrollPosition: 0
    };
    
    this.tabs.set(tabId, tab);
    this.uiManager.createTabElement(tab);
    this.switchToTab(tabId);
    
    return tabId;
  }
  
  /**
   * 切换到指定标签页
   */
  switchToTab(tabId) {
    if (!this.tabs.has(tabId)) return;
    
    // 保存当前标签页状态
    if (this.activeTabId) {
      this.saveCurrentTabState();
    }
    
    // 切换到新标签页
    this.activeTabId = tabId;
    const tab = this.tabs.get(tabId);
    
    // 更新UI
    this.uiManager.setActiveTab(tabId);
    this.editor.setContent(tab.content);
    this.editor.setCursorPosition(tab.cursorPosition);
    this.editor.setScrollPosition(tab.scrollPosition);
    
    // 更新文件信息
    this.currentFile = tab.filePath;
    this.isModified = tab.isModified;
    this.updateFileStatus();
    
    // 更新预览
    this.preview.updateContent(tab.content);
  }
  
  /**
   * 关闭当前标签页
   */
  closeCurrentTab() {
    if (!this.activeTabId) return;
    
    const tab = this.tabs.get(this.activeTabId);
    if (tab.isModified) {
      // 询问是否保存
      const result = confirm(`文件 "${tab.name}" 已修改，是否保存？`);
      if (result) {
        this.saveCurrentFile();
      }
    }
    
    this.closeTab(this.activeTabId);
  }
  
  /**
   * 关闭指定标签页
   */
  closeTab(tabId) {
    if (!this.tabs.has(tabId)) return;
    
    this.tabs.delete(tabId);
    this.uiManager.removeTabElement(tabId);
    
    // 如果关闭的是当前标签页，切换到其他标签页
    if (this.activeTabId === tabId) {
      const remainingTabs = Array.from(this.tabs.keys());
      if (remainingTabs.length > 0) {
        this.switchToTab(remainingTabs[remainingTabs.length - 1]);
      } else {
        // 没有标签页了，创建新的
        this.createNewTab();
      }
    }
  }
  
  /**
   * 保存当前标签页状态
   */
  saveCurrentTabState() {
    if (!this.activeTabId) return;
    
    const tab = this.tabs.get(this.activeTabId);
    if (tab) {
      tab.content = this.editor.getContent();
      tab.cursorPosition = this.editor.getCursorPosition();
      tab.scrollPosition = this.editor.getScrollPosition();
      tab.isModified = this.isModified;
    }
  }
  
  /**
   * 设置视图模式
   */
  setViewMode(mode) {
    this.viewMode = mode;
    this.uiManager.setViewMode(mode);
    
    // 更新工具栏按钮状态
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // 当切换到包含预览的模式时，更新预览内容
    if ((mode === 'split' || mode === 'preview') && this.activeTabId) {
      const currentContent = this.editor.getContent();
      this.preview.updateContent(currentContent);
    }
  }
  
  /**
   * 切换侧边栏显示/隐藏
   */
  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
    this.uiManager.toggleSidebar(this.sidebarVisible);
  }
  
  /**
   * 保存当前文件
   */
  async saveCurrentFile() {
    if (!this.activeTabId) return;
    
    const tab = this.tabs.get(this.activeTabId);
    const content = this.editor.getContent();
    

    
    try {
      const result = await window.electronAPI.saveFile(tab.filePath, content);
      

      
      if (result.success) {
        tab.filePath = result.filePath;
        tab.isModified = false;
        tab.content = content;
        
        this.currentFile = result.filePath;
        this.isModified = false;
        
        // 更新标签页名称
        if (!tab.name || tab.name === '未命名文档') {
          tab.name = this.getFileNameFromPath(result.filePath);
          this.uiManager.updateTabName(this.activeTabId, tab.name);
        }
        
        this.updateFileStatus();
        this.showSuccess('文件保存成功');
      } else if (!result.canceled) {
        this.showError('保存失败', result.error);
      }
    } catch (error) {
      console.error('[DEBUG] 保存异常:', error);
      this.showError('保存失败', error.message);
    }
  }
  
  /**
   * 另存为
   */
  async saveCurrentFileAs() {
    if (!this.activeTabId) return;
    
    const content = this.editor.getContent();
    
    try {
      const result = await window.electronAPI.saveFile(null, content);
      
      if (result.success) {
        const tab = this.tabs.get(this.activeTabId);
        tab.filePath = result.filePath;
        tab.isModified = false;
        tab.content = content;
        tab.name = this.getFileNameFromPath(result.filePath);
        
        this.currentFile = result.filePath;
        this.isModified = false;
        
        this.uiManager.updateTabName(this.activeTabId, tab.name);
        this.updateFileStatus();
        this.showSuccess('文件保存成功');
      }
    } catch (error) {
      this.showError('保存失败', error.message);
    }
  }
  
  /**
   * 从文件数据打开文件
   */
  openFileFromData(fileData) {
    // 检查文件是否已经打开
    for (const [tabId, tab] of this.tabs) {
      if (tab.filePath === fileData.path) {
        // 文件已经打开，切换到该标签页
        this.switchToTab(tabId);
        return;
      }
    }
    
    // 文件未打开，创建新标签页
    const fileName = this.getFileNameFromPath(fileData.path);
    const tabId = this.createNewTab(fileName, fileData.content, fileData.path);
    
    // 监听文件变化
    if (window.electronAPI.watchFile) {
      window.electronAPI.watchFile(fileData.path);
    }
  }
  
  /**
   * 处理文件变化
   */
  handleFileChanged(filePath) {
    // 找到对应的标签页
    for (const [tabId, tab] of this.tabs) {
      if (tab.filePath === filePath) {
        // 询问是否重新加载
        const result = confirm(`文件 "${tab.name}" 已被外部程序修改，是否重新加载？`);
        if (result) {
          this.reloadFile(tabId);
        }
        break;
      }
    }
  }
  
  /**
   * 重新加载文件
   */
  async reloadFile(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.filePath) return;
    
    try {
      const result = await window.electronAPI.readFile(tab.filePath);
      if (result.success) {
        tab.content = result.content;
        tab.isModified = false;
        
        if (this.activeTabId === tabId) {
          this.editor.setContent(result.content);
          this.isModified = false;
          this.updateFileStatus();
        }
      }
    } catch (error) {
      this.showError('重新加载失败', error.message);
    }
  }
  
  /**
   * 处理文件拖拽
   */
  handleFileDrop(e) {
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.openFileFromData({
            path: file.path || file.name,
            content: e.target.result,
            name: file.name
          });
        };
        reader.readAsText(file);
      }
    });
  }
  
  /**
   * 显示查找对话框
   */
  showFindDialog() {
    this.uiManager.showFindDialog(false);
  }
  
  /**
   * 显示替换对话框
   */
  showReplaceDialog() {
    this.uiManager.showFindDialog(true);
  }
  
  /**
   * 关闭查找对话框
   */
  closeFindDialog() {
    this.uiManager.hideFindDialog();
  }
  
  /**
   * 更新文件状态显示
   */
  updateFileStatus() {
    const fileNameEl = document.getElementById('current-file-name');
    const filePathEl = document.getElementById('current-file-path');
    const fileIndicator = document.getElementById('file-indicator');
    
    if (this.activeTabId) {
      const tab = this.tabs.get(this.activeTabId);
      if (fileNameEl) fileNameEl.textContent = tab.name;
      if (filePathEl) filePathEl.textContent = tab.filePath || '';
      if (fileIndicator) {
        fileIndicator.classList.toggle('modified', tab.isModified);
      }
    }
  }
  
  /**
   * 标记内容已修改
   */
  markAsModified() {
    this.isModified = true;
    if (this.activeTabId) {
      const tab = this.tabs.get(this.activeTabId);
      tab.isModified = true;
      this.uiManager.markTabAsModified(this.activeTabId, true);
    }
    this.updateFileStatus();
  }
  
  /**
   * 检查是否有未保存的更改
   */
  hasUnsavedChanges() {
    for (const tab of this.tabs.values()) {
      if (tab.isModified) return true;
    }
    return false;
  }
  
  /**
   * 处理应用关闭
   */
  async handleAppClose() {
    if (this.hasUnsavedChanges()) {
      const result = confirm('有未保存的文件，确定要退出吗？');
      if (!result) return;
    }
    
    window.windowAPI?.close();
  }
  
  /**
   * 工具方法
   */
  getFileNameFromPath(filePath) {
    if (!filePath) return '未命名文档';
    return filePath.split(/[\\/]/).pop() || '未命名文档';
  }
  
  switchToTabByIndex(index) {
    const tabIds = Array.from(this.tabs.keys());
    if (index < tabIds.length) {
      this.switchToTab(tabIds[index]);
    }
  }
  
  /**
   * 性能监控方法
   */
  markPerformance(name) {
    if (window.performanceAPI) {
      window.performanceAPI.mark(name);
    }
    this.performanceMarks.set(name, Date.now());
  }
  
  measurePerformance(name, startMark, endMark) {
    if (window.performanceAPI) {
      window.performanceAPI.measure(name, startMark, endMark);
    }
    
    const start = this.performanceMarks.get(startMark);
    const end = this.performanceMarks.get(endMark);
    if (start && end) {
      console.log(`Performance [${name}]: ${end - start}ms`);
    }
  }
  
  /**
   * 消息显示方法
   */
  showSuccess(message) {
    console.log('Success:', message);
    // TODO: 实现通知系统
  }
  
  showError(title, message) {
    console.error('Error:', title, message);
    // TODO: 实现错误对话框
  }
  
  showWarning(message) {
    console.warn('Warning:', message);
    // TODO: 实现警告通知
  }
  
  showInfo(message) {
    console.info('Info:', message);
    // TODO: 实现信息通知
  }
}

// 应用启动
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new NotepadApp();
  
  // 全局错误处理
  window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    if (app) {
      app.showError('应用错误', e.error.message);
    }
  });
  
  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    if (app) {
      app.showError('异步错误', e.reason.message || e.reason);
    }
  });
});

// 导出给其他模块使用
window.app = app;