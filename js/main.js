const cards = document.querySelectorAll('.card');
const overlay = document.getElementById('overlay');
const closeBtn = document.querySelector('.close');

cards.forEach(card => {
  card.addEventListener('click', () => {
    overlay.classList.remove('hidden');
  });
});

closeBtn.addEventListener('click', () => {
  overlay.classList.add('hidden');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    overlay.classList.add('hidden');
  }
});