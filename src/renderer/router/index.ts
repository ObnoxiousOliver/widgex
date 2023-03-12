// vue router
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

// routes

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue')
  }
]

// create router
const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
