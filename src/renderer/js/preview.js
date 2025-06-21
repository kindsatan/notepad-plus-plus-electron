/**
 * 预览器类
 * 负责Markdown内容的实时预览和渲染
 */
class Preview {
  constructor(app) {
    this.app = app;
    this.element = document.getElementById('preview-content');
    this.content = '';
    this.isScrollSyncing = false;
    this.scrollSyncTimeout = null;
    
    // 预览设置
    this.settings = {
      theme: 'dark',
      fontSize: 14,
      lineHeight: 1.6,
      maxWidth: '100%',
      sanitize: true,
      breaks: true,
      linkify: true,
      typographer: true
    };
    
    // Markdown渲染器配置
    this.renderer = null;
    this.highlighter = null;
    
    this.init();
  }
  
  /**
   * 初始化预览器
   */
  init() {
    if (!this.element) {
      console.error('预览元素未找到');
      return;
    }
    
    this.setupRenderer();
    this.setupEventListeners();
    this.applySettings();
    
    // 显示欢迎内容
    this.showWelcomeContent();
    
    console.log('预览器初始化完成');
  }
  
  /**
   * 设置Markdown渲染器
   */
  setupRenderer() {
    if (typeof marked !== 'undefined') {
      // 配置marked选项
      marked.setOptions({
        breaks: this.settings.breaks,
        gfm: true,
        headerIds: true,
        mangle: false,
        pedantic: false,
        sanitize: false, // 我们使用DOMPurify进行清理
        silent: false,
        smartLists: true,
        smartypants: this.settings.typographer,
        xhtml: false
      });
      
      // 自定义渲染器
      this.renderer = new marked.Renderer();
      
      // 自定义代码块渲染
      this.renderer.code = (code, language) => {
        const validLanguage = language && hljs.getLanguage(language) ? language : 'plaintext';
        const highlighted = hljs.highlight(code, { language: validLanguage }).value;
        return `<pre class="hljs"><code class="hljs language-${validLanguage}">${highlighted}</code></pre>`;
      };
      
      // 自定义链接渲染
      this.renderer.link = (href, title, text) => {
        const titleAttr = title ? ` title="${title}"` : '';
        return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
      };
      
      // 自定义图片渲染
      this.renderer.image = (href, title, text) => {
        const titleAttr = title ? ` title="${title}"` : '';
        const altAttr = text ? ` alt="${text}"` : '';
        return `<img src="${href}"${titleAttr}${altAttr} loading="lazy">`;
      };
      
      // 自定义表格渲染
      this.renderer.table = (header, body) => {
        return `<div class="table-wrapper"><table class="markdown-table">
<thead>
${header}</thead>
<tbody>
${body}</tbody>
</table></div>`;
      };
      
      // 自定义任务列表渲染
      this.renderer.listitem = (text) => {
        if (/^\s*\[[x ]\]\s*/.test(text)) {
          const checked = /^\s*\[x\]\s*/.test(text);
          const cleanText = text.replace(/^\s*\[[x ]\]\s*/, '');
          return `<li class="task-list-item"><input type="checkbox" ${checked ? 'checked' : ''} disabled> ${cleanText}</li>`;
        }
        return `<li>${text}</li>`;
      };
      
      marked.use({ renderer: this.renderer });
    }
  }
  
  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 滚动同步
    this.element.addEventListener('scroll', () => {
      if (!this.isScrollSyncing) {
        this.syncScrollToEditor();
      }
    });
    
