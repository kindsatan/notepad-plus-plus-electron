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
    this.outline = null;
    
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
      
      // 最后初始化大纲管理器，确保所有组件都已就绪
      setTimeout(() => {
        this.outline = new OutlineManager(this);
      }, 200);
      
      // 设置键盘快捷键
      this.setupKeyboardShortcuts();
      
      // 创建默认标签页
      this.createNewTab();
      
      // 应用初始视图模式
      this.setViewMode(this.viewMode);
      
      // 应用字体设置
      if (this.uiManager && this.uiManager.updateEditorFont) {
        this.uiManager.updateEditorFont();
      }
      
      // 更新分栏模式指示器
      this.updateSplitModeIndicator();
      
      this.markPerformance('app-init-end');
      this.measurePerformance('app-init', 'app-init-start', 'app-init-end');
      
    } catch (error) {
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
    
    window.electronAPI.onWordFileSelected((event, fileData) => {
      this.handleWordFileSelected(fileData);
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
          case 'd':
            // Ctrl+D: 切换分栏方向（水平/垂直）
            this.toggleSplitDirection();
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
          case 'D':
            // Ctrl+Shift+D: 强制切换到垂直分栏
            localStorage.setItem('verticalSplitEnabled', 'true');
            const activeTab = this.getActiveTab();
            if (activeTab && activeTab.fileType === 'image') {
              this.refreshImagePreview(activeTab.id);
            }
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
    const tabId = this.createNewTabWithoutSwitch(fileName, content, filePath);
    this.switchToTab(tabId);
    return tabId;
  }
  
  /**
   * 创建新标签页但不切换到该标签页
   */
  createNewTabWithoutSwitch(fileName = '未命名文档', content = '', filePath = null) {
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
    
    // 检查是否为图片文件
    if (tab.isImageFile) {
      // 自动设置为分栏模式
      if (this.viewMode !== 'split') {
        this.setViewMode('split');
      }
      
      this.setupImagePreview(tabId);
    } else {
      // 对于普通文件，恢复编辑器显示并设置内容
      // 恢复编辑器显示
      const editorContainer = document.querySelector('.editor-area');
      if (editorContainer) {
        // 移除图片预览容器（如果存在）
        const existingPreview = editorContainer.querySelector('.image-preview-container');
        if (existingPreview) {
          existingPreview.remove();
        }
        
        // 移除图片预览容器后，编辑器包装器会自动恢复正常显示
        const editorWrapper = editorContainer.querySelector('.editor-wrapper');
        if (editorWrapper) {
          // 确保编辑器本身也是可见的
          const editor = editorWrapper.querySelector('.editor');
          if (editor) {
            editor.style.display = '';
          }
        }
      }
      
      this.editor.setContent(tab.content);
      this.editor.setCursorPosition(tab.cursorPosition);
      this.editor.setScrollPosition(tab.scrollPosition);
      
      // 更新预览
      this.preview.updateContent(tab.content);
    }
    
    // 更新文件信息
    this.currentFile = tab.filePath;
    this.isModified = tab.isModified;
    this.updateFileStatus();
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
      const tab = this.tabs.get(this.activeTabId);
      // 只有非图片文件才更新Markdown预览内容
      if (!tab || !tab.isImageFile) {
        const currentContent = this.editor.getContent();
        this.preview.updateContent(currentContent);
      }
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
    const tabId = this.createNewTabWithoutSwitch(fileName, fileData.content, fileData.path);
    
    // 获取创建的标签页对象
    const tab = this.tabs.get(tabId);
    
    // 如果是Word文档，标记相关信息
    if (fileData.isWordDocument) {
      tab.isWordDocument = true;
      tab.originalFormat = fileData.originalFormat;
      
      // 添加转换为Markdown的按钮或提示
      this.addWordDocumentActions(tabId);
    }
    
    // 如果是图片文件，标记相关信息并设置预览模式
    if (fileData.isImageFile) {
      tab.isImageFile = true;
      tab.imageData = fileData.imageData;
    } else {
      // 确保非图片文件的isImageFile属性为false
      tab.isImageFile = false;
    }
    
    // 现在切换到新创建的标签页，此时所有属性都已设置完毕
    this.switchToTab(tabId);
    
    // 监听文件变化（Word文档和图片文件不需要监听原文件变化）
    if (window.electronAPI.watchFile && !fileData.isWordDocument && !fileData.isImageFile) {
      window.electronAPI.watchFile(fileData.path);
    }
  }
  
  /**
   * 处理文件变化
   */
  handleFileChanged(filePath) {
    // 查找对应的标签页
    for (const [tabId, tab] of this.tabs) {
      if (tab.filePath === filePath) {
        // 标记文件已在外部修改
        tab.externallyModified = true;
        
        // 更新标签页显示
        this.updateTabDisplay(tabId);
        
        // 如果是当前活动标签页，显示提示
        if (tabId === this.activeTabId) {
          this.showFileChangedNotification(filePath);
        }
        break;
      }
    }
  }
  
  /**
   * 处理Word文档选择
   */
  async handleWordFileSelected(fileData) {
    try {
      // 使用文件管理器的loadWordDocument方法
      await this.fileManager.loadWordDocument(fileData.path);
    } catch (error) {
      this.showError('打开Word文档失败', error.message);
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
   * 添加Word文档操作功能
   */
  addWordDocumentActions(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.isWordDocument) return;
    
    // 在编辑器上方添加Word文档操作栏
    const editorContainer = document.querySelector('.editor-area');
    let wordActionsBar = document.querySelector('.word-actions-bar');
    
    if (!wordActionsBar) {
      wordActionsBar = document.createElement('div');
      wordActionsBar.className = 'word-actions-bar';
      wordActionsBar.innerHTML = `
        <div class="word-document-info">
          <i class="fas fa-file-word"></i>
          <span>Word文档已转换为Markdown格式</span>
          <span class="original-format">(原格式: ${tab.originalFormat.toUpperCase()})</span>
        </div>
        <div class="word-actions">
          <button class="btn btn-sm btn-primary" onclick="app.saveAsMarkdown('${tabId}')">
            <i class="fas fa-download"></i>
            保存为Markdown
          </button>
          <button class="btn btn-sm btn-secondary" onclick="app.hideWordActionsBar()">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
      
      editorContainer.insertBefore(wordActionsBar, editorContainer.firstChild);
    }
  }
  
  /**
   * 隐藏Word文档操作栏
   */
  hideWordActionsBar() {
    const wordActionsBar = document.querySelector('.word-actions-bar');
    if (wordActionsBar) {
      wordActionsBar.remove();
    }
  }
  
  /**
   * 将Word文档内容保存为Markdown文件
   */
  async saveAsMarkdown(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.isWordDocument) return;
    
    try {
      const content = this.editor.getContent();
      const originalName = this.getFileNameFromPath(tab.filePath);
      const markdownName = originalName.replace(/\.(doc|docx)$/i, '.md');
      
      // 使用保存对话框让用户选择保存位置
      const result = await window.electronAPI.saveFile(null, content);
      
      if (result.success) {
        this.showSuccess('Markdown文件保存成功', `已保存为: ${this.getFileNameFromPath(result.filePath)}`);
      }
    } catch (error) {
      this.showError('保存Markdown失败', error.message);
    }
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
    // Performance measurement completed
  }
  
  /**
   * 消息显示方法
   */
  showSuccess(message) {
    // TODO: 实现通知系统
  }
  
  showError(title, message) {
    // TODO: 实现错误对话框
  }
  
  showWarning(message) {
    // TODO: 实现警告通知
  }
  
  showInfo(message) {
    // TODO: 实现信息通知
  }
  
  /**
   * 设置图片预览
   */
  setupImagePreview(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.isImageFile) {
      return;
    }
    
    // 获取编辑器容器
    const editorContainer = document.querySelector('.editor-area');
    if (!editorContainer) {
      return;
    }
    
    // 检查编辑器包装器状态
    const editorWrapper = editorContainer.querySelector('.editor-wrapper');
    if (editorWrapper) {
      const editor = editorWrapper.querySelector('.editor');
      if (editor) {
        if (this.viewMode === 'preview') {
          editor.style.display = 'none';
        } else {
          editor.style.display = '';
        }
      }
    }
    
    // 移除之前的图片预览容器（如果存在）
    const existingPreview = editorContainer.querySelector('.image-preview-container');
    if (existingPreview) {
      existingPreview.remove();
    }
    
    // 创建图片预览容器
    const imagePreviewContainer = document.createElement('div');
    imagePreviewContainer.className = 'image-preview-container';
    
    // 验证dataUrl格式
    if (!tab.imageData?.dataUrl || !tab.imageData.dataUrl.startsWith('data:image/')) {
      return;
    }
    
    imagePreviewContainer.innerHTML = `
      <div class="image-preview-header">
        <div class="image-info">
          <h3>${tab.imageData.fileName}</h3>
          <div class="image-details">
            <span class="file-size">${this.formatFileSize(tab.imageData.fileSize)}</span>
            <span class="file-type">${tab.imageData.mimeType}</span>
          </div>
        </div>
        <div class="image-controls">
          <button class="btn btn-secondary" id="zoom-out-btn" title="缩小">
            <i class="fas fa-search-minus"></i>
          </button>
          <button class="btn btn-secondary" id="zoom-reset-btn" title="重置缩放">
            <i class="fas fa-expand-arrows-alt"></i>
          </button>
          <button class="btn btn-secondary" id="zoom-in-btn" title="放大">
            <i class="fas fa-search-plus"></i>
          </button>
          <button class="btn btn-primary" id="ocr-btn" title="OCR识别">
            <i class="fas fa-text-width"></i>
            <span>OCR识别</span>
          </button>
        </div>
      </div>
      <div class="image-preview-content">
        <div class="image-wrapper">
          <img src="${tab.imageData.dataUrl}" alt="${tab.imageData.fileName}" class="preview-image" />
        </div>
      </div>
    `;
    
    
    editorContainer.appendChild(imagePreviewContainer);
    

    
    // 添加分栏调整器（在编辑和分栏模式下）
    if (this.viewMode === 'editor' || this.viewMode === 'split') {
      // 检查是否需要垂直分栏
      const useVerticalSplit = this.isVerticalSplitEnabled();
      
      if (useVerticalSplit) {
        // 设置垂直分栏布局
        const { topPane, bottomPane } = this.setupVerticalSplit(editorContainer);
        
        // 将图片预览容器移到下面板
        bottomPane.appendChild(imagePreviewContainer);
        
        // 调整样式以适应垂直布局
        imagePreviewContainer.style.width = '100%';
        imagePreviewContainer.style.borderLeft = 'none';
        imagePreviewContainer.style.borderTop = '1px solid var(--border-color)';
      } else {
        // 使用水平分栏（原有功能）
        this.addSplitResizer(editorContainer);
      }
    }
    
    // 设置图片缩放功能
    this.setupImageZoom(tabId, imagePreviewContainer);
    

  }
  
  /**
   * 设置图片缩放功能
   */
  setupImageZoom(tabId, container) {
    const image = container.querySelector('.preview-image');
    const imageWrapper = container.querySelector('.image-wrapper');
    const zoomInBtn = container.querySelector('#zoom-in-btn');
    const zoomOutBtn = container.querySelector('#zoom-out-btn');
    const zoomResetBtn = container.querySelector('#zoom-reset-btn');
    const ocrBtn = container.querySelector('#ocr-btn');
    
    let currentZoom = 1;
    const zoomStep = 0.2;
    const minZoom = 0.1;
    const maxZoom = 5;
    
    const updateZoom = (zoom) => {
      currentZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
      image.style.transform = `scale(${currentZoom})`;
      
      // 当缩放大于1时，添加zoomed类以启用滚动
      if (currentZoom > 1) {
        imageWrapper.classList.add('zoomed');
      } else {
        imageWrapper.classList.remove('zoomed');
      }
      
      // 更新按钮状态
      zoomOutBtn.disabled = currentZoom <= minZoom;
      zoomInBtn.disabled = currentZoom >= maxZoom;
    };
    
    // 缩放按钮事件
    zoomInBtn?.addEventListener('click', () => {
      updateZoom(currentZoom + zoomStep);
    });
    
    zoomOutBtn?.addEventListener('click', () => {
      updateZoom(currentZoom - zoomStep);
    });
    
    zoomResetBtn?.addEventListener('click', () => {
      updateZoom(1);
    });
    
    // 鼠标滚轮缩放
    image?.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
      updateZoom(currentZoom + delta);
    });
    
    // 图片拖拽功能（当缩放时）
    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;
    
    image.addEventListener('mousedown', (e) => {
      if (currentZoom > 1) {
        isDragging = true;
        const scrollContainer = container.querySelector('.image-preview-content');
        startX = e.pageX - scrollContainer.offsetLeft;
        startY = e.pageY - scrollContainer.offsetTop;
        scrollLeft = scrollContainer.scrollLeft;
        scrollTop = scrollContainer.scrollTop;
        image.style.cursor = 'grabbing';
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging || currentZoom <= 1) return;
      e.preventDefault();
      const scrollContainer = container.querySelector('.image-preview-content');
      const x = e.pageX - scrollContainer.offsetLeft;
      const y = e.pageY - scrollContainer.offsetTop;
      const walkX = (x - startX) * 2;
      const walkY = (y - startY) * 2;
      scrollContainer.scrollLeft = scrollLeft - walkX;
      scrollContainer.scrollTop = scrollTop - walkY;
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      image.style.cursor = currentZoom > 1 ? 'grab' : 'grab';
    });
    
    // OCR识别按钮事件
    ocrBtn?.addEventListener('click', () => {
      this.performOCR(tabId);
    });
    
    // 初始化缩放
    updateZoom(1);
  }
  
  /**
   * 添加分栏调整器
   */
  addSplitResizer(editorContainer) {
    // 移除现有的调整器
    const existingResizer = editorContainer.querySelector('.split-resizer');
    if (existingResizer) {
      existingResizer.remove();
    }
    
    const resizer = document.createElement('div');
    resizer.className = 'split-resizer';
    
    // 计算初始位置（50%）
    const containerWidth = editorContainer.offsetWidth;
    resizer.style.left = (containerWidth / 2) + 'px';
    
    editorContainer.appendChild(resizer);
    
    let isResizing = false;
    
    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      resizer.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      const containerRect = editorContainer.getBoundingClientRect();
      const newPosition = e.clientX - containerRect.left;
      const containerWidth = containerRect.width;
      
      // 限制最小和最大宽度
      const minWidth = 200;
      const maxWidth = containerWidth - 200;
      
      if (newPosition >= minWidth && newPosition <= maxWidth) {
        const leftPercent = (newPosition / containerWidth) * 100;
        const rightPercent = 100 - leftPercent;
        
        // 更新编辑器和预览容器的宽度
        const editorWrapper = editorContainer.querySelector('.editor-wrapper');
        const imagePreviewContainer = editorContainer.querySelector('.image-preview-container');
        
        if (editorWrapper && imagePreviewContainer) {
          editorWrapper.style.width = leftPercent + '%';
          imagePreviewContainer.style.width = rightPercent + '%';
          resizer.style.left = newPosition + 'px';
        }
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }
  
  /**
   * 添加垂直分栏调整器
   */
  addVerticalSplitResizer(container, topPane, bottomPane) {

    
    // 移除现有的垂直调整器
    const existingResizer = container.querySelector('.vertical-split-resizer');
    if (existingResizer) {

      existingResizer.remove();
    }
    
    const resizer = document.createElement('div');
    resizer.className = 'vertical-split-resizer';
    
    // 计算初始位置（40%，与topPane高度一致）
    const containerHeight = container.offsetHeight;
    const initialTop = containerHeight * 0.4;
    resizer.style.top = initialTop + 'px';
    

    
    container.appendChild(resizer);

    
    // 验证调整器是否正确添加
    const addedResizer = container.querySelector('.vertical-split-resizer');

    
    let isResizing = false;
    
    resizer.addEventListener('mouseenter', () => {
      resizer.style.backgroundColor = 'var(--color-primary)';
    });
    
    resizer.addEventListener('mouseleave', () => {
      if (!isResizing) {
        resizer.style.backgroundColor = 'var(--border-color)';
      }
    });
    
    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      resizer.classList.add('dragging');
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      const containerRect = container.getBoundingClientRect();
      const newPosition = e.clientY - containerRect.top;
      const containerHeight = containerRect.height;
      
      // 限制最小和最大高度
      const minHeight = 100;
      const maxHeight = containerHeight - 100;
      
      if (newPosition >= minHeight && newPosition <= maxHeight) {
        const topPercent = (newPosition / containerHeight) * 100;
        const bottomPercent = 100 - topPercent;
        
        // 更新上下面板的高度
        if (topPane && bottomPane) {
          topPane.style.height = topPercent + '%';
          bottomPane.style.height = bottomPercent + '%';
          resizer.style.top = newPosition + 'px';
        }
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }
  
  /**
   * 设置垂直分栏布局
   */
  setupVerticalSplit(container) {

    
    // 添加垂直分栏容器类
    container.classList.add('vertical-split-container');

    
    // 创建上下两个面板
    const topPane = document.createElement('div');
    topPane.className = 'split-pane top-pane';
    topPane.style.height = '40%'; // 编辑器占40%
    
    const bottomPane = document.createElement('div');
    bottomPane.className = 'split-pane bottom-pane';
    bottomPane.style.height = '60%'; // 图片预览占60%
    

    
    // 将现有内容移到上面板
    const childCount = container.children.length;

    
    while (container.firstChild) {
      topPane.appendChild(container.firstChild);
    }
    

    
    // 添加面板到容器
    container.appendChild(topPane);
    container.appendChild(bottomPane);
    

    
    // 添加垂直调整器
    this.addVerticalSplitResizer(container, topPane, bottomPane);
    
    return { topPane, bottomPane };
  }
  
  /**
   * 检查是否启用垂直分栏
   */
  isVerticalSplitEnabled() {
    // 可以从localStorage读取用户设置，或者检查某个标志
    // 默认启用垂直分栏，如果localStorage中没有设置
    const setting = localStorage.getItem('verticalSplitEnabled');
    return setting === null ? true : setting === 'true';
  }
  
  /**
   * 切换分栏方向
   */
  toggleSplitDirection() {
    const currentState = this.isVerticalSplitEnabled();
    localStorage.setItem('verticalSplitEnabled', (!currentState).toString());
    
    // 更新状态栏显示
    this.updateSplitModeIndicator();
    
    // 重新设置当前标签页的图片预览
    const activeTab = this.getActiveTab();
    if (activeTab && activeTab.fileType === 'image') {
      this.refreshImagePreview(activeTab.id);
    }
  }
  
  /**
   * 刷新图片预览（重新设置分栏）
   */
  refreshImagePreview(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab || tab.fileType !== 'image') return;
    
    const editorContainer = document.querySelector('.editor-area');
    if (!editorContainer) return;
    
    // 清除现有的分栏设置
    editorContainer.classList.remove('vertical-split-container');
    const existingResizers = editorContainer.querySelectorAll('.split-resizer, .vertical-split-resizer');
    existingResizers.forEach(resizer => resizer.remove());
    
    const existingPanes = editorContainer.querySelectorAll('.split-pane');
    existingPanes.forEach(pane => {
      while (pane.firstChild) {
        editorContainer.appendChild(pane.firstChild);
      }
      pane.remove();
    });
    
    // 重新设置图片预览
    this.setupImagePreview(tabId, tab.filePath);
  }
  
  /**
   * 更新分栏模式指示器
   */
  updateSplitModeIndicator() {
    const splitModeElement = document.getElementById('split-mode');
    if (splitModeElement) {
      const isVertical = this.isVerticalSplitEnabled();
      splitModeElement.textContent = isVertical ? '垂直分栏' : '水平分栏';
      splitModeElement.title = `分栏模式: ${isVertical ? '垂直' : '水平'} (Ctrl+D切换)`;
    }
  }
  
  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 执行OCR识别
   */
  async performOCR(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.filePath) {
      this.showError('OCR错误', '没有找到要识别的图片文件');
      return;
    }

    const ocrBtn = document.getElementById('ocr-btn');
    const ocrBtnText = ocrBtn?.querySelector('span');
    if (ocrBtn) {
      ocrBtn.disabled = true;
      if (ocrBtnText) {
        ocrBtnText.textContent = '识别中...';
      }
    }

    try {
      // 通过IPC调用主进程的OCR处理程序
      const result = await window.electronAPI.performOCR(tab.filePath);
      
      if (result.success && result.data && result.data.fullText) {
        // 将OCR识别结果显示在编辑器中
        if (this.editor) {
          this.editor.setContent(result.data.fullText);
          this.showSuccess('OCR识别完成', `识别耗时: ${result.data.elapsedMs || 0}ms`);
        } else {
          this.showError('OCR错误', '无法找到编辑器');
        }
      } else {
        const errorMsg = result.error || '未能识别出文本内容';
        this.showError('OCR识别失败', errorMsg);
      }
    } catch (error) {
      this.showError('OCR识别失败', error.message);
    } finally {
      // 恢复按钮状态
      if (ocrBtn) {
        ocrBtn.disabled = false;
        if (ocrBtnText) {
          ocrBtnText.textContent = 'OCR识别';
        }
      }
    }
  }
}

// 应用启动
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new NotepadApp();
  
  // 全局错误处理
  window.addEventListener('error', (e) => {
    // 静默处理全局错误
  });
  
  window.addEventListener('unhandledrejection', (e) => {
    // 静默处理未处理的Promise拒绝
  });
});

// 导出给其他模块使用
window.app = app;