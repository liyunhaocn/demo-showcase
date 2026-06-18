const state = {
  demos: [],
  selectedId: null,
  search: '',
  status: 'all',
  sort: 'date-desc',
}

const statusLabels = {
  validated: '已验证',
  prototype: '原型',
  queued: '排队',
}

const deploymentOptions = [
  {
    name: 'Gitee Pages',
    fit: '国内访问入口，适合纯静态页面和公开 Demo 展示；开通状态以当前账号为准。',
    cost: '免费优先，可能有审核/功能限制',
    url: 'https://gitee.com/pages?skip_mobile=true',
  },
  {
    name: 'GitHub Pages',
    fit: '海外镜像和开源展示入口，适合跟 GitHub 仓库自动发布同一份静态站。',
    cost: '免费静态托管',
    url: 'https://docs.github.com/en/pages',
  },
  {
    name: '双端 Git remote',
    fit: '同一套代码同时推送到 GitHub 和 Gitee，避免每天手动维护两份页面。',
    cost: '免费，依赖两个代码托管账号',
    url: './docs/deploy.md',
  },
  {
    name: 'Cloudflare Pages',
    fit: '免费海外备选，用于 Gitee Pages 不可用时保留第三个公开镜像。',
    cost: '有免费套餐，国内访问不作主保障',
    url: 'https://developers.cloudflare.com/pages/',
  },
  {
    name: 'Vercel / Netlify',
    fit: '免费预览部署和产品演示备选，适合临时分享和 PR 预览。',
    cost: '有免费入门方案，国内访问不作主保障',
    url: 'https://vercel.com/docs',
  },
]

const elements = {
  total: document.querySelector('#metric-total'),
  live: document.querySelector('#metric-live'),
  monetization: document.querySelector('#metric-monetization'),
  week: document.querySelector('#metric-week'),
  featuredDate: document.querySelector('#featured-date'),
  featured: document.querySelector('#featured-demo'),
  grid: document.querySelector('#demo-grid'),
  detail: document.querySelector('#demo-detail'),
  search: document.querySelector('#search-input'),
  status: document.querySelector('#status-filter'),
  sort: document.querySelector('#sort-select'),
  deployment: document.querySelector('#deployment-grid'),
}

async function init() {
  const response = await fetch('./data/demos.json')
  const payload = await response.json()
  state.demos = payload.demos
  state.selectedId = state.demos[0]?.id ?? null

  elements.search.addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase()
    render()
  })
  elements.status.addEventListener('change', (event) => {
    state.status = event.target.value
    render()
  })
  elements.sort.addEventListener('change', (event) => {
    state.sort = event.target.value
    render()
  })

  renderDeployment()
  render()
}

function render() {
  const demos = getFilteredDemos()
  const selected = state.demos.find((demo) => demo.id === state.selectedId) ?? demos[0] ?? state.demos[0]
  if (selected) state.selectedId = selected.id

  renderMetrics()
  renderFeatured(state.demos[0])
  renderGrid(demos)
  renderDetail(selected)
}

