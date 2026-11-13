import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// HTML elements
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const objectiveText = document.getElementById('objective');
const ammoText = document.getElementById('ammo');
const messageBox = document.getElementById('message');

// Game state
let drivesCollected = 0;
let ammo = 12;
let reserveAmmo = 48;
let canShoot = true;
let missionComplete = false;

const keys = {};
const bullets = [];
const drives = [];

// Three.js basics
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);
scene.fog = new THREE.Fog(0x0a0a12, 20, 90);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 1.7, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x222222 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const grid = new THREE.GridHelper(100, 50, 0x00ffcc, 0x333333);
grid.position.y = 0.01;
scene.add(grid);

// Walls
function createWall(x, z, width, depth) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, 4, depth),
    new THREE.MeshStandardMaterial({ color: 0x444455 })
  );
  wall.position.set(x, 2, z);
  scene.add(wall);
}

createWall(0, -20, 40, 1);
createWall(-20, 0, 1, 40);
createWall(20, 0, 1, 40);
createWall(0, 20, 40, 1);

// Safehouse
const safehouse = new THREE.Mesh(
  new THREE.BoxGeometry(4, 3, 4),
  new THREE.MeshStandardMaterial({ color: 0x00ffcc })
);
safehouse.position.set(0, 1.5, -15);
scene.add(safehouse);

// Data drives
function createDrive(x, z) {
  const drive = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xffcc00 })
  );
  drive.position.set(x, 0.5, z);
  scene.add(drive);
  drives.push(drive);
}

createDrive(-12, -8);
createDrive(12, -5);
createDrive(5, 8);

// Bullets
function createBullet() {
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
  );

  bullet.position.copy(camera.position);

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  scene.add(bullet);

  bullets.push({
    mesh: bullet,
    direction: direction,
    life: 2
  });
}

// HUD
function updateHUD() {
  objectiveText.textContent = `DATA DRIVES: ${drivesCollected} / 3`;
  ammoText.textContent = `AMMO: ${ammo} / ${reserveAmmo}`;
}

function showMessage(text, duration = 2500) {
  messageBox.textContent = text;
  messageBox.style.display = 'block';

  setTimeout(() => {
    messageBox.style.display = 'none';
  }, duration);
}

// Start button
startButton.addEventListener('click', () => {
  console.log('START MISSION clicked');
  controls.lock();
});

controls.addEventListener('lock', () => {
  startScreen.style.display = 'none';
});

controls.addEventListener('unlock', () => {
  startScreen.style.display = 'flex';
});

// Keyboard controls
document.addEventListener('keydown', (event) => {
  keys[event.code] = true;

  if (event.code === 'KeyR') {
    if (ammo < 12 && reserveAmmo > 0) {
      const needed = 12 - ammo;
      const loaded = Math.min(needed, reserveAmmo);

      ammo += loaded;
      reserveAmmo -= loaded;

      updateHUD();
      showMessage('RELOADED');
    }
  }
});

document.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

// Shooting
document.addEventListener('mousedown', (event) => {
  if (
    event.button === 0 &&
    controls.isLocked &&
    canShoot &&
    ammo > 0
  ) {
    createBullet();
    ammo--;
    updateHUD();

    canShoot = false;

    setTimeout(() => {
      canShoot = true;
    }, 180);
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Game loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const speed = 6 * delta;

  if (keys['KeyW']) controls.moveForward(speed);
  if (keys['KeyS']) controls.moveForward(-speed);
  if (keys['KeyA']) controls.moveRight(-speed);
  if (keys['KeyD']) controls.moveRight(speed);

  // Move bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];

    bullet.mesh.position.addScaledVector(bullet.direction, 30 * delta);
    bullet.life -= delta;

    if (bullet.life <= 0) {
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
    }
  }

  // Collect drives
  for (let i = drives.length - 1; i >= 0; i--) {
    const drive = drives[i];

    drive.rotation.y += delta * 2;

    if (camera.position.distanceTo(drive.position) < 2) {
      scene.remove(drive);
      drives.splice(i, 1);

      drivesCollected++;
      updateHUD();

      showMessage(`DATA DRIVE COLLECTED: ${drivesCollected} / 3`);
    }
  }

  // Mission complete
  if (
    drivesCollected === 3 &&
    missionComplete === false &&
    camera.position.distanceTo(safehouse.position) < 5
  ) {
    missionComplete = true;

    showMessage('MISSION COMPLETE: ALL DATA RECOVERED', 10000);
  }

  renderer.render(scene, camera);
}

updateHUD();
animate();