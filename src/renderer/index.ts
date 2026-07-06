/**
 * @author Ahmad Asmandar <ahmedasmnr2@gmail.com>
 * @license MIT
 */
import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import { getParentDir, resolvePath, highlightCode, parseAndRenderMath } from './utils';
import 'katex/dist/katex.min.css';

interface ElectronAPI {
  openFile: () => Promise<{ content: string; filePath: string } | null>;
  exportHtml: (filePath: string, content: string) => Promise<boolean>;
  exportPdf: (filePath: string) => Promise<boolean>;
  readDroppedFile: (filePath: string) => Promise<{ content: string; filePath: string } | null>;
  getOpenFileArg: () => Promise<{ content: string; filePath: string } | null>;
  onFileOpenedExternally: (callback: (file: { content: string; filePath: string }) => void) => void;
  onZoomIn: (callback: () => void) => void;
  onZoomOut: (callback: () => void) => void;
  onZoomReset: (callback: () => void) => void;
  onExportPdf: (callback: () => void) => void;
  onExportHtml: (callback: () => void) => void;
  openFolder: (filePath: string) => Promise<boolean>;
  selectMultipleFiles: () => Promise<string[] | null>;
  selectOutputFolder: (defaultPath: string) => Promise<string | null>;
  exportPdfFromHtml: (htmlContent: string, outputPath: string) => Promise<boolean>;

  // New Save and Menu APIs
  saveFile: (filePath: string, content: string) => Promise<boolean>;
  saveCopyAs: (content: string, defaultPath?: string) => Promise<string | null>;
  onOpenFile: (callback: () => void) => void;
  onSave: (callback: () => void) => void;
  onSaveCopyAs: (callback: () => void) => void;
  onToggleEdit: (callback: () => void) => void;
  onAbout: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const marked = new Marked();
marked.use({
  renderer: {
    code({ text, lang }) {
      const highlighted = highlightCode(text, lang || '');
      const escapedCode = encodeURIComponent(text);
      return `<div class="code-block-container">
        <button class="btn-copy-code" data-code="${escapedCode}" title="Copy Code">
          <svg class="icon" viewBox="0 0 24 24" style="width: 1rem; height: 1rem;"><path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/></svg>
        </button>
        <pre><code class="language-${lang || 'none'}">${highlighted}</code></pre>
      </div>`;
    }
  }
});

interface Tab {
  id: string;
  filePath: string | null;
  fileName: string;
  content: string;
  zoom: number;
}

let tabsList: Tab[] = [];
let activeTabId: string | null = null;

function getActiveTab(): Tab | null {
  return tabsList.find((t) => t.id === activeTabId) || null;
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const btnOpen = document.getElementById('btn-open') as HTMLButtonElement;
  const btnSave = document.getElementById('btn-save') as HTMLButtonElement;
  const btnExportHtml = document.getElementById('btn-export-html') as HTMLButtonElement;
  const btnExportPdf = document.getElementById('btn-export-pdf') as HTMLButtonElement;
  const btnOpenFolder = document.getElementById('btn-open-folder') as HTMLButtonElement;
  const btnBatchConvert = document.getElementById('btn-batch-convert') as HTMLButtonElement;
  const btnTheme = document.getElementById('btn-theme') as HTMLButtonElement;
  const filePathDisplay = document.getElementById('file-path-display') as HTMLSpanElement;
  const previewArea = document.getElementById('preview-area') as HTMLDivElement;
  const dragZone = document.getElementById('drag-zone') as HTMLElement;
  const tabsListElement = document.getElementById('tabs-list') as HTMLDivElement;
  const btnNewTab = document.getElementById('btn-new-tab') as HTMLButtonElement;
  const btnToggleEdit = document.getElementById('btn-toggle-edit') as HTMLButtonElement;
  const editorArea = document.getElementById('editor-area') as HTMLTextAreaElement;
  const btnAbout = document.getElementById('btn-about') as HTMLButtonElement;
  const aboutModal = document.getElementById('about-modal') as HTMLDivElement;
  const closeAboutModal = document.getElementById('close-about-modal') as HTMLSpanElement;

  if (!btnOpen || !btnSave || !btnExportHtml || !btnExportPdf || !btnOpenFolder || !btnBatchConvert || !btnTheme || !filePathDisplay || !previewArea || !dragZone || !tabsListElement || !btnNewTab || !btnToggleEdit || !editorArea || !btnAbout || !aboutModal || !closeAboutModal) {
    return;
  }

  let isEditMode = false;

  // Initialize theme from localStorage or system preference
  const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);

