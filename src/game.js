import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { Vehicle } from './vehicle.js';
import { AIVehicle } from './ai.js';
import { UI } from './ui.js';

export const GameState = {
  MENU: 'MENU',
  ON_FOOT: 'ON_FOOT',
  IN_VEHICLE: 'IN_VEHICLE',
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT',
};

export class Game {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.ui = new UI();
    this.state = GameState.MENU;
    this.baseFov = camera.fov;

    this.input = {
      forward: false, back: false, left: false, right: false,
      sprint: false, handbrake: false, interact: false,
    };

    this.world = null;
    this.player = null;
    this.playerCar = null;
    this.pursuers = [];

    this.hasObject = false;
    this.alarm = false;
    this.alarmTime = 0;
    this.searchLevel = 0;
    this.militarySpawned = false;
    this.escapeProgress = 0;     // seconds held at >150m
    this.closeTime = 0;          // seconds pursuers within 10m
    this.t = 0;

    this.ui.showMenu();
    this.ui.onPlay(() => this.start());
    this.ui.onRetry(() => this.start());

    this._bindInput();
  }

  _bindInput() {
    const map = {
      KeyW: 'forward', ArrowUp: 'forward', KeyZ: 'forward',
      KeyS: 'back', ArrowDown: 'back',
      KeyA: 'left', ArrowLeft: 'left', KeyQ: 'left',
      KeyD: 'right', ArrowRight: 'right',
      ShiftLeft: 'sprint', ShiftRight: 'sprint',
      Space: 'handbrake',
    };
    window.addEventListener('keydown', (e) => {
      if (map[e.code]) { this.input[map[e.code]] = true; }
      if (e.code === 'KeyE') this._tryInteract();
      if (e.code === 'KeyF' && this.player) this.player.fastWalk = !this.player.fastWalk;
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      if (map[e.code]) this.input[map[e.code]] = false;
    });

    // pointer lock + mouse look
    const canvas = document.querySelector('canvas');
    document.addEventListener('click', () => {
      if (this.state === GameState.ON_FOOT || this.state === GameState.IN_VEHICLE) {
        if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
      }
    });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === canvas && this.state === GameState.ON_FOOT && this.player) {
        this.player.onMouseMove(e.movementX, e.movementY);
      }
    });
  }

  start() {
    // clean previous run
    if (this.world) {
      this.scene.clear();
    }
    this.pursuers.forEach((p) => p.dispose());
    this.pursuers = [];

    this.world = new World(this.scene);
    this.player = new Player(this.scene, this.world);
    this.player.setActive(true);

    this.playerCar = new Vehicle(this.scene, {
      type: 'player',
      position: this.world.carSpawn.clone(),
      heading: 0,
    });

    this.hasObject = false;
    this.alarm = false;
    this.alarmTime = 0;
    this.searchLevel = 0;
    this.militarySpawned = false;
    this.escapeProgress = 0;
    this.closeTime = 0;
    this.t = 0;

    this.state = GameState.ON_FOOT;
    this.ui.startGame();
    this.ui.setObjective("Entrez dans la maison et recuperez l'objet (E)");
    this.ui.setSearchLevel(0);
  }

  _tryInteract() {
    if (this.state !== GameState.ON_FOOT) return;
    // pick up mission object
    if (!this.hasObject && this.world.missionObject) {
      const d = this.player.position.distanceTo(this.world.missionObject.position);
      if (d < 6) {
        this._grabObject();
        return;
      }
    }
    // enter car
    if (this.hasObject) {
      const d = this.player.position.distanceTo(this.playerCar.position);
      if (d < 8) this._enterVehicle();
    }
  }

  _grabObject() {
    this.hasObject = true;
    this.scene.remove(this.world.missionObject);
    if (this.world._missionLight) this.scene.remove(this.world._missionLight);
    this.world.missionObject = null;
    this._triggerAlarm();
    this.ui.setObjective('ALARME ! Rejoignez la voiture et fuyez');
  }

  _triggerAlarm() {
    this.alarm = true;
    this.alarmTime = 0;
    this.ui.triggerFlash();
    this.world.spawnRoadblocks();
    // spawn initial gendarmes near the road behind the house
    this._spawnPursuer('gendarme', new THREE.Vector3(-6, 0, 60));
    this._spawnPursuer('gendarme', new THREE.Vector3(6, 0, 90));
  }

  _spawnPursuer(type, pos) {
    const ai = new AIVehicle(this.scene, { type, position: pos, heading: Math.PI });
    this.pursuers.push(ai);
  }

  _enterVehicle() {
    this.player.setActive(false);
    this.state = GameState.IN_VEHICLE;
    // align car heading roughly toward escape (north, -z)
    this.playerCar.heading = Math.PI;
    this.ui.showSpeedo(true);
    this.ui.showEscapeTimer(true);
    this.ui.setObjective('FUYEZ ! Restez a plus de 150m pendant 60s');
    this.ui.setPrompt(null);
  }

  _nearestPursuerDist() {
    let min = Infinity;
    const p = this.state === GameState.IN_VEHICLE ? this.playerCar.position : this.player.position;
    for (const ai of this.pursuers) {
      const d = ai.position.distanceTo(p);
      if (d < min) min = d;
    }
    return min;
  }

  update(dt) {
    this.t += dt;
    this.ui.update(dt);

    if (this.state === GameState.ON_FOOT) {
      this._updateOnFoot(dt);
    } else if (this.state === GameState.IN_VEHICLE) {
      this._updateVehicle(dt);
    }

    if (this.world) this.world.update(dt, this.t);
  }

  _updateOnFoot(dt) {
    this.player.update(dt, this.input, this.camera);

    // interaction prompts
    if (!this.hasObject && this.world.missionObject) {
      const d = this.player.position.distanceTo(this.world.missionObject.position);
      this.ui.setPrompt(d < 6 ? "Appuyez sur <b>E</b> pour recuperer l'objet" : null);
    } else if (this.hasObject) {
      const d = this.player.position.distanceTo(this.playerCar.position);
      this.ui.setPrompt(d < 8 ? '<b>E</b> pour monter dans la voiture' : null);
    }

    if (this.alarm) {
      this.alarmTime += dt;
      this.searchLevel = Math.min(100, this.searchLevel + dt * 3);
      this.ui.setSearchLevel(this.searchLevel);
      // pursuers chase player on foot toward the car too
      this.pursuers.forEach((ai) => ai.update(dt, this.player.position, this.world, this.t));
    }
  }

  _updateVehicle(dt) {
    this.playerCar.driveInput(this.input);
    this.playerCar.update(dt, this.world);
    this.ui.setSpeed(this.playerCar.speedKmh);
    this._updateVehicleCamera(dt);

    this.alarmTime += dt;

    // search level rises with time
    this.searchLevel = Math.min(100, this.searchLevel + dt * 2.5);
    this.ui.setSearchLevel(this.searchLevel);

    // military reinforcements after 30s of alarm
    if (!this.militarySpawned && this.alarmTime > 30) {
      this.militarySpawned = true;
      const base = this.playerCar.position.clone();
      this._spawnPursuer('military', base.clone().add(new THREE.Vector3(8, 0, 50)));
      this._spawnPursuer('military', base.clone().add(new THREE.Vector3(-8, 0, 60)));
      this.ui.triggerFlash();
    }

    // update pursuers
    this.pursuers.forEach((ai) => ai.update(dt, this.playerCar.position, this.world, this.t));

    const dist = this._nearestPursuerDist();
    this.ui.setEscape(this.escapeProgress, dist === Infinity ? 999 : dist);

    // win condition: stay >150m for 60s (cumulative while far)
    if (dist > 150 || this.pursuers.length === 0) {
      this.escapeProgress += dt;
    } else {
      this.escapeProgress = Math.max(0, this.escapeProgress - dt * 0.5);
    }
    if (this.escapeProgress >= 60) { this._win(); return; }

    // lose condition: pursuers within 10m for 5s
    if (dist < 10) {
      this.closeTime += dt;
      if (this.closeTime >= 5) { this._lose('Les forces de l\'ordre vous ont rattrape.'); return; }
    } else {
      this.closeTime = Math.max(0, this.closeTime - dt);
    }
  }

  _updateVehicleCamera(dt) {
    const car = this.playerCar;
    const dir = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
    const back = dir.clone().multiplyScalar(-11);
    const desired = car.position.clone().add(back).add(new THREE.Vector3(0, 6, 0));
    this.camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
    const look = car.position.clone().add(dir.clone().multiplyScalar(6)).add(new THREE.Vector3(0, 1.5, 0));
    this.camera.lookAt(look);

    // FOV shift for speed sensation
    const speedFrac = Math.min(1, car.speedKmh / 170);
    const targetFov = this.baseFov + speedFrac * 22;
    this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.pow(0.01, dt));
    this.camera.updateProjectionMatrix();
  }

  _win() {
    this.state = GameState.VICTORY;
    document.exitPointerLock && document.exitPointerLock();
    this.ui.showVictory();
  }

  _lose(reason) {
    this.state = GameState.DEFEAT;
    document.exitPointerLock && document.exitPointerLock();
    this.ui.showDefeat(reason);
  }
}
