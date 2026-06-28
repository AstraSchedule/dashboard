import {createRouter, createWebHistory} from "vue-router";
import {isLoggedIn} from '@/auth.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import("../views/Login.vue"),
      meta: {noAuth: true}
    },
    {
      path: '/change-password',
      name: 'ChangePassword',
      component: () => import("../views/ChangePassword.vue")
    },
    {
      path: '/',
      component: () => import("../views/Layout.vue"),
      children: [
        {
          path: '',
          name: 'Home',
          component: () => import("../views/Home.vue")
        },
        {
          path: 'system-users',
          name: 'SystemUsers',
          component: () => import("../views/SystemUsers.vue")
        },
        {
          path: 'tenants',
          name: 'Tenants',
          component: () => import("../views/Tenants.vue")
        },
        {
          path: 'data',
          name: 'Data',
          component: () => import("../views/Data.vue")
        }
      ]
    },
    {
      path: '/:pathMatch(.*)',
      name: 'NotFound',
      redirect: '/'
    }
  ]
})

router.beforeEach((to, from, next) => {
  if (to.meta.noAuth) {
    next()
    return
  }
  if (!isLoggedIn()) {
    next('/login')
    return
  }
  next()
})

export default router
