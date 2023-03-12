import { contextBridge, ipcRenderer } from 'electron'

// declare const global: {
//   widget: {
//     setMovable: (movable: boolean) => void
//     setResizable: (resizable: boolean) => void
//     close: () => void
//     openDevTools: () => void
//     openUrl: (url: string) => void
//     openPath: (path: string) => void
//     id: string
//   }
// }

contextBridge.exposeInMainWorld('widget', {
  setMovable: (movable: boolean) => {
    ipcRenderer.send('widget-set-options', 'movable', movable)
  },
  setResizable: (resizable: boolean) => {
    ipcRenderer.send('widget-set-options', 'resizable', resizable)
  },
  close: () => {
    ipcRenderer.send('widget-close')
  },
  openDevTools: () => {
    ipcRenderer.send('widget-open-devtools')
  },
  openUrl: (url: string) => {
    ipcRenderer.send('widget-open-url', url)
  },
  openPath: (path: string) => {
    console.log('openPath', path)
    ipcRenderer.send('widget-open-path', path)
  },
  onMove: (cb: (x: number, y: number) => void) => {
    ipcRenderer.on('widget-move', (e, x, y) => cb(x, y))
  },
  requestBackdrop: () => {
    ipcRenderer.send('widget-request-backdrop')
    ipcRenderer.on('widget-backdrop', (e, backdrops) => {
      console.log('backdrops', backdrops)
    })
  },
  id: ipcRenderer.sendSync('widget-id')
})

document.addEventListener('DOMContentLoaded', () => {
  const injectedCss = document.createElement('style')
  injectedCss.innerHTML = `
    html {
      -webkit-app-region: drag;
    }

    html:before {
      content: '';
      position: fixed;
      inset: 0;
      opacity: 0;
      background: #39f8;
      mix-blend-mode: hard-light;
      z-index: 999999;
      pointer-events: none;
      transition: opacity .2s;
    }

    html[widget-highlight=true]:before {
      opacity: 1;
    }

    html[widget-highlight-pulse=true]:before {
      transition: opacity 1s;
    }

    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
    }

    [widget-draggable=true] {
      -webkit-app-region: drag;
    }

    [widget-draggable=false],
    button,
    input,
    select,
    textarea,
    a[href],
    area[href],
    [tabindex],
    [contenteditable] {
      -webkit-app-region: no-drag;
    }
  `

  document.documentElement.appendChild(injectedCss)
})

ipcRenderer.on('widget-highlight-pulse', () => {
  const html = document.documentElement
  html.setAttribute('widget-highlight-pulse', 'true')
  html.setAttribute('widget-highlight', 'true')
  setTimeout(() => {
    html.removeAttribute('widget-highlight')
    setTimeout(() => {
      html.setAttribute('widget-highlight-pulse', 'false')
    }, 1000)
  }, 1000)
}).on('widget-highlight', (e, highlight: boolean) => {
  const html = document.documentElement
  html.setAttribute('widget-highlight', highlight ? 'true' : 'false')
}).on('widget-show-id', (e, show) => {
  if (show && document.getElementById('widget-id')) return
  if (!show && !document.getElementById('widget-id')) return

  if (show) {
    const id = ipcRenderer.sendSync('widget-id')
    document.documentElement.innerHTML += `
      <div id="widget-id" style="
        position: fixed;
        top: 0;
        left: 0;
        background: #000a;
        color: #fff;
        padding: 5px;
        font-size: 12px;
        font-family: sans-serif;
        z-index: 9999999;
      ">
        ${id}
      </div>
    `
  } else {
    document.getElementById('widget-id')?.remove()
  }
})
