(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('#themeToggle');
  const label = toggle.querySelector('.theme-label');
  let saved;
  try { saved = localStorage.getItem('portfolio-theme'); } catch (_) { /* Storage can be disabled. */ }
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'ink' : 'paper';
  function setTheme(value) {
    const theme = value === 'ink' ? 'ink' : 'paper';
    root.dataset.theme = theme;
    try { localStorage.setItem('portfolio-theme', theme); } catch (_) { /* Theme still works. */ }
    label.textContent = theme === 'paper' ? '夜墨' : '宣纸';
    toggle.setAttribute('aria-label', theme === 'paper' ? '切换到夜墨主题' : '切换到宣纸主题');
  }
  setTheme(saved || preferred);
  toggle.addEventListener('click', () => setTheme(root.dataset.theme === 'paper' ? 'ink' : 'paper'));
  const nav = document.querySelector('#siteNav');
  const navToggle = document.querySelector('#navToggle');
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }));
  const bar = document.querySelector('#readingBar');
  const updateProgress = () => {
    const max = root.scrollHeight - window.innerHeight;
    bar.style.width = `${max > 0 ? window.scrollY / max * 100 : 0}%`;
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();
  document.querySelector('#year').textContent = new Date().getFullYear();
  document.querySelector('#printNote')?.addEventListener('click', () => window.print());
  const search = document.querySelector('#noteSearch');
  if (search) {
    const cards = [...document.querySelectorAll('[data-note]')];
    search.addEventListener('input', () => {
      const query = search.value.trim().toLocaleLowerCase();
      let count = 0;
      for (const card of cards) {
        const matches = `${card.dataset.note} ${card.textContent}`.toLocaleLowerCase().includes(query);
        card.hidden = !matches;
        if (matches) count++;
      }
      document.querySelector('#noNotes').hidden = count !== 0;
    });
  }
  const toc = document.querySelector('.article-toc');
  if (toc) {
    const links = [...toc.querySelectorAll('a')];
    const sections = links.map(link => document.querySelector(link.hash));
    const markActive = () => {
      let active = sections[0];
      for (const section of sections) if (section.getBoundingClientRect().top <= 140) active = section;
      for (const link of links) {
        const matches = link.hash === `#${active.id}`;
        link.classList.toggle('active', matches);
        if (matches) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    };
    window.addEventListener('scroll', markActive, { passive: true });
    markActive();
  }
})();
