/**
 * 文件管理器类
 * 负责文件和文件夹的浏览、管理和操作
 */
class FileManager {
  constructor(app) {
    this.app = app;
    this.fileTree = document.getElementById('file-tree');
    this.currentFolder = null;
    this.watchedFiles = new Set();
    this.expandedFolders = new Set();
    this.loadingFiles = new Set(); // 正在加载的文件集合
    
    // 文件过滤设置
    this.fileFilters = {
      showHidden: false,
      extensions: ['.md', '.txt', '.markdown', '.mdown', '.mkd', '.mdx', '.doc', '.docx'],
      excludePatterns: ['node_modules', '.git', '.vscode', 'dist', 'build']
    };
    
    this.init();
  }
  
  /**
   * 初始化文件管理器
   */
  init() {
    if (!this.fileTree) {
      return;
    }
    
    this.setupEventListeners();
    this.showWelcomeMessage();
  }
  
  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 文件树点击事件
    this.fileTree.addEventListener('click', this.handleFileTreeClick.bind(this));
    
    // 文件树双击事件 - 添加防抖机制
    let doubleClickTimeout = null;
    this.fileTree.addEventListener('dblclick', (e) => {
      if (doubleClickTimeout) {
        clearTimeout(doubleClickTimeout);
      }
      doubleClickTimeout = setTimeout(() => {
        this.handleFileTreeDoubleClick(e);
        doubleClickTimeout = null;
      }, 50); // 50ms 防抖延迟
    });
    
