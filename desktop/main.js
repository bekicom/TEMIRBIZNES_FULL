const { app, BrowserWindow, shell } = require('electron');

const APP_URL =
  process.env.TEMIR_DESKTOP_URL || 'https://temirbiznes-front.vercel.app';

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    autoHideMenuBar: true,
    title: 'TEMIR BIZNES',
    backgroundColor: '#eef2f7',
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
};

app.whenReady().then(() => {
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
