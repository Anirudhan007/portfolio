const mobile = window.matchMedia("(max-width: 820px)").matches;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const cappedDpr = Math.min(window.devicePixelRatio || 1, 2);
// Mobile phones need denser/brighter points; ShaderMaterial does not auto-scale gl_PointSize by DPR.
const count = mobile ? 36000 : 56000;
const basePointSize = (mobile ? 52 : 46) * cappedDpr;

const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector(".nav");
const navLinks = [...document.querySelectorAll(".nav a")];
const sections = [...document.querySelectorAll("main section")];
const copies = document.querySelectorAll(".copy");
const cursor = document.querySelector("#cursor");

menuButton?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.textContent = open ? "Close" : "Menu";
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
    if (menuButton) menuButton.textContent = "Menu";
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && nav?.classList.contains("open")) {
    nav.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton.textContent = "Menu";
    menuButton.focus();
  }
});

let scrollFadeTimer;
window.addEventListener("scroll", () => {
  document.body.classList.add("scrolling");
  window.clearTimeout(scrollFadeTimer);
  scrollFadeTimer = window.setTimeout(() => {
    document.body.classList.remove("scrolling");
  }, 180);
}, { passive: true });

if (reducedMotion || !("IntersectionObserver" in window)) {
  copies.forEach((copy) => copy.classList.add("visible"));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.25 });
  copies.forEach((copy) => revealObserver.observe(copy));
}

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle("on", link.hash === `#${entry.target.id}`));
  });
}, { rootMargin: "-42% 0px -42%", threshold: 0 });
sections.forEach((section) => sectionObserver.observe(section));

if (cursor) {
  window.addEventListener("pointermove", (event) => {
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
  });
  document.querySelectorAll("a, button").forEach((element) => {
    element.addEventListener("pointerenter", () => cursor.classList.add("hot"));
    element.addEventListener("pointerleave", () => cursor.classList.remove("hot"));
  });
}

const messageForm = document.querySelector("[data-message-form]");
if (messageForm) {
  const status = messageForm.querySelector(".form-status");
  const submit = messageForm.querySelector("button[type='submit']");

  if (status && new URLSearchParams(window.location.search).get("sent") === "1") {
    status.textContent = "Message sent. Thank you.";
    window.history.replaceState({}, "", `${window.location.pathname}#contact`);
  }

  messageForm.addEventListener("submit", (event) => {
    if (!messageForm.reportValidity()) {
      event.preventDefault();
      return;
    }
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Sending";
    }
    if (status) status.textContent = "Opening verification.";
  });
}

if (!window.THREE) {
  document.querySelector("#gl")?.remove();
  document.querySelector(".hud")?.remove();
} else {
  startOrganism();
}

