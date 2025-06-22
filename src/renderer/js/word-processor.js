/**
 * Word文档处理器
 * 负责处理.doc和.docx文件的读取和转换
 */
class WordProcessor {
  constructor() {
    this.mammoth = null;
    this.WordExtractor = null;
    this.TurndownService = null;
    this.init();
  }

  /**
   * 初始化Word处理器
   */
  async init() {
    try {
      // 动态导入模块（在渲染进程中需要通过主进程处理）
    } catch (error) {
      // Word处理器初始化失败
    }
  }

  /**
   * 检查文件是否为Word文档
   */
  isWordDocument(filePath) {
    const ext = this.getFileExtension(filePath).toLowerCase();
    return ext === '.doc' || ext === '.docx';
  }

  /**
   * 获取文件扩展名
   */
  getFileExtension(fileName) {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(lastDot) : '';
  }

  /**
   * 处理Word文档
   */
  async processWordDocument(filePath) {
    try {
      const ext = this.getFileExtension(filePath).toLowerCase();
      
      if (ext === '.docx') {
        return await this.processDocx(filePath);
      } else if (ext === '.doc') {
        return await this.processDoc(filePath);
      } else {
        throw new Error('不支持的文件格式');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 处理.docx文件
   */
  async processDocx(filePath) {
    try {
      // 通过主进程处理文件
      if (window.electronAPI && window.electronAPI.processWordDocument) {
        const result = await window.electronAPI.processWordDocument({
          filePath: filePath,
          type: 'docx'
        });
        
        if (result.success) {
          // 将HTML转换为Markdown
          const markdownResult = await window.electronAPI.htmlToMarkdown(result.html);
          
          if (markdownResult.success) {
            return markdownResult.markdown;
          } else {
            // 如果转换失败，返回原始HTML
            // HTML转Markdown失败，使用原始HTML
            return result.html;
          }
        } else {
          throw new Error(result.error);
        }
      } else {
        throw new Error('Word文档处理API不可用');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 处理.doc文件
   */
  async processDoc(filePath) {
    try {
      // 通过主进程处理文件
      if (window.electronAPI && window.electronAPI.processWordDocument) {
        const result = await window.electronAPI.processWordDocument({
          filePath: filePath,
          type: 'doc'
        });
        
        if (result.success) {
          // 对于.doc文件，如果有HTML则转换为Markdown，否则直接返回文本
          if (result.html) {
            const markdownResult = await window.electronAPI.htmlToMarkdown(result.html);
            
            if (markdownResult.success) {
              return markdownResult.markdown;
            } else {
              // HTML转Markdown失败，使用原始HTML
              return result.html;
            }
          } else if (result.text) {
            // 直接返回纯文本
            return result.text;
          } else {
            throw new Error('无法获取文档内容');
          }
        } else {
          throw new Error(result.error);
        }
      } else {
        throw new Error('Word文档处理API不可用');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 将HTML转换为Markdown
   */
  htmlToMarkdown(html) {
    try {
      if (window.electronAPI && window.electronAPI.htmlToMarkdown) {
        return window.electronAPI.htmlToMarkdown(html);
      } else {
        // 简单的HTML到Markdown转换
        return this.simpleHtmlToMarkdown(html);
      }
    } catch (error) {
      return html; // 如果转换失败，返回原始HTML
    }
  }

  /**
   * 简单的HTML到Markdown转换
   */
  simpleHtmlToMarkdown(html) {
    let markdown = html;
    
    // 基本的HTML标签转换
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
    
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    
    // 列表
    markdown = markdown.replace(/<ul[^>]*>/gi, '');
    markdown = markdown.replace(/<\/ul>/gi, '\n');
    markdown = markdown.replace(/<ol[^>]*>/gi, '');
    markdown = markdown.replace(/<\/ol>/gi, '\n');
    markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    
    // 链接
    markdown = markdown.replace(/<a[^>]*href=["'](.*?)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    
    // 图片
    markdown = markdown.replace(/<img[^>]*src=["'](.*?)["'][^>]*alt=["'](.*?)["'][^>]*>/gi, '![$2]($1)');
    markdown = markdown.replace(/<img[^>]*alt=["'](.*?)["'][^>]*src=["'](.*?)["'][^>]*>/gi, '![$1]($2)');
    markdown = markdown.replace(/<img[^>]*src=["'](.*?)["'][^>]*>/gi, '![]($1)');
    
    // 清理HTML标签
    markdown = markdown.replace(/<[^>]*>/g, '');
    
    // 清理多余的空行
    markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
    markdown = markdown.trim();
    
    return markdown;
  }

  /**
   * 保存转换后的Markdown文件
   */
  async saveAsMarkdown(content, originalPath) {
    try {
      const markdownPath = originalPath.replace(/\.(doc|docx)$/i, '.md');
      
      if (window.electronAPI && window.electronAPI.saveFile) {
        const result = await window.electronAPI.saveFile({
          filePath: markdownPath,
          content: content
        });
        
        if (result.success) {
          return {
            success: true,
            path: markdownPath
          };
        } else {
          throw new Error(result.error);
        }
      } else {
        throw new Error('文件保存API不可用');
      }
    } catch (error) {
      throw error;
    }
  }
}

// 导出WordProcessor类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WordProcessor;
} else {
  window.WordProcessor = WordProcessor;
}