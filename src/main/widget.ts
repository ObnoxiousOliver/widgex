import { BrowserWindow, dialog, Menu, shell } from 'electron'
import { DisableMinimize } from 'electron-disable-minimize'
import fs from 'fs/promises'
import path from 'path'
import { v4 } from 'uuid'
import { focusMainWin } from '.'
import { useConfig } from './config'

export interface WidgetOptions {
  movable?: boolean
  resizable?: boolean
  position?: {
    x: number
    y: number
  }
  size?: {
    width: number
    height: number
  },
  transparent?: boolean
}

export interface CustomOption {
  name: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'radio' | 'select' | 'color' | 'file' | 'folder'
  default?: string | number | boolean
  options?: {
    [key: string]: string
  }
}

export class WidgetManifest {
  name?: string = ''
  description?: string = ''
  author?: string = ''
  index?: string = ''
  options?: WidgetOptions = {}
  custonOptions?: CustomOption[] = []

  static from (object: any) {
    const manifest = new WidgetManifest()
    manifest.name = object.name
    manifest.description = object.description
    manifest.author = object.author
    manifest.index = object.index
    manifest.options = object.options
    manifest.custonOptions = object.custonOptions
    return manifest
  }
}

export class Widget {
  window: BrowserWindow | null
  source: string
  manifest: WidgetManifest

  private _uuid: string
  public get uuid () : string {
    return this._uuid
  }

  private _options : WidgetOptions
  public get options () : WidgetOptions {
    return this._options
  }

  private _customOptions: CustomOption[]
  public get customOptions () : CustomOption[] {
    return this._customOptions
  }

  private _customOptionsValues: { [key: string]: any } = {}
  public get customOptionsValues () : { [key: string]: any } {
    return this._customOptionsValues
  }

  private _active: boolean
  public get active () : boolean {
    return this._active
  }

  constructor (source: string, options?: WidgetOptions, manifest?: WidgetManifest, id?: string) {
    this.window = null
    this.source = source
    this._options = options ?? {}
    this._customOptions = manifest?.custonOptions ?? []
    this.manifest = manifest ?? {}
    this._uuid = id ?? v4()
    this._active = false
  }

  async applyOptions () {
    if (this.window) {
      const opt = this.options

      if (opt.movable !== undefined) this.window.setMovable(opt.movable)
      if (opt.resizable !== undefined) this.window.setResizable(opt.resizable)

      this.window.setBounds({
        x: opt.position?.x ?? this.window.getBounds().x,
        y: opt.position?.y ?? this.window.getBounds().y,
        width: opt.size?.width ?? this.window.getBounds().width,
        height: opt.size?.height ?? this.window.getBounds().height
      })
    }

    await this.save()
  }

  async createWindow () {
    const filePath = path.join(this.source, this.manifest.index ?? 'index.html')

    try {
      await fs.access(filePath)
    } catch (e) {
      throw new Error(`Widget index file not found at ${filePath}`)
    }

    const win = new BrowserWindow({
      transparent: this._options.transparent ?? false,
      frame: false,
      focusable: false,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      type: 'desktop',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        preload: path.join(__dirname, 'widgetPreload.js')
      }
    })

    // const handle = win.getNativeWindowHandle()
    // DisableMinimize(handle)

    this.window = win

    let saveTimeout: NodeJS.Timeout
    win.on('resize', () => {
      this._options.size = {
        width: win.getBounds().width,
        height: win.getBounds().height
      }
      clearTimeout(saveTimeout)
      saveTimeout = setTimeout(async () => {
        await this.save()
      }, 500)
    }).on('move', async () => {
      win.webContents.send('widget-move', win.getBounds().x, win.getBounds().y)
      this._options.position = {
        x: win.getBounds().x,
        y: win.getBounds().y
      }
      clearTimeout(saveTimeout)
      saveTimeout = setTimeout(async () => {
        await this.save()
      }, 500)
    })

