const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const chokidar = require('chokidar');

// 获取图片文件的MIME类型
function getMimeType(ext) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

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
                { name: 'Markdown文件', extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx'] },
                { name: 'Word文档', extensions: ['doc', 'docx'] },
                { name: '文本文件', extensions: ['txt'] },
                { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif'] },
                { name: '所有文件', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
              const filePath = result.filePaths[0];
              const ext = path.extname(filePath).toLowerCase();
              
              // 定义图片文件扩展名
              const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif'];
              const isImageFile = imageExtensions.includes(ext);
              
              try {
                if (ext === '.doc' || ext === '.docx') {
                  // Word文档处理
                  mainWindow.webContents.send('word-file-selected', {
                    path: filePath,
                    name: path.basename(filePath)
                  });
                } else if (isImageFile) {
                  // 图片文件处理
                  const imageData = await fs.readFile(filePath);
                  const base64Data = imageData.toString('base64');
                  const mimeType = getMimeType(ext);
                  
                  mainWindow.webContents.send('file-opened', {
                    path: filePath,
                    content: `data:${mimeType};base64,${base64Data}`,
                    name: path.basename(filePath),
                    isImageFile: true,
                    imageData: `data:${mimeType};base64,${base64Data}`
                  });
                } else {
                  // 普通文本文件处理
                  const content = await fs.readFile(filePath, 'utf8');
                  mainWindow.webContents.send('file-opened', {
                    path: filePath,
                    content: content,
                    name: path.basename(filePath),
                    isImageFile: false
                  });
                }
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
    
    return { success: true, folderPath: result.filePaths[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 打开文件对话框
ipcMain.handle('open-file-dialog', async (event, options) => {
  try {
    const dialogOptions = {
      properties: ['openFile', 'multiSelections'],
      title: '选择文件',
      filters: options?.filters || [
        { name: 'Markdown Files', extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx'] },
        { name: 'Word Documents', extensions: ['doc', 'docx'] },
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    };
    
    const result = await dialog.showOpenDialog(mainWindow, dialogOptions);
    
    if (result.canceled) {
      return { success: false, canceled: true };
    }
    
    return { success: true, filePaths: result.filePaths };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Word文档处理
ipcMain.handle('process-word-document', async (event, options) => {
  try {
    const { filePath, type } = options;
    
    if (type === 'docx') {
      // 处理 .docx 文件
      const mammoth = require('mammoth');
      const options = {
        path: filePath,
        // 使用更全面的样式映射
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Subtitle'] => h2:fresh",
          "r[style-name='Strong'] => strong",
          "r[style-name='Emphasis'] => em",
          // 通用样式映射
          "p => p:fresh",
          "r => span"
        ],
        convertImage: mammoth.images.imgElement(function(image) {
          return image.read("base64").then(function(imageBuffer) {
            return {
              src: "data:" + image.contentType + ";base64," + imageBuffer
            };
          });
        }),
        // 启用所有样式映射以保留更多格式
        includeDefaultStyleMap: true,
        includeEmbeddedStyleMap: true,
        preserveEmptyParagraphs: true,
        // 添加styleHook来直接处理Word文档的XML元素，保留格式
        styleHook: function(el, pr) {
          if (el.name === 'w:p') {
            const result = [];
            
            // 处理段落对齐
            const alignEl = el.firstOrEmpty('w:pPr').first('w:jc');
            if (alignEl) {
              const alignVal = alignEl.attributes['w:val'];
              if (alignVal === 'center') {
                result.push('text-align:center');
              } else if (alignVal === 'right') {
                result.push('text-align:right');
              } else if (alignVal === 'both' || alignVal === 'distribute') {
                result.push('text-align:justify');
              }
            }
            
            // 处理字体大小（从第一个run中获取）
            const fontSizeEl = el.firstOrEmpty('w:r').firstOrEmpty('w:rPr').first('w:sz');
            if (fontSizeEl) {
              const fontSizeVal = fontSizeEl.attributes['w:val'];
              // Word中的字体大小是半点单位，需要除以2
              result.push(`font-size:${fontSizeVal/2}pt`);
            }
            
            // 处理字体颜色
            const colorEl = el.firstOrEmpty('w:r').firstOrEmpty('w:rPr').first('w:color');
            if (colorEl) {
              const colorVal = colorEl.attributes['w:val'];
              if (colorVal && colorVal !== 'auto') {
                result.push(`color:#${colorVal}`);
              }
            }
            
            // 处理粗体
            const boldEl = el.firstOrEmpty('w:r').firstOrEmpty('w:rPr').first('w:b');
            if (boldEl) {
              const boldVal = boldEl.attributes['w:val'];
              if (boldVal !== '0') {
                result.push('font-weight:bold');
              }
            }
            
            // 处理斜体
            const italicEl = el.firstOrEmpty('w:r').firstOrEmpty('w:rPr').first('w:i');
            if (italicEl) {
              const italicVal = italicEl.attributes['w:val'];
              if (italicVal !== '0') {
                result.push('font-style:italic');
              }
            }
            
            // 处理下划线
            const underlineEl = el.firstOrEmpty('w:r').firstOrEmpty('w:rPr').first('w:u');
            if (underlineEl) {
              const underlineVal = underlineEl.attributes['w:val'];
              if (underlineVal && underlineVal !== 'none') {
                result.push('text-decoration:underline');
              }
            }
            
            return result.join(';') || '';
          } else if (el.name === 'w:r') {
            // 处理run级别的样式
            const result = [];
            
            // 处理字体大小
            const fontSizeEl = el.firstOrEmpty('w:rPr').first('w:sz');
            if (fontSizeEl) {
              const fontSizeVal = fontSizeEl.attributes['w:val'];
              result.push(`font-size:${fontSizeVal/2}pt`);
            }
            
            // 处理字体颜色
            const colorEl = el.firstOrEmpty('w:rPr').first('w:color');
            if (colorEl) {
              const colorVal = colorEl.attributes['w:val'];
              if (colorVal && colorVal !== 'auto') {
                result.push(`color:#${colorVal}`);
              }
            }
            
            // 处理粗体
            const boldEl = el.firstOrEmpty('w:rPr').first('w:b');
            if (boldEl) {
              const boldVal = boldEl.attributes['w:val'];
              if (boldVal !== '0') {
                result.push('font-weight:bold');
              }
            }
            
            // 处理斜体
            const italicEl = el.firstOrEmpty('w:rPr').first('w:i');
            if (italicEl) {
              const italicVal = italicEl.attributes['w:val'];
              if (italicVal !== '0') {
                result.push('font-style:italic');
              }
            }
            
            // 处理下划线
            const underlineEl = el.firstOrEmpty('w:rPr').first('w:u');
            if (underlineEl) {
              const underlineVal = underlineEl.attributes['w:val'];
              if (underlineVal && underlineVal !== 'none') {
                result.push('text-decoration:underline');
              }
            }
            
            return result.join(';') || '';
          }
          
          return '';
        }
      };
      
      const result = await mammoth.convertToHtml(options);
      return { success: true, html: result.value, messages: result.messages };
    } else if (type === 'doc') {
      // 处理 .doc 文件
      const WordExtractor = require('word-extractor');
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(filePath);
      const text = extracted.getBody();
      
      // 更好的文本到HTML转换，保持段落结构
      const lines = text.split('\n');
      let html = '';
      let currentParagraph = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '') {
          // 空行表示段落结束
          if (currentParagraph.trim()) {
            html += `<p>${currentParagraph.trim()}</p>`;
            currentParagraph = '';
          }
        } else {
          // 添加到当前段落
          if (currentParagraph) {
            currentParagraph += ' ' + line;
          } else {
            currentParagraph = line;
          }
        }
      }
      
      // 处理最后一个段落
      if (currentParagraph.trim()) {
        html += `<p>${currentParagraph.trim()}</p>`;
      }
      
      return { success: true, html, text };
    } else {
      return { success: false, error: '不支持的文件类型' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// HTML转Markdown（保留样式）
ipcMain.handle('html-to-markdown', async (event, html) => {
  try {
    const TurndownService = require('turndown');
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
      preformattedCode: false
    });
    
    // 保留所有段落样式
    turndownService.addRule('allParagraphs', {
      filter: function (node) {
        return node.nodeName === 'P';
      },
      replacement: function (content, node) {
        const styles = [];
        
        // 检查内联样式
        if (node.style) {
          if (node.style.textAlign) {
            styles.push(`text-align: ${node.style.textAlign}`);
          }
          if (node.style.fontSize) {
            styles.push(`font-size: ${node.style.fontSize}`);
          }
          if (node.style.fontWeight) {
            styles.push(`font-weight: ${node.style.fontWeight}`);
          }
          if (node.style.fontStyle) {
            styles.push(`font-style: ${node.style.fontStyle}`);
          }
        }
        
        // 检查类名
        const className = node.className || '';
        if (className) {
          if (className.includes('center')) {
            styles.push('text-align: center');
          } else if (className.includes('right')) {
            styles.push('text-align: right');
          } else if (className.includes('justify')) {
            styles.push('text-align: justify');
          }
        }
        
        if (styles.length > 0) {
          return `<p style="${styles.join('; ')}">${content.trim()}</p>\n\n`;
        } else {
          return content.trim() ? content.trim() + '\n\n' : '';
        }
      }
    });
    
    // 保留所有span样式
    turndownService.addRule('allSpans', {
      filter: function (node) {
        return node.nodeName === 'SPAN';
      },
      replacement: function (content, node) {
        const styles = [];
        
        // 检查内联样式
        if (node.style) {
          if (node.style.fontSize) {
            styles.push(`font-size: ${node.style.fontSize}`);
          }
          if (node.style.fontWeight) {
            styles.push(`font-weight: ${node.style.fontWeight}`);
          }
          if (node.style.fontStyle) {
            styles.push(`font-style: ${node.style.fontStyle}`);
          }
          if (node.style.color) {
            styles.push(`color: ${node.style.color}`);
          }
          if (node.style.textDecoration) {
            styles.push(`text-decoration: ${node.style.textDecoration}`);
          }
        }
        
        if (styles.length > 0) {
          return `<span style="${styles.join('; ')}">${content}</span>`;
        } else {
          return content;
        }
      }
    });
    
    turndownService.addRule('lineBreaks', {
      filter: 'br',
      replacement: function () {
        return '\n';
      }
    });
    
    const markdown = turndownService.turndown(html);
    return { success: true, markdown };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 图片文件处理
ipcMain.handle('process-image-file', async (event, filePath) => {
  try {
    
    // 检查文件是否存在
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!fileExists) {
      return { success: false, error: '文件不存在' };
    }
    
    // 获取文件信息
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    // 检查是否为支持的图片格式
    const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif'];
    if (!supportedFormats.includes(fileExt)) {
      return { success: false, error: '不支持的图片格式' };
    }
    
    // 读取文件并转换为base64
    const imageBuffer = await fs.readFile(filePath);
    const base64Data = imageBuffer.toString('base64');
    
    // 获取MIME类型
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff'
    };
    
    const mimeType = mimeTypes[fileExt] || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Data}`;
    
    return {
      success: true,
      imageData: {
        fileName,
        filePath,
        fileSize,
        mimeType,
        dataUrl,
        base64: base64Data
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 继续原有的处理逻辑
ipcMain.handle('continue-open-folder-dialog', async (event) => {
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
    return { success: false, error: error.message };
  }
});

// OCR识别处理
ipcMain.handle('perform-ocr', async (event, filePath) => {
  try {
    const FormData = require('form-data');
    const fetch = require('node-fetch');
    
    // 读取图片文件
    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    
    // 创建FormData
    const formData = new FormData();
    formData.append('file', fileBuffer, fileName);
    
    // 调用OCR API
    const response = await fetch('http://218.84.171.219:5000/ocr', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`OCR API请求失败: ${response.status}`);
    }
    
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
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