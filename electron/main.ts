import { app, BrowserWindow, ipcMain, dialog, safeStorage } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';
import Database from 'better-sqlite3';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Store for settings (non-sensitive)
const store = new Store();

// Database
let db: Database.Database | null = null;

function initializeDatabase() {
  const userDataPath = app.getPath('userData');
  db = new Database(join(userDataPath, 'aiimageproc.db'));
  db.pragma('journal_mode = WAL');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      original_image_path TEXT,
      result_image_path TEXT,
      settings_json TEXT
    );

    CREATE TABLE IF NOT EXISTS edit_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      action_type TEXT,
      prompt TEXT,
      provider TEXT,
      model TEXT,
      before_image_path TEXT,
      after_image_path TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS masks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      mask_data BLOB,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_edit_history_project ON edit_history(project_id);
    CREATE INDEX IF NOT EXISTS idx_masks_project ON masks(project_id);
  `);
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
    backgroundColor: '#1e1e1e',
  });

  // Load app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Auto-updater
  autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(() => {
  // Initialize database
  initializeDatabase();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Close database connection
  if (db) {
    db.close();
    db = null;
  }
});

// IPC Handlers

// File Operations
ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
    ],
  });
  return result;
});

ipcMain.handle('file:save', async (_event, { filePath, data }) => {
  try {
    const path = await import('path');
    const userDataPath = app.getPath('userData');
    const downloadsPath = app.getPath('downloads');
    
    const resolvedPath = path.resolve(filePath);
    const isAllowed = resolvedPath.startsWith(userDataPath) || resolvedPath.startsWith(downloadsPath);
    
    if (!isAllowed) {
      return { success: false, error: 'Writing to this location is not allowed for security reasons.' };
    }
    
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, data);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('file:export', async (_event, { defaultPath, data }) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath,
    filters: [{ name: 'PNG Image', extensions: ['png'] }],
  });
  
  if (!result.canceled && result.filePath) {
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(result.filePath, data);
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
  
  return { success: false, canceled: true };
});

// Storage (Sensitive - API Keys)
ipcMain.handle('storage:set', async (_event, { key, value }) => {
  try {
    const encrypted = safeStorage.encryptString(value);
    (store as any).set(key, encrypted.toString('base64'));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('storage:get', async (_event, { key }) => {
  try {
    const encrypted = (store as any).get(key) as string;
    if (!encrypted) {
      return { success: false, notFound: true };
    }
    const decrypted = safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
    return { success: true, value: decrypted };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('storage:delete', async (_event, { key }) => {
  try {
    (store as any).delete(key);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Database Operations
ipcMain.handle('db:createProject', async (_event, { name }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const stmt = db.prepare(`
      INSERT INTO projects (name, created_at, updated_at)
      VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    const result = stmt.run(name);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db:getProject', async (_event, { id }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    const project = stmt.get(id);
    return { success: true, project };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db:listProjects', async (_event, { limit = 50 }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const stmt = db.prepare(`
      SELECT * FROM projects 
      ORDER BY updated_at DESC 
      LIMIT ?
    `);
    
    const projects = stmt.all(limit);
    return { success: true, projects };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db:updateProject', async (_event, { id, updates }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.name) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    
    if (updates.original_image_path) {
      fields.push('original_image_path = ?');
      values.push(updates.original_image_path);
    }
    
    if (updates.result_image_path) {
      fields.push('result_image_path = ?');
      values.push(updates.result_image_path);
    }
    
    if (updates.settings_json) {
      fields.push('settings_json = ?');
      values.push(updates.settings_json);
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`
      UPDATE projects SET ${fields.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...values);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db:deleteProject', async (_event, { id }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    db.prepare('BEGIN TRANSACTION').run();
    db.prepare('DELETE FROM edit_history WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM masks WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    db.prepare('COMMIT').run();
    return { success: true };
  } catch (error) {
    db.prepare('ROLLBACK').run();
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db:addEditHistory', async (_event, { edit }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const stmt = db.prepare(`
      INSERT INTO edit_history (
        project_id, action_type, prompt, provider, model,
        before_image_path, after_image_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      edit.project_id,
      edit.action_type,
      edit.prompt,
      edit.provider,
      edit.model,
      edit.before_image_path,
      edit.after_image_path
    );
    
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db:getEditHistory', async (_event, { projectId, limit = 100 }) => {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const stmt = db.prepare(`
      SELECT * FROM edit_history 
      WHERE project_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    
    const history = stmt.all(projectId, limit);
    return { success: true, history };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// App Info
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform;
});

// Auto-updater events
autoUpdater.on('update-available', () => {
  mainWindow?.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-downloaded');
});

ipcMain.handle('app:restart', () => {
  autoUpdater.quitAndInstall();
});
