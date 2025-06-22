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
      console.log('[DEBUG] 接收到文件数据:', fileData);
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
    console.log('[DEBUG] switchToTab - tab info:', {
      tabId,
      isImageFile: tab.isImageFile,
      hasImageData: !!tab.imageData,
      fileName: tab.name,
      currentViewMode: this.viewMode,
      tabKeys: Object.keys(tab),
      imageDataKeys: tab.imageData ? Object.keys(tab.imageData) : null
    });
    
    if (tab.isImageFile) {
      console.log('[DEBUG] switchToTab - 确认为图片文件，准备设置预览');
      // 对于图片文件，自动切换到分栏模式并设置图片预览
      console.log('[DEBUG] 图片文件检测到，自动切换到分栏模式:', tab.name);
      
      // 自动设置为分栏模式
      if (this.viewMode !== 'split') {
        console.log('[DEBUG] 当前视图模式:', this.viewMode, '，切换到分栏模式');
        this.setViewMode('split');
      }
      
      this.setupImagePreview(tabId);
    } else {
      // 对于普通文件，恢复编辑器显示并设置内容
      console.log('[DEBUG] 普通文件，设置编辑器内容:', tab.name);
      
      // 恢复编辑器显示
      const editorContainer = document.querySelector('.editor-area');
      if (editorContainer) {
        const editorWrapper = editorContainer.querySelector('.editor-wrapper');
        if (editorWrapper) {
          editorWrapper.style.display = '';
        }
        
        // 移除图片预览容器（如果存在）
        const existingPreview = editorContainer.querySelector('.image-preview-container');
        if (existingPreview) {
          existingPreview.remove();
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
      console.error('处理Word文档失败:', error);
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
  
  /**
   * 设置图片预览
   */
  setupImagePreview(tabId) {
    const tab = this.tabs.get(tabId);
    console.log('[DEBUG] setupImagePreview - 开始设置图片预览，tab info:', {
      tabId,
      hasTab: !!tab,
      isImageFile: tab?.isImageFile,
      hasImageData: !!tab?.imageData,
      imageDataKeys: tab?.imageData ? Object.keys(tab.imageData) : null,
      dataUrlLength: tab?.imageData?.dataUrl ? tab.imageData.dataUrl.length : 0,
      dataUrlPrefix: tab?.imageData?.dataUrl ? tab.imageData.dataUrl.substring(0, 50) : null,
      currentViewMode: this.viewMode
    });
    
    if (!tab || !tab.isImageFile) {
      console.log('[DEBUG] setupImagePreview - 退出：tab不存在或不是图片文件');
      return;
    }
    
    // 获取编辑器容器
    const editorContainer = document.querySelector('.editor-area');
    if (!editorContainer) {
      console.error('[DEBUG] setupImagePreview - 错误：找不到编辑器容器');
      return;
    }
    
    console.log('[DEBUG] setupImagePreview - 编辑器容器找到，当前视图模式:', this.viewMode);
    
    // 根据当前视图模式决定是否隐藏编辑器
    const editorWrapper = editorContainer.querySelector('.editor-wrapper');
    if (editorWrapper) {
      console.log('[DEBUG] setupImagePreview - 编辑器包装器找到');
      // 对于图片文件，在所有模式下都保持编辑器包装器显示，但在预览模式下隐藏编辑器本身
    if (this.viewMode === 'preview') {
      console.log('[DEBUG] setupImagePreview - 预览模式，隐藏编辑器但保持包装器');
      editorWrapper.style.display = '';
      const editor = editorWrapper.querySelector('.editor');
      if (editor) {
        editor.style.display = 'none';
      }
    } else {
      console.log('[DEBUG] setupImagePreview - 编辑/分割模式，保持编辑器显示');
      editorWrapper.style.display = '';
      const editor = editorWrapper.querySelector('.editor');
      if (editor) {
        editor.style.display = '';
      }
    }
    } else {
      console.warn('[DEBUG] setupImagePreview - 警告：找不到编辑器包装器');
    }
    
    // 移除之前的图片预览容器（如果存在）
    const existingPreview = editorContainer.querySelector('.image-preview-container');
    if (existingPreview) {
      console.log('[DEBUG] setupImagePreview - 移除现有的图片预览容器');
      existingPreview.remove();
    } else {
      console.log('[DEBUG] setupImagePreview - 没有找到现有的图片预览容器');
    }
    
    // 创建图片预览容器
    const imagePreviewContainer = document.createElement('div');
    imagePreviewContainer.className = 'image-preview-container';
    console.log('[DEBUG] setupImagePreview - 图片预览容器已创建');
    
    console.log('[DEBUG] setupImagePreview - 准备创建HTML，imageData详情:', {
      fileName: tab.imageData?.fileName,
      fileSize: tab.imageData?.fileSize,
      mimeType: tab.imageData?.mimeType,
      hasDataUrl: !!tab.imageData?.dataUrl,
      dataUrlLength: tab.imageData?.dataUrl?.length,
      dataUrlStart: tab.imageData?.dataUrl?.substring(0, 100),
      isValidDataUrl: tab.imageData?.dataUrl?.startsWith('data:image/')
    });
    
    // 验证dataUrl格式
    if (!tab.imageData?.dataUrl || !tab.imageData.dataUrl.startsWith('data:image/')) {
      console.error('[DEBUG] setupImagePreview - 错误：无效的图片数据URL');
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
        </div>
      </div>
      <div class="image-preview-content">
        <div class="image-wrapper">
          <img src="${tab.imageData.dataUrl}" alt="${tab.imageData.fileName}" class="preview-image" />
        </div>
      </div>
    `;
    
    console.log('[DEBUG] setupImagePreview - HTML已创建，准备添加到DOM');
    
    editorContainer.appendChild(imagePreviewContainer);
    console.log('[DEBUG] setupImagePreview - 图片预览容器已添加到编辑器容器');
    
    // 添加分栏调整器（在编辑和分栏模式下）
    if (this.viewMode === 'editor' || this.viewMode === 'split') {
      // 检查是否需要垂直分栏（可以通过按键或设置来切换）
      const useVerticalSplit = this.isVerticalSplitEnabled();
      console.log('[DEBUG] 垂直分栏启用状态:', useVerticalSplit);
      console.log('[DEBUG] localStorage verticalSplitEnabled:', localStorage.getItem('verticalSplitEnabled'));
      
      if (useVerticalSplit) {
        console.log('[DEBUG] 使用垂直分栏布局');
        // 设置垂直分栏布局
        const { topPane, bottomPane } = this.setupVerticalSplit(editorContainer);
        
        // 将图片预览容器移到下面板
        bottomPane.appendChild(imagePreviewContainer);
        console.log('[DEBUG] 图片预览容器已移到下面板');
        
        // 调整样式以适应垂直布局
        imagePreviewContainer.style.width = '100%';
        imagePreviewContainer.style.borderLeft = 'none';
        imagePreviewContainer.style.borderTop = '1px solid var(--border-color)';
        console.log('[DEBUG] 垂直布局样式已应用');
      } else {
        console.log('[DEBUG] 使用水平分栏布局');
        // 使用水平分栏（原有功能）
        this.addSplitResizer(editorContainer);
      }
    }
    
    // 立即检查图片元素是否正确创建
    const createdImg = imagePreviewContainer.querySelector('.preview-image');
    if (createdImg) {
      console.log('[DEBUG] setupImagePreview - 图片元素已创建:', {
        src: createdImg.src.substring(0, 100) + '...',
        complete: createdImg.complete,
        naturalWidth: createdImg.naturalWidth,
        naturalHeight: createdImg.naturalHeight
      });
    } else {
      console.error('[DEBUG] setupImagePreview - 错误：图片元素创建失败');
    }
    
    // 调试：检查容器的实际样式
    const containerStyles = window.getComputedStyle(imagePreviewContainer);
    console.log('[DEBUG] setupImagePreview - 容器计算样式:', {
      display: containerStyles.display,
      visibility: containerStyles.visibility,
      width: containerStyles.width,
      height: containerStyles.height,
      position: containerStyles.position
    });
    
    // 添加图片加载事件监听
    const imgElement = imagePreviewContainer.querySelector('.preview-image');
    if (imgElement) {
      console.log('[DEBUG] setupImagePreview - 图片元素找到，设置事件监听器');
      
      // 检查图片元素的样式
      const imgStyles = window.getComputedStyle(imgElement);
      console.log('[DEBUG] setupImagePreview - 图片元素计算样式:', {
        display: imgStyles.display,
        visibility: imgStyles.visibility,
        width: imgStyles.width,
        height: imgStyles.height,
        maxWidth: imgStyles.maxWidth,
        maxHeight: imgStyles.maxHeight,
        objectFit: imgStyles.objectFit
      });
      
      // 检查图片预览内容区域的样式
      const contentArea = imagePreviewContainer.querySelector('.image-preview-content');
      if (contentArea) {
        const contentStyles = window.getComputedStyle(contentArea);
        console.log('[DEBUG] setupImagePreview - 内容区域计算样式:', {
          display: contentStyles.display,
          width: contentStyles.width,
          height: contentStyles.height,
          alignItems: contentStyles.alignItems,
          justifyContent: contentStyles.justifyContent
        });
      }
      
      imgElement.onload = function() {
        console.log('[DEBUG] setupImagePreview - 图片加载成功:', {
          naturalWidth: this.naturalWidth,
          naturalHeight: this.naturalHeight,
          clientWidth: this.clientWidth,
          clientHeight: this.clientHeight,
          src: this.src.substring(0, 100) + '...'
        });
      };
      
      imgElement.onerror = function() {
        console.error('[DEBUG] setupImagePreview - 图片加载失败:', {
          src: this.src.substring(0, 100) + '...'
        });
      };
      
      console.log('[DEBUG] setupImagePreview - 图片元素事件监听器已设置');
    } else {
      console.error('[DEBUG] setupImagePreview - 错误：找不到图片元素');
    }
    
    // 设置图片缩放功能
    console.log('[DEBUG] setupImagePreview - 开始设置图片缩放功能');
    this.setupImageZoom(tabId, imagePreviewContainer);
    
    // 不强制切换视图模式，保持当前模式
    console.log('[DEBUG] setupImagePreview - 图片预览设置完成，当前视图模式:', this.viewMode);
    // this.uiManager.setViewMode('preview');
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
    console.log('[DEBUG] 开始添加垂直分栏调整器');
    console.log('[DEBUG] 容器:', container);
    console.log('[DEBUG] 上面板:', topPane);
    console.log('[DEBUG] 下面板:', bottomPane);
    
    // 移除现有的垂直调整器
    const existingResizer = container.querySelector('.vertical-split-resizer');
    if (existingResizer) {
      console.log('[DEBUG] 移除现有的垂直调整器');
      existingResizer.remove();
    }
    
    const resizer = document.createElement('div');
    resizer.className = 'vertical-split-resizer';
    
    // 计算初始位置（40%，与topPane高度一致）
    const containerHeight = container.offsetHeight;
    const initialTop = containerHeight * 0.4;
    resizer.style.top = initialTop + 'px';
    
    console.log('[DEBUG] 调整器初始位置:', initialTop + 'px');
    console.log('[DEBUG] 容器高度:', containerHeight + 'px');
    
    container.appendChild(resizer);
    console.log('[DEBUG] 垂直调整器已添加到DOM');
    
    // 验证调整器是否正确添加
    const addedResizer = container.querySelector('.vertical-split-resizer');
    console.log('[DEBUG] 验证调整器是否存在:', !!addedResizer);
    if (addedResizer) {
      console.log('[DEBUG] 调整器样式:', window.getComputedStyle(addedResizer));
      console.log('[DEBUG] 调整器位置:', addedResizer.getBoundingClientRect());
    }
    
    let isResizing = false;
    
    resizer.addEventListener('mouseenter', () => {
      console.log('[DEBUG] 鼠标进入垂直调整器区域');
    });
    
    resizer.addEventListener('mouseleave', () => {
      console.log('[DEBUG] 鼠标离开垂直调整器区域');
    });
    
    resizer.addEventListener('mousedown', (e) => {
      console.log('[DEBUG] 垂直调整器鼠标按下事件');
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
    console.log('[DEBUG] 开始设置垂直分栏布局');
    console.log('[DEBUG] 目标容器:', container);
    
    // 添加垂直分栏容器类
    container.classList.add('vertical-split-container');
    console.log('[DEBUG] 已添加垂直分栏容器类');
    
    // 创建上下两个面板
    const topPane = document.createElement('div');
    topPane.className = 'split-pane top-pane';
    topPane.style.height = '40%'; // 编辑器占40%
    
    const bottomPane = document.createElement('div');
    bottomPane.className = 'split-pane bottom-pane';
    bottomPane.style.height = '60%'; // 图片预览占60%
    
    console.log('[DEBUG] 创建了上下面板');
    console.log('[DEBUG] 上面板高度: 40%');
    console.log('[DEBUG] 下面板高度: 60%');
    
    // 将现有内容移到上面板
    const childCount = container.children.length;
    console.log('[DEBUG] 容器现有子元素数量:', childCount);
    
    while (container.firstChild) {
      topPane.appendChild(container.firstChild);
    }
    
    console.log('[DEBUG] 已将现有内容移到上面板');
    
    // 添加面板到容器
    container.appendChild(topPane);
    container.appendChild(bottomPane);
    
    console.log('[DEBUG] 已添加面板到容器');
    
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