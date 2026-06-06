import * as THREE from 'three';
import { Vehicle } from './vehicle.js';

export class AIVehicle {
  constructor(scene, opts) {
    this.vehicle = new Vehicle(scene, opts);
    this.type = opts.type;
  }

  get position() { return this.vehicle.position; }
  get mesh() { return this.vehicle.mesh; }

  update(dt, targetPos, world, t) {
    const v = this.vehicle;
    const toTarget = new THREE.Vector3().subVectors(targetPos, v.position);
    toTarget.y = 0;
    const dist = toTarget.length();

    const desired = Math.atan2(toTarget.x, toTarget.z);
    let diff = desired - v.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    v.steer = Math.max(-1, Math.min(1, diff * 1.4));

    if (Math.abs(diff) > 2.2) {
      v.throttle = 0.3;
    } else if (dist < 6) {
      v.throttle = 0.5;
    } else {
      v.throttle = 1;
    }
    v.handbrake = Math.abs(diff) > 1.6 && Math.abs(v.speed) > 14;

    v.update(dt, world);
    v.flashSiren(t);
    return dist;
  }

  dispose() { this.vehicle.dispose(); }
}
