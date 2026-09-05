/*
 * LAST LIGHT // Zombie District
 *
 * This file is an additive gameplay layer for the MIT-licensed Operation
 * Ironhold baseline. The original game remains in index.original.html; this
 * layer changes the theme, turns the AI into melee infected, adds city props,
 * and adds a simple grenade action without replacing the upstream code.
 */
(function () {
  'use strict';

  const mod = (window.__IRONHOLD_ZOMBIE__ = {
    version: '0.1.0',
    grenadeCooldown: 0,
    grenadesThrown: 0,
    zombiesDecorated: 0,
    cityBuilt: false,
    slot: 1,
    previousGun: 2,
    meleeCooldown: 0,
    meleeSwing: 0,
    inspect: false,
    inspectTime: 0,
    inspectBlend: 0,
    wave: 1,
    waveCount: 3,
    waveTransition: false,
    patchErrors: [],
  });

  const grenadeMeshes = [];
  const explosionFx = [];
  const eyeGeo = new THREE.SphereGeometry(0.026, 6, 4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
  const mouthGeo = new THREE.BoxGeometry(0.12, 0.025, 0.018);
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0x121313 });

  function reportError(label, error) {
    mod.patchErrors.push(label + ': ' + (error && error.message ? error.message : String(error)));
    console.warn('[LAST LIGHT]', label, error);
  }

  function replaceText(root, pairs) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    for (const text of nodes) {
      let value = text.nodeValue;
      for (const [from, to] of pairs) value = value.split(from).join(to);
      text.nodeValue = value;
    }
  }

  function patchUi() {
    document.title = 'LAST LIGHT — Zombie District';
    replaceText(document.body, [
      ['IRONHOLD // SECTOR 7', 'LAST LIGHT // ZOMBIE DISTRICT'],
      ['OPERATION IRONHOLD — Warehouse District', 'LAST LIGHT — Zombie District'],
      ['CONTAINER YARD 04', 'DOWNTOWN BLOCK 04'],
      ['GRID 118-042', 'EVAC ROUTE 04'],
      ['10 HOSTILES · 03:00 ON THE CLOCK', 'WAVE 01 · 10 INFECTED · 03:00'],
      ['CLASSIFIED // TASK FORCE IRONHOLD WAREHOUSE', 'OUTBREAK RESPONSE // LAST LIGHT'],
      ['TASK FORCE IRONHOLD WAREHOUSE', 'LAST LIGHT RESPONSE UNIT'],
      ['DISTRICT SECTOR 7 — HOSTILE', 'DOWNTOWN DISTRICT — INFECTED'],
      ['ELIMINATE ALL 10 HOSTILES BEFORE THE CLOCK RUNS OUT', 'CLEAR THE BLOCK BEFORE THE CLOCK RUNS OUT'],
    ]);

    if (!document.getElementById('ourUiStyle')) {
      const style = document.createElement('style');
      style.id = 'ourUiStyle';
      style.textContent = `
        :root{--our-cyan:#74d7d0;--our-orange:#ff9b54;--our-red:#ff5b5b;--our-panel:rgba(9,16,22,.84)}
        body{background:#081016;color:#e9f1f0;font-family:Inter,Segoe UI,Arial,sans-serif}
        #hud{opacity:0;transition:opacity .25s} #hud.on{opacity:1}
        #hud .panel,#mapWrap,#vitals,#ammo,.slot,#top,#feed,#comms{background:var(--our-panel);border:1px solid rgba(116,215,208,.18);box-shadow:0 10px 30px rgba(0,0,0,.22);backdrop-filter:blur(8px)}
        #top{left:50%;top:18px;min-width:240px;padding:9px 18px;transform:translateX(-50%);border-radius:999px;text-align:center}
        #timer{font-size:24px;color:var(--our-cyan);letter-spacing:.12em;text-shadow:none}
        #objective{margin-top:4px;font-size:10px;letter-spacing:.16em;color:#a4b9ba}
        #objective b{color:var(--our-orange)}
        #zombieBadge{top:76px!important;border-color:rgba(255,155,84,.38)!important;background:rgba(16,25,30,.82)!important;color:var(--our-orange)!important;border-radius:999px!important;letter-spacing:.12em!important}
        #mapWrap{left:20px;top:20px;padding:10px;border-radius:12px}
        #mapWrap .lbl{font-size:9px;letter-spacing:.14em;color:#9bb0b1}
        #minimap{width:142px;height:142px}
        #vitals{left:20px;right:auto;bottom:22px;top:auto;width:188px;padding:12px;border-radius:12px}
        #vitals .row{font-size:10px;letter-spacing:.12em} #vitals .bar{height:6px;background:#18272a;border-radius:4px;overflow:hidden} #vitals .bar span{background:var(--our-cyan)}
        #vitals .sub{margin-top:8px} #apFill{background:#89a8ff!important}
        #slots{right:50%;bottom:22px;transform:translateX(50%);display:flex;flex-direction:row;gap:7px;align-items:stretch}
        .slot{min-width:112px;justify-content:center;gap:7px;padding:9px 10px;border:1px solid rgba(116,215,208,.20);border-radius:9px;color:#8aa2a4;background:rgba(9,16,22,.86);font-size:9px;letter-spacing:.10em}
        .slot b{font-size:13px;color:var(--our-orange);opacity:1}.slot.act{color:#fff;border-color:var(--our-cyan);background:rgba(116,215,208,.14);box-shadow:0 0 18px rgba(116,215,208,.12)}
        #ammo{right:20px;bottom:20px;min-width:180px;padding:12px 14px;border-radius:12px}
        #wname{color:var(--our-cyan);letter-spacing:.14em} #wmode{color:#91a5a7;letter-spacing:.14em}
        #magNum{font-size:38px;color:#f4faf8} #resNum{color:#9eb4b6}
        #feed{right:20px;top:120px;padding:7px;border-radius:10px;gap:3px} #comms{left:20px;bottom:205px;padding:8px 10px;border-radius:10px}
        #cross{opacity:.9} #hitmark i{border-color:var(--our-orange)!important}
        .screen{background:linear-gradient(135deg,#071016 0%,#0b1b22 55%,#10151c 100%)!important}
        .screen::after{background:linear-gradient(90deg,transparent,rgba(116,215,208,.035),transparent)!important}
        #startScreen{align-items:center!important;padding:20px!important;cursor:pointer!important}
        #startScreen .col{width:min(720px,92vw)!important;padding:32px 38px;border:1px solid rgba(116,215,208,.24);border-radius:18px;background:rgba(7,16,22,.86);box-shadow:0 24px 70px rgba(0,0,0,.4)}
        #startScreen .title{font-size:clamp(40px,7vw,78px);letter-spacing:.02em;background:linear-gradient(180deg,#f4ffff,#73d7d0)!important;-webkit-background-clip:text!important;background-clip:text!important;text-shadow:none}
        #startScreen .eyebrow{color:var(--our-orange);letter-spacing:.28em}.keys{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 20px}.key{grid-template-columns:94px 1fr;color:#9cb1b1}.key kbd{border-color:rgba(116,215,208,.25);background:rgba(116,215,208,.07);border-radius:5px;color:#dff7f3}.cta{border-color:rgba(116,215,208,.55);background:rgba(116,215,208,.10);border-radius:8px;letter-spacing:.22em}.hint{color:#789294}
        .slug{color:#638184}.slug.tl{color:var(--our-cyan)}
        #endScreen{background:linear-gradient(135deg,#071016,#15151a)!important}.screen .rule{background:linear-gradient(90deg,var(--our-cyan),transparent)!important}
        #endScreen .title{background:linear-gradient(180deg,#fff,#ff9b54)!important;-webkit-background-clip:text!important;background-clip:text!important}
        #stats{border-color:rgba(116,215,208,.2);border-radius:12px;overflow:hidden}.stat{background:rgba(7,16,22,.88)}.stat .v{color:#f1f9f7}.stat .k{color:#779294}button.btn{border-color:rgba(116,215,208,.55);background:rgba(116,215,208,.10);border-radius:8px}
        @media(max-width:760px){#slots{right:10px;left:10px;transform:none}.slot{min-width:0;flex:1;padding:8px 4px}.slot span{font-size:8px}.keys{grid-template-columns:1fr}.col{padding:24px!important}#vitals{bottom:92px}#ammo{bottom:92px}}
      `;
      document.head.appendChild(style);
    }

    const slotNames = ['P-9 PISTOL', 'M4 RIFLE', 'COMBAT KNIFE', 'FRAG GRENADE'];
    document.querySelectorAll('#slots .slot').forEach((slot, index) => {
      const label = slot.querySelector('span');
      if (label && slotNames[index]) label.textContent = slotNames[index];
      slot.dataset.slot = String(index + 1);
    });
    const mapMode = document.getElementById('mapMode');
    if (mapMode) mapMode.textContent = 'DOWNTOWN';
    const objective = document.getElementById('objective');
    if (objective) objective.innerHTML = '<b id="killCount">0</b> / 30 INFECTED';
    const endSub = document.getElementById('endSub');
    if (endSub) endSub.textContent = 'DOWNTOWN BLOCK — LAST LIGHT';
    const startKeys = document.querySelector('.keys');
    if (startKeys) {
      const rows = [...startKeys.querySelectorAll('.key')];
      const weaponRow = rows.find((row) => row.textContent.includes('1–4'));
      if (weaponRow) weaponRow.innerHTML = '<kbd>1–4</kbd> <span>PISTOL · RIFLE · KNIFE · GRENADE</span>';
      const fireRow = rows.find((row) => row.textContent.includes('FIRE'));
      if (fireRow) fireRow.innerHTML = '<kbd>LMB</kbd> <span>FIRE · KNIFE SWING · THROW</span>';
      if (!rows.some((row) => row.textContent.includes('INSPECT'))) {
         startKeys.insertAdjacentHTML('beforeend', '<div class="key"><kbd>F</kbd> <span>INSPECT ACTIVE WEAPON</span></div>');
      }
    }

    const hud = document.getElementById('hud');
    if (hud && !document.getElementById('zombieBadge')) {
      const badge = document.createElement('div');
      badge.id = 'zombieBadge';
      badge.textContent = 'LAST LIGHT // WAVE 01';
      hud.appendChild(badge);
    }
  }

  function addCityProps() {
    if (mod.cityBuilt || typeof box !== 'function' || typeof scene === 'undefined') return;
    try {
      const facade = [
        [6.5, 7.0, 8.0, -24, 0, -18, 0x59616a, '#5b6571'],
        [8.0, 9.0, 6.0, 23, 0, -16, 0x675953, '#6b5e57'],
        [5.5, 6.0, 9.0, -23, 0, 2, 0x56655b, '#56685b'],
        [7.0, 8.0, 5.0, 22, 0, 5, 0x70625b, '#75665e'],
        [5.0, 5.0, 5.0, -21, 0, 18, 0x4d5960, '#4d5960'],
        [5.0, 6.5, 5.5, 20, 0, 19, 0x65574d, '#67594f'],
      ];
      for (const [w, h, d, x, y, z, color, map] of facade) {
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.91, metalness: 0.03 });
        box(w, h, d, x, y, z, mat, { map, uvScale: [0.28, 0.28] });
        // Window strips make the mass read as a city block instead of a box wall.
        const windowMat = new THREE.MeshStandardMaterial({ color: 0x17232c, roughness: 0.44, metalness: 0.12, emissive: 0x071019, emissiveIntensity: 0.7 });
        for (let row = 0; row < Math.max(2, Math.floor(h / 2.3)); row++) {
          const pane = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.62, 3.4), 0.52, 0.035), windowMat);
          pane.position.set(x, y + 1.2 + row * 1.55, z - d * 0.505);
          pane.castShadow = false;
          scene.add(pane);
        }
      }

      const poleMat = new THREE.MeshStandardMaterial({ color: 0x293036, roughness: 0.82, metalness: 0.35 });
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xffb45e });
      for (const [x, z] of [[-16, -19], [16, -19], [-17, 13], [17, 13]]) {
        const pole = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 3.5, 8), poleMat);
        stem.position.y = 1.75;
        pole.add(stem);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.06), poleMat);
        arm.position.set(0.32, 3.35, 0);
        pole.add(arm);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), lampMat);
        lamp.position.set(0.65, 3.27, 0);
        pole.add(lamp);
        const light = new THREE.PointLight(0xff9b55, 0.45, 8, 2);
        light.position.copy(lamp.position);
        pole.add(light);
        pole.position.set(x, 0, z);
        scene.add(pole);
      }
      mod.cityBuilt = true;
    } catch (error) {
      reportError('city props', error);
    }
  }

  // Replace the warehouse scene with a small authored block.  The gameplay
  // code (movement, raycasts, AI and weapons) stays intact, but no upstream
  // environment mesh, texture, fog card or shadow caster remains in the frame.
  function buildOurLiteScene() {
    if (mod.liteSceneBuilt || typeof scene === 'undefined') return;
    try {
      const keep = new Set(typeof enemies !== 'undefined' ? enemies.map((enemy) => enemy.obj) : []);
      const keepMeshes = (list) => { if (!list) return; list.forEach((item) => { if (item && item.mesh) keep.add(item.mesh); }); };
      keepMeshes(typeof TRACERS !== 'undefined' ? TRACERS : null);
      keepMeshes(typeof SHELLS !== 'undefined' ? SHELLS : null);
      keepMeshes(typeof DECALS !== 'undefined' ? DECALS : null);
      if (typeof PS_SPARK !== 'undefined' && PS_SPARK.pts) keep.add(PS_SPARK.pts);
      if (typeof PS_SOFT !== 'undefined' && PS_SOFT.pts) keep.add(PS_SOFT.pts);
      [
        typeof muzzleLight !== 'undefined' ? muzzleLight : null,
        typeof muzzleSprite !== 'undefined' ? muzzleSprite : null,
        typeof muzzleGlow !== 'undefined' ? muzzleGlow : null
      ].forEach((item) => { if (item) keep.add(item); });
      for (const child of [...scene.children]) if (!keep.has(child)) scene.remove(child);

      colliders.length = 0;
      worldSolid.length = 0;
      groundMesh.length = 0;
      ceilMesh.length = 0;
      mapRects.length = 0;
      if (typeof extraShadows !== 'undefined') extraShadows.length = 0;

      scene.background = new THREE.Color(0x0b151b);
      scene.fog = new THREE.Fog(0x0b151b, 24, 74);
      renderer.shadowMap.enabled = false;
      renderer.setPixelRatio(1);
      renderScale = 0.72;
      allocTargets();

      const groundMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.98, metalness: 0.02 });
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x151e23, roughness: 0.98, metalness: 0.01 });
      const curbMat = new THREE.MeshStandardMaterial({ color: 0x4b5b5c, roughness: 0.92, metalness: 0.02 });
      const buildingMats = [0x34434a, 0x4a3f43, 0x3b4b43, 0x4a4941, 0x34404f];
      const windowMat = new THREE.MeshStandardMaterial({ color: 0x87c8c3, emissive: 0x17423f, emissiveIntensity: 0.45, roughness: 0.32, metalness: 0.08 });
      const trimMat = new THREE.MeshStandardMaterial({ color: 0xa47755, roughness: 0.76, metalness: 0.05 });

      const addMesh = (geometry, material, x, y, z, solid) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = false; mesh.receiveShadow = false;
        scene.add(mesh);
        if (solid) worldSolid.push(mesh);
        return mesh;
      };
      const addBox = (w, h, d, x, z, material, solid = true, color = '#2f4147') => {
        const mesh = addMesh(new THREE.BoxGeometry(w, h, d), material, x, h * 0.5, z, solid);
        if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: h, minZ: z - d / 2, maxZ: z + d / 2 });
        if (w > 1 && d > 1) mapRects.push({ x, z, w, d, c: color });
        return mesh;
      };
      const addPlane = (w, d, y, material) => {
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
        plane.rotation.x = -Math.PI / 2; plane.position.y = y; plane.receiveShadow = false;
        scene.add(plane); return plane;
      };

      const floor = addPlane(86, 86, 0, groundMat);
      worldSolid.push(floor); groundMesh.push(floor);
      addPlane(7.4, 86, 0.006, roadMat);
      addPlane(86, 7.4, 0.007, roadMat);
      addBox(1.0, 0.12, 86, -4.2, 0, curbMat, false);
      addBox(1.0, 0.12, 86, 4.2, 0, curbMat, false);
      addBox(86, 0.12, 1.0, 0, -4.2, curbMat, false);
      addBox(86, 0.12, 1.0, 0, 4.2, curbMat, false);

      const buildings = [
        [-18, -17, 12, 10, 6.2, buildingMats[0], '#34434a'], [18, -17, 12, 10, 7.4, buildingMats[1], '#4a3f43'],
        [-18, 17, 12, 10, 7.0, buildingMats[2], '#3b4b43'], [18, 17, 12, 10, 6.4, buildingMats[3], '#4a4941'],
        [-31, 0, 6, 16, 5.0, buildingMats[4], '#34404f'], [31, 0, 6, 16, 5.7, buildingMats[0], '#34434a']
      ];
      buildings.forEach(([x, z, w, d, h, color, mapColor], bi) => {
        addBox(w, h, d, x, z, new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.02 }), true, mapColor);
        const rows = Math.max(2, Math.floor(h / 2));
        for (let row = 0; row < rows; row++) {
          const y = 1.35 + row * 1.62;
          const paneW = Math.max(0.8, Math.min(2.15, (w - 1.1) / 3.2));
          for (let col = -1; col <= 1; col++) {
            const pane = new THREE.Mesh(new THREE.BoxGeometry(paneW, 0.48, 0.035), windowMat);
            pane.position.set(x + col * (paneW + 0.45), y, z - d * 0.505);
            scene.add(pane);
          }
        }
        const sign = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.55, 4.5), 0.12, 0.05), trimMat);
        sign.position.set(x, Math.min(h - 0.55, 4.9), z - d * 0.512); scene.add(sign);
      });

      // A few cheap cover pieces make the block playable without a prop pack.
      [[-8, -10, 2.2, 1.1, 1.0], [10, -8, 2.8, 1.2, 1.0], [-9, 10, 1.8, 1.0, 1.2], [9, 11, 2.4, 1.3, 0.9]].forEach(([x, z, w, h, d]) => {
        addBox(w, h, d, x, z, trimMat, true, '#8c6546');
      });

      const poleMat = new THREE.MeshStandardMaterial({ color: 0x2f3d42, roughness: 0.84, metalness: 0.34 });
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xffb276 });
      [[-5.8, -5.8], [5.8, -5.8], [-5.8, 5.8], [5.8, 5.8]].forEach(([x, z]) => {
        addMesh(new THREE.CylinderGeometry(0.045, 0.07, 3.4, 6), poleMat, x, 1.7, z, false);
        addMesh(new THREE.BoxGeometry(0.65, 0.06, 0.06), poleMat, x + 0.28, 3.28, z, false);
        addMesh(new THREE.SphereGeometry(0.105, 6, 4), lampMat, x + 0.58, 3.22, z, false);
      });

      scene.add(new THREE.HemisphereLight(0x9ccbd1, 0x172027, 1.35));
      const key = new THREE.DirectionalLight(0xffd3a0, 1.4); key.position.set(-18, 28, 12); key.castShadow = false; scene.add(key);
      const fill = new THREE.DirectionalLight(0x8bb4d7, 0.38); fill.position.set(16, 10, -20); scene.add(fill);
      mod.cityBuilt = true;
      mod.liteSceneBuilt = true;
    } catch (error) {
      reportError('lite scene', error);
    }
  }

  function decorateEnemy(enemy, index) {
    if (!enemy || enemy.zombieDecorated) return;
    try {
      enemy.zombieDecorated = true;
      enemy.upper = false;
      enemy.obj.position.y = 0;
      enemy.name = 'INFECTED-' + String(index + 1).padStart(2, '0');
      enemy.zombieAttackT = 0.35 + index * 0.04;
      enemy.zombiePhase = index * 0.7;
      if (enemy.p && enemy.p.gun) enemy.p.gun.visible = false;

      enemy.p.model.traverse((mesh) => {
        if (!mesh.isMesh || !mesh.material || mesh.material.visible === false) return;
        const material = mesh.material.clone();
        material.color.setHex(index % 3 === 0 ? 0x4d6b50 : (index % 3 === 1 ? 0x536a5e : 0x3f5a4b));
        material.roughness = 0.94;
        material.metalness = 0.02;
        mesh.material = material;
      });
      enemy.p.head.traverse((mesh) => {
        if (!mesh.isMesh || !mesh.material || mesh.material.visible === false) return;
        const material = mesh.material.clone();
        material.color.setHex(0x6f8a67);
        material.roughness = 0.97;
        material.metalness = 0;
        mesh.material = material;
      });

      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.052, 0.015, -0.126);
      rightEye.position.set(0.052, 0.015, -0.126);
      enemy.p.head.add(leftEye, rightEye);
      const mouth = new THREE.Mesh(mouthGeo, mouthMat);
      mouth.position.set(0, -0.065, -0.132);
      enemy.p.head.add(mouth);
      if (enemy.tag && enemy.tag.draw) enemy.tag.draw(enemy.hp, false);
      mod.zombiesDecorated += 1;
    } catch (error) {
      reportError('zombie decoration', error);
    }
  }

  function decorateAllEnemies() {
    if (typeof enemies === 'undefined') return;
    enemies.forEach(decorateEnemy);
  }

  const baseUpdateEnemy = typeof updateEnemy === 'function' ? updateEnemy : null;
  function updateZombieEnemy(enemy, dt) {
    if (!enemy || enemy.dead) {
      if (enemy && enemy.dead && baseUpdateEnemy) baseUpdateEnemy(enemy, dt);
      return;
    }
    if (typeof G === 'undefined' || !G.running || G.over || (typeof player !== 'undefined' && player.dead)) return;
    if (!enemy.zombieDecorated) decorateEnemy(enemy, enemy.idx || 0);

    const dx = player.pos.x - enemy.obj.position.x;
    const dz = player.pos.z - enemy.obj.position.z;
    const distance = Math.hypot(dx, dz);
    const safeDistance = Math.max(distance, 0.001);
    enemy.zombieAttackT = Math.max(0, (enemy.zombieAttackT || 0) - dt);
    enemy.zombiePhase = (enemy.zombiePhase || 0) + dt * (distance > 1.6 ? 8 : 3);
    const facing = Math.atan2(dx, dz) + Math.PI;
    enemy.obj.rotation.y = facing;
    enemy.p.model.rotation.z = Math.sin(enemy.zombiePhase) * (distance > 1.6 ? 0.055 : 0.025);
    enemy.p.model.position.y = Math.abs(Math.sin(enemy.zombiePhase * 0.5)) * 0.018;
    enemy.p.legs.forEach((leg, legIndex) => {
      leg.hip.rotation.x = Math.sin(enemy.zombiePhase + legIndex * Math.PI) * 0.38;
      leg.knee.rotation.x = Math.max(0, Math.sin(enemy.zombiePhase + legIndex * Math.PI + 0.6)) * 0.34;
    });
    enemy.p.arms.forEach((arm, armIndex) => {
      arm.sh.rotation.x = -0.55 + Math.sin(enemy.zombiePhase * 0.7 + armIndex) * 0.26;
      arm.sh.rotation.z = (armIndex ? 1 : -1) * (0.22 + Math.sin(enemy.zombiePhase * 0.8 + armIndex) * 0.12);
    });

    if (distance > 1.45 && typeof moveSlide === 'function') {
      const speed = distance > 8 ? 2.65 : (distance > 3.5 ? 2.2 : 1.25);
      moveSlide(enemy.obj.position, (dx / safeDistance) * speed * dt, (dz / safeDistance) * speed * dt, 0.32, 1.72);
    } else if (distance <= 1.55 && enemy.zombieAttackT <= 0 && !mod.testMode && typeof damagePlayer === 'function') {
      damagePlayer(8 + (enemy.idx % 3) * 1.5, enemy.obj.position);
      enemy.zombieAttackT = 0.92;
      if (typeof G !== 'undefined') G.killFlash = Math.max(G.killFlash, 0.08);
    }
    if (enemy.tag && enemy.tag.draw) enemy.tag.draw(enemy.hp, distance < 16);
  }

  const grenadeGeo = new THREE.SphereGeometry(0.13, 8, 6);
  const grenadeMat = new THREE.MeshStandardMaterial({ color: 0x59634d, roughness: 0.78, metalness: 0.22 });
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffb34f, transparent: true, opacity: 0.82, depthWrite: false });

  let knifeVM = null;
  let grenadeVM = null;
  function buildUtilityViewmodels() {
    if (knifeVM || typeof vmRecoil === 'undefined') return;
    const steel = new THREE.MeshStandardMaterial({ color: 0xb7c2c8, roughness: 0.34, metalness: 0.76 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x202a2e, roughness: 0.78, metalness: 0.14 });
    const glove = new THREE.MeshStandardMaterial({ color: 0x27372d, roughness: 0.94, metalness: 0.02 });

    knifeVM = new THREE.Group();
    // Authored low-poly combat knife.  The blade uses a real silhouette rather
    // than stacked cones, so the spine, point and fuller remain readable at
    // the small first-person scale.
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.072, 0.02);
    bladeShape.lineTo(0.064, 0.02);
    bladeShape.lineTo(0.070, 0.16);
    bladeShape.lineTo(0.048, 0.37);
    bladeShape.lineTo(0.008, 0.62);
    bladeShape.lineTo(-0.042, 0.43);
    bladeShape.lineTo(-0.070, 0.18);
    bladeShape.closePath();
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.075, bevelEnabled: true, bevelSegments: 1,
      bevelSize: 0.012, bevelThickness: 0.010, curveSegments: 1,
    });
    bladeGeo.translate(0, 0, -0.0375);
    const blade = new THREE.Mesh(bladeGeo, steel);
    blade.position.set(0, 0.00, -0.19);
    blade.rotation.y = -0.08;
    knifeVM.add(blade);
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.36, 0.012), dark);
    fuller.position.set(-0.005, 0.24, -0.235);
    fuller.rotation.z = -0.025;
    knifeVM.add(fuller);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.44, 0.010), new THREE.MeshStandardMaterial({ color: 0xe7eef0, roughness: 0.22, metalness: 0.84 }));
    edge.position.set(0.049, 0.27, -0.236);
    edge.rotation.z = -0.11;
    knifeVM.add(edge);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.048, 0.072), dark);
    guard.position.set(0, -0.005, 0.025);
    guard.rotation.z = -0.04;
    knifeVM.add(guard);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.31, 6), dark);
    handle.position.set(0, -0.005, 0.20);
    handle.rotation.x = Math.PI / 2;
    knifeVM.add(handle);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.009, 5, 8), steel);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, -0.005, 0.10 + i * 0.10);
      knifeVM.add(ring);
    }
    const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.084, 0.052, 6), steel);
    pommel.position.set(0, -0.005, 0.365);
    pommel.rotation.x = Math.PI / 2;
    knifeVM.add(pommel);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.13, 0.20), glove);
    hand.position.set(0.03, -0.08, 0.30);
    hand.rotation.z = -0.08;
    knifeVM.add(hand);
    knifeVM.position.set(0.30, -0.17, -0.78);
    knifeVM.rotation.set(-0.28, 0.18, -0.30);
    // Keep the silhouette prominent without covering the reticle during play.
    knifeVM.scale.setScalar(0.82);
    knifeVM.visible = false;
    vmRecoil.add(knifeVM);

    grenadeVM = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 8), new THREE.MeshStandardMaterial({ color: 0x657153, roughness: 0.86, metalness: 0.18 }));
    grenadeVM.add(body);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.138, 0.014, 6, 12), dark);
    band.rotation.x = Math.PI / 2;
    grenadeVM.add(band);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.018, 0.025), steel);
    lever.position.set(0.03, 0.12, 0);
    grenadeVM.add(lever);
    const pin = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.008, 5, 8), steel);
    pin.position.set(0.095, 0.14, 0.01);
    pin.rotation.x = Math.PI / 2;
    grenadeVM.add(pin);
    grenadeVM.position.set(0.27, -0.16, -0.72);
    grenadeVM.rotation.set(-0.25, 0.14, -0.18);
    grenadeVM.visible = false;
    vmRecoil.add(grenadeVM);
  }

  function hideAllViewmodels() {
    if (typeof WEAPONS !== 'undefined') WEAPONS.forEach((weapon) => { if (weapon.vm) weapon.vm.group.visible = false; });
    if (knifeVM) knifeVM.visible = false;
    if (grenadeVM) grenadeVM.visible = false;
  }

  function showGunSlot(slot) {
    buildUtilityViewmodels();
    hideAllViewmodels();
    const weaponIndex = slot === 1 ? 2 : 0;
    mod.slot = slot;
    mod.previousGun = weaponIndex;
    if (typeof player !== 'undefined') player.weapon = weaponIndex;
    if (typeof WEAPONS !== 'undefined' && WEAPONS[weaponIndex] && WEAPONS[weaponIndex].vm) WEAPONS[weaponIndex].vm.group.visible = true;
    if (typeof updateAmmoUI === 'function') updateAmmoUI();
  }

  function selectGunSlot(slot) {
    if (typeof G === 'undefined' || !G.running || typeof player === 'undefined') return;
    buildUtilityViewmodels();
    if (slot === 1 || slot === 2) {
      mod.inspect = false;
      mod.inspectTime = 0;
      const target = slot === 1 ? 2 : 0;
      mod.slot = slot;
      mod.previousGun = target;
      if (player.weapon === target && player.switchTo < 0) {
        showGunSlot(slot);
      } else {
        hideAllViewmodels();
        if (typeof switchWeapon === 'function') switchWeapon(target);
      }
      return;
    }
    hideAllViewmodels();
    mod.slot = slot;
    mod.inspect = false;
    mod.inspectTime = 0;
    mod.inspectBlend = 0;
    if (slot === 3 && knifeVM) knifeVM.visible = true;
    if (slot === 4 && grenadeVM) grenadeVM.visible = true;
    if (typeof setADS === 'function') setADS(false);
    player.triggerHeld = false;
    player.triggerReleased = true;
    if (typeof UI !== 'undefined') {
      UI.wname.textContent = slot === 3 ? 'TACTICAL KNIFE' : 'FRAG GRENADE';
      UI.wmode.textContent = slot === 3 ? 'MELEE' : 'THROWABLE';
      UI.magNum.textContent = slot === 3 ? '—' : (mod.grenadeCooldown > 0 ? '0' : '1');
      UI.resNum.textContent = '';
      UI.reloadHint.textContent = slot === 3 ? 'F  INSPECT' : '';
    }
  }

  function updateUtilityView(dt) {
    mod.meleeCooldown = Math.max(0, mod.meleeCooldown - dt);
    mod.meleeSwing = Math.max(0, mod.meleeSwing - dt);
    if (mod.inspect) mod.inspectTime += dt;
    mod.inspectBlend = damp(mod.inspectBlend, mod.inspect ? 1 : 0, 10, dt);
    if (knifeVM && knifeVM.visible) {
      const k = clamp(1 - mod.meleeSwing / 0.42, 0, 1);
      const arc = Math.sin(k * Math.PI);
      const inspectIn = mod.inspectBlend;
      const inspectSway = mod.inspect ? Math.sin(mod.inspectTime * 2.4) * 0.08 : 0;
      knifeVM.rotation.z = -0.38 - arc * 1.22 + inspectIn * (0.62 + inspectSway);
      knifeVM.rotation.x = -0.22 + arc * 0.58 - inspectIn * 0.32;
      knifeVM.rotation.y = 0.23 + inspectIn * Math.sin(mod.inspectTime * 2.1) * 0.76;
      knifeVM.position.x = 0.30 - arc * 0.12 - inspectIn * 0.12;
      knifeVM.position.y = -0.17 + arc * 0.05 + inspectIn * 0.10;
      knifeVM.position.z = -0.78 + inspectIn * 0.16;
    }
    // CS-style inspect for the authored firearms: raise the active viewmodel,
    // cant it toward the centre, then continuously give it a small showroom
    // yaw.  Additive offsets are applied after the base animation each frame,
    // so recoil, bob, reload and ADS continue to work normally.
    if ((mod.slot === 1 || mod.slot === 2) && typeof vmSway !== 'undefined') {
      const b = mod.inspectBlend;
      const t = mod.inspectTime;
      const w = typeof WEAPONS !== 'undefined' ? WEAPONS[player.weapon] : null;
      if (w && w.vm && w.vm.group) {
        w.vm.group.rotation.x += b * (-0.16 + Math.sin(t * 1.7) * 0.035);
        w.vm.group.rotation.y += b * (0.34 + Math.sin(t * 1.15) * 0.14);
        w.vm.group.rotation.z += b * (-0.20 + Math.sin(t * 1.45) * 0.05);
      }
      vmSway.position.x += b * 0.075;
      vmSway.position.y += b * 0.12;
      vmSway.position.z += b * 0.08;
    }
    if (grenadeVM && grenadeVM.visible) {
      const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.025;
      grenadeVM.scale.setScalar(pulse);
    }
    document.querySelectorAll('#slots .slot').forEach((slot, index) => {
      slot.classList.toggle('act', index === mod.slot - 1);
    });
  }

  function updateWaveUi() {
    const cooldown = mod.grenadeCooldown > 0 ? 1 : 0;
    const kills = typeof G !== 'undefined' ? G.kills : 0;
    const key = `${mod.wave}|${cooldown}|${kills}|${mod.slot}`;
    if (mod._waveUiKey === key) return;
    mod._waveUiKey = key;
    const badge = document.getElementById('zombieBadge');
    if (badge) badge.textContent = cooldown
      ? `LAST LIGHT // WAVE ${String(mod.wave).padStart(2, '0')} // GRENADE COOLDOWN`
      : `LAST LIGHT // WAVE ${String(mod.wave).padStart(2, '0')}`;
    const objective = document.getElementById('objective');
    if (objective) objective.innerHTML = `<b id="killCount">${kills}</b> / 30 INFECTED`;
    document.querySelectorAll('#slots .slot').forEach((slot, index) => {
      slot.classList.toggle('act', index === mod.slot - 1);
    });
  }

  function nextWave() {
    if (mod.waveTransition || typeof enemies === 'undefined' || typeof spawnEnemies !== 'function') return;
    mod.waveTransition = true;
    mod.wave += 1;
    for (const enemy of enemies) {
      if (enemy.obj && typeof scene !== 'undefined') scene.remove(enemy.obj);
      if (enemy.tag && enemy.tag.tex && enemy.tag.tex.dispose) enemy.tag.tex.dispose();
    }
    enemies.length = 0;
    if (typeof enemyHitMeshes !== 'undefined') enemyHitMeshes.length = 0;
    spawnEnemies();
    setTimeout(() => {
      decorateAllEnemies();
      mod.waveTransition = false;
      if (typeof G !== 'undefined') {
        G.grace = 2.2;
        G.time = Math.min(180, G.time + 35);
      }
      updateWaveUi();
      if (typeof pushComms === 'function') pushComms('LAST LIGHT', `WAVE ${String(mod.wave).padStart(2, '0')} — INFECTED INBOUND`);
    }, 0);
  }

  function meleeAttack() {
    if (typeof G === 'undefined' || !G.running || mod.meleeCooldown > 0 || typeof camera === 'undefined') return false;
    if (mod.inspect) return true;
    mod.meleeCooldown = 0.42;
    mod.meleeSwing = 0.42;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    shootRay.set(camera.position, dir);
    shootRay.far = 2.35;
    for (const enemy of (typeof enemies !== 'undefined' ? enemies : [])) if (!enemy.dead) enemy.obj.updateMatrixWorld(true);
    const hits = shootRay.intersectObjects(typeof enemyHitMeshes !== 'undefined' ? enemyHitMeshes : [], false);
    const hit = hits.find((entry) => entry.object && entry.object.userData && entry.object.userData.enemy && !entry.object.userData.enemy.dead);
    if (!hit) return true;
    const data = hit.object.userData;
    const enemy = data.enemy;
    const head = data.part === 'head';
    const killed = damageEnemy(enemy, head ? 120 : 72, head, dir, hit.point);
    G.hits++;
    SFX.hitBeep(head);
    showHitmark(killed);
    return true;
  }

  function toggleInspect() {
    if (typeof G === 'undefined' || !G.running) return;
    if (mod.slot === 3 && !knifeVM) return;
    if (typeof player !== 'undefined' && player.switching > 0) return;
    if (mod.slot === 4) return;
    if (mod.meleeSwing > 0) return;
    mod.inspect = !mod.inspect;
    mod.inspectTime = 0;
    player.triggerHeld = false;
    player.triggerReleased = true;
  }

  function throwGrenade() {
    if (typeof G === 'undefined' || !G.running || mod.grenadeCooldown > 0 || typeof camera === 'undefined') return;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const mesh = new THREE.Mesh(grenadeGeo, grenadeMat);
    mesh.position.copy(camera.position).addScaledVector(dir, 0.75);
    scene.add(mesh);
    grenadeMeshes.push({ mesh, velocity: dir.multiplyScalar(14).add(new THREE.Vector3(0, 4.8, 0)), life: 0 });
    mod.grenadeCooldown = 1.25;
    mod.grenadesThrown += 1;
  }

  function explodeGrenade(grenade) {
    const point = grenade.mesh.position.clone();
    scene.remove(grenade.mesh);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), flashMat.clone());
    flash.position.copy(point);
    scene.add(flash);
    explosionFx.push({ mesh: flash, life: 0.35 });
    if (typeof enemies !== 'undefined' && typeof damageEnemy === 'function') {
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        const distance = enemy.obj.position.distanceTo(point);
        if (distance > 4.8) continue;
        const damage = Math.max(20, 120 * (1 - distance / 5.3));
        const direction = enemy.obj.position.clone().sub(point).normalize();
        damageEnemy(enemy, damage, false, direction, point);
      }
    }
  }

  function updateGrenades(dt) {
    mod.grenadeCooldown = Math.max(0, mod.grenadeCooldown - dt);
    for (let i = grenadeMeshes.length - 1; i >= 0; i -= 1) {
      const grenade = grenadeMeshes[i];
      grenade.life += dt;
      grenade.velocity.y -= 13 * dt;
      grenade.mesh.position.addScaledVector(grenade.velocity, dt);
      grenade.mesh.rotation.x += dt * 9;
      grenade.mesh.rotation.z += dt * 7;
      if (grenade.mesh.position.y <= 0.16 || grenade.life >= 1.65) {
        explodeGrenade(grenade);
        grenadeMeshes.splice(i, 1);
      }
    }
    for (let i = explosionFx.length - 1; i >= 0; i -= 1) {
      const fx = explosionFx[i];
      fx.life -= dt;
      const k = Math.max(0, fx.life / 0.35);
      fx.mesh.scale.setScalar(1 + (1 - k) * 7);
      fx.mesh.material.opacity = k;
      if (fx.life <= 0) {
        scene.remove(fx.mesh);
        explosionFx.splice(i, 1);
      }
    }
    updateWaveUi();
  }

  function installPatches() {
    try {
      patchUi();
      buildOurLiteScene();
      decorateAllEnemies();
      buildUtilityViewmodels();

      // A query-string test mode keeps automated browser QA deterministic and
      // avoids requiring Pointer Lock support from the test browser.
      if (new URLSearchParams(location.search).has('test') && !mod.testMode && typeof requestLock === 'function') {
        mod.testMode = true;
        setTimeout(function () {
          if (typeof G !== 'undefined' && !G.started && typeof startGame === 'function') {
            startGame();
            // Keep the deterministic QA view alive long enough to inspect
            // movement, weapons and the custom street without AI pressure.
            G.grace = 60;
          }
        }, 120);
      }

      // The QA URL auto-starts the round, so there is no start-screen click
      // available to satisfy Pointer Lock's user-gesture requirement.  Let the
      // first click on the game canvas capture the mouse just like the normal
      // start flow; without this, mousemove events are correctly ignored by the
      // browser because pointerLockElement remains null.
      if (!mod.pointerCaptureWrapped) {
        let lastX = null;
        let lastY = null;
        addEventListener('click', (event) => {
          if (typeof G === 'undefined' || !G.started || G.over) return;
          lastX = event.clientX;
          lastY = event.clientY;
          if (document.pointerLockElement !== document.body) {
            mod.mouseFallback = true;
            if (typeof requestLock === 'function') requestLock();
          }
        }, true);
        addEventListener('mousemove', (event) => {
          if (document.pointerLockElement === document.body) {
            mod.mouseFallback = false;
            lastX = event.clientX;
            lastY = event.clientY;
            return;
          }
          if (!mod.mouseFallback || typeof G === 'undefined' || !G.running) return;
          if (lastX === null || lastY === null) {
            lastX = event.clientX; lastY = event.clientY; return;
          }
          const dx = event.clientX - lastX;
          const dy = event.clientY - lastY;
          lastX = event.clientX; lastY = event.clientY;
          mouseDX += clamp(dx, -90, 90);
          mouseDY += clamp(dy, -90, 90);
        }, true);
        mod.pointerCaptureWrapped = true;
      }

      // Chromium's in-app preview can reject Pointer Lock even after a valid
      // start click.  Keep the same CS-style mouse look by falling back to
      // clientX/clientY deltas when that rejection is detected; normal desktop
      // browsers still use Pointer Lock with raw movement deltas.
      if (!mod.requestLockWrapped && typeof requestLock === 'function') {
        const baseRequestLock = requestLock;
        requestLock = function () {
          mod.mouseFallback = true;
          baseRequestLock();
          clearTimeout(requestLock._fallbackTimer);
          requestLock._fallbackTimer = setTimeout(() => {
            if (document.pointerLockElement === document.body || typeof G === 'undefined' || !G.started || G.over) return;
            mod.mouseFallback = true;
            G.paused = false; G.running = true;
            if (typeof UI !== 'undefined' && UI.pause) UI.pause.classList.remove('on');
            if (typeof SFX !== 'undefined' && SFX.resume) SFX.resume();
          }, 520);
        };
        mod.requestLockWrapped = true;
      }

      if (typeof updateEnemy === 'function') updateEnemy = updateZombieEnemy;
      if (typeof enemyShoot === 'function') enemyShoot = function () {};

      if (typeof resetWorldState === 'function' && !mod.resetWrapped) {
        const baseReset = resetWorldState;
        resetWorldState = function () {
          grenadeMeshes.splice(0).forEach((grenade) => scene.remove(grenade.mesh));
          explosionFx.splice(0).forEach((fx) => scene.remove(fx.mesh));
          mod.grenadeCooldown = 0;
          mod.zombiesDecorated = 0;
          mod.slot = 1;
          mod.previousGun = 2;
          mod.meleeCooldown = 0;
          mod.meleeSwing = 0;
          mod.inspect = false;
          mod.inspectTime = 0;
          mod.inspectBlend = 0;
          mod.wave = 1;
          mod.waveTransition = false;
          baseReset();
          setTimeout(() => {
            decorateAllEnemies();
            showGunSlot(1);
            updateWaveUi();
          }, 0);
        };
        mod.resetWrapped = true;
      }

      if (typeof endGame === 'function' && !mod.endWrapped) {
        const baseEnd = endGame;
        endGame = function (win) {
          // The upstream win check fires every time G.kills >= 10. Convert
          // that check into three short zombie waves without touching the
          // original combat and score bookkeeping.
          if (win && mod.wave < mod.waveCount && G.kills % 10 === 0 && !mod.waveTransition) {
            nextWave();
            return;
          }
          if (win && mod.wave < mod.waveCount) return;
          baseEnd(win);
          const score = document.getElementById('sKills');
          if (score) score.innerHTML = G.kills + '<span>/30</span>';
        };
        mod.endWrapped = true;
      }

      if (typeof fireWeapon === 'function' && !mod.fireWrapped) {
        const baseFire = fireWeapon;
        fireWeapon = function () {
          if (mod.inspect) {
            mod.inspect = false;
            mod.inspectTime = 0;
            return false;
          }
          if (mod.slot === 3) return meleeAttack();
          if (mod.slot === 4) {
            if (!player.triggerReleased) return false;
            player.triggerReleased = false;
            throwGrenade();
            return true;
          }
          return baseFire();
        };
        mod.fireWrapped = true;
      }

      if (!mod.inputWrapped) {
        addEventListener('keydown', (event) => {
          if (event.repeat) return;
          if (event.code === 'Digit1' && typeof G !== 'undefined' && G.running) {
            event.preventDefault();
            event.stopImmediatePropagation();
            selectGunSlot(1);
          } else if (event.code === 'Digit2' && typeof G !== 'undefined' && G.running) {
            event.preventDefault();
            event.stopImmediatePropagation();
            selectGunSlot(2);
          } else if (event.code === 'Digit3' && typeof G !== 'undefined' && G.running) {
            event.preventDefault();
            event.stopImmediatePropagation();
            selectGunSlot(3);
          } else if (event.code === 'Digit4' && typeof G !== 'undefined' && G.running) {
            event.preventDefault();
            event.stopImmediatePropagation();
            selectGunSlot(4);
            throwGrenade();
          } else if (event.code === 'KeyF' && typeof G !== 'undefined' && G.running) {
            event.preventDefault();
            event.stopImmediatePropagation();
            toggleInspect();
          }
        }, true);
        addEventListener('wheel', (event) => {
          if (typeof G === 'undefined' || !G.running) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          const order = [1, 2, 3, 4];
          const at = Math.max(0, order.indexOf(mod.slot));
          const dir = event.deltaY > 0 ? 1 : -1;
          selectGunSlot(order[(at + dir + order.length) % order.length]);
        }, { capture: true, passive: false });
        mod.inputWrapped = true;
      }

      if (typeof frame === 'function' && !mod.frameWrapped) {
        const baseFrame = frame;
        let last = performance.now();
        frame = function (now) {
          const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
          last = now;
          updateGrenades(dt);
          baseFrame(now);
          updateUtilityView(dt);
        };
        mod.frameWrapped = true;
      }
      mod.ready = true;
    } catch (error) {
      reportError('install patches', error);
    }
  }

  installPatches();
  setTimeout(installPatches, 120);
  setTimeout(installPatches, 650);
})();
