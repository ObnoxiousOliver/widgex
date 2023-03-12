import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json')

let config: any
export function useConfig () {
  if (config) return config

  let con
  try {
    console.log('Reading config file', CONFIG_PATH)
    con = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    console.log('Read config file', con)
  } catch (e) {
    fs.writeFileSync(CONFIG_PATH, '{}')
    con = {}
  }

  // Read the config file
  // Return a proxy that writes to the config file
  config = createOnChangeProxy(con, (target) => {
    try {
      fs.writeFile(CONFIG_PATH, JSON.stringify(target, null, 4), (e) => {
        if (e) console.error('Error writing config file', e)
      })
    } catch (e) {
      console.error('Error writing config file', e)
    }
  })

  console.log('Config', config.widgets)

  return config
}

function createOnChangeProxy (target: object, onChange: (target: object) => void) {
  const proxy = new Proxy(target, {
    get (target, prop): object {
      const item = target[prop as keyof object]
      if (item && typeof item === 'object') return createOnChangeProxy(item, () => onChange(proxy))
      return item
    },
    set (target, prop, newValue) {
      const res = Reflect.set(target, prop, newValue)
      onChange(proxy)
      return res
    }
  })

  return proxy
}
