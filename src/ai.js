import * as THREE from 'three';
import { Vehicle } from './vehicle.js';

// An AI-controlled pursuer wrapping a Vehicle. Steers toward a target position
// using a simple angle-to-target heuristic.
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

    // desired heading toward target
    const desired = Math.atan2(toTarget.x, toTarget.z);
    let diff = desired - v.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    // steer proportional to angle difference (note: vehicle steers left for +)
    v.steer = Math.max(-1, Math.min(1, diff * 1.4));

    // throttle: full chase, ease off if facing away sharply or very close
    if (Math.abs(diff) > 2.2) {
      v.throttle = 0.3;          // nearly reversed: slow and turn
    } else if (dist < 6) {
      v.throttle = 0.5;
    } else {
      v.throttle = 1;
    }
    v.handbrake = Math.abs(diff) > 1.6 && Math.abs(v.speed) > 14; // drift around sharp turns

    v.update(dt, world);
    v.flashSiren(t);
    return dist;
  }

  dispose() { this.vehicle.dispose(); }
}
