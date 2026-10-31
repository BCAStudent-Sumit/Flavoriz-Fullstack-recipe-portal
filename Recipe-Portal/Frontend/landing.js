window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('avatar-canvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xfdf6ec, 0.0016);

  const camera = new THREE.PerspectiveCamera(
    60, window.innerWidth / window.innerHeight, 1, 2000
  );
  camera.position.z = 650;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lighting for shaded 3D shapes
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const keyLight = new THREE.DirectionalLight(0xfff3e0, 0.8);
  keyLight.position.set(300, 400, 500);
  scene.add(keyLight);

  const colorTeal = new THREE.Color(0x1a5653);
  const colorOrange = new THREE.Color(0xe8552f);
  const colorGold = new THREE.Color(0xf4a261);

  // ---- Floating food shapes: donuts, citrus wedges, berries ----
  const donutGeo = new THREE.TorusGeometry(14, 5.5, 12, 28);
  const berryGeo = new THREE.SphereGeometry(7, 14, 14);

  const wedgeShape = new THREE.Shape();
  wedgeShape.moveTo(0, 0);
  wedgeShape.absarc(0, 0, 13, 0, Math.PI / 3, false);
  wedgeShape.lineTo(0, 0);
  const wedgeGeo = new THREE.ExtrudeGeometry(wedgeShape, { depth: 3, bevelEnabled: false });
  wedgeGeo.center();

  const donutColors = [colorOrange, colorTeal, colorGold];
  const foodItems = [];
  const foodCount = 26;

  for (let i = 0; i < foodCount; i++) {
    const pick = i % 3;
    let mesh;

    if (pick === 0) {
      const mat = new THREE.MeshStandardMaterial({
        color: donutColors[i % donutColors.length],
        roughness: 0.45,
        metalness: 0.05,
        transparent: true,
        opacity: 0.9,
      });
      mesh = new THREE.Mesh(donutGeo, mat);
    } else if (pick === 1) {
      const mat = new THREE.MeshStandardMaterial({
        color: colorGold,
        roughness: 0.4,
        metalness: 0.05,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      });
      mesh = new THREE.Mesh(wedgeGeo, mat);
    } else {
      const mat = new THREE.MeshStandardMaterial({
        color: colorOrange,
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9,
      });
      mesh = new THREE.Mesh(berryGeo, mat);
    }

    mesh.position.set(
      (Math.random() - 0.5) * 1400,
      (Math.random() - 0.5) * 1200,
      (Math.random() - 0.5) * 900
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    mesh.userData.spinX = 0.002 + Math.random() * 0.003;
    mesh.userData.spinY = 0.0015 + Math.random() * 0.003;
    mesh.userData.driftSpeed = 0.2 + Math.random() * 0.45;

    scene.add(mesh);
    foodItems.push(mesh);
  }

  // ---- Mouse parallax on the camera ----
  let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) * 0.35;
    mouseY = (e.clientY - window.innerHeight / 2) * 0.35;
  });

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;
    camera.position.x = targetX;
    camera.position.y = -targetY;
    camera.lookAt(scene.position);

    foodItems.forEach((item, i) => {
      item.rotation.x += item.userData.spinX;
      item.rotation.y += item.userData.spinY;
      item.position.y += Math.sin(time + i) * 0.15 + item.userData.driftSpeed * 0.15;
      if (item.position.y > 650) item.position.y = -650;
    });

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---- Mouse-parallax tilt on the dish collage ----
  const dishCollage = document.querySelector('.dish-collage');
  if (dishCollage) {
    dishCollage.addEventListener('mousemove', (e) => {
      const rect = dishCollage.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const rotateY = ((px - rect.width / 2) / (rect.width / 2)) * 5;
      const rotateX = -((py - rect.height / 2) / (rect.height / 2)) * 5;
      dishCollage.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      dishCollage.style.transformStyle = 'preserve-3d';
    });
    dishCollage.addEventListener('mouseleave', () => {
      dishCollage.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
  }

  // ---- 3D mouse-tilt on trending recipe cards ----
  document.querySelectorAll('.recipe-card').forEach((el) => {
    el.style.transformStyle = 'preserve-3d';
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const rotateY = ((px - rect.width / 2) / (rect.width / 2)) * 6;
      const rotateX = -((py - rect.height / 2) / (rect.height / 2)) * 6;
      el.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
    });
  });
});