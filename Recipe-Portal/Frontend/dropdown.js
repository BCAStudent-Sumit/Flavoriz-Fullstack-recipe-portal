// frontend/js/dropdown.js

const dropdownTrigger = document.getElementById('dropdownTrigger');
const dropdownMenu = document.getElementById('dropdownMenu');

if (dropdownTrigger && dropdownMenu) {
  dropdownTrigger.addEventListener('click', (e) => {
    // Only intercept click on mobile - on desktop, hover already handles it
    if (window.innerWidth <= 768) {
      e.preventDefault();
      dropdownMenu.classList.toggle('show');
    }
  });

  // Close dropdown if user taps outside of it
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 &&
        !dropdownTrigger.contains(e.target) &&
        !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove('show');
    }
  });
}