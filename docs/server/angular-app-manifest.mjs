
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
      "chunk-LYGNLHZP.js"
    ],
    "route": "/challenge"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 962, hash: 'cfbc7155edabb5ba0296c542b27768876d9c1b89571f5e252dd4a8924afdd00f', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 998, hash: '9d297a1cbeb2fb61d9c367d74ddc7c2b8aecb1674998c4c8c69660db463d1d84', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'challenge/index.html': {size: 30738, hash: '945a95f9c748f34a9846896617564154e0c96a25204d0f94089bf69629720693', text: () => import('./assets-chunks/challenge_index_html.mjs').then(m => m.default)},
    'dashboard/index.html': {size: 34724, hash: 'c6fcaf021ff52885c1d9ef4e28981485d5f5b2be065de23ee06222e8c8df4997', text: () => import('./assets-chunks/dashboard_index_html.mjs').then(m => m.default)},
    'styles-R56BDBKB.css': {size: 1548, hash: 'G54EbIyDfGU', text: () => import('./assets-chunks/styles-R56BDBKB_css.mjs').then(m => m.default)}
  },
};