    win.webContents.on('ipc-message-sync', (event, channel, args) => {
      if (channel === 'widget-get-options') {
        event.returnValue = this.options
      }
      if (channel === 'widget-get-manifest') {
        event.returnValue = this.manifest
      }
      if (channel === 'widget-get-custom-options') {
        event.returnValue = this.customOptions
      }
      if (channel === 'widget-get-custom-options-values') {
        event.returnValue = this.customOptionsValues
      }
      if (channel === 'widget-id') {
        event.returnValue = this.uuid
      }
    }).on('ipc-message', async (event, channel, ...args) => {
      if (channel === 'widget-set-custom-option') {
        this._customOptionsValues[args[0]] = args[1]
        this.save()
      }
      if (channel === 'widget-set-option') {
        this._options[args[0] as keyof WidgetOptions] = args[1]
        this.applyOptions()
      }
      if (channel === 'widget-close') {
        this.destroy()
      }
      if (channel === 'widget-open-devtools') {
        win.webContents.openDevTools({
          mode: 'detach'
        })
      }
      if (channel === 'widget-open-url') {
        // Check if widget is trusted
        if (useConfig().trustedWidgets.includes(this.uuid)) {
          shell.openExternal(args[0])
          return
        }

        const result = await dialog.showMessageBox({
          type: 'warning',
          title: 'Widget wants to open a URL',
          message: 'This widget wants to open a URL. Do you want to proceed?',
          buttons: ['Yes', 'No'],
          detail: 'URL: "' + args[0] + '".\n\nThis is a security risk. Only open URLs from trusted sources. If you are not sure, click "No".',
          checkboxLabel: 'Trust this widget',
          checkboxChecked: false,
          cancelId: 1
        })

        if (result.response === 0) {
          shell.openExternal(args[0])
        }

        if (result.checkboxChecked) {
          useConfig().trustedWidgets.push(this.uuid)
        }
      }
      if (channel === 'widget-open-path') {
        // Check if path exists
        try {
          await fs.access(args[0])
        } catch (e) {
          console.error(args[0] + ' does not exist')
          return
        }

        // Check if path is a file
        const stat = await fs.stat(args[0])
        if (stat.isDirectory()) {
          shell.openPath(args[0])
        } else {
          // Check if widget is trusted
          if (useConfig().trustedWidgets.includes(this.uuid)) {
            shell.openPath(args[0])
            return
          }

          const result = await dialog.showMessageBox({
            type: 'warning',
            title: 'Widget wants to open a file',
            message: 'This widget wants to open a file. Do you want to proceed?',
            buttons: ['Yes', 'No'],
            detail: 'Path: "' + args[0] + '".\n\nThis is a security risk. Only open files from trusted sources. If you are not sure, click "No".',
            checkboxLabel: 'Trust this widget',
            checkboxChecked: false,
            cancelId: 1
          })

          if (result.response === 0) {
            shell.openPath(args[0])
          }

          if (result.checkboxChecked) {
            useConfig().trustedWidgets.push(this.uuid)
          }
        }
      }
    })

    // override the default context menu
    const WM_INITMENU = 0x0116
    win.hookWindowMessage(WM_INITMENU, () => {
      win.setEnabled(false)
      win.setEnabled(true)
      Menu.buildFromTemplate([
        {
          label: 'Settings',
          click: () => {
            focusMainWin()
          }
        },
        { type: 'separator' },
        {
          label: 'Moveable',
          type: 'checkbox',
          checked: this._options.movable,
          click: () => {
            this.setMovable(!this.options.movable)
          }
        },
        {
          label: 'Resizable',
          type: 'checkbox',
          checked: this._options.resizable,
          click: () => {
            this.setResizable(!this.options.resizable)
          }
        },
        { type: 'separator' },
        {
          label: 'Open DevTools',
          click: () => {
            win.webContents.openDevTools({
              mode: 'detach'
            })
          }
        },
        {
          role: 'reload',
          click: () => {
            win?.reload()
          }
        },
        { type: 'separator' },
        {
          role: 'close',
          click: () => {
            this.destroy()
          }
        }
      ]).popup()
    })

    await win.loadURL(filePath)
    this._active = true
    this.applyOptions()
  }

  setCustonOptionValue (key: string, value: any) {
    this._customOptionsValues[key] = value
    this.applyOptions()
  }

  setSize (width: number, height: number) {
    this._options.size = { width, height }
    this.applyOptions()
  }

  setPosition (x: number, y: number) {
    this._options.position = { x, y }
    this.applyOptions()
  }

  setMovable (movable: boolean) {
    this._options.movable = movable
    this.applyOptions()
  }

  setResizable (resizable: boolean) {
    this._options.resizable = resizable
    this.applyOptions()
  }

  async destroy () {
    if (this.window) {
      this.window.destroy()
      this.window = null
      this._active = false
      await this.save()
    }
  }

  reset () {
    this._options = this.manifest.options ?? {}
    this._customOptionsValues = {}
    this.applyOptions()
  }

  send (channel: string, ...args: any[]) {
    if (this.window) {
      this.window.webContents.send(channel, ...args)
    }
  }

  async save () {
    const config = useConfig()

    if (!config.widgets) {
      config.widgets = {}
    }

    config.widgets[this.uuid] = {
      source: this.source,
      active: this.active,
      options: this.options,
      customOptions: this.customOptionsValues
    }
  }
}

export class WidgetManager {
  widgets: Widget[]

  constructor () {
    this.widgets = [];
    (async () => {
      for (const id of Object.keys(useConfig().widgets)) {
        console.log(`Loading widget ${id}`)
        const widget = useConfig().widgets[id]
        this.addWidget(widget.source, id, widget.options).then(w => {
          if (widget.active) {
            console.log(`Activating widget ${id}`)
            w.createWindow()
          }
        })
      }
    })()
  }

  async addWidget (location: string, id?: string, options: WidgetOptions = {}): Promise<Widget> {
    try {
      await fs.access(location)
    } catch (e) {
      throw new Error(`Widget file not found: ${location}`)
    }

    const files = await fs.readdir(location)
    if (!files.includes('manifest.json')) {
      throw new Error('manifest.json not found')
    }
    const manifest = WidgetManifest.from(JSON.parse(await fs.readFile(`${location}/manifest.json`, 'utf8')))

    const widget = new Widget(location, { ...manifest.options, ...options }, manifest, id)
    // widget.createWindow()
    this.widgets.push(widget)

    return widget
  }

  removeWidget (widget: Widget) {
    widget.destroy()
    this.widgets = this.widgets.filter(w => w !== widget)
  }
}
