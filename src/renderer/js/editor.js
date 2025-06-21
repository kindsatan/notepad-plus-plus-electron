/**
 * 编辑器类
 * 负责文本编辑、语法高亮、代码折叠等功能
 */
class Editor {
  constructor(app) {
    this.app = app;
    this.element = document.getElementById('editor');
    this.lineNumbers = document.getElementById('line-numbers');
    this.content = '';
    this.cursorPosition = { line: 0, column: 0 };
    this.scrollPosition = 0;
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = 100;
    this.isComposing = false;
    this.highlightTimeout = null;
    
    // 编辑器设置
    this.settings = {
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
      tabSize: 4,
      wordWrap: true,
      showLineNumbers: true,
      highlightCurrentLine: true,
      autoIndent: true,
      bracketMatching: true
    };
    
    // 语法高亮相关
    this.syntaxHighlighter = new SyntaxHighlighter();
    
    this.init();
  }
  
  /**
   * 初始化编辑器
   */
  init() {
    if (!this.element) {
      console.error('编辑器元素未找到');
      return;
    }
    
    this.setupEditor();
    this.setupEventListeners();
    this.updateLineNumbers();
    this.applySyntaxHighlighting();
    
    console.log('编辑器初始化完成');
  }
  
  /**
   * 设置编辑器属性
   */
  setupEditor() {
    // textarea元素不需要设置contentEditable
    this.element.spellcheck = false;
    this.element.style.fontSize = this.settings.fontSize + 'px';
    this.element.style.fontFamily = this.settings.fontFamily;
    this.element.style.tabSize = this.settings.tabSize;
    this.element.style.whiteSpace = this.settings.wordWrap ? 'pre-wrap' : 'pre';
    
    // 设置初始内容 - 对于textarea使用value而不是textContent
    this.element.value = this.content;
  }

  /**
   * 更新字体设置
   */
  updateFontSettings(fontFamily, fontSize) {
    if (fontFamily) {
      this.settings.fontFamily = fontFamily;
      this.element.style.fontFamily = fontFamily;
    }
    
    if (fontSize) {
      this.settings.fontSize = fontSize;
      this.element.style.fontSize = fontSize + 'px';
    }
    
    // 更新行号字体大小
    this.updateLineNumbers();
  }
  
  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 输入事件
    this.element.addEventListener('input', (e) => {
      if (!this.isComposing) {
        this.handleInput(e);
      }
    });
    
    // 输入事件
    this.element.addEventListener('input', (e) => {
      if (!this.isComposing) {
        this.handleInput(e);
      }
    });
    
    this.element.addEventListener('compositionstart', () => {
      this.isComposing = true;
    });
    
    this.element.addEventListener('compositionend', (e) => {
      this.isComposing = false;
      this.handleInput(e);
    });
    
