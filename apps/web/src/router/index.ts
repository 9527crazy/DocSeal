import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      children: [
        { path: '', redirect: '/template' },
        {
          path: 'template',
          name: 'template-list',
          component: () => import('@/views/template/index.vue'),
        },
        {
          path: 'template/:id',
          name: 'template-detail',
          component: () => import('@/views/template/detail.vue'),
        },
        {
          path: 'contract/generate/:templateId',
          name: 'contract-generate',
          component: () => import('@/views/contract/generate.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
    },
  ],
})

export default router
