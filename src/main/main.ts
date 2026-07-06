/**
 * @author Ahmad Asmandar <ahmedasmnr2@gmail.com>
 * @license MIT
 */
import { app, BrowserWindow, ipcMain, dialog, protocol, net, shell, Menu, MenuItem } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';

let mainWindow: BrowserWindow | null = null;

function registerMediaProtocol() {
  protocol.handle('app-media', (request) => {
    try {
      // Decode path from url. Remove 'app-media://' prefix.
      const urlPath = request.url.replace(/^app-media:\/\/+/, '');
      const decodedPath = decodeURIComponent(urlPath);
      // Resolve path to make sure it's absolute
      const absolutePath = path.resolve(decodedPath);
      
      // Verify file exists
      if (fs.existsSync(absolutePath)) {
        return net.fetch(pathToFileURL(absolutePath).toString());
      }
    } catch (err) {
      console.error('Error in app-media protocol handler:', err);
    }
    return new Response('Not Found', { status: 404 });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    icon: path.join(__dirname, '../../markdown.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load the index.html from dist/renderer
  const htmlPath = path.join(__dirname, '../renderer/index.html');
  mainWindow.loadFile(htmlPath).catch((err) => {
    console.error('Failed to load index.html:', err);
  });

  // Open external links in default system browser
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();

    // Add Copy if text is selected
    if (params.selectionText && params.selectionText.trim() !== '') {
      menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }));
    menu.append(new MenuItem({ type: 'separator' }));

    // Zoom options
    menu.append(new MenuItem({
      label: 'Zoom In',
      click: () => {
        mainWindow?.webContents.send('menu:zoom-in');
      }
    }));
    menu.append(new MenuItem({
      label: 'Zoom Out',
      click: () => {
        mainWindow?.webContents.send('menu:zoom-out');
      }
    }));
    menu.append(new MenuItem({
      label: 'Reset Zoom',
      click: () => {
        mainWindow?.webContents.send('menu:zoom-reset');
      }
    }));

    // Add Separator
    menu.append(new MenuItem({ type: 'separator' }));

    // Export options
    menu.append(new MenuItem({
      label: 'Export to PDF',
      click: () => {
        mainWindow?.webContents.send('menu:export-pdf');
      }
    }));
    menu.append(new MenuItem({
      label: 'Export to HTML',
      click: () => {
        mainWindow?.webContents.send('menu:export-html');
      }
    }));

    menu.popup({ window: mainWindow || undefined });
  });

  // Create Application Menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu:open-file');
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu:save');
          }
        },
        {
          label: 'Save Copy As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow?.webContents.send('menu:save-copy-as');
          }
        },
        { type: 'separator' as const },
        {
          label: 'Export to PDF',
          click: () => {
            mainWindow?.webContents.send('menu:export-pdf');
          }
        },
        {
          label: 'Export to HTML',
          click: () => {
            mainWindow?.webContents.send('menu:export-html');
          }
        },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Edit Mode',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow?.webContents.send('menu:toggle-edit');
          }
        },
        { type: 'separator' as const },
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => {
            mainWindow?.webContents.send('menu:zoom-in');
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow?.webContents.send('menu:zoom-out');
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow?.webContents.send('menu:zoom-reset');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            mainWindow?.webContents.send('menu:about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getArgFilePath(argsList: string[]): string | null {
  for (const arg of argsList) {
    if (typeof arg === 'string' && (arg.endsWith('.md') || arg.endsWith('.markdown'))) {
      try {
        const absolutePath = path.resolve(arg);
        if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
          return absolutePath;
        }
      } catch (e) {
        // Ignore
      }
    }
  }
  return null;
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const filePath = getArgFilePath(commandLine);
      if (filePath) {
        fs.promises.readFile(filePath, 'utf-8').then((content) => {
          mainWindow?.webContents.send('file:opened-externally', { content, filePath });
        }).catch((err) => {
          console.error('Failed to read file from second instance:', err);
        });
      }
    }
  });

  app.whenReady().then(() => {
    registerMediaProtocol();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: Open File
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return { content, filePath };
  } catch (err: any) {
    dialog.showErrorBox('File Read Error', `Could not read file: ${err.message}`);
    return null;
  }
});

// IPC Handler: Read Dropped File
ipcMain.handle('file:readDropped', async (_, filePath: string) => {
  try {
    // Basic validation of path extension or existence
    const absolutePath = path.resolve(filePath);
    const stat = await fs.promises.stat(absolutePath);
    if (!stat.isFile()) {
      throw new Error('Not a file');
    }
    const ext = path.extname(absolutePath).toLowerCase();
    if (ext !== '.md' && ext !== '.markdown') {
      throw new Error('Only markdown files (.md, .markdown) are allowed.');
    }
    const content = await fs.promises.readFile(absolutePath, 'utf-8');
    return { content, filePath: absolutePath };
  } catch (err: any) {
    dialog.showErrorBox('File Open Error', `Could not open file: ${err.message}`);
    return null;
  }
});

