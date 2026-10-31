// Fade out before navigating to another page
document.querySelectorAll('a[href$=".html"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (link.target === '_blank') return; // skip external links
    e.preventDefault();
    document.body.style.transition = 'opacity 0.25s ease';
    document.body.style.opacity = '0';
    setTimeout(() => {
      window.location.href = href;
    }, 250);
  });
});