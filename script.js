/* ---------------------------------------------------------
   DATA
--------------------------------------------------------- */

const planetEvents = [
  { name: "Thermal spike", lat: 34.0, lon: 45.0, level: "CRITICAL" },
  { name: "Unknown signal", lat: 51.5, lon: -0.1, level: "INFO" },
  { name: "Unit BRAVO contact", lat: 35.7, lon: 139.7, level: "CRITICAL" },
  { name: "Drone recon", lat: -33.9, lon: 151.2, level: "INFO" },
  { name: "Sat uplink window", lat: 40.7, lon: -74.0, level: "INFO" }
];

const tasks = [
  "Secure grid A7",
  "Deploy recon drone",
  "Update extraction route",
  "Sync intel with HQ",
  "Verify sat uplink"
];

const problems = [
  "Comms latency spike",
  "Unknown signal detected",
  "Satellite pass window closing",
  "Thermal anomaly in sector D3"
];

/* ---------------------------------------------------------
   POPULATE UI LISTS
--------------------------------------------------------- */

function fillList(id, arr, cls) {
  const box = document.getElementById(id);
  arr.forEach(t => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<span>${t}</span><span class="tag ${cls}">ACTIVE</span>`;
    box.append(div);
  });
}

fillList("taskList", tasks, "tag-info");
fillList("problemList", problems, "tag-critical");

/* ---------------------------------------------------------
   TIMELINE
--------------------------------------------------------- */

const timeline = document.getElementById("timeline");

function addTimelineEntry(ev, crisis = false) {
  const row = document.createElement("div");
  row.className = "timeline-row";

  if (crisis) {
    row.style.borderLeft = "3px solid red";
    row.style.animation = "triBlink 0.6s 2";
  }

  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  row.innerHTML = `
    <div class="timeline-time">${time}</div>
    <div>${ev.name} — <span class="tag-info">${ev.level}</span></div>
    <div class="timeline-coord">Lat: ${ev.lat.toFixed(1)}°, Lon: ${ev.lon.toFixed(1)}°</div>
  `;

  timeline.prepend(row);
}

planetEvents.forEach(e => addTimelineEntry(e));

/* ---------------------------------------------------------
   THREE.JS GLOBE
--------------------------------------------------------- */

const container = document.getElementById("globe");
const labelContainer = document.getElementById("markerLabels");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
camera.position.z = 3.2;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

/* Earth */
const earthGeo = new THREE.SphereGeometry(1, 64, 64);
const earthTex = new THREE.TextureLoader().load(
  "https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg"
);
const earthMat = new THREE.MeshPhongMaterial({ map: earthTex });
const earth = new THREE.Mesh(earthGeo, earthMat);
scene.add(earth);

/* Lights */
scene.add(new THREE.AmbientLight(0x404040, 0.6));
const light = new THREE.PointLight(0xffffff, 1.2);
light.position.set(5, 3, 5);
scene.add(light);

/* Marker group */
const markerGroup = new THREE.Group();
scene.add(markerGroup);

const markerLabels = [];

/* Convert lat/lon to 3D position */
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/* Create markers */
planetEvents.forEach(ev => {
  const base = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff3b3b })
  );

  const pulse = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.6 })
  );

  const pos = latLonToVector3(ev.lat, ev.lon, 1.02);
  base.position.copy(pos);
  pulse.position.copy(pos);

  markerGroup.add(base);
  markerGroup.add(pulse);

  ev.markerBase = base;
  ev.markerPulse = pulse;

  /* 2D label */
  const label = document.createElement("div");
  label.className = "marker-label";
  label.innerHTML = `<strong>${ev.name}</strong><br><span class="coord">${ev.lat.toFixed(1)}°, ${ev.lon.toFixed(1)}°</span>`;
  labelContainer.appendChild(label);

  markerLabels.push({ base, pulse, label, ev });
});

/* ---------------------------------------------------------
   CRISIS EFFECTS
--------------------------------------------------------- */

const crisisStrobe = document.getElementById("crisisStrobe");
const crisisEcho = document.getElementById("crisisEcho");

function triggerCrisis(ev) {
  /* Strong strobe */
  crisisStrobe.style.opacity = "1";
  setTimeout(() => (crisisStrobe.style.opacity = "0"), 180);

  /* Echo */
  crisisEcho.style.opacity = "1";
  setTimeout(() => (crisisEcho.style.opacity = "0"), 350);

  /* Timeline crisis entry */
  addTimelineEntry(ev, true);

  /* Bars spike */
  spikeBars();

  /* Marker pulse */
  markerLabels.forEach(m => {
    if (m.ev === ev) {
      m.pulse.scale.set(3, 3, 3);
      setTimeout(() => m.pulse.scale.set(1, 1, 1), 600);
    } else {
      m.pulse.scale.set(1.3, 1.3, 1.3);
      setTimeout(() => m.pulse.scale.set(1, 1, 1), 600);
    }
  });
}

/* ---------------------------------------------------------
   THREAT BARS
--------------------------------------------------------- */

function spikeBars() {
  for (let i = 1; i <= 4; i++) {
    const bar = document.getElementById("bar" + i);
    bar.style.transform = "scaleY(" + (0.7 + Math.random() * 0.3) + ")";
    setTimeout(() => {
      bar.style.transform = "scaleY(" + (0.2 + Math.random() * 0.2) + ")";
    }, 800);
  }
}

/* ---------------------------------------------------------
   ANIMATION LOOP
--------------------------------------------------------- */

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();

  earth.rotation.y += 0.002;
  markerGroup.rotation.y += 0.002;

  /* Pulse markers */
  markerLabels.forEach((m, i) => {
    const s = 1 + 0.4 * Math.sin(t * 3 + i);
    m.pulse.scale.set(s, s, s);
    m.pulse.material.opacity = 0.3 + 0.3 * (1 + Math.sin(t * 3 + i)) / 2;

    /* Project labels */
    const vector = m.base.position.clone();
    vector.project(camera);

    const x = (vector.x * 0.5 + 0.5) * container.clientWidth;
    const y = (-vector.y * 0.5 + 0.5) * container.clientHeight;

    m.label.style.transform = `translate(${x}px, ${y}px)`;
    m.label.style.opacity = vector.z > 0 ? "1" : "0";
  });

  renderer.render(scene, camera);
}

animate();

/* ---------------------------------------------------------
   RANDOM CRISIS TRIGGERS
--------------------------------------------------------- */

setInterval(() => {
  const ev = planetEvents[Math.floor(Math.random() * planetEvents.length)];
  triggerCrisis(ev);
}, 8000);

/* ---------------------------------------------------------
   AUDIO (optional)
--------------------------------------------------------- */

let audioCtx;

function initAudio() {
  if (audioCtx) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function beep() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.frequency.value = 700 + Math.random() * 300;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  }

  setInterval(() => {
    if (Math.random() > 0.7) beep();
  }, 2500);
}

window.addEventListener("click", initAudio, { once: true });
