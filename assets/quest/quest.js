'use strict';
// No answers, names or learning records are sent by this marketing page.
const emit = (name, params) => {
  if (typeof window.gtag === 'function') window.gtag('event', name, params);
};
// Filters only work with JavaScript, so they stay hidden without it.
document.querySelectorAll('.filters[hidden]').forEach(group => { group.hidden = false; });
document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    const category = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    let visible = 0;
    document.querySelectorAll('[data-course-category]').forEach(card => {
      card.hidden = category !== 'all' && category !== card.dataset.courseCategory;
      if (!card.hidden) visible++;
    });
    const count = document.querySelector('[data-course-count]');
    if (count) count.textContent = `${visible}教材を表示しています`;
    emit('quest_course_filter', {category});
  });
});
document.querySelectorAll('[data-store]').forEach(link => link.addEventListener('click', () => {
  emit('quest_store_click', {store: link.dataset.store, placement: link.dataset.placement, course: document.body.dataset.course || 'all', page_path: location.pathname});
}));
document.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
  const correct = button.dataset.answer === '2';
  document.querySelectorAll('[data-answer]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  const result = document.querySelector('[data-quiz-result]');
  result.innerHTML = `<strong>${correct ? '正解！ 2個です。' : '答えは、2個です。'}</strong><br>てこがつり合うときは「重さ × 支点からの距離」が左右で同じ。左は 2 × 3 = 6、右も 2 × 3 = 6 になります。`;
}));
const dialog = document.querySelector('.image-dialog');
let opener;
if (dialog && typeof dialog.showModal === 'function') {
  document.querySelectorAll('[data-preview]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); opener = link;
    dialog.querySelector('img').src = link.href;
    dialog.querySelector('img').alt = link.dataset.preview;
    dialog.querySelector('p').textContent = link.dataset.preview;
    dialog.showModal();
  }));
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { if (opener) opener.focus(); });
}
document.querySelectorAll('[data-world-view]').forEach(button => button.addEventListener('click', () => {
  const group = button.closest('[data-world-gallery]') || document;
  const img = group.querySelector('[data-world-image]');
  img.src = `/assets/quest/kingdom-${button.dataset.worldView}.webp`;
  img.alt = button.dataset.worldView === 'day-tablet' ? '建物と道が広がる王国マップの昼の実画面' : '王都の周囲へ広がる領地を見渡す王国マップの実画面';
  const preview = img.closest('[data-preview]');
  if (preview) { preview.href = img.src; preview.dataset.preview = img.alt; }
  group.querySelectorAll('[data-world-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
}));
document.querySelectorAll('.mobile-menu nav a').forEach(link => link.addEventListener('click', () => link.closest('details').removeAttribute('open')));
// The voice wave only moves while the sample is actually playing.
document.querySelectorAll('.voice-card audio').forEach(audio => {
  const card = audio.closest('.voice-card');
  const sync = () => card.classList.toggle('playing', !audio.paused && !audio.ended);
  ['play', 'pause', 'ended'].forEach(type => audio.addEventListener(type, sync));
});