function startOrganism() {
  const THREE = window.THREE;
  const canvas = document.querySelector("#gl");
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  } catch {
    canvas.remove();
    document.querySelector(".hud")?.remove();
    return;
  }

  renderer.setPixelRatio(cappedDpr);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070a, 0.028);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 22);

  const random = (amount = 1) => (Math.random() * 2 - 1) * amount;
  const gaussian = () => {
    let u = 0;
    let v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  function helix() {
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const t = index / count;
      const angle = t * Math.PI * 28;
      const y = (t - 0.5) * 15;
      if (index % 5 === 0) {
        const mix = Math.random();
        const x = Math.cos(angle) * 2.1;
        const z = Math.sin(angle) * 2.1;
        positions[index * 3] = x * (1 - mix * 2) + random(0.05);
        positions[index * 3 + 1] = y + random(0.04);
        positions[index * 3 + 2] = z * (1 - mix * 2) + random(0.05);
      } else {
        const strand = index % 2 ? Math.PI : 0;
        const radius = 2.1 + random(0.16);
        positions[index * 3] = Math.cos(angle + strand) * radius;
        positions[index * 3 + 1] = y + random(0.06);
        positions[index * 3 + 2] = Math.sin(angle + strand) * radius;
      }
    }
    return positions;
  }

  function cortex() {
    const positions = new Float32Array(count * 3);
    const lobeCount = 10;
    const centres = Array.from({ length: lobeCount }, (_, index) => {
      const y = ((index % 5) / 4) * 2 - 1;
      const angle = (index / lobeCount) * Math.PI * 2 + (index % 2) * 0.35;
      const radius = Math.sqrt(Math.max(0, 1 - y * y)) * 5.4;
      return [Math.cos(angle) * radius, y * 5.6, Math.sin(angle) * radius];
    });

    for (let index = 0; index < count; index += 1) {
      if (index % 4 === 0) {
        const fromIndex = (Math.random() * lobeCount) | 0;
        const toIndex = (fromIndex + 1 + ((Math.random() * 3) | 0)) % lobeCount;
        const from = centres[fromIndex];
        const to = centres[toIndex];
        const t = Math.random();
        const bend = 1 + Math.sin(t * Math.PI) * 0.18;
        for (let axis = 0; axis < 3; axis += 1) {
          positions[index * 3 + axis] = (from[axis] + (to[axis] - from[axis]) * t) * bend + random(0.06);
        }
      } else {
        const centre = centres[(Math.random() * lobeCount) | 0];
        const tight = gaussian() * 0.42;
        for (let axis = 0; axis < 3; axis += 1) {
          positions[index * 3 + axis] = centre[axis] + tight;
        }
      }
    }
    return positions;
  }

  function lattice() {
    const positions = new Float32Array(count * 3);
    const halfX = 6.4;
    const halfY = 5.0;
    const halfZ = 6.4;
    const faceGrid = 6;

    for (let index = 0; index < count; index += 1) {
      const mode = index % 10;
      if (mode < 6) {
        // Strong cube edges — this is what makes the "box" readable.
        const edge = (Math.random() * 12) | 0;
        const t = Math.random() * 2 - 1;
        let x = 0;
        let y = 0;
        let z = 0;
        if (edge < 4) {
          y = edge < 2 ? halfY : -halfY;
          z = edge % 2 === 0 ? halfZ : -halfZ;
          x = t * halfX;
        } else if (edge < 8) {
          x = edge < 6 ? halfX : -halfX;
          z = edge % 2 === 0 ? halfZ : -halfZ;
          y = t * halfY;
        } else {
          x = edge < 10 ? halfX : -halfX;
          y = edge % 2 === 0 ? halfY : -halfY;
          z = t * halfZ;
        }
        positions[index * 3] = x + random(0.03);
        positions[index * 3 + 1] = y + random(0.03);
        positions[index * 3 + 2] = z + random(0.03);
      } else if (mode < 9) {
        // Face grid lines so the faces read as a box, not fog.
        const face = (Math.random() * 6) | 0;
        const u = (((Math.random() * faceGrid) | 0) / (faceGrid - 1)) * 2 - 1;
        const v = Math.random() * 2 - 1;
        let x = 0;
        let y = 0;
        let z = 0;
        if (face === 0 || face === 1) {
          x = face === 0 ? halfX : -halfX;
          y = u * halfY;
          z = v * halfZ;
        } else if (face === 2 || face === 3) {
          y = face === 2 ? halfY : -halfY;
          x = u * halfX;
          z = v * halfZ;
        } else {
          z = face === 4 ? halfZ : -halfZ;
          x = u * halfX;
          y = v * halfY;
        }
        positions[index * 3] = x + random(0.025);
        positions[index * 3 + 1] = y + random(0.025);
        positions[index * 3 + 2] = z + random(0.025);
      } else {
        // Sparse interior points only — keeps depth without washing out the box.
        const gx = (((Math.random() * 5) | 0) / 4) * 2 - 1;
        const gy = (((Math.random() * 5) | 0) / 4) * 2 - 1;
        const gz = (((Math.random() * 5) | 0) / 4) * 2 - 1;
        positions[index * 3] = gx * halfX * 0.72 + random(0.02);
        positions[index * 3 + 1] = gy * halfY * 0.72 + random(0.02);
        positions[index * 3 + 2] = gz * halfZ * 0.72 + random(0.02);
      }
    }
    return positions;
  }

  function knot() {
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const t = (index / count) * Math.PI * 2;
      const radius = Math.cos(5 * t) + 2;
      const centre = [
        radius * Math.cos(3 * t) * 1.85,
        radius * Math.sin(3 * t) * 1.85,
        -Math.sin(5 * t) * 2.8
      ];
      const spread = Math.cbrt(Math.random()) * 0.55;
      const y = random();
      const angle = Math.random() * Math.PI * 2;
      const ring = Math.sqrt(1 - y * y);
      positions[index * 3] = centre[0] + Math.cos(angle) * ring * spread;
      positions[index * 3 + 1] = centre[1] + y * spread;
      positions[index * 3 + 2] = centre[2] + Math.sin(angle) * ring * spread;
    }
    return positions;
  }

  function globe() {
    const positions = new Float32Array(count * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let index = 0; index < count; index += 1) {
      if (index % 11 === 0) {
        const radius = Math.cbrt(Math.random()) * 3.5;
        const y = random();
        const angle = Math.random() * Math.PI * 2;
        const ring = Math.sqrt(1 - y * y);
        positions[index * 3] = Math.cos(angle) * ring * radius;
        positions[index * 3 + 1] = y * radius;
        positions[index * 3 + 2] = Math.sin(angle) * ring * radius;
      } else {
        const y = 1 - (index / (count - 1)) * 2;
        const ring = Math.sqrt(Math.max(0, 1 - y * y));
        const angle = golden * index;
        const band = 6.4 * (1 + Math.sin(y * 40) * 0.012);
        positions[index * 3] = Math.cos(angle) * ring * band;
        positions[index * 3 + 1] = y * band;
        positions[index * 3 + 2] = Math.sin(angle) * ring * band;
      }
    }
    return positions;
  }

  const shapes = [helix(), cortex(), lattice(), knot(), globe()];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(shapes[0].slice(), 3));
  shapes.forEach((shape, index) => geometry.setAttribute(`aP${index}`, new THREE.BufferAttribute(shape, 3)));

  const randomness = new Float32Array(count);
  for (let index = 0; index < count; index += 1) randomness[index] = Math.random();
  geometry.setAttribute("aRand", new THREE.BufferAttribute(randomness, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);

  const palette = [
    new THREE.Color(0x53f2c8),
    new THREE.Color(0xff4d8d),
    new THREE.Color(0x66c8ff),
    new THREE.Color(0xc6ff4d),
    new THREE.Color(0xffb648)
  ];

  const uniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uSize: { value: basePointSize },
    uColA: { value: palette[0].clone() },
    uColB: { value: palette[1].clone() },
    uMix: { value: 0 },
    uBurst: { value: 0 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aP0; attribute vec3 aP1; attribute vec3 aP2;
      attribute vec3 aP3; attribute vec3 aP4; attribute float aRand;
      uniform float uTime, uMorph, uSize, uBurst;
      varying float vRand; varying float vFade;
      void main() {
        float m = uMorph;
        vec3 p = mix(aP0, aP1, clamp(m, 0.0, 1.0));
        p = mix(p, aP2, clamp(m - 1.0, 0.0, 1.0));
        p = mix(p, aP3, clamp(m - 2.0, 0.0, 1.0));
        p = mix(p, aP4, clamp(m - 3.0, 0.0, 1.0));
        float phase = aRand * 6.2831;
        p += vec3(sin(uTime * .6 + phase), cos(uTime * .5 + phase * 1.7), sin(uTime * .7 + phase * 2.3)) * .055;
        p += normalize(p + .0001) * uBurst * (.4 + aRand * 1.6);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float distance = -mv.z;
        gl_PointSize = uSize * (.35 + aRand * .9) / max(distance, .001);
        vRand = aRand;
        vFade = clamp(1.0 - (distance - 8.0) / 34.0, .05, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform vec3 uColA, uColB; uniform float uMix, uTime;
      varying float vRand; varying float vFade;
      void main() {
        float distance = length(gl_PointCoord - .5);
        if (distance > .5) discard;
        float alpha = smoothstep(.5, 0.0, distance);
        alpha *= alpha;
        vec3 color = mix(uColA, uColB, uMix);
        float spark = step(.985, fract(vRand * 91.7 + uTime * .35));
        color = mix(color, vec3(1.0), spark * .85) * (.72 + vRand * .55);
        gl_FragColor = vec4(color, alpha * vFade * 1.0);
      }
    `
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const cage = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(13, 1)),
    new THREE.LineBasicMaterial({ color: 0x2a3a44, transparent: true, opacity: 0.22 })
  );
  scene.add(cage);

  const states = ["INTRO", "WORK", "EXPERIENCE", "EDUCATION", "CONTACT"];
  const stateReadout = document.querySelector("#hState");
  const morphReadout = document.querySelector("#hMorph");
  const morphBar = document.querySelector("#hBar");
  const nodeReadout = document.querySelector("#hNodes");
  const fpsReadout = document.querySelector("#hFps");
  nodeReadout.textContent = count.toLocaleString();

  let targetMorph = 0;
  let morph = 0;
  let previousMorph = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let frames = 0;
  let fpsStart = performance.now();

  function setMorphTarget() {
    const currentY = window.scrollY;
    let segment = 0;
    while (segment < sections.length - 1 && currentY >= sections[segment + 1].offsetTop) segment += 1;
    if (segment === sections.length - 1) {
      targetMorph = 4;
      return;
    }
    const start = sections[segment].offsetTop;
    const end = sections[segment + 1].offsetTop;
    targetMorph = segment + Math.max(0, Math.min(1, (currentY - start) / Math.max(1, end - start)));
  }

  window.addEventListener("scroll", setMorphTarget, { passive: true });
  window.addEventListener("pointermove", (event) => {
    targetX = (event.clientX / window.innerWidth - 0.5) * 2;
    targetY = (event.clientY / window.innerHeight - 0.5) * 2;
  });
  setMorphTarget();

  const started = performance.now();
  function render(now) {
    requestAnimationFrame(render);
    const time = (now - started) / 1000;
    morph += (targetMorph - morph) * (reducedMotion ? 1 : 0.055);
    pointerX += (targetX - pointerX) * 0.045;
    pointerY += (targetY - pointerY) * 0.045;

    const velocity = Math.abs(morph - previousMorph);
    previousMorph = morph;
    uniforms.uBurst.value += (Math.min(velocity * 26, 1.1) - uniforms.uBurst.value) * 0.12;
    uniforms.uTime.value = time;
    uniforms.uMorph.value = morph;

    const colorIndex = Math.min(3, Math.floor(morph));
    uniforms.uColA.value.copy(palette[colorIndex]);
    uniforms.uColB.value.copy(palette[colorIndex + 1]);
    uniforms.uMix.value = morph - colorIndex;

    const orbit = reducedMotion ? 0 : time * 0.055;
    points.rotation.y = orbit + pointerX * 0.45;
    points.rotation.x = pointerY * 0.32 + Math.sin(time * 0.22) * 0.05;
    cage.rotation.y = -orbit * 0.5;
    cage.rotation.x = orbit * 0.3;

    const cameraDistance = 20 + Math.sin((morph / 4) * Math.PI) * 5.5;
    camera.position.z += (cameraDistance - camera.position.z) * 0.03;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);

    frames += 1;
    if (now - fpsStart > 500) {
      fpsReadout.textContent = Math.round((frames * 1000) / (now - fpsStart));
      frames = 0;
      fpsStart = now;
    }
    morphReadout.textContent = morph.toFixed(3);
    morphBar.style.width = `${(morph / 4) * 100}%`;
    stateReadout.textContent = states[Math.min(4, Math.round(morph))];
  }
  requestAnimationFrame(render);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    setMorphTarget();
  });
}
