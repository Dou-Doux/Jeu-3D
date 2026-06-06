import * as THREE from 'three';
import { Game } from './game.js';

// Bootstrap: scene, camera, renderer, resize handling, animation loop.
const canvas = document.querySelector('#app canvas') || document.createElement('canvas');
if (!canvas.parentElement) {
  document.getElementById('app').appendChild(canvas);
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // cap for Chromebook perf
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 6, 30);

const game = new Game(scene, camera);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05); // clamp to avoid huge steps
  game.update(dt);
  renderer.render(scene, camera);
}
loop();
