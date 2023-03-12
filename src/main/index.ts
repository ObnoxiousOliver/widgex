'use strict'

import { app, protocol, BrowserWindow, ipcMain, Tray, Menu, globalShortcut } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import path from 'path'
import { WidgetManager } from './widget'
const isDevelopment = process.env.NODE_ENV !== 'production'

const lock = app.requestSingleInstanceLock()
if (!lock) {
  app.quit()
}

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

let mainWin: BrowserWindow | null = null
async function createMainWindow () {
  // Create the browser window.
  mainWin = new BrowserWindow({
    width: 800,
    height: 600,
    roundedCorners: true,
    backgroundColor: '#2e2c29',

    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: !!process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
      preload: path.join(__dirname, 'preload.js')

    }
  })

  // Hide the menu bar
  mainWin.setMenuBarVisibility(false)

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    await mainWin.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    mainWin.loadURL('app://./index.html')
  }

  mainWin.on('closed', () => {
    mainWin = null
  })
}

export async function focusMainWin (id?: string) {
  if (mainWin && !mainWin?.isDestroyed()) {
    if (mainWin.isMinimized()) mainWin.restore()
    mainWin.focus()
  } else {
    await createMainWindow()
  }

  if (id) {
    mainWin?.webContents.send('focus-widget', id)
  }
}

app.on('second-instance', () => {
  focusMainWin()
})

app.on('window-all-closed', (e: any) => {
  e.preventDefault()
})

;(async () => {
  await app.whenReady()
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e)
    }
  }

  const widgetManager = new WidgetManager()

  ipcMain.on('get-widgets', e => {
    const widgets = widgetManager.widgets.map(x => ({
      uuid: x.uuid,
      manifest: x.manifest,
      source: x.source
    }))

    e.returnValue = widgets
  })

  const tray = new Tray(path.join(__dirname, 'logo.png'))
  tray.setToolTip('WidgeX')
  tray.on('click', () => focusMainWin())
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'WidgeX',
      click: () => focusMainWin()
    },
    { type: 'separator' },
    {
      role: 'quit',
      click: () => app.quit()
    }
  ]))

  // Exit cleanly on request from parent process in development mode.
  if (isDevelopment) {
    if (process.platform === 'win32') {
      process.on('message', (data) => {
        if (data === 'graceful-exit') {
          app.quit()
        }
      })
    } else {
      process.on('SIGTERM', () => {
        app.quit()
      })
    }
  }
})()