function getFilteredDemos() {
  const filtered = state.demos.filter((demo) => {
    const haystack = [
      demo.name,
      demo.tagline,
      demo.problem,
      demo.audience,
      demo.status,
      ...demo.tags,
      ...demo.monetization,
    ].join(' ').toLowerCase()
    const matchesSearch = !state.search || haystack.includes(state.search)
    const matchesStatus = state.status === 'all' || demo.status === state.status
    return matchesSearch && matchesStatus
  })

  return filtered.sort((a, b) => {
    if (state.sort === 'score-desc') return b.score - a.score
    if (state.sort === 'name-asc') return a.name.localeCompare(b.name)
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
}

function renderMetrics() {
  const total = state.demos.length
  const live = state.demos.filter((demo) => demo.links.demo).length
  const monetizable = state.demos.filter((demo) => demo.monetization.length > 0).length
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const week = state.demos.filter((demo) => new Date(demo.date).getTime() >= sevenDaysAgo).length

  elements.total.textContent = total
  elements.live.textContent = live
  elements.monetization.textContent = monetizable
  elements.week.textContent = week
}

function renderFeatured(demo) {
  if (!demo) {
    elements.featured.innerHTML = '<div class="empty">暂无 Demo</div>'
    return
  }

  elements.featuredDate.textContent = formatDate(demo.date)
  elements.featured.innerHTML = `
    <img src="${demo.cover}" alt="${demo.name} screenshot" />
    <div class="featured-body">
      <div class="card-top">
        <span class="status-chip status-${demo.status}">${statusLabels[demo.status] ?? demo.status}</span>
        <span class="score-pill">评分 ${demo.score}</span>
      </div>
      <div>
        <h3>${demo.name}</h3>
        <p>${demo.tagline}</p>
      </div>
      <div class="tag-row">${demo.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}</div>
      <div class="actions">
        ${demo.links.demo ? `<a class="action-link primary-link" href="${demo.links.demo}" target="_blank" rel="noreferrer">打开 Demo</a>` : ''}
        <a class="action-link" href="${demo.links.repo}" target="_blank" rel="noreferrer">查看代码</a>
      </div>
    </div>
  `
}

function renderGrid(demos) {
  if (demos.length === 0) {
    elements.grid.innerHTML = '<div class="empty">没有匹配的 Demo。</div>'
    return
  }

  elements.grid.innerHTML = demos
    .map((demo) => `
      <article class="demo-card ${demo.id === state.selectedId ? 'is-active' : ''}">
        <img src="${demo.cover}" alt="${demo.name} screenshot" />
        <div class="card-top">
          <span class="status-chip status-${demo.status}">${statusLabels[demo.status] ?? demo.status}</span>
          <span class="score-pill">${demo.score}</span>
        </div>
        <div class="card-copy">
          <h3>${demo.name}</h3>
          <p>${demo.tagline}</p>
        </div>
        <div class="tag-row">${demo.tags.slice(0, 4).map((tag) => `<span class="tag">${tag}</span>`).join('')}</div>
        <div class="card-footer">
          <span class="meta-label">${formatDate(demo.date)}</span>
          <span class="meta-label">${demo.audience}</span>
        </div>
        <button class="card-button" type="button" data-demo-id="${demo.id}">查看详情</button>
      </article>
    `)
    .join('')

  elements.grid.querySelectorAll('[data-demo-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedId = button.dataset.demoId
      render()
      elements.detail.scrollIntoView({ block: 'nearest' })
    })
  })
}

function renderDetail(demo) {
  if (!demo) {
    elements.detail.innerHTML = '<div class="empty">选择一个 Demo 查看详情。</div>'
    return
  }

  elements.detail.innerHTML = `
    <div class="card-top">
      <span class="status-chip status-${demo.status}">${statusLabels[demo.status] ?? demo.status}</span>
      <span class="score-pill">商业化评分 ${demo.score}</span>
    </div>
    <div>
      <h3>${demo.name}</h3>
      <p>${demo.tagline}</p>
    </div>
    ${renderBlock('目标用户', [demo.audience])}
    ${renderBlock('痛点', [demo.problem])}
    ${renderBlock('盈利方式', demo.monetization)}
    ${renderBlock('验证证据', demo.validation)}
    ${renderBlock('技术栈', demo.stack)}
    <div class="actions">
      ${demo.links.demo ? `<a class="action-link primary-link" href="${demo.links.demo}" target="_blank" rel="noreferrer">打开 Demo</a>` : ''}
      <a class="action-link" href="${demo.links.repo}" target="_blank" rel="noreferrer">代码目录</a>
    </div>
  `
}

function renderBlock(title, items) {
  return `
    <div class="detail-block">
      <span class="meta-label">${title}</span>
      <ul class="detail-list">
        ${items.map((item) => `<li>${item}</li>`).join('')}
      </ul>
    </div>
  `
}

function renderDeployment() {
  elements.deployment.innerHTML = deploymentOptions
    .map((option) => `
      <article class="deploy-card">
        <strong>${option.name}</strong>
        <p>${option.fit}</p>
        <span class="tag">${option.cost}</span>
        <a class="action-link" href="${option.url}" target="_blank" rel="noreferrer">官方文档</a>
      </article>
    `)
    .join('')
}

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

init().catch((error) => {
  console.error(error)
  elements.grid.innerHTML = '<div class="empty">数据加载失败。</div>'
})
