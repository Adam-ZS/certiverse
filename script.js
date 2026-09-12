(function(){
  "use strict";

  const CERTS = (window.CERTIFICATIONS || []).map(normalize);

  function normalize(c){
    const merged = Object.assign({
      issuer: null, weight: 3, featured: false, dateObtained: null,
      description: "", certificateImage: null, certificatePdf: null,
      verificationUrl: null, verified: false, category: []
    }, c);
    // category must always be an array, even if someone typed a plain string in data.js
    if (typeof merged.category === "string"){
      merged.category = [merged.category];
    }
    if (!Array.isArray(merged.category)){
      merged.category = [];
    }
    return merged;
  }

  const PLACEHOLDER_IMG = "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250">
      <rect width="400" height="250" fill="#171B24"/>
      <circle cx="200" cy="110" r="40" fill="none" stroke="#00E5FF" stroke-width="3" opacity="0.6"/>
      <text x="200" y="200" fill="#8A93A6" font-family="monospace" font-size="12" text-anchor="middle">NO IMAGE PROVIDED</text>
    </svg>`);

  const CATEGORY_COLORS = [0x00E5FF, 0x7C3AED, 0xF59E0B, 0x22D3EE, 0xA3FF12, 0xFF6B9D, 0x60A5FA, 0xF472B6];
  function colorForIndex(i){ return CATEGORY_COLORS[i % CATEGORY_COLORS.length]; }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- BOOT SEQUENCE ---------- */
  const bootLines = [
    "INITIALIZING ARCHIVE...",
    "SECURE CHANNEL: ESTABLISHED",
    "CREDENTIAL INDEX: ONLINE",
    "ACCESS GRANTED"
  ];
  const bootEl = document.getElementById("boot");
  const bootTextEl = document.getElementById("boot-text");
  const bootSkip = document.getElementById("boot-skip");

  function finishBoot(){
    bootEl.classList.add("hidden");
    setTimeout(()=> bootEl.remove(), 500);
  }

  if (localStorage.getItem("archive_booted") === "1" || reducedMotion){
    finishBoot();
  } else {
    let i = 0;
    const interval = setInterval(()=>{
      if (i < bootLines.length){
        bootTextEl.textContent += (i>0?"\n":"") + bootLines[i];
        i++;
      } else {
        clearInterval(interval);
        localStorage.setItem("archive_booted","1");
        setTimeout(finishBoot, 400);
      }
    }, 300);
    bootSkip.addEventListener("click", ()=>{
      clearInterval(interval);
      localStorage.setItem("archive_booted","1");
      finishBoot();
    });
  }

  /* ---------- STATS ---------- */
  document.getElementById("stat-total").textContent = CERTS.length;
  document.getElementById("stat-verified").textContent = CERTS.filter(c=>c.verified).length;
  const allCategories = [...new Set(CERTS.flatMap(c=>c.category))];
  document.getElementById("stat-categories").textContent = allCategories.length;

  /* ---------- CATEGORY FILTERS ---------- */
  const filterWrap = document.getElementById("category-filters");
  let activeCategory = "ALL";
  function renderChips(){
    filterWrap.innerHTML = "";
    ["ALL", ...allCategories].forEach((cat, idx)=>{
      const chip = document.createElement("button");
      chip.className = "chip" + (cat===activeCategory ? " active" : "");
      chip.textContent = cat.toUpperCase();
      const hex = cat === "ALL" ? "#8A93A6" : "#" + colorForIndex(idx - 1).toString(16).padStart(6,"0").toUpperCase();
      chip.style.setProperty("--chipc", hex);
      chip.addEventListener("click", ()=>{ activeCategory = cat; renderChips(); renderGrid(); });
      filterWrap.appendChild(chip);
    });
  }

  /* ---------- SEARCH ---------- */
  const searchInput = document.getElementById("search");
  searchInput.addEventListener("input", renderGrid);
  document.addEventListener("keydown", (e)=>{
    if (e.key === "/" && document.activeElement !== searchInput){
      e.preventDefault(); searchInput.focus();
    }
    if (e.key === "Escape") closeModal();
  });

  /* ---------- SORT / RESET ---------- */
  let sortMode = "featured";
  function dateScore(c){ return c.dateObtained ? new Date(c.dateObtained).getTime() : 0; }
  const sorters = {
    featured: (a,b)=> (b.featured - a.featured) || (b.weight - a.weight),
    newest:   (a,b)=> dateScore(b) - dateScore(a),
    oldest:   (a,b)=> dateScore(a) - dateScore(b)
  };
  const sortBtns = Array.from(document.querySelectorAll(".sort-btn"));
  sortBtns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      sortMode = btn.dataset.sort;
      sortBtns.forEach(b=> b.classList.toggle("active", b===btn));
      renderGrid();
    });
  });
  const resultCount = document.getElementById("result-count");
  document.getElementById("reset-filters").addEventListener("click", ()=>{
    searchInput.value = "";
    activeCategory = "ALL";
    sortMode = "featured";
    sortBtns.forEach(b=> b.classList.toggle("active", b.dataset.sort==="featured"));
    renderChips();
    renderGrid();
  });

  /* ---------- GRID RENDER ---------- */
  const gridEl = document.getElementById("grid");
  const emptyState = document.getElementById("empty-state");

  function matches(c, query){
    if (activeCategory !== "ALL" && !c.category.includes(activeCategory)) return false;
    if (!query) return true;
    const haystack = [c.name, c.issuer, ...c.category, c.description].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function renderGrid(){
    const query = searchInput.value.trim();
    const filtered = CERTS.filter(c => matches(c, query))
      .sort(sorters[sortMode] || sorters.featured);

    resultCount.textContent = "SHOWING " + filtered.length + " / " + CERTS.length + " · " + (activeCategory === "ALL" ? "ALL" : activeCategory.toUpperCase());

    gridEl.innerHTML = "";
    filtered.forEach(c=>{
      const card = document.createElement("div");
      card.className = "card" + (c.featured ? " featured" : "");
      card.tabIndex = 0;
      card.setAttribute("role","button");
      card.innerHTML = `
        <img class="card-image" loading="lazy" decoding="async" src="${c.certificateImage || PLACEHOLDER_IMG}" alt="${c.name}"
             onerror="this.src='${PLACEHOLDER_IMG}'"/>
        <div class="card-body">
          <p class="card-name">${c.name}</p>
          <p class="card-issuer">${c.issuer || "—"}</p>
          <div class="card-footer">
            <span class="badge">${c.category[0] || "OTHER"}</span>
            ${c.verified ? `<span class="verified-dot yes">● VERIFIED</span>` : ""}
          </div>
        </div>`;
      card.addEventListener("click", ()=> openModal(c));
      card.addEventListener("keydown", (e)=>{ if(e.key === "Enter") openModal(c); });
      gridEl.appendChild(card);
    });

    emptyState.hidden = filtered.length > 0;
  }

  /* ---------- MODAL ---------- */
  const backdrop = document.getElementById("modal-backdrop");
  let lastFocus = null;
  function openModal(c){
    if (!c){
      console.error("openModal called with no certificate data.");
      return;
    }
    try{
      renderModal(c);
      lastFocus = document.activeElement;
      backdrop.hidden = false;
      const closeBtn = document.getElementById("modal-close");
      if (closeBtn) closeBtn.focus();
    } catch(err){
      console.error("Could not render modal for this certificate — check data.js for this entry:", c, err);
    }
  }

  function fmtDate(iso){
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" });
  }

  function renderModal(c){
    document.getElementById("modal-image").src = c.certificateImage || PLACEHOLDER_IMG;
    document.getElementById("modal-image").onerror = function(){ this.src = PLACEHOLDER_IMG; };
    document.getElementById("modal-categories").innerHTML =
      (c.category.length ? c.category : ["OTHER"])
        .map(cat => `<span class="badge">${cat.toUpperCase()}</span>`).join(" ");
    document.getElementById("modal-name").textContent = c.name;
    document.getElementById("modal-issuer").textContent = c.issuer || "Issuer not specified";
    document.getElementById("modal-date").textContent = fmtDate(c.dateObtained) || "NOT RECORDED";
    document.getElementById("modal-description").textContent = c.description || "No description provided yet.";

    const expLabel = document.getElementById("modal-expiry-label");
    const expValue = document.getElementById("modal-expiry");
    const expiry = fmtDate(c.expiryDate);
    if (expiry){
      expLabel.hidden = false;
      expValue.hidden = false;
      expValue.textContent = expiry;
    } else {
      expLabel.hidden = true;
      expValue.hidden = true;
    }

    const statusEl = document.getElementById("modal-verify-status");
    const verifyBtn = document.getElementById("modal-verify-btn");
    if (c.verified && c.verificationUrl){
      statusEl.className = "verify-status yes";
      statusEl.textContent = "● VERIFIED";
      verifyBtn.href = c.verificationUrl;
      verifyBtn.classList.remove("disabled");
      verifyBtn.textContent = "VERIFY CREDENTIAL ↗";
      statusEl.hidden = false;
      verifyBtn.hidden = false;
    } else {
      statusEl.hidden = true;
      verifyBtn.hidden = true;
    }

    const pdfBtn = document.getElementById("modal-pdf-btn");
    if (c.certificatePdf){
      pdfBtn.href = c.certificatePdf;
      pdfBtn.hidden = false;
    } else {
      pdfBtn.hidden = true;
    }
  }
  function closeModal(){
    backdrop.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.getElementById("modal-close").addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e)=>{ if (e.target === backdrop) closeModal(); });

  renderChips();
  renderGrid();

  const dataWarning = document.getElementById("data-warning");
  if (CERTS.length === 0){
    dataWarning.hidden = false;
  }

  /* ---------- 3D CORE (graceful degradation) ---------- */
  (function initCore(){
    const canvas = document.getElementById("core-canvas");
    const fallbackNote = document.getElementById("core-fallback-note");
    const tooltip = document.getElementById("node-tooltip");
    const section = canvas.parentElement;

    if (reducedMotion || typeof THREE === "undefined"){
      canvas.hidden = true;
      fallbackNote.hidden = false;
      return;
    }

    try{
      const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, section.clientWidth/section.clientHeight, 0.1, 200);
      const defaultCamPos = new THREE.Vector3(0, 0, 9);
      camera.position.copy(defaultCamPos);

      function resize(){
        renderer.setSize(section.clientWidth, section.clientHeight);
        camera.aspect = section.clientWidth/section.clientHeight;
        camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener("resize", resize);

      // ---- soft glow sprite texture (canvas-generated, no external assets) ----
      function makeGlowTexture(hex){
        const size = 128;
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const ctx = c.getContext("2d");
        const color = "#" + hex.toString(16).padStart(6,"0");
        const grad = ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
        grad.addColorStop(0, color + "ff");
        grad.addColorStop(0.4, color + "88");
        grad.addColorStop(1, color + "00");
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,size,size);
        return new THREE.CanvasTexture(c);
      }

      // ---- starfield background ----
      const starGeo = new THREE.BufferGeometry();
      const starCount = 800;
      const starPos = new Float32Array(starCount * 3);
      for (let i=0;i<starCount;i++){
        starPos[i*3]   = (Math.random()-0.5) * 60;
        starPos[i*3+1] = (Math.random()-0.5) * 60;
        starPos[i*3+2] = (Math.random()-0.5) * 60 - 10;
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({ color:0xffffff, size:0.05, transparent:true, opacity:0.6 });
      scene.add(new THREE.Points(starGeo, starMat));

      // ---- credential core ----
      const coreGroup = new THREE.Group();
      scene.add(coreGroup);

      const coreGeo = new THREE.IcosahedronGeometry(2, 1);
      const coreMat = new THREE.MeshBasicMaterial({ color:0x00E5FF, wireframe:true, transparent:true, opacity:0.75 });
      const core = new THREE.Mesh(coreGeo, coreMat);
      coreGroup.add(core);

      const innerGeo = new THREE.IcosahedronGeometry(1.3, 0);
      const innerMat = new THREE.MeshBasicMaterial({ color:0x7C3AED, wireframe:true, transparent:true, opacity:0.45 });
      coreGroup.add(new THREE.Mesh(innerGeo, innerMat));

      // glow behind the core
      const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture(0x00E5FF), transparent:true, opacity:0.55, depthWrite:false
      }));
      glowSprite.scale.set(7,7,1);
      coreGroup.add(glowSprite);

      // ---- category orbit rings + nodes ----
      const cats = allCategories.length ? allCategories : ["GENERAL"];
      const nodes = [];
      cats.forEach((cat, idx)=>{
        const color = colorForIndex(idx);
        const radius = 3.4 + (idx % 2) * 0.9; // stagger rings so they don't overlap visually
        const tiltX = (idx * 0.35) - (cats.length*0.17);

        // orbit ring (visual guide)
        const ringGeo = new THREE.TorusGeometry(radius, 0.006, 8, 96);
        const ringMat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.25 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI/2 + tiltX;
        scene.add(ring);

        // node
        const nodeGroup = new THREE.Group();
        const nodeGeo = new THREE.SphereGeometry(0.14, 16, 16);
        const nodeMat = new THREE.MeshBasicMaterial({ color });
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
        nodeGroup.add(nodeMesh);

        const nodeGlow = new THREE.Sprite(new THREE.SpriteMaterial({
          map: makeGlowTexture(color), transparent:true, opacity:0.8, depthWrite:false
        }));
        nodeGlow.scale.set(1.1,1.1,1);
        nodeGroup.add(nodeGlow);

        nodeGroup.userData = { baseAngle:(idx/cats.length)*Math.PI*2, radius, tiltX, category:cat, mesh:nodeMesh };
        scene.add(nodeGroup);
        nodes.push(nodeGroup);
      });

      // ---- interactivity: hover + click ----
      const raycaster = new THREE.Raycaster();
      const mouseNDC = new THREE.Vector2();
      let hoveredNode = null;
      let focusTarget = null;   // camera dolly target
      let idleTimer = null;
      let autoRotate = true;

      function setHover(node){
        if (hoveredNode === node) return;
        if (hoveredNode) hoveredNode.userData.mesh.scale.set(1,1,1);
        hoveredNode = node;
        if (hoveredNode){
          hoveredNode.userData.mesh.scale.set(1.6,1.6,1.6);
          tooltip.textContent = hoveredNode.userData.category.toUpperCase();
          tooltip.hidden = false;
        } else {
          tooltip.hidden = true;
        }
      }

      function pickNode(clientX, clientY){
        const rect = canvas.getBoundingClientRect();
        mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouseNDC, camera);
        const meshes = nodes.map(n => n.userData.mesh);
        const hits = raycaster.intersectObjects(meshes);
        if (hits.length === 0) return null;
        return nodes.find(n => n.userData.mesh === hits[0].object) || null;
      }

      canvas.addEventListener("mousemove", (e)=>{
        const node = pickNode(e.clientX, e.clientY);
        setHover(node);
        if (node){
          const rect = canvas.getBoundingClientRect();
          tooltip.style.left = (e.clientX - rect.left) + "px";
          tooltip.style.top = (e.clientY - rect.top) + "px";
        }
      });
      canvas.addEventListener("mouseleave", ()=> setHover(null));

      canvas.addEventListener("click", (e)=>{
        const node = pickNode(e.clientX, e.clientY);
        if (!node) return;
        // wire the 3D node directly into the existing category filter + grid
        activeCategory = node.userData.category;
        renderChips();
        renderGrid();
        document.getElementById("archive").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
        focusTarget = node;
        autoRotate = false;
        clearTimeout(idleTimer);
        idleTimer = setTimeout(()=>{ focusTarget = null; autoRotate = true; }, 4000);
      });

      // subtle cursor parallax
      let mouseX = 0, mouseY = 0;
      window.addEventListener("mousemove", (e)=>{
        mouseX = (e.clientX / window.innerWidth - 0.5);
        mouseY = (e.clientY / window.innerHeight - 0.5);
      });

      let t = 0;
      function animate(){
        requestAnimationFrame(animate);
        t += 0.003;

        coreGroup.rotation.y += 0.002;
        coreGroup.rotation.x += 0.0008;
        const pulse = 1 + Math.sin(t*8) * 0.03;
        coreGroup.scale.set(pulse, pulse, pulse);

        nodes.forEach((node)=>{
          const speed = autoRotate ? 1 : 0.15;
          const angle = node.userData.baseAngle + t * speed;
          const r = node.userData.radius;
          node.position.set(
            Math.cos(angle) * r,
            Math.sin(node.userData.tiltX) * r * 0.35,
            Math.sin(angle) * r
          );
        });

        if (focusTarget){
          const targetPos = focusTarget.position.clone().multiplyScalar(1.6);
          camera.position.lerp(targetPos, 0.04);
        } else {
          const drift = defaultCamPos.clone();
          drift.x += mouseX * 1.5;
          drift.y += -mouseY * 1.5;
          camera.position.lerp(drift, 0.02);
        }
        camera.lookAt(0,0,0);

        renderer.render(scene, camera);
      }
      animate();
    } catch(err){
      console.error("3D core failed to initialize:", err);
      canvas.hidden = true;
      fallbackNote.hidden = false;
    }
  })();

})();
