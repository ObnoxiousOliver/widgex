<template>
  <li>
    <button>
      <div class="name">
        {{ wname }}
      </div>
      <div class="desc">
        {{ wdesc }}
      </div>
    </button>
  </li>
</template>

<script lang="ts" setup>
import { Widget } from '@/main/widget'
import { computed } from 'vue'

const props = defineProps<{
  widget: Widget
}>()

const wname = computed(() => props.widget.manifest.name)
const wdesc = computed(() => props.widget.manifest.description)
</script>

<style lang="scss" scoped>

button {
  display: block;
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  padding: .5rem .75rem;
  margin: .1rem -.75rem;
  transition: .2s;
  border-radius: var(--radius);
  width: fill-available;
  text-align: left;

  &:hover {
    background: var(--col-hov);
  }
}

</style>
