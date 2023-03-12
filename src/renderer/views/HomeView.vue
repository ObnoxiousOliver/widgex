<template>
  <aside>
    <WidgetList :widgets="widgets" />
  </aside>
  <main>
    <h1>App</h1>
  </main>
</template>

<script lang="ts" setup>
import { Widget } from '@/main/widget'
import { ref } from 'vue'
import { useWidgets } from '../widgets'
import WidgetList from '../components/WidgetList.vue'

const widget = useWidgets()
const widgets: Widget[] = ref(widget)
</script>

<style lang="scss">
:root {
  --col-prime: #fff;
  --col-sec: #f3f3f3;
  --col-hov: #e3e3e3;
  --text-prime: #000;
  --text-sec: #1f1f1f;

  --radius: .3rem;
}
@media (prefers-color-scheme: dark) {
  :root {
    --col-prime: #202020;
    --col-sec: #272727;
    --col-hov: #3a3a3a;
    --text-prime: #fff;
    --text-sec: #f3f3f3;
  }
}

html, body {
  background: var(--col-prime);
  color: var(--text-prime);

  font-family: "Roboto", sans-serif;
  height: 100%;
  user-select: none;
}

#app {
  height: 100%;
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}
</style>

<style lang="scss" scoped>
$aside-width: 15rem;
aside {
  background: var(--col-sec);
  padding: 1rem;
  position: fixed;
  inset: 0 auto 0 0;
  width: $aside-width;
}

main {
  border-top-left-radius: var(--radius);
  margin-left: $aside-width;
  padding: 1rem;
  min-height: 100%;
}
</style>