// IPC Handler: Export HTML
ipcMain.handle('export:html', async (_, sourceFilePath: string, htmlContent: string) => {
  if (!mainWindow) return false;

  const baseName = sourceFilePath ? path.basename(sourceFilePath, path.extname(sourceFilePath)) : 'document';
  const defaultPath = `${baseName}.html`;

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export to HTML',
    defaultPath: defaultPath,
    filters: [{ name: 'HTML Files', extensions: ['html'] }]
  });

  if (result.canceled || !result.filePath) {
    return false;
  }

  try {
    await fs.promises.writeFile(result.filePath, htmlContent, 'utf-8');
    shell.showItemInFolder(result.filePath);
    return true;
  } catch (err: any) {
    dialog.showErrorBox('Export Error', `Could not save HTML file: ${err.message}`);
    return false;
  }
});

// IPC Handler: Export PDF
ipcMain.handle('export:pdf', async (_, sourceFilePath: string) => {
  if (!mainWindow) return false;

  const baseName = sourceFilePath ? path.basename(sourceFilePath, path.extname(sourceFilePath)) : 'document';
  const defaultPath = `${baseName}.pdf`;

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export to PDF',
    defaultPath: defaultPath,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });

  if (result.canceled || !result.filePath) {
    return false;
  }

  try {
    // Generate PDF using chromium print functionality
    const pdfBuffer = await mainWindow.webContents.printToPDF({
      printBackground: true,
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      },
      pageSize: 'A4'
    });

    await fs.promises.writeFile(result.filePath, pdfBuffer);
    shell.showItemInFolder(result.filePath);
    return true;
  } catch (err: any) {
    dialog.showErrorBox('Export Error', `Could not save PDF file: ${err.message}`);
    return false;
  }
});

// IPC Handler: Get Startup File Argument
ipcMain.handle('file:getOpenArg', async () => {
  const filePath = getArgFilePath(process.argv);
  if (!filePath) return null;
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return { content, filePath };
  } catch (err) {
    return null;
  }
});

// IPC Handler: Open Current File Folder
ipcMain.handle('file:openFolder', async (_, filePath: string) => {
  if (!filePath) return false;
  try {
    const folderPath = path.dirname(filePath);
    await shell.openPath(folderPath);
    return true;
  } catch (err) {
    console.error('Failed to open export folder:', err);
    return false;
  }
});

// IPC Handler: Select Multiple Files Dialog
ipcMain.handle('dialog:selectMultipleFiles', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown'] }
    ]
  });
  if (result.canceled || !result.filePaths) {
    return null;
  }
  return result.filePaths;
});

// IPC Handler: Select Output Folder Dialog
ipcMain.handle('dialog:selectOutputFolder', async (_, defaultPath: string) => {
  if (!mainWindow) return null;
  
  try {
    if (defaultPath) {
      // Ensure target directory parent folder path exists
      const parentDir = path.dirname(defaultPath);
      if (!fs.existsSync(parentDir)) {
        await fs.promises.mkdir(parentDir, { recursive: true });
      }
    }
  } catch (e) {
    // Ignore folder creation errors
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Output Folder for PDFs',
    defaultPath: defaultPath || undefined,
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// IPC Handler: Export styled HTML content to PDF using headless window
ipcMain.handle('export:pdfFromHtml', async (_, htmlContent: string, outputPath: string) => {
  const workerWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
  await workerWindow.loadURL(dataUrl);

  try {
    const destDir = path.dirname(outputPath);
    if (!fs.existsSync(destDir)) {
      await fs.promises.mkdir(destDir, { recursive: true });
    }

    const pdfBuffer = await workerWindow.webContents.printToPDF({
      printBackground: true,
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      },
      pageSize: 'A4'
    });

    await fs.promises.writeFile(outputPath, pdfBuffer);
    return true;
  } catch (err) {
    console.error('Failed to export PDF from HTML in main:', err);
    return false;
  } finally {
    workerWindow.close();
  }
});

// IPC Handler: Save file directly
ipcMain.handle('file:save', async (_, filePath: string, content: string) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (err: any) {
    dialog.showErrorBox('Save Error', `Could not save file: ${err.message}`);
    return false;
  }
});

// IPC Handler: Save Copy As
ipcMain.handle('file:saveCopyAs', async (_, content: string, defaultPath?: string) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Copy As',
    defaultPath: defaultPath || undefined,
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  try {
    await fs.promises.writeFile(result.filePath, content, 'utf-8');
    return result.filePath;
  } catch (err: any) {
    dialog.showErrorBox('Save Error', `Could not save file: ${err.message}`);
    return null;
  }
});