  btnTheme.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });

  // Edit Mode toggle event
  btnToggleEdit.addEventListener('click', () => {
    isEditMode = !isEditMode;
    if (isEditMode) {
      dragZone.classList.add('edit-mode-active');
      btnToggleEdit.classList.add('active');
      btnSave.style.display = 'inline-flex';
      btnToggleEdit.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/></svg>
        Preview Mode
      `;
      const activeTab = getActiveTab();
      if (activeTab) {
        editorArea.value = activeTab.content;
      }
      editorArea.focus();
    } else {
      dragZone.classList.remove('edit-mode-active');
      btnToggleEdit.classList.remove('active');
      btnSave.style.display = 'none';
      btnToggleEdit.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04M3,17.25V21H6.75L17.81,9.94L14.06,6.19L3,17.25Z"/></svg>
        Edit Mode
      `;
      const activeTab = getActiveTab();
      if (activeTab) {
        activeTab.content = editorArea.value;
        renderMarkdown(activeTab.content, activeTab.filePath, activeTab.id);
      }
    }
  });

  // Save Functionality
  async function performSave() {
    const activeTab = getActiveTab();
    if (!activeTab) return;

    if (isEditMode) {
      activeTab.content = editorArea.value;
    }

    if (activeTab.filePath) {
      await window.electronAPI.saveFile(activeTab.filePath, activeTab.content);
    } else {
      await performSaveCopyAs();
    }
  }

  async function performSaveCopyAs() {
    const activeTab = getActiveTab();
    if (!activeTab) return;

    if (isEditMode) {
      activeTab.content = editorArea.value;
    }

    const defaultName = activeTab.filePath || (activeTab.fileName ? activeTab.fileName : 'untitled.md');
    const newPath = await window.electronAPI.saveCopyAs(activeTab.content, defaultName);
    if (newPath) {
      activeTab.filePath = newPath;
      activeTab.fileName = newPath.split(/[/\\]/).pop() || 'Untitled';
      filePathDisplay.textContent = newPath;
      renderTabs();
      if (!isEditMode) {
        renderMarkdown(activeTab.content, activeTab.filePath, activeTab.id);
      }
    }
  }

  btnSave.addEventListener('click', performSave);

  editorArea.addEventListener('input', () => {
    const activeTab = getActiveTab();
    if (activeTab) {
      activeTab.content = editorArea.value;
    }
  });

  // About Modal events
  btnAbout.addEventListener('click', () => {
    aboutModal.classList.add('show');
  });

  closeAboutModal.addEventListener('click', () => {
    aboutModal.classList.remove('show');
  });

  window.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
      aboutModal.classList.remove('show');
    }
  });

  // Render Tab Navigation bar
  function renderTabs() {
    tabsListElement.innerHTML = '';
    tabsList.forEach((tab) => {
      const tabItem = document.createElement('div');
      tabItem.className = `tab-item${tab.id === activeTabId ? ' active' : ''}`;
      tabItem.setAttribute('data-tab-id', tab.id);

      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title';
      titleSpan.textContent = tab.fileName;
      tabItem.appendChild(titleSpan);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn-close-tab';
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tab.id);
      });
      tabItem.appendChild(closeBtn);

      tabItem.addEventListener('click', () => {
        switchTab(tab.id);
      });

      tabsListElement.appendChild(tabItem);
    });
  }

  // Create a new tab
  function createTab(filePath: string | null, fileName: string, content: string) {
    // If we only have a single clean unsaved tab, reuse it
    if (tabsList.length === 1 && tabsList[0].filePath === null && tabsList[0].content === '') {
      tabsList[0].filePath = filePath;
      tabsList[0].fileName = fileName;
      tabsList[0].content = content;
      switchTab(tabsList[0].id);
      return;
    }

    const tabId = Math.random().toString(36).substring(2, 9);
    const newTab: Tab = {
      id: tabId,
      filePath,
      fileName,
      content,
      zoom: 1.0
    };
    tabsList.push(newTab);
    switchTab(tabId);
  }

  // Switch focus to a tab
  function switchTab(tabId: string) {
    activeTabId = tabId;
    renderTabs();
    const tab = getActiveTab();
    if (tab) {
      currentZoom = tab.zoom;
      updateZoom();
      renderMarkdown(tab.content, tab.filePath, tab.id);
    } else {
      showEmptyState();
    }
  }

  // Close tab and select nearest tab
  function closeTab(tabId: string) {
    const tabIndex = tabsList.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    tabsList.splice(tabIndex, 1);

    if (activeTabId === tabId) {
      if (tabsList.length > 0) {
        const nextActiveIndex = Math.min(tabIndex, tabsList.length - 1);
        switchTab(tabsList[nextActiveIndex].id);
      } else {
        activeTabId = null;
        renderTabs();
        showEmptyState();
      }
    } else {
      renderTabs();
    }
  }

  function showEmptyState() {
    previewArea.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,20H18A2,2 0 0,0 20,18V8L14,2M18,18H6V4H13V9H18V18M16,11H8V13H16V11M16,14H8V16H16V14M11,8H8V10H11V8Z"/></svg>
        <h2>Markdown Viewer</h2>
        <p>Drag and drop a <code>.md</code> file here, or click "Open File" to load.</p>
      </div>`;
    filePathDisplay.textContent = 'No file loaded. Drag & drop a markdown file here or click Open.';
    btnExportHtml.setAttribute('disabled', 'true');
    btnExportPdf.setAttribute('disabled', 'true');
    btnOpenFolder.setAttribute('disabled', 'true');
    btnToggleEdit.setAttribute('disabled', 'true');
    if (isEditMode) {
      btnToggleEdit.click();
    }
  }

  // Render Markdown and update DOM
  async function renderMarkdown(markdown: string, filePath: string | null, tabId: string) {
    // Render to HTML with math parsing
    const rawHtml = await parseAndRenderMath(markdown, (md) => marked.parse(md));
    // Sanitize
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['math', 'annotation', 'semantics', 'mtext', 'mn', 'mo', 'mi', 'mspace', 'mover', 'munder', 'munderover', 'mfrac', 'mroot', 'msqrt', 'msub', 'msup', 'msubsup', 'mtable', 'mtr', 'mtd', 'maligngroup', 'malignmark', 'ms', 'mglyph', 'span', 'div'],
      ADD_ATTR: ['encoding', 'display', 'class', 'style', 'aria-hidden']
    });

    if (tabId !== activeTabId) return;

    previewArea.innerHTML = cleanHtml;

    if (filePath) {
      const images = previewArea.querySelectorAll('img');
      const parentDir = getParentDir(filePath);

      images.forEach((img) => {
        const src = img.getAttribute('src') || '';
        if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
          const absPath = resolvePath(parentDir, src);
          img.src = `app-media://${absPath}`;
        }
      });

      filePathDisplay.textContent = filePath;
      btnExportHtml.removeAttribute('disabled');
      btnExportPdf.removeAttribute('disabled');
      btnOpenFolder.removeAttribute('disabled');
    } else {
      filePathDisplay.textContent = 'Untitled Document';
      btnExportHtml.removeAttribute('disabled');
      btnExportPdf.setAttribute('disabled', 'true');
      btnOpenFolder.setAttribute('disabled', 'true');
    }
    btnToggleEdit.removeAttribute('disabled');
  }

  // Event: Open File
  btnOpen.addEventListener('click', async () => {
    const file = await window.electronAPI.openFile();
    if (file) {
      const fileName = file.filePath.split(/[/\\]/).pop() || 'Untitled';
      createTab(file.filePath, fileName, file.content);
    }
  });

  // Event: Open Export Folder
  btnOpenFolder.addEventListener('click', async () => {
    const activeTab = getActiveTab();
    if (activeTab && activeTab.filePath) {
      await window.electronAPI.openFolder(activeTab.filePath);
    }
  });

  // Event: Export HTML
  btnExportHtml.addEventListener('click', async () => {
    const activeTab = getActiveTab();
    if (!activeTab) return;
    if (isEditMode) {
      activeTab.content = editorArea.value;
      await renderMarkdown(activeTab.content, activeTab.filePath, activeTab.id);
    }
    if (!previewArea.innerHTML) return;

    const stylesheets = Array.from(document.styleSheets);
    let cssRulesText = '';
    try {
      for (const sheet of stylesheets) {
        for (const rule of Array.from(sheet.cssRules)) {
          cssRulesText += rule.cssText + '\n';
        }
      }
    } catch (e) {
      cssRulesText = `
        body { font-family: sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; }
        pre { background: #f4f4f4; padding: 1rem; border-radius: 5px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; }
      `;
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${activeTab.fileName}</title>
  <style>
    ${cssRulesText}
  </style>
</head>
<body class="markdown-body" style="background: white; color: black; padding: 3rem;">
  ${previewArea.innerHTML}
 </body>
</html>`;

    await window.electronAPI.exportHtml(activeTab.filePath || 'export.html', fullHtml);
  });

  // Event: Export PDF
  btnExportPdf.addEventListener('click', async () => {
    const activeTab = getActiveTab();
    if (activeTab && activeTab.filePath) {
      const wasEditMode = isEditMode;
      if (isEditMode) {
        btnToggleEdit.click();
      }
      await window.electronAPI.exportPdf(activeTab.filePath);
      if (wasEditMode) {
        btnToggleEdit.click();
      }
    }
  });

  // Event: Batch Convert multiple files
  btnBatchConvert.addEventListener('click', async () => {
    const filePaths = await window.electronAPI.selectMultipleFiles();
    if (!filePaths || filePaths.length === 0) return;

    const firstFilePath = filePaths[0];
    const sourceDir = getParentDir(firstFilePath);
    const defaultOutputFolder = sourceDir ? `${sourceDir}/documentaion_md` : 'documentaion_md';

    const outputFolder = await window.electronAPI.selectOutputFolder(defaultOutputFolder);
    if (!outputFolder) return;

    const stylesheets = Array.from(document.styleSheets);
    let cssRulesText = '';
    try {
      for (const sheet of stylesheets) {
        for (const rule of Array.from(sheet.cssRules)) {
          cssRulesText += rule.cssText + '\n';
        }
      }
    } catch (e) {
      cssRulesText = '';
    }

    btnBatchConvert.disabled = true;
    const originalText = btnBatchConvert.innerHTML;
    btnBatchConvert.innerHTML = '<span>Converting...</span>';

    let successCount = 0;
    for (const filePath of filePaths) {
      try {
        const loaded = await window.electronAPI.readDroppedFile(filePath);
        if (!loaded) continue;

        const rawHtml = await parseAndRenderMath(loaded.content, (md) => marked.parse(md));
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['math', 'annotation', 'semantics', 'mtext', 'mn', 'mo', 'mi', 'mspace', 'mover', 'munder', 'munderover', 'mfrac', 'mroot', 'msqrt', 'msub', 'msup', 'msubsup', 'mtable', 'mtr', 'mtd', 'maligngroup', 'malignmark', 'ms', 'mglyph', 'span', 'div'],
          ADD_ATTR: ['encoding', 'display', 'class', 'style', 'aria-hidden']
        });

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanHtml;
        const images = tempDiv.querySelectorAll('img');
        const fileParentDir = getParentDir(filePath);

        images.forEach((img) => {
          const src = img.getAttribute('src') || '';
          if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
            const absPath = resolvePath(fileParentDir, src);
            img.src = `app-media://${absPath}`;
          }
        });

        const mdFileName = filePath.split(/[/\\]/).pop() || 'document.md';
        const pdfFileName = mdFileName.replace(/\.(md|markdown)$/i, '') + '.pdf';
        const outputPdfPath = `${outputFolder}/${pdfFileName}`;

        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${pdfFileName}</title>
  <style>
    ${cssRulesText}
  </style>
