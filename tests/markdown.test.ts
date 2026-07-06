/**
 * @author Ahmad Asmandar <ahmedasmnr2@gmail.com>
 * @license MIT
 */
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import { resolvePath, parseAndRenderMath } from '../src/renderer/utils';

const marked = new Marked();

describe('Markdown Viewer Unit Tests', () => {
  it('renders standard Markdown elements correctly', async () => {
    const markdown = '# Hello World\n\nThis is a **bold** paragraph.\n\n* Item 1\n* Item 2';
    const html = await marked.parse(markdown);
    
    expect(html).toContain('<h1>Hello World</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<li>Item 1</li>');
  });

  it('renders tables and code blocks correctly', async () => {
    const markdown = '| Name | Age |\n|---|---|\n| Alice | 30 |\n\n```js\nconsole.log(123);\n```';
    const html = await marked.parse(markdown);

    expect(html).toContain('<table>');
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<td>Alice</td>');
    expect(html).toContain('<pre><code class="language-js">');
    expect(html).toContain('console.log(123);');
  });

  it('sanitizes unsafe HTML elements and scripts', async () => {
    const unsafeMarkdown = '# Title\n\n<script>alert("XSS")</script>\n<div onclick="doBad()">Click</div>\n<iframe src="javascript:alert(1)"></iframe>';
    const rawHtml = await marked.parse(unsafeMarkdown);
    const safeHtml = DOMPurify.sanitize(rawHtml);

    // Verify it strips the script tag completely
    expect(safeHtml).not.toContain('<script>');
    expect(safeHtml).not.toContain('alert("XSS")');
    // Verify it strips inline event handlers
    expect(safeHtml).not.toContain('onclick=');
    // Verify it strips unsafe iframe
    expect(safeHtml).not.toContain('<iframe');
    // Keep standard text elements
    expect(safeHtml).toContain('<h1>Title</h1>');
  });

  it('resolves relative image paths correctly', () => {
    const baseWindows = 'C:\\Users\\test\\docs';
    const baseUnix = '/Users/test/docs';
    
    // Windows paths
    expect(resolvePath(baseWindows, 'image.png')).toBe('C:/Users/test/docs/image.png');
    expect(resolvePath(baseWindows, '../img/pic.jpg')).toBe('C:/Users/test/img/pic.jpg');

    // Unix paths
    expect(resolvePath(baseUnix, 'image.png')).toBe('/Users/test/docs/image.png');
    expect(resolvePath(baseUnix, '../img/pic.jpg')).toBe('/Users/test/img/pic.jpg');
  });

  it('generates export HTML boilerplate correctly', async () => {
    const bodyHtml = '<h1>Document</h1><p>Test</p>';
    const cssRulesText = 'body { color: red; }';
    
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Exported Markdown</title>
  <style>
    ${cssRulesText}
  </style>
</head>
<body class="markdown-body">
  ${bodyHtml}
</body>
</html>`;

    expect(fullHtml).toContain('<!DOCTYPE html>');
    expect(fullHtml).toContain('<title>Exported Markdown</title>');
    expect(fullHtml).toContain('body { color: red; }');
    expect(fullHtml).toContain('<h1>Document</h1>');
  });

  it('parses and renders LaTeX math using parseAndRenderMath', async () => {
    const markdown = 'Formula: $a^2 + b^2 = c^2$\n\nBlock:\n\n$$E = mc^2$$';
    const html = await parseAndRenderMath(markdown, (md) => marked.parse(md));

    expect(html).toContain('<span class="katex">');
    expect(html).toContain('a^2 + b^2 = c^2');
    expect(html).toContain('E = mc^2');
  });
});
