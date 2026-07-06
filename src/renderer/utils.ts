/**
 * @author Ahmad Asmandar <ahmedasmnr2@gmail.com>
 * @license MIT
 */
import katex from 'katex';

// Helper: Get parent directory
export function getParentDir(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return '';
  return filePath.substring(0, lastSlash);
}

// Helper: Resolve relative paths
export function resolvePath(base: string, relative: string): string {
  const isAbsoluteUnix = base.replace(/\\/g, '/').startsWith('/');
  const parts = (base + '/' + relative).replace(/\\/g, '/').split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  let resolved = stack.join('/');
  if (isAbsoluteUnix && !resolved.startsWith('/')) {
    resolved = '/' + resolved;
  }
  return resolved;
}

// Helper: Simple client-side regex code highlighter with line numbers
export function highlightCode(code: string, lang: string): string {
  // Split code by lines, trimming trailing newline if present
  const lines = code.replace(/\r?\n$/, '').split(/\r?\n/);
  
  const highlightedLines = lines.map((lineText) => {
    // Safe HTML escape
    let html = lineText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Style Comments: // or /* */ or #
    html = html.replace(/(\/\/.*|\/\*[\s\S]*?\*\/|#.*)/g, '<span class="code-comment">$1</span>');

    // Style Strings: double quotes, single quotes, backticks (avoiding attributes in spans)
    html = html.replace(/(["'`])(.*?)\1/g, (match, quote, content) => {
      if (content.includes('span') || content.includes('class=')) {
        return match;
      }
      return `<span class="code-string">${quote}${content}${quote}</span>`;
    });

    // Style Keywords
    const keywords = /\b(const|let|var|function|return|class|import|export|from|if|else|for|while|def|and|or|not|async|await|try|catch|new|this|public|private|protected|interface|type|default|break|continue)\b/g;
    html = html.replace(keywords, '<span class="code-keyword">$1</span>');

    // Style Numbers
    html = html.replace(/\b(\d+)\b/g, '<span class="code-number">$1</span>');

    return html;
  });

  // Construct lines structure with line numbers
  let tableHtml = '<table class="code-table">';
  highlightedLines.forEach((line, idx) => {
    tableHtml += `<tr><td class="line-number">${idx + 1}</td><td class="code-line">${line || ' '}</td></tr>`;
  });
  tableHtml += '</table>';
  
  return tableHtml;
}

// Helper: Parse and render LaTeX mathematics block
export async function parseAndRenderMath(
  markdown: string,
  renderFunc: (md: string) => string | Promise<string>
): Promise<string> {
  const placeholders: string[] = [];

  // Extract display math $$ ... $$
  let processed = markdown.replace(/\$\$(.*?)\$\$/gs, (_, math) => {
    const placeholder = `MATHDISPPLACEHOLDER${placeholders.length}`;
    try {
      const html = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
      placeholders.push(html);
    } catch (e) {
      placeholders.push(`<span class="math-error">${math}</span>`);
    }
    return placeholder;
  });

  // Extract inline math $ ... $ (avoid matching single dollar signs with spaces or numbers)
  processed = processed.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_, math) => {
    const placeholder = `MATHINLPLACEHOLDER${placeholders.length}`;
    try {
      const html = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
      placeholders.push(html);
    } catch (e) {
      placeholders.push(`<span class="math-error">${math}</span>`);
    }
    return placeholder;
  });

  // Run markdown rendering
  const rawHtml = await Promise.resolve(renderFunc(processed));

  // Restore math placeholders
  let restored = rawHtml;
  for (let i = 0; i < placeholders.length; i++) {
    restored = restored.replace(`MATHDISPPLACEHOLDER${i}`, placeholders[i]);
    restored = restored.replace(`MATHINLPLACEHOLDER${i}`, placeholders[i]);
  }

  return restored;
}
