/* scripts.js — upgrades: dynamic-form ragebait + neutral note system + data-loss button */
(function () {
  'use strict';

  // CONFIG
  const MAX_NOTES = 8;
  const SPAWN_INTERVAL = 2200;
  const DEBUG = false; // set true to see console logs

  // minimal helpers
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const rint = (a,b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const randHex = () => '#'+Math.floor(Math.random()*0xFFFFFF).toString(16).padStart(6,'0');

  // ---------- neutral note system (cap enforced) ----------
  let spawnNotes = true;
  let noteCount = 0;
  const activeNotes = new Set();

  function ensureOverlay() {
    if ($('#note-debug-overlay')) return;
    const o = document.createElement('div');
    o.id = 'note-debug-overlay';
    o.style.position = 'fixed';
    o.style.right = '10px';
    o.style.top = '10px';
    o.style.zIndex = 2147483646;
    o.style.background = 'rgba(0,0,0,0.7)';
    o.style.color = '#fff';
    o.style.padding = '8px';
    o.style.fontSize = '13px';
    o.style.border = '2px solid #ff66cc';
    o.style.borderRadius = '6px';
    o.innerHTML = `<div id="note-count">Notes: 0 / ${MAX_NOTES}</div><div style="margin-top:6px"><button id="note-toggle-btn">Toggle Notes (P)</button></div>`;
    document.body.appendChild(o);
    $('#note-toggle-btn').addEventListener('click', toggleNotes);
  }
  ensureOverlay();
  function setOverlayCount(n) {
    const el = $('#note-count'); if (el) el.textContent = `Notes: ${n} / ${MAX_NOTES}`;
    if (DEBUG) console.log('[notes]', n, '/', MAX_NOTES);
  }

  function makeNote(opts = {}) {
    try {
      if (!spawnNotes) return null;
      if (noteCount >= MAX_NOTES) return null;

      const node = document.createElement('div');
      node.className = 'ui-note';
      node.style.position = 'fixed';
      node.style.left = rint(10,85) + '%';
      node.style.top = rint(12,80) + '%';
      node.style.transform = 'translate(-50%,-50%)';
      node.style.zIndex = 2147483000 + rint(1,999);
      node.style.padding = '12px';
      node.style.border = '3px solid yellow';
      node.style.background = 'linear-gradient(90deg,' + randHex() + ',' + randHex() + ')';
      node.style.color = '#000';
      node.style.minWidth = '240px';
      node.style.borderRadius = '8px';
      node.dataset.open = '1';
      node.innerHTML = `
        <a href="#" class="ui-note-close" style="position:absolute; right:8px; top:6px; text-decoration:none; color:#111; font-weight:800;">✕</a>
        <div style="font-weight:800; margin-bottom:6px;">${opts.title || 'NOTICE'}</div>
        <div style="margin-bottom:8px;">${opts.text || 'Something important.'}</div>
        <div style="text-align:right;"><button class="ui-note-act">OK</button></div>
      `;
      document.body.appendChild(node);
      activeNotes.add(node);
      noteCount = Math.min(MAX_NOTES, noteCount + 1);
      setOverlayCount(noteCount);

      function closeIt(ev) {
        if (ev) ev.preventDefault();
        if (node.dataset.open !== '1') return;
        node.dataset.open = '0';
        if (node.parentNode) node.remove();
        activeNotes.delete(node);
        noteCount = Math.max(0, noteCount - 1);
        setOverlayCount(noteCount);

        // penalty spawn: up to available slots (max 2)
        const slots = Math.max(0, MAX_NOTES - noteCount);
        const toSpawn = Math.min(2, slots);
        for (let i=0;i<toSpawn;i++) {
          setTimeout(() => {
            if (spawnNotes && noteCount < MAX_NOTES) makeNote({ title: 'REMINDER', text: 'You cannot escape.' });
          }, 200 + i*120);
        }
      }

      const x = node.querySelector('.ui-note-close');
      if (x) x.addEventListener('click', closeIt);
      const ok = node.querySelector('.ui-note-act');
      if (ok) ok.addEventListener('click', function (e) {
        e.preventDefault();
        try { window.open('https://example.com','_blank'); } catch (err) {}
      });

      return node;
    } catch (err) {
      console.error('[makeNote]', err);
      return null;
    }
  }

  const spawner = setInterval(() => {
    if (!spawnNotes) return;
    if (noteCount < MAX_NOTES && Math.random() > 0.45) makeNote();
  }, SPAWN_INTERVAL);

  function toggleNotes() {
    spawnNotes = !spawnNotes;
    if (!spawnNotes) {
      activeNotes.forEach(n => { try { n.dataset.open='0'; if (n.parentNode) n.remove(); } catch(e){} });
      activeNotes.clear();
      noteCount = 0;
      setOverlayCount(noteCount);
    }
  }
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'p' || ev.key === 'P') { ev.preventDefault(); toggleNotes(); }
  });

  // ---------- dynamic validation rules (ragebait) ----------
  const zodiac = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
  // const emojis = ['😀','😈','🔥','🌶️','🍕','🦄','🐹','✨','💀','🤡'];
  const emojis = [':happy',':frustrated'];

  function randomRules() {
    // create a set of requirements that change every time
    // Name: either contains emoji, or length multiple of N, or at least K words
    // Email: either local-part is palindrome OR contains substring OR ends with a random token
    // Password: combination requirement (zodiac + number + special + emoji)
    const nameRuleType = rint(1,3);
    const nameRule = (name) => {
      if (nameRuleType === 1) return emojis[Math.floor(Math.random()*emojis.length)];
      if (nameRuleType === 2) return (rint(2,4)); // words required
      return (rint(6,12)); // length multiple target
    };
    const emailRuleType = rint(1,3);
    let emailRule;
    if (emailRuleType === 1) {
      const s = (Math.random() > 0.5 ? 'xyz' : 'ooo' + rint(1,9));
      emailRule = { type:'contains', token: s };
    } else if (emailRuleType === 2) {
      emailRule = { type:'palindrome' };
    } else {
      const token = ['-vip','-bot','-99'][rint(0,2)];
      emailRule = { type:'endswith', token };
    }
    // password requirement compound
    const zodiacReq = zodiac[rint(0, zodiac.length - 1)];
    const needEmoji = emojis[rint(0, emojis.length - 1)];
    const specialChars = '!@#$%^&*';
    const minLen = rint(8, 14);
    return {
      nameRuleType,
      nameRule,
      emailRule,
      passwordReq: { zodiac: zodiacReq, emoji: needEmoji, minLen, requireNumber: Math.random() > 0.4, special: specialChars[rint(0,specialChars.length-1)] }
    };
  }

  let currentRules = randomRules();

  function describeRules(r) {
    const parts = [];
    // name
    if (r.nameRuleType === 1) {
      parts.push(`Name must include this emoji somewhere: ${r.nameRule()}`);
    } else if (r.nameRuleType === 2) {
      parts.push(`Name must have at least ${r.nameRule()} words (yes, words).`);
    } else {
      parts.push(`Name length must be a multiple of ${r.nameRule()} characters. (Good luck)`);
    }
    // email
    const e = r.emailRule;
    if (e.type === 'contains') parts.push(`Email local-part must contain "${e.token}".`);
    else if (e.type === 'palindrome') parts.push(`Email local-part must be a palindrome (e.g. bob@...)`);
    else parts.push(`Email must end with "${e.token}" before the @ (yes, really).`);
    // password
    const p = r.passwordReq;
    let pdesc = `Password: at least ${p.minLen} chars, must include the zodiac "${p.zodiac}" and the emoji ${p.emoji}`;
    if (p.requireNumber) pdesc += ', and at least one number';
    pdesc += `, and a "${p.special}" character.`;
    parts.push(pdesc);
    return parts.join(' ');
  }

  function showRules() {
    const el = $('#rules');
    if (!el) return;
    el.textContent = describeRules(currentRules);
  }
  showRules();

  function validateForm(name, email, pass) {
    // name
    const r = currentRules;
    if (r.nameRuleType === 1) {
      const emot = r.nameRule();
      if (!name.includes(emot)) return { ok:false, msg:`Name must include ${emot}` };
    } else if (r.nameRuleType === 2) {
      const needWords = r.nameRule();
      const words = name.trim().split(/\s+/).filter(Boolean).length;
      if (words < needWords) return { ok:false, msg:`Name must have at least ${needWords} words` };
    } else {
      const m = r.nameRule();
      if (name.length === 0 || (name.length % m !== 0)) return { ok:false, msg:`Name length must be a multiple of ${m}` };
    }

    // email
    const parts = (email || '').split('@');
    if (parts.length < 2) return { ok:false, msg:'Email must look like name@domain.tld' };
    const local = parts[0];
    const eR = r.emailRule;
    if (eR.type === 'contains') {
      if (!local.includes(eR.token)) return { ok:false, msg:`Email local-part must contain "${eR.token}"` };
    } else if (eR.type === 'palindrome') {
      const s = local.replace(/[^a-z0-9]/gi,'').toLowerCase();
      if (s.length === 0 || s !== s.split('').reverse().join('')) return { ok:false, msg:'Email local-part must be a palindrome' };
    } else {
      if (!local.endsWith(eR.token.replace(/^-/,''))) return { ok:false, msg:`Email local-part must end with "${eR.token}"` };
    }

    // password
    const p = r.passwordReq;
    if ((pass || '').length < p.minLen) return { ok:false, msg:`Password must be at least ${p.minLen} characters` };
    if (!pass.toLowerCase().includes(p.zodiac)) return { ok:false, msg:`Password must include your zodiac "${p.zodiac}"` };
    if (!pass.includes(p.emoji)) return { ok:false, msg:`Password must include the emoji ${p.emoji}` };
    if (p.requireNumber && !(/\d/.test(pass))) return { ok:false, msg:'Password must include at least one number' };
    if (!pass.includes(p.special)) return { ok:false, msg:`Password must include "${p.special}"` };
    return { ok:true, msg:'ok' };
  }

  // ---------- form handling ----------
  const form = $('#ragebait-form');
  const nameIn = $('#name');
  const emailIn = $('#email');
  const passIn = $('#password');
  const status = $('#status');
  const savedArea = $('#saved-area');

  function flashStatus(txt, bad) {
    if (!status) return;
    status.textContent = txt;
    status.classList.toggle('danger', !!bad);
    setTimeout(() => { if (status.textContent === txt) status.textContent = ''; }, 2800);
  }

  function clearForm(leaveMsg) {
    try {
      // clear most fields (but not all to be mean)
      if (leaveMsg) {
        nameIn.value = '';
        emailIn.value = '';
      } else {
        nameIn.value = '';
        emailIn.value = '';
        passIn.value = '';
      }
    } catch (e) {}
  }

  function saveProfile(profile) {
    try {
      // store in localStorage
      localStorage.setItem('rage:profile', JSON.stringify(profile));
      savedArea.textContent = `Saved (maybe): ${profile.name} / ${profile.email}`;
    } catch (e) {
      savedArea.textContent = 'Save failed (storage blocked).';
    }
  }

  // Submit handler
  if (form) {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const name = (nameIn.value || '').trim();
      const email = (emailIn.value || '').trim();
      const pass = (passIn.value || '');

      const v = validateForm(name, email, pass);
      if (!v.ok) {
        // failure: escalate frustration — clear, show rules changed, spawn notes
        flashStatus('Validation failed: ' + v.msg, true);
        // spawn a note or two as harassment
        makeNote({ title: 'ERROR', text: v.msg });
        // intentionally clear everything to rage-bait (but sometimes leave email for tease)
        clearForm(Math.random() > 0.5);
        // slightly change rules for next attempt
        currentRules = randomRules();
        showRules();
        // small frustration bump stored
        try { localStorage.setItem('bestsite:frustration', String((parseInt(localStorage.getItem('bestsite:frustration')||'0')||0) + 3)); } catch(e){}
        return;
      }

      // success: show fake saving spinner, store, and sometimes still rage
      flashStatus('Saving... please wait (no really)', false);

      // small spinner simulation
      const loader = document.createElement('span');
      loader.className = 'blink';
      loader.textContent = ' ⏳';
      status.appendChild(loader);

      // setTimeout(() => {
      //   try {
      //     saveProfile({ name, email, pass: '••••••' });
      //     flashStatus('Saved! You did it. (Sort of)', false);
      //     // sometimes still spawn a note as "confirmation"
      //     if (Math.random() > 0.3) makeNote({ title: 'CONFIRM', text: 'Your registration is provisional.' });
      //     // mutate rules after successful save (so next time is different)
      //     currentRules = randomRules();
      //     showRules();
      //     // increment frustration slightly
      //     try { localStorage.setItem('bestsite:frustration', String((parseInt(localStorage.getItem('bestsite:frustration')||'0')||0) + 1)); } catch(e){}
      //   } finally {
      //     if (loader.parentNode) loader.remove();
      //   }
      // }, 1200 + Math.random()*1200);


      // Redirect after a short delay
      setTimeout(() => {
          try {
              // We can still save this, so it appears on next visit
              saveProfile({ name, email, pass: '••••••' }); 
          } catch(e) {
              console.warn('Could not save profile to localStorage', e);
          }

          // The main action: redirect
          window.location.href = 'hello.html';

      }, 1500); // A fixed 1.5 second delay
    });
  }

  // ---------- Lose All Your Data button ----------
  const loseBtn = $('#lose-data-btn');
  if (loseBtn) {
    loseBtn.addEventListener('click', () => {
      // theatrical fake confirm box (not the browser confirm)
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.right = '0';
      overlay.style.bottom = '0';
      overlay.style.background = 'rgba(0,0,0,0.85)';
      overlay.style.zIndex = 2147483647;
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.innerHTML = `
        <div style="background:#111;color:#fff;padding:22px;border:4px solid red;border-radius:10px;max-width:540px;text-align:center;">
          <div style="font-size:20px;font-weight:900;margin-bottom:8px;">Are you sure? THIS WILL ERASE YOUR DATA FOREVER</div>
          <div style="margin-bottom:12px;">Type <b>DELETE</b> to proceed:</div>
          <input id="confirm-erase" style="padding:8px;border-radius:6px;border:2px solid #444;width:80%;display:block;margin:8px auto 12px auto;text-align:center;" />
          <div><button id="confirm-yes" style="margin-right:8px;background:red;border:3px solid yellow;">Yes, erase</button><button id="confirm-no">Cancel</button></div>
        </div>
      `;
      document.body.appendChild(overlay);
      const input = $('#confirm-erase');
      const yes = $('#confirm-yes');
      const no = $('#confirm-no');

      no.addEventListener('click', () => { if (overlay.parentNode) overlay.remove(); });

      yes.addEventListener('click', () => {
        if (!input.value || input.value.toUpperCase() !== 'DELETE') {
          // be mean: clear input and spawn a note
          input.value = '';
          makeNote({ title: 'NOPE', text: 'You must type DELETE in ALL CAPS.' });
          return;
        }
        try {
          // actual erase
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {}
        // dramatic message
        overlay.innerHTML = `<div style="background:#111;color:#fff;padding:22px;border:4px solid #ff6a00;border-radius:10px;max-width:540px;text-align:center;">
          <div style="font-size:20px;font-weight:900;margin-bottom:8px;">All your data is gone</div>
          <div style="margin-bottom:12px;">We opened a new tab to celebrate (maybe).</div>
          <div style="font-size:12px;opacity:0.9;">If you still see something, refresh the page.</div>
        </div>`;
        // small flourish: open two tabs (may be blocked)
        try { window.open('https://www.google.com', '_blank'); } catch(e){}
        try { window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank'); } catch(e){}
        // remove after a moment
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 2700);
      });
    });
  }

  // ---------- Sanity toggle (Shift+S) ----------
  function toggleSanity() {
    document.body.classList.toggle('sanity-mode');
    // when sanity on, remove notes and pause spawns
    const on = document.body.classList.contains('sanity-mode');
    if (on) {
      // clear notes
      activeNotes.forEach(n => { try { n.dataset.open='0'; if (n.parentNode) n.remove(); } catch(e){} });
      activeNotes.clear();
      noteCount = 0;
      setOverlayCount(noteCount);
      spawnNotes = false;
    } else {
      spawnNotes = true;
    }
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.shiftKey && (ev.key === 'S' || ev.key === 's')) { ev.preventDefault(); toggleSanity(); }
  });

  // small helper: show/save stored profile on load
  try {
    const stored = localStorage.getItem('rage:profile');
    if (stored) {
      try { const p = JSON.parse(stored); if (p && savedArea) savedArea.textContent = `Saved: ${p.name} / ${p.email}`; } catch(e){}
    }
  } catch (e) {}

  // expose API for debugging/testing
  window._ragekit = {
    makeNote,
    toggleNotes,
    get noteCount() { return noteCount; },
    MAX_NOTES
  };

})();

