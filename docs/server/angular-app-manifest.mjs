
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/dashboard",
    "route": "/"
  },
  {
    "renderMode": 2,
    "route": "/dashboard"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-24UP77Q3.js"
    ],
    "route": "/challenge"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 962, hash: '5124c626b2b4a9d29a753f43366e5e2bcb21fc4f15d2d2763795c8c7dec7c6d2', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 998, hash: '630901c42ae7c5b4dfd92b5ea6926ffa510a385a0b9ef2ebd2cfdbc8d8f77d1a', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'challenge/index.html': {size: 30819, hash: 'e7b59615130db40167e49657cd00bfecc0a108589f5a7cc9bec763429d556ef3', text: () => import('./assets-chunks/challenge_index_html.mjs').then(m => m.default)},
    'dashboard/index.html': {size: 34792, hash: 'e586199d2a2f494660a7e4677d57a8f7e4d4a6ae6d4f3904ae78c1dea902097a', text: () => import('./assets-chunks/dashboard_index_html.mjs').then(m => m.default)},
    'styles-R56BDBKB.css': {size: 1548, hash: 'G54EbIyDfGU', text: () => import('./assets-chunks/styles-R56BDBKB_css.mjs').then(m => m.default)}
  },
};
