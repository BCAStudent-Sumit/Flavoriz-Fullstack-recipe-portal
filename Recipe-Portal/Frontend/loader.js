// frontend/js/loader.js
// Small standalone Three.js scene for the loading screen - a spinning donut.

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('loaderCanvas');
  const overlay = document.getElementById('loadingScreen');
  if (!canvas || !overlay) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 1000);
  camera.position.z = 60;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(160, 160);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const light = new THREE.DirectionalLight(0xfff3e0, 0.9);
  light.position.set(60, 80, 100);
  scene.add(light);

  const donut = new THREE.Mesh(
    new THREE.TorusGeometry(16, 6, 20, 48),
    new THREE.MeshStandardMaterial({ color: 0xe8552f, roughness: 0.4, metalness: 0.1 })
  );
  scene.add(donut);

  // Small sprinkle dots on top for a food-y detail
  const sprinkleGeo = new THREE.SphereGeometry(1, 8, 8);
  const sprinkleColors = [0x1a5653, 0xf4a261, 0xffffff];
  for (let i = 0; i < 10; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: sprinkleColors[i % 3] });
    const sprinkle = new THREE.Mesh(sprinkleGeo, mat);
    const angle = (i / 10) * Math.PI * 2;
    sprinkle.position.set(Math.cos(angle) * 16, Math.sin(angle) * 16, 6);
    donut.add(sprinkle);
  }

  let running = true;
  function animateLoader() {
    if (!running) return;
    requestAnimationFrame(animateLoader);
    donut.rotation.x += 0.02;
    donut.rotation.y += 0.03;
    renderer.render(scene, camera);
  }
  animateLoader();

  // Hide the loader once the page has fully loaded, with a small minimum
  // display time so it doesn't just flash on fast connections.
  const minDisplayTime = 2500;
  const startTime = Date.now();

  function hideLoader() {
    const elapsed = Date.now() - startTime;
    const wait = Math.max(0, minDisplayTime - elapsed);
    setTimeout(() => {
      overlay.classList.add('loader-hidden');
      setTimeout(() => { running = false; }, 700); // stop rendering once faded out
    }, wait);
  }

  if (document.readyState === 'complete') {
    hideLoader();
  } else {
    window.addEventListener('load', hideLoader);
  }
});