    // 点击链接处理
    this.element.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        e.preventDefault();
        this.handleLinkClick(e.target.href);
      }
    });
    
    // 图片加载错误处理
    this.element.addEventListener('error', (e) => {
      if (e.target.tagName === 'IMG') {
        this.handleImageError(e.target);
      }
    }, true);
  }
  
  /**
   * 应用设置
   */
  applySettings() {
    this.element.style.fontSize = this.settings.fontSize + 'px';
    this.element.style.lineHeight = this.settings.lineHeight;
    this.element.style.maxWidth = this.settings.maxWidth;
    
    // 应用主题
    this.element.className = `preview-content theme-${this.settings.theme}`;
  }
  
  /**
   * 显示欢迎内容
   */
  showWelcomeContent() {
    const welcomeContent = `
# 欢迎使用 Notepad++

这是一个现代化的Markdown编辑器，具有以下特性：

## ✨ 主要功能

- **实时预览** - 边写边看，所见即所得
- **语法高亮** - 支持多种编程语言
- **文件管理** - 便捷的文件浏览和管理
- **多标签页** - 同时编辑多个文件
- **查找替换** - 强大的文本搜索功能

## 🚀 快捷键

| 功能 | 快捷键 |
|------|--------|
| 新建文件 | Ctrl+N |
| 打开文件 | Ctrl+O |
| 保存文件 | Ctrl+S |
| 查找 | Ctrl+F |
| 替换 | Ctrl+H |
| 撤销 | Ctrl+Z |
| 重做 | Ctrl+Y |

## 📝 Markdown语法示例

### 文本格式

**粗体文本** 和 *斜体文本*

### 代码

行内代码：\`console.log('Hello World!')\`

代码块：
\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

### 列表

- 无序列表项 1
- 无序列表项 2
  - 嵌套项

1. 有序列表项 1
2. 有序列表项 2

### 任务列表

- [x] 已完成任务
- [ ] 待完成任务

### 引用

> 这是一个引用块
> 可以包含多行内容

### 链接和图片

[链接文本](https://example.com)

![图片描述](https://via.placeholder.com/300x200)

---

开始编写您的Markdown文档吧！
    `;
    
    this.updateContent(welcomeContent);
  }
  
  /**
   * 更新预览内容
   */
  updateContent(markdownContent) {
    if (this.content === markdownContent) return;
    
    this.content = markdownContent;
    
    try {
      // 渲染Markdown
      let html = '';
      
      if (markdownContent.trim()) {
        if (typeof marked !== 'undefined') {
          html = marked.parse(markdownContent);
        } else {
          // 降级处理：简单的文本显示
          html = this.simpleMarkdownRender(markdownContent);
        }
        
        // 清理HTML（防止XSS）
        if (this.settings.sanitize && typeof DOMPurify !== 'undefined') {
          html = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: [
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              'p', 'br', 'strong', 'em', 'u', 's', 'del',
              'a', 'img', 'code', 'pre',
              'ul', 'ol', 'li',
              'blockquote', 'hr',
              'table', 'thead', 'tbody', 'tr', 'th', 'td',
              'div', 'span'
            ],
            ALLOWED_ATTR: [
              'href', 'title', 'alt', 'src', 'class', 'id',
              'target', 'rel', 'type', 'checked', 'disabled',
              'loading'
            ]
          });
        }
      } else {
        html = '<div class="empty-content">开始输入Markdown内容...</div>';
      }
      
      // 更新DOM
      this.element.innerHTML = html;
      
      // 处理代码高亮
      this.highlightCodeBlocks();
      
      // 处理数学公式（如果需要）
      this.renderMathExpressions();
      
      // 处理图表（如果需要）
      this.renderCharts();
      
    } catch (error) {
      console.error('预览渲染失败:', error);
      this.element.innerHTML = `<div class="error-content">预览渲染失败: ${error.message}</div>`;
    }
  }
  
  /**
   * 简单的Markdown渲染（降级方案）
   */
  simpleMarkdownRender(content) {
    return content
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/\n/gim, '<br>');
  }
  
  /**
   * 高亮代码块
   */
  highlightCodeBlocks() {
    if (typeof hljs !== 'undefined') {
      this.element.querySelectorAll('pre code:not(.hljs)').forEach(block => {
        hljs.highlightElement(block);
      });
    }
  }
  
  /**
   * 渲染数学公式
   */
  renderMathExpressions() {
    // TODO: 如果需要数学公式支持，可以集成KaTeX或MathJax
  }
  
  /**
   * 渲染图表
   */
  renderCharts() {
    // TODO: 如果需要图表支持，可以集成Mermaid或Chart.js
  }
  
  /**
   * 同步滚动到编辑器
   */
  syncScrollToEditor() {
    if (this.scrollSyncTimeout) {
      clearTimeout(this.scrollSyncTimeout);
    }
    
    this.scrollSyncTimeout = setTimeout(() => {
      const editor = this.app.editor;
      if (editor && editor.element) {
        const previewScrollRatio = this.element.scrollTop / (this.element.scrollHeight - this.element.clientHeight);
        const editorScrollTop = previewScrollRatio * (editor.element.scrollHeight - editor.element.clientHeight);
        
        this.isScrollSyncing = true;
        editor.element.scrollTop = editorScrollTop;
        
        setTimeout(() => {
          this.isScrollSyncing = false;
        }, 100);
      }
    }, 50);
  }
  
  /**
   * 从编辑器同步滚动
   */
  syncScrollFromEditor(editorScrollTop, editorScrollHeight, editorClientHeight) {
    if (this.isScrollSyncing) return;
    
    const editorScrollRatio = editorScrollTop / (editorScrollHeight - editorClientHeight);
    const previewScrollTop = editorScrollRatio * (this.element.scrollHeight - this.element.clientHeight);
    
    this.isScrollSyncing = true;
    this.element.scrollTop = previewScrollTop;
    
    setTimeout(() => {
      this.isScrollSyncing = false;
    }, 100);
  }
  
  /**
   * 处理链接点击
   */
  handleLinkClick(href) {
    if (href.startsWith('http://') || href.startsWith('https://')) {
      // 外部链接
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal(href);
      } else {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    } else if (href.startsWith('#')) {
      // 内部锚点
      const target = this.element.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // 相对路径文件
      console.log('打开相对路径文件:', href);
      // TODO: 实现相对路径文件打开
    }
  }
  
  /**
   * 处理图片加载错误
   */
  handleImageError(img) {
    img.style.display = 'none';
    
    // 创建错误提示
    const errorDiv = document.createElement('div');
    errorDiv.className = 'image-error';
    errorDiv.innerHTML = `
      <i class="fas fa-image"></i>
      <span>图片加载失败: ${img.alt || img.src}</span>
    `;
    
    img.parentNode.insertBefore(errorDiv, img.nextSibling);
  }
  
  /**
   * 导出功能
   */
  
  /**
   * 导出为HTML
   */
  exportAsHTML() {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Export</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        pre {
            background: #f4f4f4;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 10px;
            overflow-x: auto;
        }
        code {
            background: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 0;
            padding-left: 20px;
            color: #666;
        }
        table {
            border-collapse: collapse;
            width: 100%;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>
${this.element.innerHTML}
</body>
</html>
    `;
    
    return html;
  }
  
  /**
   * 导出为PDF
   */
  async exportAsPDF() {
    if (window.electronAPI && window.electronAPI.exportToPDF) {
      const html = this.exportAsHTML();
      return await window.electronAPI.exportToPDF(html);
    } else {
      throw new Error('PDF导出功能不可用');
    }
  }
  
  /**
   * 打印预览
   */
  print() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(this.exportAsHTML());
    printWindow.document.close();
    printWindow.print();
  }
  
  /**
   * 公共API方法
   */
  
  /**
   * 设置主题
   */
  setTheme(theme) {
    this.settings.theme = theme;
    this.applySettings();
  }
  
  /**
   * 更新设置
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.applySettings();
  }
  
  /**
   * 获取当前内容
   */
  getContent() {
    return this.content;
  }
  
  /**
   * 获取渲染后的HTML
   */
  getRenderedHTML() {
    return this.element.innerHTML;
  }
  
  /**
   * 滚动到顶部
   */
  scrollToTop() {
    this.element.scrollTop = 0;
  }
  
  /**
   * 滚动到底部
   */
  scrollToBottom() {
    this.element.scrollTop = this.element.scrollHeight;
  }
  
  /**
   * 滚动到指定位置
   */
  scrollTo(position) {
    this.element.scrollTop = position;
  }
  
  /**
   * 查找并高亮文本
   */
  highlightText(searchText, options = {}) {
    if (!searchText) {
      this.clearHighlights();
      return;
    }
    
    const {
      caseSensitive = false,
      wholeWord = false
    } = options;
    
    // 移除之前的高亮
    this.clearHighlights();
    
    // 创建搜索正则表达式
    let flags = 'g';
    if (!caseSensitive) flags += 'i';
    
    let pattern = searchText;
    if (wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    
    const regex = new RegExp(pattern, flags);
    
    // 高亮匹配的文本
    this.highlightMatches(this.element, regex);
  }
  
  /**
   * 清除高亮
   */
  clearHighlights() {
    this.element.querySelectorAll('.search-highlight').forEach(el => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });
  }
  
  /**
   * 高亮匹配项
   */
  highlightMatches(node, regex) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const matches = [...text.matchAll(regex)];
      
      if (matches.length > 0) {
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        
        matches.forEach(match => {
          // 添加匹配前的文本
          if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
          }
          
          // 添加高亮的匹配文本
          const highlight = document.createElement('span');
          highlight.className = 'search-highlight';
          highlight.textContent = match[0];
          fragment.appendChild(highlight);
          
          lastIndex = match.index + match[0].length;
        });
        
        // 添加剩余文本
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        
        node.parentNode.replaceChild(fragment, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // 递归处理子节点
      Array.from(node.childNodes).forEach(child => {
        this.highlightMatches(child, regex);
      });
    }
  }
}