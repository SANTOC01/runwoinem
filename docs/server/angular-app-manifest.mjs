
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/runwoinem/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/runwoinem/dashboard",
    "route": "/runwoinem"
  },
  {
    "renderMode": 2,
    "route": "/runwoinem/dashboard"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-24UP77Q3.js"
    ],
    "route": "/runwoinem/challenge"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 972, hash: 'afffefee21f29d1f829b2754e5582c8fdb69076bd68f857ab618937e75f40638', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1008, hash: 'd965d022ab629802cdc5d9c848f86d11c7b67f806bca23b659be24a509cfb339', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'challenge/index.html': {size: 30839, hash: '12d7a8a9e00703df37f90ca063b939ee3515168d31369432285dd6fc6ab9ab00', text: () => import('./assets-chunks/challenge_index_html.mjs').then(m => m.default)},
    'dashboard/index.html': {size: 34812, hash: 'f950c64e68f4595c93059a5d9a2fca1cede2e24664c20bffab745ec47591d37d', text: () => import('./assets-chunks/dashboard_index_html.mjs').then(m => m.default)},
    'styles-R56BDBKB.css': {size: 1548, hash: 'G54EbIyDfGU', text: () => import('./assets-chunks/styles-R56BDBKB_css.mjs').then(m => m.default)}
  },
};
