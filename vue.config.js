const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  pages: {
    index: {
      entry: 'src/renderer/index.ts'
    }
  },
  pluginOptions: {
    electronBuilder: {
      mainProcessFile: 'src/main/index.ts',
      mainProcessWatch: ['src/main/**/*.ts'],
      preload: {
        preload: 'src/main/preload.ts',
        widgetPreload: 'src/main/widgetPreload.ts'
      }
    }
  }
})