    // 键盘事件
    this.element.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });
    
    // 粘贴事件
    this.element.addEventListener('paste', (e) => {
      this.handlePaste(e);
    });
    
    // 滚动事件
    this.element.addEventListener('scroll', () => {
      this.handleScroll();
    });
    
    // 选择和光标位置事件 - textarea不支持selectionchange，使用其他事件
    this.element.addEventListener('select', () => {
      this.updateCursorPosition();
    });
    
    this.element.addEventListener('keyup', () => {
      this.updateCursorPosition();
    });
    
    this.element.addEventListener('mouseup', () => {
      this.updateCursorPosition();
    });
    
    // 焦点事件
    this.element.addEventListener('focus', () => {
      this.element.classList.add('focused');
    });
    
    this.element.addEventListener('blur', () => {
      this.element.classList.remove('focused');
    });
  }
  
  /**
   * 处理输入事件
   */
  handleInput(e) {
    // 从DOM获取纯文本内容
    const newContent = this.getPlainTextFromElement();
    

    
    // 检查内容是否真的改变了
    if (newContent !== this.content) {

      
      // 保存到历史记录
      this.saveToHistory();
      
      // 更新内容
      this.content = newContent;
      
      // 标记为已修改
      this.app.markAsModified();
      
      // 更新行号
      this.updateLineNumbers();
      
      // 延迟应用语法高亮，避免干扰用户输入
      clearTimeout(this.highlightTimeout);
      this.highlightTimeout = setTimeout(() => {
        this.applySyntaxHighlighting();
      }, 300);
      
      // 更新预览
      this.app.preview.updateContent(this.content);
      
      // 自动缩进
      if (this.settings.autoIndent && e.inputType === 'insertLineBreak') {
        this.handleAutoIndent();
      }
    } else {

    }
  }
  
  /**
   * 处理键盘按键
   */
  handleKeyDown(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    
    // Tab键处理
    if (e.key === 'Tab') {
      e.preventDefault();
      if (shift) {
        this.unindent();
      } else {
        this.indent();
      }
      return;
    }
    
    // 括号匹配
    if (this.settings.bracketMatching) {
      const brackets = {
        '(': ')',
        '[': ']',
        '{': '}',
        '"': '"',
        "'": "'",
        '`': '`'
      };
      
      if (brackets[e.key]) {
        e.preventDefault();
        this.insertBracketPair(e.key, brackets[e.key]);
        return;
      }
    }
    
    // 其他快捷键
    if (ctrl) {
      switch (e.key) {
        case 'a':
          e.preventDefault();
          this.selectAll();
          break;
        case 'd':
          e.preventDefault();
          this.duplicateLine();
          break;
        case '/':
          e.preventDefault();
          this.toggleComment();
          break;
      }
    }
  }
  
  /**
   * 处理粘贴事件
   */
  handlePaste(e) {
    e.preventDefault();
    
    const text = e.clipboardData.getData('text/plain');
    if (text) {
      this.insertText(text);
    }
  }
  
  /**
   * 处理滚动事件
   */
  handleScroll() {
    this.scrollPosition = this.element.scrollTop;
    
    // 同步行号滚动
    if (this.lineNumbers) {
      this.lineNumbers.scrollTop = this.scrollPosition;
    }
  }
  
  /**
   * 更新光标位置
   */
  updateCursorPosition() {
    if (!this.element) return;
    
    // 对于textarea元素，使用selectionStart属性
    if (this.element.tagName.toLowerCase() === 'textarea') {
      const cursorPos = this.element.selectionStart;
      const textBeforeCursor = this.element.value.substring(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      
      this.cursorPosition = {
        line: lines.length - 1,
        column: lines[lines.length - 1].length
      };
    } else {
      // 对于其他元素，使用window.getSelection()
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textBeforeCursor = this.getTextBeforeRange(range);
        const lines = textBeforeCursor.split('\n');
        
        this.cursorPosition = {
          line: lines.length - 1,
          column: lines[lines.length - 1].length
        };
      }
    }
    
    // 更新状态栏
    this.updateStatusBar();
  }
  
  /**
   * 更新行号
   */
  updateLineNumbers() {
    if (!this.lineNumbers || !this.settings.showLineNumbers) return;
    
    const lines = this.content.split('\n');
    const lineCount = lines.length;
    
    let html = '';
    for (let i = 1; i <= lineCount; i++) {
      html += `<div class="line-number">${i}</div>`;
    }
    
    this.lineNumbers.innerHTML = html;
  }
  
  /**
   * 应用语法高亮
   */
  applySyntaxHighlighting() {
    // 对于textarea元素，不能使用innerHTML进行语法高亮
    // 因为textarea只能包含纯文本，修改innerHTML会破坏其结构
    if (this.element.tagName.toLowerCase() === 'textarea') {
      // 跳过语法高亮，保持textarea的纯文本特性
      return;
    }
    
    if (!this.syntaxHighlighter) return;
    
    // 保存当前选择和滚动位置
    const selection = this.saveSelection();
    const scrollTop = this.element.scrollTop;
    
    // 应用高亮
    const highlightedContent = this.syntaxHighlighter.highlight(this.content, 'markdown');
    
    // 只有在内容确实改变时才更新DOM
    if (this.element.innerHTML !== highlightedContent) {
      this.element.innerHTML = highlightedContent;
      
      // 恢复选择和滚动位置
      this.restoreSelection(selection);
      this.element.scrollTop = scrollTop;
    }
  }
  
  /**
   * 保存选择状态
   */
  saveSelection() {
    // 对于textarea元素，使用selectionStart和selectionEnd
    if (this.element.tagName.toLowerCase() === 'textarea') {
      return {
        startOffset: this.element.selectionStart,
        endOffset: this.element.selectionEnd
      };
    }
    
    // 对于其他元素，使用window.getSelection()
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      return {
        startOffset: this.getTextOffset(range.startContainer, range.startOffset),
        endOffset: this.getTextOffset(range.endContainer, range.endOffset)
      };
    }
    return null;
  }
  
  /**
   * 恢复选择状态
   */
  restoreSelection(selectionState) {
    if (!selectionState) return;
    
    // 对于textarea元素，使用setSelectionRange
    if (this.element.tagName.toLowerCase() === 'textarea') {
      this.element.setSelectionRange(selectionState.startOffset, selectionState.endOffset);
      return;
    }
    
    // 对于其他元素，使用window.getSelection()
    const selection = window.getSelection();
    const range = document.createRange();
    
    try {
      const startPos = this.getNodeAndOffsetFromTextOffset(selectionState.startOffset);
      const endPos = this.getNodeAndOffsetFromTextOffset(selectionState.endOffset);
      
      if (startPos && endPos) {
        range.setStart(startPos.node, startPos.offset);
        range.setEnd(endPos.node, endPos.offset);
        
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (e) {
      console.warn('恢复选择状态失败:', e);
    }
  }
  
  /**
   * 获取文本偏移量
   */
  getTextOffset(node, offset) {
    let textOffset = 0;
    const walker = document.createTreeWalker(
      this.element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let currentNode;
    while (currentNode = walker.nextNode()) {
      if (currentNode === node) {
        return textOffset + offset;
      }
      textOffset += currentNode.textContent.length;
    }
    
    return textOffset;
  }
  
  /**
   * 从文本偏移量获取节点和偏移量
   */
  getNodeAndOffsetFromTextOffset(textOffset) {
    let currentOffset = 0;
    const walker = document.createTreeWalker(
      this.element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let currentNode;
    while (currentNode = walker.nextNode()) {
      const nodeLength = currentNode.textContent.length;
      if (currentOffset + nodeLength >= textOffset) {
        return {
          node: currentNode,
          offset: textOffset - currentOffset
        };
      }
      currentOffset += nodeLength;
    }
    
    return null;
  }
  
  /**
   * 获取范围前的文本
   */
  getTextBeforeRange(range) {
    const tempRange = document.createRange();
    tempRange.selectNodeContents(this.element);
    tempRange.setEnd(range.startContainer, range.startOffset);
    return tempRange.toString();
  }
  
  /**
   * 插入文本
   */
  insertText(text) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      
      // 触发输入事件
      this.element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  
  /**
   * 缩进
   */
  indent() {
    const tabString = ' '.repeat(this.settings.tabSize);
    this.insertText(tabString);
  }
  
  /**
   * 取消缩进
   */
  unindent() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const line = this.getCurrentLine(range);
      
      if (line.startsWith(' '.repeat(this.settings.tabSize))) {
        // 删除缩进
        const newLine = line.substring(this.settings.tabSize);
        this.replaceCurrentLine(newLine);
      }
    }
  }
  
  /**
   * 自动缩进
   */
  handleAutoIndent() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const previousLine = this.getPreviousLine(range);
      
      if (previousLine) {
        const indent = this.getLineIndent(previousLine);
        if (indent) {
          this.insertText(indent);
        }
      }
    }
  }
  
  /**
   * 获取当前行
   */
  getCurrentLine(range) {
    const textBeforeCursor = this.getTextBeforeRange(range);
    const lines = textBeforeCursor.split('\n');
    return lines[lines.length - 1];
  }
  
  /**
   * 获取上一行
   */
  getPreviousLine(range) {
    const textBeforeCursor = this.getTextBeforeRange(range);
    const lines = textBeforeCursor.split('\n');
    return lines.length > 1 ? lines[lines.length - 2] : null;
  }
  
  /**
   * 获取行缩进
   */
  getLineIndent(line) {
    const match = line.match(/^\s*/);
    return match ? match[0] : '';
  }
  
  /**
   * 替换当前行
   */
  replaceCurrentLine(newLine) {
    // TODO: 实现行替换逻辑
  }
  
  /**
   * 插入括号对
   */
  insertBracketPair(open, close) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      if (selectedText) {
        // 包围选中文本
        range.deleteContents();
        range.insertNode(document.createTextNode(open + selectedText + close));
      } else {
        // 插入括号对并将光标置于中间
        range.insertNode(document.createTextNode(open + close));
        range.setStart(range.startContainer, range.startOffset - 1);
        range.collapse(true);
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  
  /**
   * 全选
   */
  selectAll() {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(this.element);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  /**
   * 复制当前行
   */
  duplicateLine() {
    // TODO: 实现行复制逻辑
  }
  
  /**
   * 切换注释
   */
  toggleComment() {
    // TODO: 实现注释切换逻辑
  }
  
  /**
   * 撤销
   */
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const state = this.history[this.historyIndex];
      this.setContent(state.content, false);
      this.setCursorPosition(state.cursorPosition);
    }
  }
  
  /**
   * 重做
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const state = this.history[this.historyIndex];
      this.setContent(state.content, false);
      this.setCursorPosition(state.cursorPosition);
    }
  }
  
  /**
   * 保存到历史记录
   */
  saveToHistory() {
    const state = {
      content: this.content,
      cursorPosition: { ...this.cursorPosition },
      timestamp: Date.now()
    };
    
    // 移除当前位置之后的历史记录
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // 添加新状态
    this.history.push(state);
    this.historyIndex = this.history.length - 1;
    
    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyIndex--;
    }
  }
  
  /**
   * 更新状态栏
   */
  updateStatusBar() {
    const lineEl = document.getElementById('cursor-line');
    const columnEl = document.getElementById('cursor-column');
    const lengthEl = document.getElementById('content-length');
    
    if (lineEl) lineEl.textContent = this.cursorPosition.line + 1;
    if (columnEl) columnEl.textContent = this.cursorPosition.column + 1;
    if (lengthEl) lengthEl.textContent = this.content.length;
  }
  
  /**
   * 公共API方法
   */
  
  /**
   * 设置内容
   */
  setContent(content, saveHistory = true) {
    if (saveHistory) {
      this.saveToHistory();
    }
    
    this.content = content || '';
    // 对于textarea元素，使用value属性而不是textContent
    if (this.element.tagName.toLowerCase() === 'textarea') {
      this.element.value = this.content;
    } else {
      this.element.textContent = this.content;
    }
    
    this.updateLineNumbers();
    this.applySyntaxHighlighting();
    this.updateStatusBar();
  }
  
  /**
   * 获取内容
   */
  getContent() {
    // 对于textarea元素，直接从value获取最新内容
    let currentContent;
    if (this.element && this.element.tagName.toLowerCase() === 'textarea') {
      currentContent = this.element.value || '';
      // 同步更新存储的内容
      this.content = currentContent;
    } else {
      // 对于其他元素，返回存储的内容
      currentContent = this.content || '';
    }
    

    
    return currentContent;
  }
  
  /**
   * 从DOM元素获取纯文本内容
   */
  getPlainTextFromElement() {
    if (!this.element) return '';
    
    // 对于textarea元素，直接返回value
    if (this.element.tagName.toLowerCase() === 'textarea') {
      return this.element.value || '';
    }
    
    // 对于其他元素，创建一个临时元素来获取纯文本
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.element.innerHTML;
    
    // 递归获取所有文本节点的内容
    const getTextContent = (node) => {
      let text = '';
      for (let child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          text += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          // 对于br标签，添加换行符
          if (child.tagName === 'BR') {
            text += '\n';
          } else if (child.tagName === 'DIV') {
            // 对于div标签，在前面添加换行符（除了第一个）
            if (text && !text.endsWith('\n')) {
              text += '\n';
            }
            text += getTextContent(child);
          } else {
            text += getTextContent(child);
          }
        }
      }
      return text;
    };
    
    return getTextContent(tempDiv);
  }
  
  /**
   * 设置光标位置
   */
  setCursorPosition(position) {
    this.cursorPosition = position;
    
    if (!this.element || !position) return;
    
    // 对于textarea元素，计算字符位置并设置selectionStart
    if (this.element.tagName.toLowerCase() === 'textarea') {
      const lines = this.element.value.split('\n');
      let charPosition = 0;
      
      // 计算到指定行的字符位置
      for (let i = 0; i < Math.min(position.line, lines.length); i++) {
        charPosition += lines[i].length + 1; // +1 for newline character
      }
      
      // 添加列偏移
      if (position.line < lines.length) {
        charPosition += Math.min(position.column, lines[position.line].length);
      }
      
      // 设置光标位置
      this.element.setSelectionRange(charPosition, charPosition);
      this.element.focus();
    }
    // TODO: 为其他元素类型实现光标位置设置
  }
  
  /**
   * 获取光标位置
   */
  getCursorPosition() {
    return { ...this.cursorPosition };
  }
  
  /**
   * 设置滚动位置
   */
  setScrollPosition(position) {
    this.scrollPosition = position;
    this.element.scrollTop = position;
  }
  
  /**
   * 获取滚动位置
   */
  getScrollPosition() {
    return this.element.scrollTop;
  }
  
  /**
   * 聚焦编辑器
   */
  focus() {
    this.element.focus();
  }
  
  /**
   * 查找文本
   */
  find(text, options = {}) {
    
    
    const {
      caseSensitive = false,
      wholeWord = false,
      regex = false
    } = options;
    
    try {
      // 清除之前的高亮
      this.clearSearchHighlights();
      
      if (!text) {
        
        return false;
      }
      
      const content = this.element.textContent || '';
      
      
      let searchRegex;
      
      if (regex) {
        try {
          const flags = caseSensitive ? 'g' : 'gi';
          searchRegex = new RegExp(text, flags);
          
        } catch (e) {
          console.error('Invalid regex:', e);
          return false;
        }
      } else {
        // 转义特殊字符
        const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\$&');
        let pattern = escapedText;
        
        if (wholeWord) {
          pattern = `\b${escapedText}\b`;
        }
        
        const flags = caseSensitive ? 'g' : 'gi';
        searchRegex = new RegExp(pattern, flags);
        
      }
      
      // 查找所有匹配项
      const matches = [];
      let match;
      while ((match = searchRegex.exec(content)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          text: match[0]
        });
        
        // 防止无限循环
        if (searchRegex.lastIndex === match.index) {
          searchRegex.lastIndex++;
        }
      }
      
      // 存储匹配结果
      this.searchMatches = matches;
      this.currentMatchIndex = -1;
      

      
      // 高亮显示所有匹配项
      this.highlightSearchMatches();
      
      return matches.length > 0;
    } catch (error) {
      console.error('Find error:', error);
      return false;
    }
  }
  
  /**
   * 查找下一个
   */
  findNext(text, options = {}) {
    if (!this.searchMatches || this.searchMatches.length === 0) {
      this.find(text, options);
    }
    
    if (this.searchMatches && this.searchMatches.length > 0) {
      this.currentMatchIndex = (this.currentMatchIndex + 1) % this.searchMatches.length;
      this.selectMatch(this.currentMatchIndex);
      return true;
    }
    

    return false;
  }
  
  /**
   * 查找上一个
   */
  findPrevious(text, options = {}) {
    if (!this.searchMatches || this.searchMatches.length === 0) {
      this.find(text, options);
    }
    
    if (this.searchMatches && this.searchMatches.length > 0) {
      this.currentMatchIndex = this.currentMatchIndex <= 0 ? 
        this.searchMatches.length - 1 : this.currentMatchIndex - 1;
      this.selectMatch(this.currentMatchIndex);
      return true;
    }
    
    return false;
  }
  
  /**
   * 选中指定的匹配项
   */
  selectMatch(index) {

    
    if (!this.searchMatches || index < 0 || index >= this.searchMatches.length) {

      return;
    }
    
    const match = this.searchMatches[index];
    
    const content = this.element.textContent || '';
    
    // 对于 textarea 元素，使用简单的选择方法
    if (this.element.tagName.toLowerCase() === 'textarea') {

      this.element.focus();
      this.element.setSelectionRange(match.index, match.index + match.length);
      
      return;
    }
    
    // 对于 contentEditable 元素，使用 Range API
    
    
    // 创建文本节点的范围
    const range = document.createRange();
    const walker = document.createTreeWalker(
      this.element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // 只接受非空的文本节点
          return node.textContent.length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      },
      false
    );
    
    let currentPos = 0;
    let node;
    let rangeSet = false;
    
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent.length;
      
      
      // 检查匹配项是否在当前节点中开始
      if (currentPos <= match.index && currentPos + nodeLength > match.index) {
        const startOffset = match.index - currentPos;
        
        range.setStart(node, startOffset);
        
        // 检查匹配项是否在当前节点中结束
        if (currentPos + nodeLength >= match.index + match.length) {
          const endOffset = match.index + match.length - currentPos;
          
          range.setEnd(node, endOffset);
          rangeSet = true;
          break;
        } else {
          // 跨节点的情况，需要继续查找结束节点
          let remainingLength = match.length - (nodeLength - startOffset);
          let endNode;
          
          
          while (remainingLength > 0 && (endNode = walker.nextNode())) {
            const endNodeLength = endNode.textContent.length;
            
            
            if (endNodeLength >= remainingLength) {
              
              range.setEnd(endNode, remainingLength);
              rangeSet = true;
              break;
            }
            remainingLength -= endNodeLength;
          }
          break;
        }
      }
      
      currentPos += nodeLength;
    }
    
    if (!rangeSet) {
      
      
      // 备用方法：直接使用文本内容创建范围
      try {
        const textNode = this.element.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          range.setStart(textNode, match.index);
          range.setEnd(textNode, match.index + match.length);
          rangeSet = true;
          
        }
      } catch (error) {
        console.error('[EDITOR] selectMatch: fallback method failed:', error);
        return;
      }
    }
    
    if (!rangeSet) {
      
      return;
    }
    
    // 选中文本
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    
    
    // 滚动到可见区域
    if (range.getBoundingClientRect) {
      this.element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }
  
  /**
   * 高亮显示搜索匹配项
   */
  highlightSearchMatches() {
    // 简单实现：添加CSS类来高亮
    // 这里可以根据需要实现更复杂的高亮逻辑
  }
  
  /**
   * 清除搜索高亮
   */
  clearSearchHighlights() {
    this.searchMatches = [];
    this.currentMatchIndex = -1;
    // 清除高亮样式
  }
  
  /**
   * 检查文本是否匹配搜索条件
   * @param {string} text - 要检查的文本
   * @param {string} searchText - 搜索文本
   * @param {Object} options - 搜索选项
   * @returns {boolean} 是否匹配
   */
  matchesSearchCriteria(text, searchText, options = {}) {
 
    
    if (!text || !searchText) {
      
      return false;
    }
    
    // 如果启用了大小写敏感
    if (options.caseSensitive) {
      const matches = text === searchText;
      
      return matches;
    } else {
      const matches = text.toLowerCase() === searchText.toLowerCase();

      return matches;
    }
  }
  
  /**
   * 替换文本
   */
  replace(searchText, replaceText, options = {}) {
    
    if (!searchText) {

      return false;
    }
    
    // 首先确保有搜索匹配项
    if (!this.searchMatches || this.searchMatches.length === 0) {

      if (!this.find(searchText, options)) {

        return false;
      }
    }
    
    // 如果没有当前选中的匹配项，选择第一个
    if (this.currentMatchIndex === -1 && this.searchMatches.length > 0) {
      
      this.currentMatchIndex = 0;
      this.selectMatch(this.currentMatchIndex);
    }
    
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
 
    
    // 检查当前选中的文本是否匹配搜索条件
    if (selectedText && this.matchesSearchCriteria(selectedText, searchText, options)) {
      
      
      try {
        // 对于 textarea 元素，使用专门的替换逻辑
        if (this.element.tagName.toLowerCase() === 'textarea') {
          
          
          const start = this.element.selectionStart;
          const end = this.element.selectionEnd;
          const value = this.element.value;
          
         
          
          // 替换选中的文本
          const newValue = value.substring(0, start) + replaceText + value.substring(end);
          this.element.value = newValue;
          
          
          
          // 设置光标位置到替换文本的末尾
          const newCursorPos = start + replaceText.length;
          this.element.setSelectionRange(newCursorPos, newCursorPos);
          
          
        } else {
          // 对于 contentEditable 元素，使用 Range API
          
          
          const range = selection.getRangeAt(0);
          
          range.deleteContents();
          
          
          const textNode = document.createTextNode(replaceText);
          range.insertNode(textNode);
          
          // 将光标移动到替换文本的末尾
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        // 触发输入事件
        
        this.element.dispatchEvent(new Event('input', { bubbles: true }));
        
        // 清除搜索匹配项，因为内容已经改变
        this.clearSearchHighlights();
        

        return true;
      } catch (error) {
        console.error('[EDITOR] replace: error during replacement:', error);
        return false;
      }
    }
    
    // 如果没有选中匹配的文本，查找下一个匹配项
    
    if (this.findNext(searchText, options)) {
      
      
      const newSelection = window.getSelection();
      
      
      if (newSelection.rangeCount > 0) {
        try {
          const range = newSelection.getRangeAt(0);
          
          range.deleteContents();
          
          
          range.insertNode(document.createTextNode(replaceText));
          
          // 触发输入事件

          this.element.dispatchEvent(new Event('input', { bubbles: true }));
          
          
          return true;
        } catch (error) {
          console.error('[EDITOR] replace: error during replacement:', error);
          return false;
        }
      }
    }
    
    
    return false;
  }

  /**
   * 全部替换
   */
  replaceAll(searchText, replaceText, options = {}) {
    if (!searchText || !this.element) {
      return 0;
    }

    const {
      caseSensitive = false,
      wholeWord = false,
      regex = false
    } = options;

    let content = this.element.value;
    let searchPattern;
    let count = 0;

    try {
      if (regex) {
        // 正则表达式模式
        const flags = caseSensitive ? 'g' : 'gi';
        searchPattern = new RegExp(searchText, flags);
      } else {
        // 普通文本模式
        let escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\$&');
        
        if (wholeWord) {
          escapedSearch = `\b${escapedSearch}\b`;
        }
        
        const flags = caseSensitive ? 'g' : 'gi';
        searchPattern = new RegExp(escapedSearch, flags);
      }

      // 执行替换并计算替换次数
      const newContent = content.replace(searchPattern, (match) => {
        count++;
        return replaceText;
      });

      // 更新编辑器内容
      if (count > 0) {
        this.setContent(newContent);
      }

      return count;
    } catch (error) {
      console.error('替换操作失败:', error);
      return 0;
    }
  }
  
  /**
   * 获取选中文本
   */
  getSelectedText() {
    const selection = window.getSelection();
    return selection.toString();
  }
  
  /**
   * 设置编辑器设置
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.setupEditor();
  }
}

/**
 * 语法高亮器类
 */
class SyntaxHighlighter {
  constructor() {
    this.rules = {
      markdown: [
        // 标题
        { pattern: /^#{1,6}\s+.+$/gm, className: 'markdown-header' },
        // 粗体
        { pattern: /\*\*([^*]+)\*\*/g, className: 'markdown-bold' },
        // 斜体
        { pattern: /\*([^*]+)\*/g, className: 'markdown-italic' },
        // 代码块
        { pattern: /```[\s\S]*?```/g, className: 'markdown-code-block' },
        // 行内代码
        { pattern: /`([^`]+)`/g, className: 'markdown-code' },
        // 链接
        { pattern: /\[([^\]]+)\]\(([^)]+)\)/g, className: 'markdown-link' },
        // 引用
        { pattern: /^>\s+.+$/gm, className: 'markdown-quote' },
        // 列表
        { pattern: /^[\s]*[-*+]\s+.+$/gm, className: 'markdown-list' },
        // 有序列表
        { pattern: /^[\s]*\d+\.\s+.+$/gm, className: 'markdown-ordered-list' }
      ]
    };
  }
  
  /**
   * 高亮文本
   */
  highlight(text, language) {
    if (!this.rules[language]) {
      return this.escapeHtml(text);
    }
    
    let highlightedText = this.escapeHtml(text);
    
    this.rules[language].forEach(rule => {
      highlightedText = highlightedText.replace(rule.pattern, (match) => {
        return `<span class="${rule.className}">${match}</span>`;
      });
    });
    
    return highlightedText;
  }
  
  /**
   * 转义HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}