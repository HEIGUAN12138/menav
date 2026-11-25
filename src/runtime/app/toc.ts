import type { RuntimeDom } from '../types';
import { SELECTORS, byId, qs, qsa } from '../dom/selectors';

type TocEntry = {
  element: HTMLElement;
  link: HTMLElement;
};

const ACTIVE_CLASS = 'is-current';
const SPY_OFFSET = 96;

function normalizeText(value: unknown): string {
  return String(value === null || value === undefined ? '' : value).trim();
}

function getHeadingText(element: HTMLElement | null): string {
  if (!element) return '';
  const heading = qs('h1, h2, h3, h4, h5, h6', element);
  return normalizeText((heading || element).textContent);
}

module.exports = function initToc(
  dom: RuntimeDom,
  getCurrentPageId: () => string
): { refresh: () => void } {
  const { content } = dom;
  const tocNav = byId('page-toc-nav');
  const tocRoot = tocNav ? tocNav.closest('.page-toc') : null;

  if (!content || !tocNav || !tocRoot) {
    return { refresh: () => {} };
  }

  let entries: TocEntry[] = [];
  let activeLink: HTMLElement | null = null;
  let ticking = false;

  function ensureId(element: HTMLElement, pageId: string, index: number): string {
    const existing = normalizeText(element.id || element.getAttribute('id'));
    if (existing) return existing;
    const next = `toc-${pageId}-${index}`;
    element.id = next;
    return next;
  }

  function createLink(target: HTMLElement, id: string, label: string, isSub: boolean): HTMLElement {
    const link = document.createElement('a');
    link.className = isSub ? 'toc-link toc-link-sub' : 'toc-link';
    link.href = `#${id}`;
    link.textContent = label;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const containerTop = content!.getBoundingClientRect().top;
      const offset = target.getBoundingClientRect().top - containerTop + content!.scrollTop - 24;
      content!.scrollTo({ top: Math.max(offset, 0), behavior: 'smooth' });
    });
    return link;
  }

  function build(): void {
    entries = [];
    activeLink = null;
    tocNav!.textContent = '';

    const pageId = normalizeText(getCurrentPageId());
    const page = (pageId ? byId(pageId) : qs(SELECTORS.pageActive, content!)) as HTMLElement | null;
    if (!page) {
      tocRoot!.classList.add('is-empty');
      return;
    }

    const categories = qsa(SELECTORS.categoryLevelOne, page);
    if (categories.length === 0) {
      tocRoot!.classList.add('is-empty');
      return;
    }
    tocRoot!.classList.remove('is-empty');

    const list = document.createElement('ul');
    list.className = 'toc-list';

    categories.forEach((category, index) => {
      const heading = qs(':scope > .category-header', category);
      const label = getHeadingText(heading as HTMLElement | null);
      if (!label) return;

      const categoryId = ensureId(category as HTMLElement, pageId || 'page', index);

      const item = document.createElement('li');
      item.className = 'toc-item';
      const link = createLink(category as HTMLElement, categoryId, label, false);
      link.dataset.tocId = categoryId;
      item.appendChild(link);
      entries.push({ element: category as HTMLElement, link });

      const groupsContainer = qs(':scope > .category-content > .groups-container', category);
      const groups = groupsContainer
        ? qsa(':scope > .group', groupsContainer)
        : [];
      if (groups.length > 0) {
        const subList = document.createElement('ul');
        subList.className = 'toc-sublist';
        groups.forEach((group, groupIndex) => {
          const groupLabel = getHeadingText(qs(':scope > .group-header', group));
          if (!groupLabel) return;
          const groupId = ensureId(
            group as HTMLElement,
            `${pageId || 'page'}-${categoryId}`,
            groupIndex
          );
          const subItem = document.createElement('li');
          subItem.className = 'toc-item toc-item-sub';
          const subLink = createLink(group as HTMLElement, groupId, groupLabel, true);
          subLink.dataset.tocId = groupId;
          subItem.appendChild(subLink);
          subList.appendChild(subItem);
          entries.push({ element: group as HTMLElement, link: subLink });
        });
        if (subList.childElementCount > 0) item.appendChild(subList);
      }

      list.appendChild(item);
    });

    if (list.childElementCount === 0) {
      tocRoot!.classList.add('is-empty');
      return;
    }

    tocNav!.appendChild(list);
    updateActive();
  }

  function setActive(next: HTMLElement | null): void {
    if (next === activeLink) return;
    if (activeLink) activeLink.classList.remove(ACTIVE_CLASS);
    activeLink = next;
    if (activeLink) activeLink.classList.add(ACTIVE_CLASS);
    syncSidebar();
  }

  // 左侧目录同步高亮当前所在分类
  function syncSidebar(): void {
    const panel = qs(SELECTORS.submenuPanel);
    if (!panel) return;
    const entry = entries.find((item) => item.link === activeLink);
    const category = entry
      ? ((entry.element.closest('.category-level-1') as HTMLElement | null) || entry.element)
      : null;
    const name = category ? normalizeText(category.dataset.name || category.id) : '';
    qsa(SELECTORS.submenuItem, panel).forEach((item) => {
      const match =
        !!name &&
        (item.dataset.category === name ||
          item.dataset.categoryId === name ||
          normalizeText(item.textContent) === name);
      item.classList.toggle('active', match);
    });
  }

  function updateActive(): void {
    if (entries.length === 0) return;
    const containerTop = content!.getBoundingClientRect().top;
    let current: TocEntry | null = null;

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      // 折叠后不可见的分组不参与高亮，避免读到 0 高度位置
      if (entry.element.getClientRects().length === 0) continue;
      const offset = entry.element.getBoundingClientRect().top - containerTop;
      if (offset <= SPY_OFFSET) current = entry;
      else break;
    }

    // 停在顶部时第一个标题可能还没进入阈值区，仍然高亮第一项
    if (!current && content!.scrollTop <= 4) {
      const firstVisible = entries.find((entry) => entry.element.getClientRects().length > 0);
      if (firstVisible) current = firstVisible;
    }

    setActive(current ? current.link : null);
  }

  function onScroll(): void {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      ticking = false;
      updateActive();
    });
  }

  content.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('menav:pageChanged', () => {
    build();
    content.scrollTop = content.scrollTop;
  });

  build();

  return { refresh: build };
};
