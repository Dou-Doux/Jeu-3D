import * as THREE from 'three';

export class Vehicle {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.type = opts.type || 'player';
    this.position = (opts.position || new THREE.Vector3()).clone();
    this.heading = opts.heading || 0;
    this.speed = 0;
    this.steer = 0;
    this.throttle = 0;
    this.handbrake = false;

    this.maxSpeed = this.type === 'player' ? 48 : (this.type === 'military' ? 34 : 42);
    this.accel = this.type === 'player' ? 26 : 22;
    this.brakePower = 40;
    this.turnRate = 2.4;
    this.drag = 1.6;

    this.mesh = this._build();
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;
    scene.add(this.mesh);
  }

  _build() {
    const g = new THREE.Group();
    let bodyColor, roofColor;
    if (this.type === 'gendarme') { bodyColor = 0x1c3fb0; roofColor = 0xf0f0f0; }
    else if (this.type === 'military') { bodyColor = 0x4a5320; roofColor = 0x3a4119; }
    else { bodyColor = 0xc81e2c; roofColor = 0x8a1018; }

    const bodyMat = new THREE.MeshPhongMaterial({ color: bodyColor, shininess: 60 });
    const roofMat = new THREE.MeshPhongMaterial({ color: roofColor, shininess: 40 });
    const glassMat = new THREE.MeshPhongMaterial({ color: 0x223044, shininess: 100 });
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    const isJeep = this.type === 'military';
    const bw = 2.2, bl = isJeep ? 4.4 : 4.6, bh = isJeep ? 1.4 : 1.0;

    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bl), bodyMat);
    body.position.y = 1.0;
    g.add(body);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(bw * 0.92, isJeep ? 0.9 : 0.85, bl * (isJeep ? 0.7 : 0.5)),
      isJeep ? roofMat : glassMat
    );
    roof.position.set(0, isJeep ? 1.9 : 1.75, isJeep ? -0.2 : -0.3);
    g.add(roof);

    if (!isJeep) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.94, 0.6, bl * 0.46), roofMat);
      cap.position.set(0, 2.1, -0.3);
      g.add(cap);
    }

    this.wheels = [];
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 12);
    const offsets = [
      [-bw / 2 - 0.05, 0.55, bl / 2 - 1.0],
      [bw / 2 + 0.05, 0.55, bl / 2 - 1.0],
      [-bw / 2 - 0.05, 0.55, -bl / 2 + 1.0],
      [bw / 2 + 0.05, 0.55, -bl / 2 + 1.0],
    ];
    offsets.forEach((o) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(o[0], o[1], o[2]);
      g.add(w);
      this.wheels.push(w);
    });

    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    [-0.7, 0.7].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.2), lightMat);
      hl.position.set(x, 0.9, bl / 2);
      g.add(hl);
    });

    if (this.type === 'gendarme') {
      this.sirenRed = new THREE.PointLight(0xff2222, 0, 14);
      this.sirenRed.position.set(-0.5, 2.5, -0.3);
      this.sirenBlue = new THREE.PointLight(0x2266ff, 2, 14);
      this.sirenBlue.position.set(0.5, 2.5, -0.3);
      g.add(this.sirenRed, this.sirenBlue);
      const barMat = new THREE.MeshBasicMaterial({ color: 0xff3030 });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.4), barMat);
      bar.position.set(0, 2.35, -0.3);
      g.add(bar);
      this._sirenBar = bar;
    }
    if (this.type === 'military') {
      this.spot = new THREE.PointLight(0xfff2cc, 0.6, 18);
      this.spot.position.set(0, 2.6, 1);
      g.add(this.spot);
    }

    return g;
  }

  driveInput(input) {
    this.throttle = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    this.steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    this.handbrake = !!input.handbrake;
  }

  update(dt, world) {
    if (this.throttle > 0) {
      this.speed += this.accel * this.throttle * dt;
    } else if (this.throttle < 0) {
      this.speed += this.accel * this.throttle * dt;
    } else {
      const sign = Math.sign(this.speed);
      this.speed -= sign * this.drag * dt * Math.max(2, Math.abs(this.speed) * 0.3);
      if (Math.sign(this.speed) !== sign) this.speed = 0;
    }
    if (this.handbrake) {
      const sign = Math.sign(this.speed);
      this.speed -= sign * this.brakePower * dt;
      if (Math.sign(this.speed) !== sign) this.speed = 0;
    }
    this.speed = Math.max(-this.maxSpeed * 0.4, Math.min(this.maxSpeed, this.speed));

    const speedFactor = Math.min(1, Math.abs(this.speed) / 10);
    const turnMul = this.handbrake ? 1.7 : 1.0;
    this.heading += this.steer * this.turnRate * turnMul * speedFactor * dt * Math.sign(this.speed || 1);

    const dir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.position.x += dir.x * this.speed * dt;
    this.position.z += dir.z * this.speed * dt;

    if (world) {
      const before = this.position.clone();
      world.resolveCollision(this.position, 1.6);
      if (!before.equals(this.position)) {
        this.speed *= 0.4;
      }
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;

    const spin = this.speed * dt / 0.55;
    this.wheels.forEach((w) => { w.rotation.x += spin; });
    const fs = this.steer * 0.4;
    if (this.wheels[0]) this.wheels[0].rotation.y = fs;
    if (this.wheels[1]) this.wheels[1].rotation.y = fs;
  }

  flashSiren(t) {
    if (this.type !== 'gendarme') return;
    const on = Math.floor(t * 4) % 2 === 0;
    this.sirenRed.intensity = on ? 2.5 : 0;
    this.sirenBlue.intensity = on ? 0 : 2.5;
    if (this._sirenBar) this._sirenBar.material.color.setHex(on ? 0xff3030 : 0x3060ff);
  }

  get speedKmh() { return Math.abs(this.speed) * 3.6; }

  dispose() {
    this.scene.remove(this.mesh);
  }
}
