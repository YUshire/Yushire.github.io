const root = document.documentElement;
const themeToggle = document.querySelector('#themeToggle');
const themeLabel = themeToggle.querySelector('.theme-label');
const storedTheme = localStorage.getItem('portfolio-theme');
const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem('portfolio-theme', theme);
  themeLabel.textContent = theme === 'paper' ? '夜墨' : '宣纸';
  themeToggle.setAttribute('aria-label', theme === 'paper' ? '切换到夜墨主题' : '切换到宣纸主题');
}

setTheme(storedTheme || (preferredDark ? 'ink' : 'paper'));
themeToggle.addEventListener('click', () => setTheme(root.dataset.theme === 'paper' ? 'ink' : 'paper'));

const navToggle = document.querySelector('#navToggle');
const siteNav = document.querySelector('#siteNav');
navToggle.addEventListener('click', () => {
  const isOpen = siteNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});
siteNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  siteNav.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}));

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

const filters = document.querySelectorAll('.filter');
const projects = document.querySelectorAll('.project-card');
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  projects.forEach(project => {
    const matches = button.dataset.filter === 'all' || project.dataset.category === button.dataset.filter;
    project.classList.toggle('is-hidden', !matches);
  });
}));

document.querySelectorAll('.abstract-toggle').forEach(button => button.addEventListener('click', () => {
  const abstract = button.closest('.pub-main').querySelector('.abstract');
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  abstract.hidden = expanded;
}));

const toast = document.querySelector('#toast');
let toastTimer;
function showToast() {
  clearTimeout(toastTimer);
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}
document.querySelectorAll('.placeholder-action, [data-placeholder-link]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  showToast();
}));

const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...siteNav.querySelectorAll('a')];
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
  });
}, { rootMargin: '-40% 0px -50% 0px' });
sections.forEach(section => sectionObserver.observe(section));

const readingBar = document.querySelector('#readingBar');
window.addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  readingBar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
}, { passive: true });

document.querySelector('#year').textContent = new Date().getFullYear();
