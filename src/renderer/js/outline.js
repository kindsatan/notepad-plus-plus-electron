/**
 * 文档大纲管理器
 * 负责解析Markdown内容并生成文档大纲树
 */
class OutlineManager {
  constructor(app) {
    this.app = app;
    this.element = document.getElementById('outline-tree');
    this.headings = [];
    
    if (!this.element) {
      return;
    }
    
    this.init();
  }
  
  /**
   * 初始化大纲管理器
   */
  init() {
    // 延迟绑定事件，确保编辑器完全初始化
    setTimeout(() => {
      this.bindEvents();
    }, 100);
  }
  
  /**
   * 绑定事件监听
   */
  bindEvents() {
    if (!this.app.editor || !this.app.editor.element) {
      return;
    }
    
    // 监听编辑器内容变化
    this.app.editor.element.addEventListener('input', () => {
      this.onFileContentChanged();
    });
    
    // 监听编辑器内容设置事件
    const originalSetContent = this.app.editor.setContent.bind(this.app.editor);
    this.app.editor.setContent = (content) => {
      originalSetContent(content);
      // 延迟更新大纲，确保内容已设置
      setTimeout(() => {
        this.updateOutline();
      }, 50);
    };
  }
  
  /**
   * 防抖更新大纲
   */
  debounceUpdate() {
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      this.updateOutline();
    }, 300);
  }
  
  /**
   * 更新文档大纲
   */
  updateOutline() {
    if (!this.element) {
      return;
    }
    
    if (!this.app.editor || !this.app.editor.element) {
      this.showEmptyState();
      return;
    }
    
    const content = this.app.editor.element.value;
    
    if (!content.trim()) {
      this.showEmptyState();
      return;
    }
    
    this.headings = this.parseHeadings(content);
    
    if (this.headings.length === 0) {
      this.showEmptyState();
    } else {
      this.renderOutline();
    }
  }
  
  /**
   * 解析Markdown标题
   */
  parseHeadings(content) {
    const headings = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = this.generateId(text);
        
        headings.push({
          level,
          text,
          id,
          line: index + 1
        });
      }
    });
    
    return headings;
  }
  
  /**
   * 生成标题ID
   */
  generateId(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  /**
   * 渲染大纲树
   */
  renderOutline() {
    const tree = this.buildTree(this.headings);
    this.element.innerHTML = this.renderTree(tree);
    
    // 添加点击事件
    this.addClickListeners();
  }
  
  /**
   * 构建大纲树结构
   */
  buildTree(headings) {
    const tree = [];
    const stack = [];
    
    headings.forEach(heading => {
      const node = {
        ...heading,
        children: []
      };
      
      // 找到合适的父节点
      while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
        stack.pop();
      }
      
      if (stack.length === 0) {
        tree.push(node);
      } else {
        stack[stack.length - 1].children.push(node);
      }
      
      stack.push(node);
    });
    
    return tree;
  }
  
  /**
   * 渲染树节点
   */
  renderTree(nodes) {
    if (nodes.length === 0) {
      return '';
    }
    
    let html = '<ul class="outline-list">';
    
    nodes.forEach(node => {
      html += `
        <li class="outline-item" data-line="${node.line}">
          <div class="outline-content level-${node.level}">
            <span class="outline-text" title="${node.text}">${node.text}</span>
            <span class="outline-line">:${node.line}</span>
          </div>
      `;
      
      if (node.children.length > 0) {
        html += this.renderTree(node.children);
      }
      
      html += '</li>';
    });
    
    html += '</ul>';
    return html;
  }
  
  /**
   * 添加点击事件监听
   */
  addClickListeners() {
    this.element.querySelectorAll('.outline-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const line = parseInt(item.dataset.line);
        this.jumpToLine(line);
      });
    });
  }
  
  /**
   * 跳转到指定行
   */
  jumpToLine(line) {
    if (!this.app.editor || !this.app.editor.element) {
      return;
    }
    
    // 获取当前视图模式
    const currentViewMode = this.app.viewMode || 'editor';
    
    if (currentViewMode === 'preview') {
      // 预览模式下，滚动到预览区域的对应标题
      this.jumpToPreviewHeading(line);
    } else {
      // 编辑模式或分屏模式下，跳转到编辑器的指定行
      this.jumpToEditorLine(line);
    }
    
    // 高亮当前行
    this.highlightCurrentLine(line);
  }
  
  /**
   * 在编辑器中跳转到指定行
   */
  jumpToEditorLine(line) {
    const editor = this.app.editor.element;
    const lines = editor.value.split('\n');
    
    if (line > 0 && line <= lines.length) {
      // 计算光标位置
      let position = 0;
      for (let i = 0; i < line - 1; i++) {
        position += lines[i].length + 1; // +1 for newline
      }
      
      // 设置光标位置并聚焦
      editor.focus();
      editor.setSelectionRange(position, position);
      
      // 滚动到可见区域
      const lineHeight = parseInt(getComputedStyle(editor).lineHeight);
      const scrollTop = (line - 1) * lineHeight;
      editor.scrollTop = Math.max(0, scrollTop - editor.clientHeight / 2);
    }
  }
  
  /**
   * 在预览区域中跳转到对应标题
   */
  jumpToPreviewHeading(line) {
    if (!this.app.preview || !this.app.preview.element) {
      return;
    }
    
    // 获取对应行的标题文本
    const editor = this.app.editor.element;
    const lines = editor.value.split('\n');
    
    if (line > 0 && line <= lines.length) {
      const targetLine = lines[line - 1];
      const headingMatch = targetLine.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        const headingText = headingMatch[2].trim();
        const headingLevel = headingMatch[1].length;
        
        // 获取预览内容区域和滚动容器
        const previewContent = this.app.preview.element; // preview-content
        const previewArea = document.getElementById('preview-area'); // 外层容器
        const previewWrapper = previewArea ? previewArea.querySelector('.preview-wrapper') : null; // 实际滚动容器
        
        if (!previewWrapper) {
          // 预览滚动容器未找到
          return;
        }
        
        const headings = previewContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        for (const heading of headings) {
          if (heading.textContent.trim() === headingText && 
              parseInt(heading.tagName.charAt(1)) === headingLevel) {
            // 计算标题相对于预览内容的位置
            const headingRect = heading.getBoundingClientRect();
            const previewContentRect = previewContent.getBoundingClientRect();
            const previewWrapperRect = previewWrapper.getBoundingClientRect();
            
            // 计算标题在预览内容中的偏移位置
            const headingOffsetTop = heading.offsetTop;
            
            // 计算滚动位置，让标题显示在预览区域的中央
            const scrollTop = headingOffsetTop - (previewWrapper.clientHeight / 2) + (heading.offsetHeight / 2);
            
            // 平滑滚动到目标位置
            previewWrapper.scrollTo({
              top: Math.max(0, scrollTop),
              behavior: 'smooth'
            });
            
            // 临时高亮该标题
            heading.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
            heading.style.transition = 'background-color 0.3s ease';
            
            setTimeout(() => {
              heading.style.backgroundColor = '';
            }, 1000);
            
            break;
          }
        }
      }
    }
  }
  
  /**
   * 高亮当前行
   */
  highlightCurrentLine(line) {
    // 移除之前的高亮
    this.element.querySelectorAll('.outline-item.active').forEach(item => {
      item.classList.remove('active');
    });
    
    // 添加新的高亮
    const targetItem = this.element.querySelector(`[data-line="${line}"]`);
    if (targetItem) {
      targetItem.classList.add('active');
    }
  }
  
  /**
   * 显示空状态
   */
  showEmptyState() {
    if (!this.element) {
      // outline-tree元素不存在，无法显示空状态
      return;
    }
    
    this.element.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-list-ul"></i>
        <p>打开Markdown文件以查看大纲</p>
      </div>
    `;
  }
  
  /**
   * 清空大纲
   */
  clear() {
    this.headings = [];
    this.showEmptyState();
  }
  
  /**
   * 手动刷新大纲
   */
  refresh() {
    this.updateOutline();
  }
  
  /**
   * 当文件内容改变时调用
   */
  onFileContentChanged() {
    setTimeout(() => {
      this.updateOutline();
    }, 50);
  }
}