</head>
<body class="markdown-body" style="background: white; color: black; padding: 3rem;">
  ${tempDiv.innerHTML}
</body>
</html>`;

        const success = await window.electronAPI.exportPdfFromHtml(fullHtml, outputPdfPath);
        if (success) {
          successCount++;
        }
      } catch (err) {
        console.error('Error batch converting file:', filePath, err);
      }
    }

    btnBatchConvert.disabled = false;
    btnBatchConvert.innerHTML = originalText;

    if (successCount > 0) {
      await window.electronAPI.openFolder(`${outputFolder}/dummy.pdf`);
    }
  });

  // Event: Create empty new tab
  btnNewTab.addEventListener('click', () => {
    createTab(null, 'Untitled', '');
  });

  // Zoom logic
  let currentZoom = 1.0;
  const btnZoomIn = document.getElementById('btn-zoom-in') as HTMLButtonElement;
  const btnZoomOut = document.getElementById('btn-zoom-out') as HTMLButtonElement;
  const zoomDisplay = document.getElementById('zoom-display') as HTMLSpanElement;

  function updateZoom() {
    document.documentElement.style.setProperty('--zoom-factor', currentZoom.toString());
    if (zoomDisplay) {
      zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
    }
    const tab = getActiveTab();
    if (tab) {
      tab.zoom = currentZoom;
    }
  }

  if (btnZoomIn && btnZoomOut && zoomDisplay) {
    btnZoomIn.addEventListener('click', () => {
      if (currentZoom < 2.0) {
        currentZoom = Math.min(2.0, currentZoom + 0.1);
        updateZoom();
      }
    });

    btnZoomOut.addEventListener('click', () => {
      if (currentZoom > 0.5) {
        currentZoom = Math.max(0.5, currentZoom - 0.1);
        updateZoom();
      }
    });

    zoomDisplay.style.cursor = 'pointer';
    zoomDisplay.addEventListener('click', () => {
      currentZoom = 1.0;
      updateZoom();
    });
  }

  // Drag and Drop support
  dragZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragZone.classList.add('drag-over');
  });

  dragZone.addEventListener('dragleave', () => {
    dragZone.classList.remove('drag-over');
  });

  dragZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragZone.classList.remove('drag-over');

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
          const loaded = await window.electronAPI.readDroppedFile(file.path);
          if (loaded) {
            const fileName = loaded.filePath.split(/[/\\]/).pop() || 'Untitled';
            createTab(loaded.filePath, fileName, loaded.content);
          }
        }
      }
    }
  });

  // Check if a file was passed on startup via CLI argument
  window.electronAPI.getOpenFileArg().then((argFile) => {
    if (argFile) {
      const fileName = argFile.filePath.split(/[/\\]/).pop() || 'Untitled';
      createTab(argFile.filePath, fileName, argFile.content);
    } else {
      createTab(null, 'Untitled', '');
    }
  }).catch((err) => {
    console.error('Error fetching startup file argument:', err);
    createTab(null, 'Untitled', '');
  });

  // Listen for files opened externally (second instances)
  window.electronAPI.onFileOpenedExternally((file) => {
    if (file) {
      const fileName = file.filePath.split(/[/\\]/).pop() || 'Untitled';
      createTab(file.filePath, fileName, file.content);
    }
  });

  // Listen to context menu events from Main Process
  window.electronAPI.onZoomIn(() => {
    if (currentZoom < 2.0) {
      currentZoom = Math.min(2.0, currentZoom + 0.1);
      updateZoom();
    }
  });

  window.electronAPI.onZoomOut(() => {
    if (currentZoom > 0.5) {
      currentZoom = Math.max(0.5, currentZoom - 0.1);
      updateZoom();
    }
  });

  window.electronAPI.onZoomReset(() => {
    currentZoom = 1.0;
    updateZoom();
  });

  window.electronAPI.onExportPdf(() => {
    if (!btnExportPdf.disabled) {
      btnExportPdf.click();
    }
  });

  window.electronAPI.onExportHtml(() => {
    if (!btnExportHtml.disabled) {
      btnExportHtml.click();
    }
  });

  // App Menu Handlers
  window.electronAPI.onOpenFile(() => {
    btnOpen.click();
  });

  window.electronAPI.onSave(performSave);
  window.electronAPI.onSaveCopyAs(performSaveCopyAs);
  window.electronAPI.onToggleEdit(() => {
    btnToggleEdit.click();
  });
  window.electronAPI.onAbout(() => {
    btnAbout.click();
  });

  // Delegation for copying code block contents
  previewArea.addEventListener('click', async (e) => {
    const button = (e.target as HTMLElement).closest('.btn-copy-code') as HTMLButtonElement | null;
    if (button) {
      const escapedCode = button.getAttribute('data-code') || '';
      const rawCode = decodeURIComponent(escapedCode);
      try {
        await navigator.clipboard.writeText(rawCode);
        const originalHtml = button.innerHTML;
        button.innerHTML = '<span style="font-size: 0.75rem; font-family: sans-serif;">Copied!</span>';
        button.classList.add('copied');
        
        setTimeout(() => {
          button.innerHTML = originalHtml;
          button.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy code to clipboard:', err);
      }
    }
  });
});
