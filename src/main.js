import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import axios from 'axios'

import router from "./router/index.js";
import {removeToken, removeUserInfo} from '@/auth.js'

axios.interceptors.response.use(
  resp => resp,
  err => {
    const method = err.config?.method?.toUpperCase()
    if (err.response?.status === 401 && (method === 'GET' || method === 'OPTIONS') && router.currentRoute.value.name !== 'Login') {
      removeToken()
      removeUserInfo()
      router.push('/login')
    }
    return Promise.reject(err)
  }
)

createApp(App).use(router).mount('#app')
