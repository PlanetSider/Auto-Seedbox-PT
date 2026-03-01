/**
 * Auto-Seedbox-PT (ASP) Screenshot 前端扩展
 * 由 Nginx 动态注入：/asp-screenshot.js
 */
(function() {
  console.log("📸 [ASP] Screenshot v1.3 已加载！");

  const SS_API = "/api/ss";

  const script = document.createElement('script');
  script.src = "/sweetalert2.all.min.js";
  document.head.appendChild(script);

  function getCurrentDir() {
    let path = window.location.pathname.replace(/^\/files/, '');
    return decodeURIComponent(path) || '/';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    return new Promise((resolve, reject) => {
      document.execCommand("copy") ? resolve() : reject(new Error("copy failed"));
      textArea.remove();
    });
  }


  let lastRightClickedFile = "";
  document.addEventListener('contextmenu', function(e) {
    let row = e.target.closest('.item');
    if (row) {
      let nameEl = row.querySelector('.name');
      if (nameEl) lastRightClickedFile = nameEl.innerText.trim();
    } else lastRightClickedFile = "";
  }, true);

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.asp-ss-btn-class') && !e.target.closest('.item[aria-selected="true"]')) lastRightClickedFile = "";
  }, true);

  const isMedia = (file) => file && file.match(/\.(mp4|mkv|avi|ts|m2ts|mov|webm|mpg|mpeg|wmv|flv|vob|iso)$/i);

  async function probeVideo(fullPath) {
    try {
      const r = await fetch(`${SS_API}?file=${encodeURIComponent(fullPath)}&probe=1`, { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j && j.meta) return j.meta;
    } catch (e) {}
    return { width: null, height: null, duration: null };
  }

  function clamp(v, lo, hi, fallback) {
    v = parseInt(v, 10);
    if (!Number.isFinite(v)) return fallback;
    return Math.max(lo, Math.min(hi, v));
  }

  async function promptSettings(fileName) {
    if (typeof Swal === 'undefined') {
      alert('UI is still loading, please retry in a moment.');
      return null;
    }

    const fullPath = (getCurrentDir() + '/' + fileName).replace(/\/\//g, '/');

    Swal.fire({
      title: 'Reading media metadata...',
      html: 'Detecting source resolution for better defaults.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const meta = await probeVideo(fullPath);
    const origW = clamp(meta.width, 320, 3840, 1280);
    const origH = meta.height ? clamp(meta.height, 240, 2160, null) : null;

    const presetWs = [origW, 3840, 2560, 1920, 1280, 960, 720]
      .filter((v, i, a) => a.indexOf(v) === i)
      .filter((v) => v >= 320 && v <= 3840);
    const presetNs = [6, 8, 10, 12, 16];

    const html = `
      <style>
        .ss-wrap{background:linear-gradient(145deg,#0b1220 0%,#111a2f 45%,#0f172a 100%);border:1px solid rgba(148,163,184,.26);border-radius:18px;padding:16px 16px 14px;color:#e2e8f0;text-align:left;box-shadow:0 16px 40px rgba(2,6,23,.35)}
        .ss-head{margin-bottom:14px}
        .ss-title{font-size:16px;font-weight:800;letter-spacing:.2px}
        .ss-sub{margin-top:6px;font-size:12px;opacity:.88;line-height:1.5}
        .ss-sub code{padding:2px 6px;border-radius:8px;background:rgba(15,23,42,.75);border:1px solid rgba(148,163,184,.35)}
        .ss-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
        .ss-pill{font-size:11px;padding:4px 8px;border-radius:999px;background:rgba(30,41,59,.92);border:1px solid rgba(148,163,184,.35)}
        .ss-form{display:grid;grid-template-columns:140px 1fr;gap:12px 12px;align-items:start}
        .ss-form label{padding-top:8px;font-size:12px;opacity:.9;font-weight:700;letter-spacing:.2px}
        .ss-control{display:flex;flex-direction:column;gap:8px}
        .ss-form input[type='number']{width:100%;padding:10px 12px;border-radius:12px;border:1px solid rgba(148,163,184,.42);background:rgba(15,23,42,.78);color:#f8fafc;outline:none}
        .ss-form input[type='number']:focus{border-color:#22d3ee;box-shadow:0 0 0 3px rgba(34,211,238,.2)}
        .ss-form input[type='range']{width:100%;accent-color:#22d3ee}
        .ss-chiprow{display:flex;flex-wrap:wrap;gap:8px}
        .ss-chip{cursor:pointer;user-select:none;padding:6px 10px;border-radius:999px;border:1px solid rgba(148,163,184,.35);background:rgba(15,23,42,.7);font-size:12px;transition:.2s ease}
        .ss-chip:hover{transform:translateY(-1px);border-color:rgba(103,232,249,.8);background:rgba(6,182,212,.2)}
        .ss-help{font-size:12px;opacity:.8;line-height:1.5}
        .ss-value{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;background:rgba(15,23,42,.8);border:1px solid rgba(148,163,184,.32)}
        @media (max-width:760px){.ss-form{grid-template-columns:1fr}.ss-form label{padding-top:0}}
      </style>

      <div class='ss-wrap'>
        <div class='ss-head'>
          <div class='ss-title'>Screenshot Studio</div>
          <div class='ss-sub'>File: <code>${escapeHtml(fileName)}</code></div>
          <div class='ss-meta'>
            <span class='ss-pill'>Source: ${origW}${origH ? 'x' + origH : ''}</span>
            <span class='ss-pill'>Output: JPG + ZIP</span>
            <span class='ss-pill'>Temp: /tmp/asp_screens</span>
          </div>
        </div>

        <div class='ss-form'>
          <label>Screenshots</label>
          <div class='ss-control'>
            <input id='ss_n' type='number' min='1' max='20' value='6'/>
            <div class='ss-chiprow' id='ss_n_chips'>
              ${presetNs.map((n) => `<span class='ss-chip' data-n='${n}'>${n} shots</span>`).join('')}
            </div>
          </div>

          <label>Width</label>
          <div class='ss-control'>
            <input id='ss_w' type='number' min='320' max='3840' value='${origW}'/>
            <div class='ss-chiprow' id='ss_w_chips'>
              ${presetWs.map((w) => `<span class='ss-chip' data-w='${w}'>${w}${w === origW ? ' (source)' : ''}</span>`).join('')}
            </div>
          </div>

          <label>Skip Head (%)</label>
          <div class='ss-control'>
            <input id='ss_head' type='range' min='0' max='20' value='5'/>
            <div class='ss-help'>Current <span class='ss-value'><span id='ss_head_v'>5</span>%</span></div>
          </div>

          <label>Skip Tail (%)</label>
          <div class='ss-control'>
            <input id='ss_tail' type='range' min='0' max='20' value='5'/>
            <div class='ss-help'>Current <span class='ss-value'><span id='ss_tail_v'>5</span>%</span></div>
          </div>

          <label>Tips</label>
          <div class='ss-help'>Head/Tail skip helps avoid OP/ED and credits. Set to 0 when full-range capture is needed.</div>
        </div>
      </div>
    `;

    const result = await Swal.fire({
      title: 'Screenshot Settings',
      html,
      width: 840,
      showCancelButton: true,
      confirmButtonText: 'Start Capture',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#475569',
      didOpen: () => {
        const head = document.getElementById('ss_head');
        const tail = document.getElementById('ss_tail');
        const hv = document.getElementById('ss_head_v');
        const tv = document.getElementById('ss_tail_v');
        head.addEventListener('input', () => { hv.textContent = head.value; });
        tail.addEventListener('input', () => { tv.textContent = tail.value; });

        const nInput = document.getElementById('ss_n');
        const wInput = document.getElementById('ss_w');

        document.getElementById('ss_n_chips').addEventListener('click', (e) => {
          const t = e.target.closest('.ss-chip');
          if (!t) return;
          const n = t.getAttribute('data-n');
          if (n) nInput.value = n;
        });

        document.getElementById('ss_w_chips').addEventListener('click', (e) => {
          const t = e.target.closest('.ss-chip');
          if (!t) return;
          const w = t.getAttribute('data-w');
          if (w) wInput.value = w;
        });
      },
      preConfirm: () => {
        const n = clamp(document.getElementById('ss_n').value, 1, 20, 6);
        const w = clamp(document.getElementById('ss_w').value, 320, 3840, origW);
        const head = clamp(document.getElementById('ss_head').value, 0, 20, 5);
        const tail = clamp(document.getElementById('ss_tail').value, 0, 20, 5);
        return { n, width: w, head, tail, fullPath, meta };
      }
    });

    if (!result.isConfirmed) {
      Swal.close();
      return null;
    }
    return result.value;
  }

  function openScreenshot(fileName) {
    promptSettings(fileName).then((opt) => {
      if (!opt) return;

      Swal.fire({
        title: 'Generating screenshots...',
        html: `Count <b>${opt.n}</b> / Width <b>${opt.width}</b> / Head <b>${opt.head}%</b> / Tail <b>${opt.tail}%</b>`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const url = `${SS_API}?file=${encodeURIComponent(opt.fullPath)}&n=${opt.n}&width=${opt.width}&head=${opt.head}&tail=${opt.tail}&fmt=jpg&zip=1`;

      fetch(url, { cache: 'no-store' })
        .then((r) => r.json().then((j) => ({ ok: r.ok, status: r.status, json: j })))
        .then(({ ok, status, json }) => {
          if (!ok || !json || !json.base || !Array.isArray(json.files) || json.files.length === 0) {
            const msg = (json && json.error) ? json.error : `Request failed (HTTP ${status})`;
            throw new Error(msg);
          }

          const base = json.base;
          const imgs = json.files.map((f) => `${base}${f}`);
          const absoluteImgs = imgs.map((u) => new URL(u, window.location.origin).href);
          const allLinksText = absoluteImgs.join('\n');
          const zipUrl = json.zip ? `${base}${json.zip}` : null;

          let html = `<style>
            .ss-panel{background:linear-gradient(160deg,#081226 0%,#111827 45%,#101a33 100%);border:1px solid rgba(148,163,184,.25);border-radius:18px;padding:14px;color:#e5e7eb;box-shadow:0 16px 42px rgba(2,6,23,.38)}
            .ss-top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
            .ss-file{font-size:13px;opacity:.95}
            .ss-file code{padding:3px 7px;border-radius:7px;background:rgba(15,23,42,.75);border:1px solid rgba(148,163,184,.32)}
            .ss-badges{display:flex;gap:8px;flex-wrap:wrap}
            .ss-badge{font-size:11px;padding:4px 8px;border-radius:999px;background:rgba(2,132,199,.18);border:1px solid rgba(125,211,252,.45)}
            .ss-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}
            .ss-card{border-radius:14px;overflow:hidden;border:1px solid rgba(148,163,184,.28);background:rgba(15,23,42,.65);transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
            .ss-card:hover{transform:translateY(-2px);border-color:rgba(34,211,238,.85);box-shadow:0 8px 20px rgba(6,182,212,.22)}
            .ss-bar{padding:8px 10px;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(90deg,rgba(15,23,42,.2),rgba(15,23,42,.65));font-size:12px}
            .ss-idx{font-weight:800}
            .ss-tip{opacity:.72}
            .ss-img{width:100%;display:block}
            .ss-foot{margin-top:12px;padding:10px;border-radius:12px;background:rgba(15,23,42,.78);border:1px solid rgba(148,163,184,.28);font-size:12px;line-height:1.6}
            .ss-foot code{padding:2px 6px;border-radius:7px;background:rgba(30,41,59,.86)}
            .ss-links{margin-top:8px;word-break:break-all}
            .ss-links a{color:#7dd3fc;text-decoration:none}
            .ss-links a:hover{text-decoration:underline}
            @media (max-width:760px){.ss-grid{grid-template-columns:1fr}}
          </style>`;

          html += `<div class='ss-panel'>`;
          html += `<div class='ss-top'><div class='ss-file'>File: <code>${escapeHtml(fileName)}</code></div><div class='ss-badges'><span class='ss-badge'>${imgs.length} shots</span><span class='ss-badge'>Width ${opt.width}</span><span class='ss-badge'>Head/Tail ${opt.head}% / ${opt.tail}%</span></div></div>`;
          html += `<div class='ss-grid'>` + imgs.map((u, i) => `
              <a href='${u}' target='_blank' style='text-decoration:none'>
                <div class='ss-card'>
                  <div class='ss-bar'><div class='ss-idx'>#${i + 1}</div><div class='ss-tip'>Open image</div></div>
                  <img class='ss-img' src='${u}' loading='lazy'/>
                </div>
              </a>`).join('') + `</div>`;
          html += `<div class='ss-foot'>ZIP package: <code>${json.zip || 'N/A'}</code><div class='ss-links'>${zipUrl ? `ZIP download: <a href='${zipUrl}' target='_blank'>${zipUrl}</a>` : 'ZIP unavailable, use Copy All Links to copy each image URL.'}</div></div>`;
          html += `</div>`;

          Swal.fire({
            title: 'Screenshots Ready',
            html,
            width: '980px',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Download ZIP',
            denyButtonText: 'Copy All Links',
            cancelButtonText: 'Close',
            confirmButtonColor: '#0284c7',
            denyButtonColor: '#0f766e',
            cancelButtonColor: '#475569'
          }).then((result) => {
            if (result.isConfirmed) {
              if (zipUrl) {
                window.open(zipUrl, '_blank');
              } else if (imgs[0]) {
                window.open(imgs[0], '_blank');
              }
            } else if (result.isDenied) {
              copyText(allLinksText).then(() => {
                Swal.fire({
                  toast: true,
                  position: 'top-end',
                  icon: 'success',
                  title: `Copied ${imgs.length} screenshot links`,
                  showConfirmButton: false,
                  timer: 2000
                });
              }).catch(() => {
                Swal.fire('Copy failed', 'Please copy from preview links.', 'error');
              });
            } else {
              Swal.close();
            }
          });
        })
        .catch((e) => Swal.fire('Screenshot failed', e.toString(), 'error'));
    });
  }

  // 注入按钮（仿 MediaInfo）
  let observerTimer = null;
  const observer = new MutationObserver(() => {
    if (observerTimer) clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      let targetFile = "";
      if (lastRightClickedFile) targetFile = lastRightClickedFile;
      else {
        let selectedRows = document.querySelectorAll('.item[aria-selected="true"], .item.selected');
        if (selectedRows.length === 1) {
          let nameEl = selectedRows[0].querySelector('.name');
          if (nameEl) targetFile = nameEl.innerText.trim();
        }
      }

      let ok = isMedia(targetFile);

      let menus = new Set();
      document.querySelectorAll('button[aria-label="Info"]').forEach(btn => {
        if (btn.parentElement) menus.add(btn.parentElement);
      });

      menus.forEach(menu => {
        let existingBtn = menu.querySelector('.asp-ss-btn-class');
        if (ok) {
          if (!existingBtn) {
            let btn = document.createElement('button');
            btn.className = 'action asp-ss-btn-class';
            btn.setAttribute('title', 'Screenshot');
            btn.setAttribute('aria-label', 'Screenshot');
            btn.innerHTML = '<i class="material-icons">photo_camera</i><span>Screenshot</span>';

            btn.onclick = function(ev) {
              ev.preventDefault();
              ev.stopPropagation();
              document.body.click();
              openScreenshot(targetFile);
            };

            let miBtn = menu.querySelector('.asp-mi-btn-class');
            if (miBtn) miBtn.insertAdjacentElement('afterend', btn);
            else {
              let infoBtn = menu.querySelector('button[aria-label="Info"]');
              if (infoBtn) infoBtn.insertAdjacentElement('afterend', btn);
              else menu.appendChild(btn);
            }
          } else {
            let miBtn = menu.querySelector('.asp-mi-btn-class');
            if (miBtn && existingBtn.previousElementSibling !== miBtn) miBtn.insertAdjacentElement('afterend', existingBtn);
          }
        } else {
          if (existingBtn) existingBtn.remove();
        }
      });
    }, 100);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
