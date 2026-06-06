import * as THREE from 'three';

// Third-person on-foot character with WASD movement relative to camera yaw,
// pointer-lock mouse look, sprint, and AABB collision via world.
export class Player {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.radius = 0.7;
    this.speed = 7;
    this.sprintSpeed = 12;
    this.yaw = Math.PI;     // facing direction (around Y)
    this.pitch = -0.15;     // camera vertical
    this.position = world.playerSpawn.clone();
    this.velocity = new THREE.Vector3();
    this.active = false;
    this.mesh = this._build();
    this.scene.add(this.mesh);
    this.mesh.position.copy(this.position);
  }

  _build() {
    const g = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: 0xe0b48c });
    const cloth = new THREE.MeshLambertMaterial({ color: 0x223344 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x1a1f2a });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 0.6), cloth);
    body.position.y = 1.6;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), skin);
    head.position.y = 2.6;
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.3), cloth);
    lArm.position.set(-0.7, 1.7, 0);
    const rArm = lArm.clone(); rArm.position.x = 0.7;
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.3, 0.35), dark);
    lLeg.position.set(-0.28, 0.65, 0);
    const rLeg = lLeg.clone(); rLeg.position.x = 0.28;
    g.add(body, head, lArm, rArm, lLeg, rLeg);
    this._limbs = { lArm, rArm, lLeg, rLeg };
    return g;
  }

  setActive(v) { this.active = v; this.mesh.visible = v; }

  onMouseMove(dx, dy) {
    this.yaw -= dx * 0.0025;
    this.pitch -= dy * 0.0025;
    this.pitch = Math.max(-0.9, Math.min(0.4, this.pitch));
  }

  update(dt, input, camera) {
    if (!this.active) return;
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const move = new THREE.Vector3();
    if (input.forward) move.add(forward);
    if (input.back) move.sub(forward);
    if (input.left) move.sub(right);
    if (input.right) move.add(right);

    const moving = move.lengthSq() > 0.001;
    if (moving) {
      move.normalize();
      const spd = input.sprint ? this.sprintSpeed : this.speed;
      this.position.x += move.x * spd * dt;
      this.position.z += move.z * spd * dt;
      // face movement direction
      const targetRot = Math.atan2(move.x, move.z);
      this.mesh.rotation.y = targetRot;
    }
    this.world.resolveCollision(this.position, this.radius);
    this.position.y = 0;
    this.mesh.position.copy(this.position);

    // walk bob on limbs
    this._t = (this._t || 0) + (moving ? dt * (input.sprint ? 14 : 9) : 0);
    const swing = moving ? Math.sin(this._t) * 0.6 : 0;
    this._limbs.lLeg.rotation.x = swing;
    this._limbs.rLeg.rotation.x = -swing;
    this._limbs.lArm.rotation.x = -swing;
    this._limbs.rArm.rotation.x = swing;

    this._updateCamera(camera);
  }

  _updateCamera(camera) {
    const dist = 7, height = 4;
    const offset = new THREE.Vector3(
      -Math.sin(this.yaw) * dist,
      height - this.pitch * 6,
      -Math.cos(this.yaw) * dist
    );
    const target = this.position.clone().add(new THREE.Vector3(0, 2.2, 0));
    const desired = target.clone().add(offset);
    camera.position.lerp(desired, 0.18);
    camera.lookAt(target);
  }
}
