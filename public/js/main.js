// Reveal nav links on wider viewports
if (window.innerWidth > 860) {
  document.querySelectorAll('[data-navlink]').forEach((a) => { a.style.display = 'inline'; });
}

function breakSeal() {
  const seal = document.getElementById('wax-seal');
  const rev = document.getElementById('seal-reveal');
  const hint = document.getElementById('seal-hint');
  if (!seal || !rev) return;
  const open = seal.getAttribute('data-open') === '1';
  if (open) {
    seal.setAttribute('data-open', '0');
    seal.style.opacity = '1';
    seal.style.transform = 'translate(-50%,-50%) rotate(0deg) scale(1)';
    rev.style.maxHeight = '0';
    rev.style.opacity = '0';
    if (hint) hint.textContent = 'Tap the seal';
  } else {
    seal.setAttribute('data-open', '1');
    seal.style.opacity = '0';
    seal.style.transform = 'translate(-50%,-50%) rotate(-26deg) scale(0.5)';
    rev.style.maxHeight = rev.scrollHeight + 'px';
    rev.style.opacity = '1';
    if (hint) hint.textContent = 'Sealed again? Tap to reset';
  }
}

function toggleFaq(btn) {
  const item = btn.parentElement;
  const ans = item.querySelector('[data-ans]');
  const sign = btn.querySelector('[data-sign]');
  if (!ans) return;
  const open = ans.getAttribute('data-open') === '1';
  ans.setAttribute('data-open', open ? '0' : '1');
  ans.style.maxHeight = open ? '0px' : ans.scrollHeight + 'px';
  ans.style.opacity = open ? '0' : '1';
  if (sign) sign.style.transform = open ? 'rotate(0deg)' : 'rotate(45deg)';
}
