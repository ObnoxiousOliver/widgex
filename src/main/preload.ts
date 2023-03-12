import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { Widget } from './widget'

console.log('renderer')

contextBridge.exposeInMainWorld('widgets', {
  get (): Widget[] {
    return ipcRenderer.sendSync('get-widgets')
  },
  onChanged (callback: (widgets: Widget[]) => void) {
    function cb (e: IpcRendererEvent, widgets: Widget[]) {
      callback(widgets)
    }

    ipcRenderer.on('widgets-changed', cb)
    return () => ipcRenderer.off('widgets-changed', cb)
  }
})
