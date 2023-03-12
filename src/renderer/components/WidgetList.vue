<template>
  <ul>
    <li v-for="widget in widgets" :key="widget.id">
      <WidgetListItem :widget="widget" />
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { Widget } from '@/main/widget'
import WidgetListItem from './WidgetListItem.vue'

defineProps<{
  widgets: Widget[]
}>()
</script>

<style lang="scss" scoped>
ul {
  list-style: none;
  padding: 0;
}
</style>
