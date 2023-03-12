import { Widget } from '@/main/widget'
import { ref, Ref } from 'vue'

declare const widgets: {
  get(): Widget[]
  onChanged(callback: (widgets: Widget[]) => void): void
}

export const w: Ref<Widget[]> = ref([])
export function useWidgets (): Ref<Widget[]> {
  if (!w.value.length) {
    w.value = widgets.get()
    widgets.onChanged((widgets) => {
      w.value = widgets
    })
  }
  return w
}