    // 右键菜单事件
    this.fileTree.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    
    // 拖拽事件
    this.fileTree.addEventListener('dragstart', this.handleDragStart.bind(this));
    this.fileTree.addEventListener('dragover', this.handleDragOver.bind(this));
    this.fileTree.addEventListener('drop', this.handleDrop.bind(this));
  }
  
  /**
   * 显示欢迎消息
   */
  showWelcomeMessage() {
    this.fileTree.innerHTML = `
      <div class="welcome-message">
        <i class="fas fa-folder-open"></i>
        <p>打开文件夹开始编辑</p>
        <button class="btn btn-primary" onclick="app.fileManager.openFolder()">
          <i class="fas fa-folder-open"></i>
          打开文件夹
        </button>
      </div>
    `;
  }
  
  /**
   * 打开文件
   */
  async openFile() {
    try {
      if (window.electronAPI && window.electronAPI.openFileDialog) {
        const result = await window.electronAPI.openFileDialog({
          filters: [
            { name: 'Markdown Files', extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx'] },
            { name: 'Word Documents', extensions: ['doc', 'docx'] },
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        
        if (result && !result.canceled && result.filePaths.length > 0) {
          for (const filePath of result.filePaths) {
            await this.loadFile(filePath);
          }
        }
      } else {
        // 降级方案：使用HTML文件输入
        this.openFileWithInput();
      }
    } catch (error) {
      this.app.showError('打开文件失败: ' + error.message);
    }
  }
  
  /**
   * 使用HTML输入打开文件（降级方案）
   */
  openFileWithInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.txt';
    input.multiple = true;
    
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.app.openFileFromData({
            path: file.name,
            content: e.target.result,
            name: file.name
          });
        };
        reader.readAsText(file);
      });
    };
    
    input.click();
  }
  
  /**
   * 打开文件夹
   */
  async openFolder() {
    try {
      if (window.electronAPI && window.electronAPI.openFolderDialog) {
        const result = await window.electronAPI.openFolderDialog();
        
        if (result && result.success && result.folderPath) {
          await this.loadFolder(result.folderPath);
        }
      } else {
        this.app.showError('打开文件夹失败', '此功能需要在Electron环境中运行');
      }
    } catch (error) {
      this.app.showError('打开文件夹失败: ' + error.message);
    }
  }
  
  /**
   * 加载文件
   */
  async loadFile(filePath) {
    // 检查文件是否正在加载中
    if (this.loadingFiles.has(filePath)) {
      return;
    }
    
    // 标记文件为加载中
    this.loadingFiles.add(filePath);
    
    try {
      const fileExtension = this.getFileExtension(filePath).toLowerCase();
      
      // 检查是否为Word文档
      if (fileExtension === '.doc' || fileExtension === '.docx') {
        await this.loadWordDocument(filePath, fileExtension);
      } else if (this.isImageFile(fileExtension)) {
        // 处理图片文件
        await this.loadImageFile(filePath);
      } else {
        // 处理普通文本文件
        if (window.electronAPI && window.electronAPI.readFile) {
          const result = await window.electronAPI.readFile(filePath);
          
          if (result.success) {
            this.app.openFileFromData({
              path: filePath,
              content: result.content,
              name: this.getFileNameFromPath(filePath)
            });
            
            // 监听文件变化
            this.watchFile(filePath);
          } else {
            throw new Error(result.error);
          }
        }
      }
    } catch (error) {
      this.app.showError('加载文件失败: ' + error.message);
    } finally {
      // 移除加载标记
      this.loadingFiles.delete(filePath);
    }
  }
  
  /**
   * 加载Word文档
   */
  async loadWordDocument(filePath, fileExtension) {
    try {
      // 创建WordProcessor实例
      const wordProcessor = new WordProcessor();
      
      // 处理Word文档
      let content;
      if (fileExtension === '.docx') {
        content = await wordProcessor.processDocx(filePath);
      } else if (fileExtension === '.doc') {
        content = await wordProcessor.processDoc(filePath);
      }
      
      if (content) {
        // 将Word文档作为Markdown内容打开
        this.app.openFileFromData({
          path: filePath,
          content: content,
          name: this.getFileNameFromPath(filePath),
          isWordDocument: true,
          originalFormat: fileExtension
        });
        
        // 显示转换成功消息
        this.app.showSuccess('Word文档已转换', `${fileExtension.toUpperCase()} 文档已成功转换为Markdown格式`);
      }
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 加载文件夹
   */
  async loadFolder(folderPath) {
    try {
      if (window.electronAPI && window.electronAPI.readDirectory) {
        const result = await window.electronAPI.readDirectory(folderPath);
        
        if (result.success) {
          this.currentFolder = folderPath;
          this.renderFileTree(result.files, folderPath);
          
          // 监听文件夹变化
          this.watchFolder(folderPath);
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      this.app.showError('加载文件夹失败', error.message);
    }
  }
  
  /**
   * 渲染文件树
   */
  renderFileTree(files, basePath) {
    this.fileTree.innerHTML = '';
    
    // 创建根文件夹
    const rootFolder = this.createFolderElement({
      name: this.getFileNameFromPath(basePath),
      path: basePath,
      isRoot: true
    });
    
    this.fileTree.appendChild(rootFolder);
    
    // 渲染文件和子文件夹
    this.renderFileTreeItems(files, rootFolder.querySelector('.folder-content'), basePath);
    
    // 展开根文件夹
    this.expandFolder(rootFolder);
  }
  
  /**
   * 渲染文件树项目
   */
  renderFileTreeItems(items, container, basePath) {
    // 过滤和排序
    const filteredItems = this.filterItems(items);
    const sortedItems = this.sortItems(filteredItems);
    
    sortedItems.forEach(item => {
      const element = item.isDirectory 
        ? this.createFolderElement(item)
        : this.createFileElement(item);
      
      container.appendChild(element);
    });
  }
  
  /**
   * 过滤文件项目
   */
  filterItems(items) {
    return items.filter(item => {
      // 隐藏文件过滤
      if (!this.fileFilters.showHidden && item.name.startsWith('.')) {
        return false;
      }
      
      // 排除模式过滤
      if (this.fileFilters.excludePatterns.some(pattern => 
        item.name.includes(pattern))) {
        return false;
      }
      
      // 文件扩展名过滤（仅对文件）
      if (!item.isDirectory && this.fileFilters.extensions.length > 0) {
        const ext = this.getFileExtension(item.name);
        return this.fileFilters.extensions.includes(ext);
      }
      
      return true;
    });
  }
  
  /**
   * 排序文件项目
   */
  sortItems(items) {
    return items.sort((a, b) => {
      // 文件夹优先
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      
      // 按名称排序
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }
  
  /**
   * 创建文件夹元素
   */
  createFolderElement(folder) {
    const div = document.createElement('div');
    div.className = 'folder-item';
    div.dataset.path = folder.path;
    div.dataset.type = 'folder';
    
    const isExpanded = this.expandedFolders.has(folder.path);
    
    div.innerHTML = `
      <div class="folder-header">
        <i class="fas fa-chevron-${isExpanded ? 'down' : 'right'} folder-toggle"></i>
        <i class="fas fa-folder${isExpanded ? '-open' : ''} folder-icon"></i>
        <span class="folder-name">${folder.name}</span>
      </div>
      <div class="folder-content" style="display: ${isExpanded ? 'block' : 'none'}"></div>
    `;
    
    return div;
  }
  
  /**
   * 创建文件元素
   */
  createFileElement(file) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.dataset.path = file.path;
    div.dataset.type = 'file';
    div.draggable = true;
    
    const icon = this.getFileIcon(file.name);
    const isWatched = this.watchedFiles.has(file.path);
    
    div.innerHTML = `
      <i class="${icon} file-icon"></i>
      <span class="file-name">${file.name}</span>
      ${isWatched ? '<i class="fas fa-eye file-status" title="正在监听"></i>' : ''}
    `;
    
    return div;
  }
  
  /**
   * 获取文件图标
   */
  getFileIcon(fileName) {
    const ext = this.getFileExtension(fileName);
    
    const iconMap = {
      '.md': 'fab fa-markdown',
      '.markdown': 'fab fa-markdown',
      '.txt': 'fas fa-file-alt',
      '.json': 'fas fa-file-code',
      '.js': 'fab fa-js-square',
      '.html': 'fab fa-html5',
      '.css': 'fab fa-css3-alt',
      '.png': 'fas fa-file-image',
      '.jpg': 'fas fa-file-image',
      '.jpeg': 'fas fa-file-image',
      '.gif': 'fas fa-file-image',
      '.pdf': 'fas fa-file-pdf'
    };
    
    return iconMap[ext] || 'fas fa-file';
  }
  
  /**
   * 处理文件树点击事件
   */
  handleFileTreeClick(e) {
    const target = e.target;
    const item = target.closest('.folder-item, .file-item');
    
    if (!item) return;
    
    // 处理文件夹切换
    if (target.classList.contains('folder-toggle') || target.classList.contains('folder-header')) {
      this.toggleFolder(item);
      return;
    }
    
    // 处理文件选择
    if (item.dataset.type === 'file') {
      this.selectFile(item);
    }
  }
  
  /**
   * 处理文件树双击事件
   */
  handleFileTreeDoubleClick(e) {
    const item = e.target.closest('.file-item');
    
    if (item && item.dataset.type === 'file') {
      this.openFileFromTree(item.dataset.path);
    }
  }
  
  /**
   * 切换文件夹展开/折叠
   */
  async toggleFolder(folderElement) {
    const path = folderElement.dataset.path;
    const content = folderElement.querySelector('.folder-content');
    const toggle = folderElement.querySelector('.folder-toggle');
    const icon = folderElement.querySelector('.folder-icon');
    
    const isExpanded = content.style.display === 'block';
    
    if (isExpanded) {
      // 折叠
      content.style.display = 'none';
      toggle.className = 'fas fa-chevron-right folder-toggle';
      icon.className = 'fas fa-folder folder-icon';
      this.expandedFolders.delete(path);
    } else {
      // 展开
      if (content.children.length === 0) {
        // 懒加载子项目
        await this.loadFolderContents(path, content);
      }
      
      content.style.display = 'block';
      toggle.className = 'fas fa-chevron-down folder-toggle';
      icon.className = 'fas fa-folder-open folder-icon';
      this.expandedFolders.add(path);
    }
  }
  
  /**
   * 展开文件夹
   */
  expandFolder(folderElement) {
    const content = folderElement.querySelector('.folder-content');
    const toggle = folderElement.querySelector('.folder-toggle');
    const icon = folderElement.querySelector('.folder-icon');
    
    content.style.display = 'block';
    toggle.className = 'fas fa-chevron-down folder-toggle';
    icon.className = 'fas fa-folder-open folder-icon';
    
    this.expandedFolders.add(folderElement.dataset.path);
  }
  
  /**
   * 加载文件夹内容
   */
  async loadFolderContents(folderPath, container) {
    try {
      if (window.electronAPI && window.electronAPI.readDirectory) {
        const result = await window.electronAPI.readDirectory(folderPath);
        
        if (result.success) {
          this.renderFileTreeItems(result.files, container, folderPath);
        }
      }
    } catch (error) {
      // 静默处理错误
    }
  }
  
  /**
   * 选择文件
   */
  selectFile(fileElement) {
    // 移除之前的选择
    this.fileTree.querySelectorAll('.file-item.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // 选择当前文件
    fileElement.classList.add('selected');
  }
  
  /**
   * 从文件树打开文件
   */
  async openFileFromTree(filePath) {
    await this.loadFile(filePath);
  }
  
  /**
   * 处理右键菜单
   */
  handleContextMenu(e) {
    e.preventDefault();
    
    const item = e.target.closest('.folder-item, .file-item');
    if (!item) return;
    
    const isFile = item.dataset.type === 'file';
    const path = item.dataset.path;
    
    this.showContextMenu(e.clientX, e.clientY, {
      isFile,
      path,
      actions: this.getContextMenuActions(isFile, path)
    });
  }
  
  /**
   * 获取右键菜单操作
   */
  getContextMenuActions(isFile, path) {
    const actions = [];
    
    if (isFile) {
      actions.push(
        { label: '打开', icon: 'fas fa-folder-open', action: () => this.openFileFromTree(path) },
        { label: '在新标签页打开', icon: 'fas fa-plus', action: () => this.openFileInNewTab(path) },
        { separator: true },
        { label: '重命名', icon: 'fas fa-edit', action: () => this.renameFile(path) },
        { label: '删除', icon: 'fas fa-trash', action: () => this.deleteFile(path) },
        { separator: true },
        { label: '复制路径', icon: 'fas fa-copy', action: () => this.copyPath(path) },
        { label: '在资源管理器中显示', icon: 'fas fa-external-link-alt', action: () => this.showInExplorer(path) }
      );
    } else {
      actions.push(
        { label: '新建文件', icon: 'fas fa-file-plus', action: () => this.createNewFile(path) },
        { label: '新建文件夹', icon: 'fas fa-folder-plus', action: () => this.createNewFolder(path) },
        { separator: true },
        { label: '重命名', icon: 'fas fa-edit', action: () => this.renameFolder(path) },
        { label: '删除', icon: 'fas fa-trash', action: () => this.deleteFolder(path) },
        { separator: true },
        { label: '复制路径', icon: 'fas fa-copy', action: () => this.copyPath(path) },
        { label: '在资源管理器中显示', icon: 'fas fa-external-link-alt', action: () => this.showInExplorer(path) }
      );
    }
    
    return actions;
  }
  
  /**
   * 显示右键菜单
   */
  showContextMenu(x, y, options) {
    // 移除现有菜单
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    // 创建菜单
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    
    options.actions.forEach(action => {
      if (action.separator) {
        const separator = document.createElement('div');
        separator.className = 'menu-separator';
        menu.appendChild(separator);
      } else {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.innerHTML = `
          <i class="${action.icon}"></i>
          <span>${action.label}</span>
        `;
        
        item.addEventListener('click', () => {
          action.action();
          menu.remove();
        });
        
        menu.appendChild(item);
      }
    });
    
    document.body.appendChild(menu);
    
    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }
  
  /**
   * 监听文件变化
   */
  watchFile(filePath) {
    if (window.electronAPI && window.electronAPI.watchFile) {
      window.electronAPI.watchFile(filePath);
      this.watchedFiles.add(filePath);
    }
  }
  
  /**
   * 监听文件夹变化
   */
  watchFolder(folderPath) {
    if (window.electronAPI && window.electronAPI.watchFolder) {
      window.electronAPI.watchFolder(folderPath);
    }
  }
  
  /**
   * 文件操作方法
   */
  
  async createNewFile(folderPath) {
    const fileName = prompt('请输入文件名:', 'new-file.md');
    if (!fileName) return;
    
    // TODO: 实现新建文件
  }
  
  async createNewFolder(parentPath) {
    const folderName = prompt('请输入文件夹名:', 'new-folder');
    if (!folderName) return;
    
    // TODO: 实现新建文件夹
  }
  
  async renameFile(filePath) {
    const currentName = this.getFileNameFromPath(filePath);
    const newName = prompt('请输入新文件名:', currentName);
    if (!newName || newName === currentName) return;
    
    // TODO: 实现文件重命名
  }
  
  async renameFolder(folderPath) {
    const currentName = this.getFileNameFromPath(folderPath);
    const newName = prompt('请输入新文件夹名:', currentName);
    if (!newName || newName === currentName) return;
    
    // TODO: 实现文件夹重命名
  }
  
  async deleteFile(filePath) {
    const fileName = this.getFileNameFromPath(filePath);
    const confirmed = confirm(`确定要删除文件 "${fileName}" 吗？`);
    if (!confirmed) return;
    
    // TODO: 实现文件删除
  }
  
  async deleteFolder(folderPath) {
    const folderName = this.getFileNameFromPath(folderPath);
    const confirmed = confirm(`确定要删除文件夹 "${folderName}" 及其所有内容吗？`);
    if (!confirmed) return;
    
    // TODO: 实现文件夹删除
  }
  
  copyPath(path) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(path);
      this.app.showSuccess('路径已复制到剪贴板');
    }
  }
  
  showInExplorer(path) {
    if (window.electronAPI && window.electronAPI.showInExplorer) {
      window.electronAPI.showInExplorer(path);
    }
  }
  
  openFileInNewTab(filePath) {
    this.loadFile(filePath);
  }
  
  /**
   * 拖拽处理
   */
  handleDragStart(e) {
    const item = e.target.closest('.file-item');
    if (item) {
      e.dataTransfer.setData('text/plain', item.dataset.path);
      e.dataTransfer.effectAllowed = 'copy';
    }
  }
  
  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }
  
  handleDrop(e) {
    e.preventDefault();
    const filePath = e.dataTransfer.getData('text/plain');
    if (filePath) {
      this.loadFile(filePath);
    }
  }
  
  /**
   * 工具方法
   */
  getFileNameFromPath(filePath) {
    return filePath.split(/[\\/]/).pop() || '';
  }
  
  getFileExtension(fileName) {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(lastDot) : '';
  }
  
  /**
   * 公共API方法
   */
  
  /**
   * 刷新文件树
   */
  async refresh() {
    if (this.currentFolder) {
      await this.loadFolder(this.currentFolder);
    }
  }
  
  /**
   * 设置文件过滤器
   */
  setFileFilters(filters) {
    this.fileFilters = { ...this.fileFilters, ...filters };
    this.refresh();
  }
  
  /**
   * 获取当前文件夹
   */
  getCurrentFolder() {
    return this.currentFolder;
  }
  
  /**
   * 查找文件
   */
  findFiles(searchTerm) {
    const results = [];
    const searchLower = searchTerm.toLowerCase();
    
    this.fileTree.querySelectorAll('.file-item').forEach(item => {
      const fileName = item.querySelector('.file-name').textContent.toLowerCase();
      if (fileName.includes(searchLower)) {
        results.push({
          name: item.querySelector('.file-name').textContent,
          path: item.dataset.path,
          element: item
        });
      }
    });
    
    return results;
  }
  
  /**
   * 高亮搜索结果
   */
  highlightSearchResults(searchTerm) {
    // 清除之前的高亮
    this.fileTree.querySelectorAll('.file-item').forEach(item => {
      item.classList.remove('search-highlight');
    });
    
    if (!searchTerm) return;
    
    // 高亮匹配的文件
    const results = this.findFiles(searchTerm);
    results.forEach(result => {
      result.element.classList.add('search-highlight');
    });
  }
  
  /**
   * 检查是否为图片文件
   */
  isImageFile(fileExtension) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif'];
    return imageExtensions.includes(fileExtension.toLowerCase());
  }
  
  /**
   * 加载图片文件
   */
  async loadImageFile(filePath) {
    try {
      
      if (window.electronAPI && window.electronAPI.processImageFile) {
        const result = await window.electronAPI.processImageFile(filePath);
        

        
        if (result.success) {
          const fileData = {
            path: filePath,
            content: result.imageData.dataUrl,
            name: this.getFileNameFromPath(filePath),
            isImageFile: true,
            imageData: result.imageData
          };
          

          
          this.app.openFileFromData(fileData);
        } else {
          throw new Error(result.error);
        }
      } else {
        throw new Error('图片处理功能不可用');
      }
    } catch (error) {
      this.app.showError('加载图片文件失败: ' + error.message);
    }
  }
}