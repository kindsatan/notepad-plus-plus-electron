const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const chokidar = require('chokidar');

// GPU相关设置 - 解决GPU进程异常退出问题
// 方案1: 尝试优化GPU设置
// app.commandLine.appendSwitch('disable-gpu-sandbox');
// app.commandLine.appendSwitch('enable-gpu-rasterization');
// app.commandLine.appendSwitch('enable-zero-copy');
// app.commandLine.appendSwitch('ignore-gpu-blacklist');
// app.commandLine.appendSwitch('disable-software-rasterizer');

// 方案2: 如果GPU驱动有问题，使用软件渲染（稳定但性能较低）
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('disable-gpu-sandbox');

// 禁用GPU进程崩溃时的自动重启
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');

// 其他稳定性设置
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');

// 保持对窗口对象的全局引用，如果不这样做，当JavaScript对象被垃圾回收时，窗口将自动关闭
let mainWindow;
let fileWatcher;

// 应用配置
const config = {
  isDev: process.argv.includes('--dev'),
  minWidth: 1024,
  minHeight: 768,
  defaultWidth: 1440,
  defaultHeight: 900
};

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: config.defaultWidth,
    height: config.defaultHeight,
    minWidth: config.minWidth,
    minHeight: config.minHeight,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      hardwareAcceleration: false, // 禁用硬件加速，使用软件渲染
      webSecurity: false // 配合命令行参数
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1e293b',
      symbolColor: '#f1f5f9',
      height: 48
    },
    show: false, // 先不显示，等加载完成后再显示
    icon: path.join(__dirname, '../../assets/icon.png')
  });

  // 加载应用的index.html
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 开发模式下打开开发者工具
    if (config.isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (fileWatcher) {
      fileWatcher.close();
    }
  });

  // 设置菜单
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建文件',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-file');
          }
        },
        {
          label: '打开文件',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'Markdown文件', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
                { name: '文本文件', extensions: ['txt'] },
                { name: '所有文件', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
              const filePath = result.filePaths[0];
              try {
                const content = await fs.readFile(filePath, 'utf8');
                mainWindow.webContents.send('file-opened', {
                  path: filePath,
                  content: content,
                  name: path.basename(filePath)
                });
              } catch (error) {
                dialog.showErrorBox('错误', `无法打开文件: ${error.message}`);
              }
            }
          }
        },
        {
          label: '打开文件夹',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory']
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
              const folderPath = result.filePaths[0];
              mainWindow.webContents.send('folder-opened', {
                path: folderPath,
                name: path.basename(folderPath)
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save-file');
          }
        },
        {
          label: '另存为',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('menu-save-as');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        {
          label: '撤销',
          accelerator: 'CmdOrCtrl+Z',
          click: () => {
            mainWindow.webContents.send('menu-undo');
          }
        },
        {
          label: '重做',
          accelerator: 'CmdOrCtrl+Y',
          click: () => {
            mainWindow.webContents.send('menu-redo');
          }
        },
        { type: 'separator' },
        {
          label: '查找',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('menu-find');
          }
        },
        {
          label: '替换',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            mainWindow.webContents.send('menu-replace');
          }
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '编辑模式',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow.webContents.send('menu-view-mode', 'editor');
          }
        },
        {
          label: '分屏模式',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            mainWindow.webContents.send('menu-view-mode', 'split');
          }
        },
        {
          label: '预览模式',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            mainWindow.webContents.send('menu-view-mode', 'preview');
          }
        },
        { type: 'separator' },
        {
          label: '切换侧边栏',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            mainWindow.webContents.send('menu-toggle-sidebar');
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 Notepad++',
              message: 'Notepad++ v1.0.0',
              detail: '一款面向开发者、技术写作者和高效内容创作者的，追求极致性能和现代化体验的跨平台Markdown编辑器。'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC 事件处理
ipcMain.handle('save-file', async (event, { filePath, content }) => {
  try {
    // 如果没有提供文件路径，显示保存对话框
    if (!filePath) {
      
      const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
          { name: 'Markdown Files', extensions: ['md', 'markdown'] },
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (result.canceled) {
        
        return { success: false, canceled: true };
      }
      
      filePath = result.filePath;
      
    }
    
    
    await fs.writeFile(filePath, content, 'utf8');
    
    return { success: true, filePath };
  } catch (error) {
    console.error('[DEBUG] 文件保存失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const result = [];
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      const stats = await fs.stat(fullPath);
      
      result.push({
        name: item.name,
        path: fullPath,
        isDirectory: item.isDirectory(),
        size: stats.size,
        modified: stats.mtime
      });
    }
    
    return { success: true, files: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('watch-file', (event, filePath) => {
  if (fileWatcher) {
    fileWatcher.close();
  }
  
  fileWatcher = chokidar.watch(filePath);
  fileWatcher.on('change', () => {
    mainWindow.webContents.send('file-changed', filePath);
  });
  
  return { success: true };
});

ipcMain.handle('open-folder-dialog', async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择文件夹'
    });
    
    if (result.canceled) {
      return { success: false, canceled: true };
    }
    
    const folderPath = result.filePaths[0];
    return { success: true, folderPath };
  } catch (error) {
    console.error('打开文件夹对话框失败:', error);
    return { success: false, error: error.message };
  }
});

// 应用事件处理
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 安全设置
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});