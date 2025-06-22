const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', { filePath, content }),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  watchFile: (filePath) => ipcRenderer.invoke('watch-file', filePath),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  
  // Word文档处理
  processWordDocument: (options) => ipcRenderer.invoke('process-word-document', options),
  htmlToMarkdown: (html) => ipcRenderer.invoke('html-to-markdown', html),
  
  // 图片文件处理
  processImageFile: (filePath) => ipcRenderer.invoke('process-image-file', filePath),
  
  // 菜单事件监听
  onMenuNewFile: (callback) => ipcRenderer.on('menu-new-file', callback),
  onMenuSaveFile: (callback) => ipcRenderer.on('menu-save-file', callback),
  onMenuSaveAs: (callback) => ipcRenderer.on('menu-save-as', callback),
  onMenuUndo: (callback) => ipcRenderer.on('menu-undo', callback),
  onMenuRedo: (callback) => ipcRenderer.on('menu-redo', callback),
  onMenuFind: (callback) => ipcRenderer.on('menu-find', callback),
  onMenuReplace: (callback) => ipcRenderer.on('menu-replace', callback),
  onMenuViewMode: (callback) => ipcRenderer.on('menu-view-mode', callback),
  onMenuToggleSidebar: (callback) => ipcRenderer.on('menu-toggle-sidebar', callback),
  
  // 文件事件
  onFileOpened: (callback) => ipcRenderer.on('file-opened', callback),
  onFolderOpened: (callback) => ipcRenderer.on('folder-opened', callback),
  onFileChanged: (callback) => ipcRenderer.on('file-changed', callback),
  onWordFileSelected: (callback) => ipcRenderer.on('word-file-selected', callback),
  
  // 移除监听器
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // 获取平台信息
  platform: process.platform,
  
  // 版本信息
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

// 窗口控制API
contextBridge.exposeInMainWorld('windowAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized')
});

// 主题API
contextBridge.exposeInMainWorld('themeAPI', {
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', callback)
});

// 应用配置API
contextBridge.exposeInMainWorld('configAPI', {
  get: (key) => ipcRenderer.invoke('config-get', key),
  set: (key, value) => ipcRenderer.invoke('config-set', key, value),
  getAll: () => ipcRenderer.invoke('config-get-all'),
  reset: () => ipcRenderer.invoke('config-reset')
});

// 通知API
contextBridge.exposeInMainWorld('notificationAPI', {
  show: (title, body, options) => ipcRenderer.send('show-notification', { title, body, options }),
  onNotificationClick: (callback) => ipcRenderer.on('notification-click', callback)
});

// 开发者工具
if (process.argv.includes('--dev')) {
  contextBridge.exposeInMainWorld('devAPI', {
    openDevTools: () => ipcRenderer.send('open-dev-tools'),
    reload: () => ipcRenderer.send('reload-window'),
    log: (...args) => console.log('[Renderer]', ...args),
    error: (...args) => console.error('[Renderer]', ...args)
  });
}

// 性能监控API
contextBridge.exposeInMainWorld('performanceAPI', {
  mark: (name) => performance.mark(name),
  measure: (name, startMark, endMark) => performance.measure(name, startMark, endMark),
  getEntries: () => performance.getEntries(),
  clearMarks: () => performance.clearMarks(),
  clearMeasures: () => performance.clearMeasures(),
  now: () => performance.now()
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('Preload uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Preload unhandled rejection at:', promise, 'reason:', reason);
});

// 初始化完成通知
console.log('Preload script loaded successfully');