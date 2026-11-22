/* Component category IDs and paths follow the category folders. */
const entries = window.LibraryCatalog;
const componentCategories = window.LibraryCategories.map(item => [item.id, item.label]);
const defaultCategory = componentCategories.find(([id]) => id === 'button')?.[0] || componentCategories[0]?.[0] || 'all';
const normalizeCategory = id => ({ buttons: 'button', backgrounds: 'background' }[id] || id);
const interactionLabels = { hover: '悬停 hover', press: '按压 press', drag: '拖拽 drag', swipe: '滑动 swipe', scroll: '滚动 scroll', input: '输入 input' };
const grid = document.querySelector('#grid'), heading = document.querySelector('h1'), description = document.querySelector('#description'), search = document.querySelector('#search'), sidebar = document.querySelector('#categories'), chips = document.querySelector('#chips');
const storageKey = '31library:catalog:' + new URL('.', document.baseURI).pathname;
const params = new URLSearchParams(location.search);
let section = ['components', 'blocks', 'lab'].includes(params.get('section')) ? params.get('section') : 'components';
let category = normalizeCategory(params.get('category')) || (section === 'components' ? defaultCategory : 'all');
let filter = params.get('filter') || 'all';
search.value = params.get('q') || '';
let saved;
try { saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch {}
function save() {
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('section', section);
  url.searchParams.set('category', category);
  if (filter !== 'all') url.searchParams.set('filter', filter);
  if (search.value.trim()) url.searchParams.set('q', search.value.trim());
  history.replaceState(null, '', url);
  try { sessionStorage.setItem(storageKey, JSON.stringify({ section, url: url.href, scroll: scrollY })); } catch {}
}
function render(animate = false) {
  const lab = section === 'lab';
  const sectionItems = entries.filter(item => item.section === section);
  const categories = section === 'components' && componentCategories.length ? componentCategories : [['all', lab ? '全部实验' : section === 'blocks' ? '全部区块' : '全部组件']];
  if (!categories.some(([id]) => id === category)) category = categories[0][0];
  document.querySelectorAll('.library-nav-item').forEach(link => {
    const active = new URL(link.href).searchParams.get('section') === section;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  sidebar.replaceChildren();
  categories.forEach(([id, name]) => {
    const button = document.createElement('button'); button.className = 'category' + (category === id ? ' active' : ''); button.dataset.category = id;
    button.setAttribute('aria-pressed', String(category === id));
    const label = document.createElement('span'); label.textContent = name;
    const count = document.createElement('span'); count.className = 'count'; count.textContent = sectionItems.filter(item => id === 'all' || item.category === id).length;
    button.append(label, count); sidebar.append(button);
  });
  heading.textContent = categories.find(([id]) => category === id)[1];
  document.querySelector('.category-heading span').textContent = lab ? '全部实验' : section === 'blocks' ? '全部区块' : '全部组件';
  const filters = lab ? [...new Set(sectionItems.flatMap(item => item.technologies))].map(id => [id, id]) : Object.entries(interactionLabels);
  if (filter !== 'all' && !filters.some(([id]) => id === filter)) filter = 'all';
  chips.setAttribute('aria-label', lab ? '技术筛选' : '交互筛选');
  chips.replaceChildren();
  [['all', '全部'], ...filters].forEach(([id, text]) => {
    const button = document.createElement('button'); button.className = 'chip' + (filter === id ? ' active' : ''); button.dataset.filter = id; button.textContent = text; button.setAttribute('aria-pressed', String(filter === id)); chips.append(button);
  });
  const q = search.value.trim().toLowerCase();
  const items = sectionItems.filter(item => (category === 'all' || item.category === category) && (filter === 'all' || (lab ? item.technologies : item.interactions).includes(filter)) && (!q || [item.title, item.keywords, ...item.interactions, ...item.technologies, ...item.interactions.map(id => interactionLabels[id])].join(' ').toLowerCase().includes(q)));
  description.textContent = items.length + ' 个条目';
  grid.replaceChildren();
  items.forEach(item => {
    const card = document.createElement('article'); card.className = 'card'; card.dataset.project = item.id;
    const preview = document.createElement('div'); preview.className = 'preview';
    const frame = document.createElement('iframe'); frame.className = 'cover-frame'; frame.title = item.title + ' · 交互体验'; frame.loading = 'lazy';
    const url = new URL(item.href, document.baseURI); url.searchParams.set('cover', '1'); frame.src = url.href; frame.style.height = item.previewHeight + 'px';
    const info = document.createElement('a'); info.className = 'card-info'; info.href = new URL(item.href, document.baseURI).href;
    const title = document.createElement('h2'); title.textContent = item.title; info.append(title);
    const tags = lab ? item.technologies : item.interactions;
    if (tags.length) { const label = document.createElement('p'); label.textContent = (lab ? '技术实现 · ' : '鼠标交互 · ') + tags.join(' / '); info.append(label); }
    preview.append(frame); card.append(preview, info); grid.append(card);
  });
  if (!items.length) { const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = q || filter !== 'all' ? '没有找到匹配的条目，试试其他关键词或筛选。' : '这里的内容正在整理中。'; grid.append(empty); }
  save();
  window.LibraryMotion?.updateCatalog(animate === true);
}
document.querySelector('.library-nav').addEventListener('click', event => {
  const link = event.target.closest('.library-nav-item'); if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); section = new URL(link.href).searchParams.get('section'); category = section === 'components' ? defaultCategory : 'all'; filter = 'all'; search.value = ''; render(true);
});
sidebar.addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (button) { category = button.dataset.category; filter = 'all'; render(true); } });
chips.addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (button) { filter = button.dataset.filter; render(true); } });
search.addEventListener('input', render);
search.addEventListener('keydown', event => { if (event.key === 'Escape') { search.value = ''; render(); search.blur(); } });
window.addEventListener('pagehide', save);
window.addEventListener('message', event => {
  if (event.origin !== location.origin) return;
  const frame = [...grid.querySelectorAll('iframe')].find(node => node.contentWindow === event.source);
  if (!frame) return;
  if (event.data?.type === 'library:cover-size' && Number.isFinite(event.data.height) && event.data.height > 0 && event.data.height < 1500) frame.style.height = Math.ceil(event.data.height) + 'px';
  if (event.data?.type === 'library:cover-open') { save(); location.assign(frame.closest('.card').querySelector('.card-info').href); }
});
render();
if (params.get('restore') === '1' && saved?.section === section) requestAnimationFrame(() => scrollTo(0, saved.scroll || 0));
window.addEventListener('pageshow', event => { if (event.persisted) { try { const state = JSON.parse(sessionStorage.getItem(storageKey)); scrollTo(0, state?.scroll || 0); } catch {} } });
