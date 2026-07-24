// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Display from './views/Display.vue'
import Admin from './views/Admin.vue'
import Kegs from './views/Kegs.vue'


const routes = [
  { path: '/', component: Display },
  { path: '/admin', component: Admin },
  { path: '/kegs',  component: Kegs}
]

export default createRouter({
  history: createWebHistory(),
  routes
})
