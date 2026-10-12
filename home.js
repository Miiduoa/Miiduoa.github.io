// Links still open the source images when scripting or <dialog> is unavailable.
(() => {
  'use strict';
  const dialog = document.querySelector('#preview-dialog');
  const links = [...document.querySelectorAll('a[data-preview]')];
  if (!dialog || typeof dialog.showModal !== 'function' || !links.length) return;
  const image = dialog.querySelector('#preview-image');
  const caption = dialog.querySelector('#preview-caption');
  const count = dialog.querySelector('#preview-count');
  let index = 0;
  let opener = null;
  const show = (next) => {
    index = (next + links.length) % links.length;
    const link = links[index];
    image.src = link.href;
    image.alt = link.querySelector('img')?.alt || link.dataset.caption || '專案畫面';
    caption.textContent = link.dataset.caption || image.alt;
    count.textContent = `${index + 1} / ${links.length}`;
  };
  links.forEach((link, position) => {
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      show(position);
      dialog.showModal();
      document.body.classList.add('preview-open');
    });
  });
  dialog.querySelector('#preview-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('#preview-prev').addEventListener('click', () => show(index - 1));
  dialog.querySelector('#preview-next').addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      const controls = [...dialog.querySelectorAll('button:not([disabled]), a[href]')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('preview-open');
    opener?.focus({ preventScroll: true });
  });
})();
