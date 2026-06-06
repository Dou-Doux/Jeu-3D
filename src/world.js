import * as THREE from 'three';

// Builds the semi-rural environment: ground, roads, house, trees, streetlamps.
// Exposes collision boxes (AABB) and useful spawn points.
export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];      // array of THREE.Box3 for walls/buildings
    this.streetLamps = [];
    this.roadblocks = [];     // meshes added after alarm
    this.house = null;
    this.missionObject = null;
    this.carSpawn = new THREE.Vector3(14, 0, 26);
    this.playerSpawn = new THREE.Vector3(0, 0, 18);
    this.build();
  }

  build() {
    this._lights();
    this._ground();
    this._roads();
    this._house();
    this._scenery();
    this._lamps();
  }

  _lights() {
    const amb = new THREE.AmbientLight(0x4a5878, 0.9);
    this.scene.add(amb);
    const sun = new THREE.DirectionalLight(0xfff0d8, 1.0);
    sun.position.set(60, 120, 40);
    this.scene.add(sun);
    this.scene.fog = new THREE.Fog(0x0e1428, 120, 600);
    this.scene.background = new THREE.Color(0x0e1428);
  }

  _ground() {
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.MeshLambertMaterial({ color: 0x2c3a26 })
    );
    g.rotation.x = -Math.PI / 2;
    g.position.y = -0.01;
    this.scene.add(g);
  }

  _roadStrip(w, l, x, z, rot) {
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(w, l),
      new THREE.MeshLambertMaterial({ color: 0x222428 })
    );
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = rot;
    road.position.set(x, 0.02, z);
    this.scene.add(road);
    // dashed center markings
    const dashMat = new THREE.MeshLambertMaterial({ color: 0xd8d27a });
    const count = Math.floor(l / 14);
    for (let i = 0; i < count; i++) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 5), dashMat);
      d.rotation.x = -Math.PI / 2;
      const along = -l / 2 + i * 14 + 7;
      if (rot === 0) d.position.set(x, 0.03, z + along);
      else d.position.set(x + along, 0.03, z);
      this.scene.add(d);
    }
  }

  _roads() {
    // main vertical road
    this._roadStrip(14, 1400, 0, 0, 0);
    // horizontal crossroads
    this._roadStrip(14, 1400, 0, -120, Math.PI / 2);
    this._roadStrip(14, 1400, 0, 120, Math.PI / 2);
    this._roadStrip(14, 1400, 0, -360, Math.PI / 2);
  }

  _addBoxCollider(mesh) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    this.colliders.push(box);
  }

  _house() {
    const house = new THREE.Group();
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xb7a98c });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x7a3b2e });
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x6b5a44 });

    // Position and add to scene FIRST so updateMatrixWorld gives correct world coords
    house.position.set(0, 0, -22);
    this.scene.add(house);
    this.house = house;

    const W = 22, D = 18, H = 7, t = 0.6;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, D), floorMat);
    floor.position.y = 0.15;
    house.add(floor);

    const mkWall = (sx, sy, sz, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), wallMat);
      m.position.set(x, y, z);
      house.add(m);
      return m;
    };
    this._addBoxCollider(mkWall(W, H, t, 0, H / 2, -D / 2));
    this._addBoxCollider(mkWall(t, H, D, -W / 2, H / 2, 0));
    this._addBoxCollider(mkWall(t, H, D, W / 2, H / 2, 0));
    const seg = (W - 5) / 2;
    this._addBoxCollider(mkWall(seg, H, t, -(5 / 2 + seg / 2), H / 2, D / 2));
    this._addBoxCollider(mkWall(seg, H, t, (5 / 2 + seg / 2), H / 2, D / 2));
    mkWall(5, 2, t, 0, H - 1, D / 2);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 1.5, 0.6, D + 1.5), roofMat);
    roof.position.y = H + 0.3;
    house.add(roof);

    // interior trigger zone (where the door is, in world space)
    this.houseInteriorCenter = new THREE.Vector3(0, 0, -22);

    // mission object: glowing box deep inside
    const moMat = new THREE.MeshPhongMaterial({ color: 0x33ffcc, emissive: 0x18a07c, emissiveIntensity: 1.2 });
    const mo = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), moMat);
    mo.position.set(-5, 1.5, -28);
    this.scene.add(mo);
    const moLight = new THREE.PointLight(0x33ffcc, 2, 14);
    moLight.position.copy(mo.position);
    this.scene.add(moLight);
    this.missionObject = mo;
    this._missionLight = moLight;
    this._missionBase = mo.position.y;
  }

  _scenery() {
    // trees
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a22 });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f6b2a });
    const rng = () => (Math.random() - 0.5);
    for (let i = 0; i < 80; i++) {
      const x = rng() * 600;
      const z = rng() * 700 - 150;
      if (Math.abs(x) < 12) continue; // keep road clear
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 5, 6), trunkMat);
      trunk.position.y = 2.5;
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(3, 7, 7), leafMat);
      leaves.position.y = 7;
      tree.add(trunk, leaves);
      tree.position.set(x, 0, z);
      this.scene.add(tree);
    }
    // a few distant buildings flanking the road
    const bMat = [0x55606e, 0x6a5b52, 0x4f5a66];
    for (let i = 0; i < 24; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -i * 55 - 60;
      const h = 8 + Math.random() * 14;
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(14 + Math.random() * 8, h, 12 + Math.random() * 6),
        new THREE.MeshLambertMaterial({ color: bMat[i % 3] })
      );
      b.position.set(side * (26 + Math.random() * 8), h / 2, z);
      this.scene.add(b);
      this._addBoxCollider(b);
    }
  }

  _lamps() {
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x333740 });
    for (let i = 0; i < 30; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -i * 48 + 40;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 9, 6), poleMat);
      pole.position.set(side * 9, 4.5, z);
      this.scene.add(pole);
      const light = new THREE.PointLight(0xffd9a0, 1.1, 40);
      light.position.set(side * 8, 9, z);
      this.scene.add(light);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe8b8 })
      );
      bulb.position.copy(light.position);
      this.scene.add(bulb);
      this.streetLamps.push(light);
    }
  }

  // Spawn roadblocks across the road after alarm.
  spawnRoadblocks() {
    const positions = [-180, -300, 80];
    positions.forEach((z) => {
      const block = new THREE.Group();
      const barMat = new THREE.MeshLambertMaterial({ color: 0xffaa00 });
      for (let i = -1; i <= 1; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.2, 0.6), barMat);
        bar.position.set(i * 4.6, 1, 0);
        block.add(bar);
        const box = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(i * 4.6, 1, z), new THREE.Vector3(4.5, 2, 1));
        this.colliders.push(box);
      }
      block.position.set(0, 0, z);
      this.scene.add(block);
      this.roadblocks.push(block);
    });
  }

  update(dt, t) {
    // animate mission object glow & float
    if (this.missionObject) {
      this.missionObject.rotation.y += dt * 1.2;
      const y = this._missionBase + Math.sin(t * 2) * 0.25;
      this.missionObject.position.y = y;
      this._missionLight.position.y = y;
    }
  }

  // Simple horizontal AABB collision resolution for a moving point with radius.
  resolveCollision(pos, radius) {
    for (const box of this.colliders) {
      // expand box by radius on X/Z
      const minX = box.min.x - radius, maxX = box.max.x + radius;
      const minZ = box.min.z - radius, maxZ = box.max.z + radius;
      if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
        // push out along the smallest penetration axis
        const dl = pos.x - minX, dr = maxX - pos.x;
        const dn = pos.z - minZ, df = maxZ - pos.z;
        const m = Math.min(dl, dr, dn, df);
        if (m === dl) pos.x = minX;
        else if (m === dr) pos.x = maxX;
        else if (m === dn) pos.z = minZ;
        else pos.z = maxZ;
      }
    }
    return pos;
  }
}
