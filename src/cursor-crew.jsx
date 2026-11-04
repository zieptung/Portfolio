import React, { useEffect, useRef } from 'react';

// A crew of "agents" that type the page's text as it comes into view, then select and check other parts.
// Text stays in the DOM the whole time: untyped characters are only painted transparent through the
// CSS Custom Highlight API, so layout, screen readers and React's own text nodes are left alone.
const COLORS = ['#ff5d65', '#4cc9f0', '#ffd166', '#7ae582', '#c77dff', '#ff9f68', '#5eead4', '#f472b6', '#a3e635', '#93c5fd'];
const CREW = ['api', 'db', 'ui', 'qa', 'deploy', 'auth', 'cache', 'queue', 'test', 'docs', 'git', 'ci', 'log', 'bot', 'sql']
  .map((name, i) => ({ name: `${name}-agent`, color: COLORS[i % COLORS.length] }));
const PHONE_CREW = 8;
const TASKS = ['refactor', 'lint', 'review', 'test', 'fix', 'optimize', 'commit', 'deploy'];
// Every text on the page gets typed except these: the moving tech rail, form fields and anything not on screen yet.
const TEXT_SKIP = '.crew, .skip-link, .brand-viewport, .brand-full-grid, .mobile-menu, .project-dialog, form, noscript';
const BOX_TARGETS = [
  '.primary-link', '.reel-button', '.hero-manifesto', '.hero-stats > div', '.hero-stats > a',
  '.text-link', '.filters button', '.search-box', '.project-card', '.brand-all', '.brand-viewport', '.outline-button',
  '.award-total', '.recognition-row', '.award-expand', '.flow-list li',
  '.education-row', '.skill-tags span', '.process-row', '.quote-panel', '.experience-row', '.award-list button',
  '.contact-cta', '.contact-links > a', '.contact-links > div', '.project-brief summary',
].join(',');
const WAIT_MS = 9000;
const ORBIT_GAP = 30;
const ORBIT_MARGIN = 46;
const ORBIT_SPEED = 0.5;
const ORBIT_WIGGLE = 10;
const ORBIT_TARGETS = ['.reel-screen', '.contact-links'];
const END_OF_PAGE = 160;
const ICON_ANGLE = 116; // the arrow's own tilt, in degrees
const DRAW_MS = 380;
const MAX_BOXES = 10;
const BOX_FIRST = 0.4;
const PAD = 3;
const COMPACT_BOX = 46;
const HIGHLIGHT = 'crew-hidden';

const random = (min, max) => min + Math.random() * (max - min);
const pick = list => list[Math.floor(Math.random() * list.length)];

// Groups every visible text node under its nearest block element, so one agent types one block.
function textBlocks() {
  const blocks = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.nodeValue.trim() || node.parentElement.closest(TEXT_SKIP)) continue;
    let block = node.parentElement;
    while (block !== document.body && getComputedStyle(block).display === 'inline') block = block.parentElement;
    if (!block.getClientRects().length) continue;
    if (!blocks.has(block)) blocks.set(block, []);
    blocks.get(block).push(node);
  }
  return blocks;
}

export default function CursorCrew({ enabled, lang }) {
  const layerRef = useRef(null);
  const seenText = useRef(new Set());
  const checked = useRef(new Set());
  const seenLang = useRef(lang);

  useEffect(() => {
    const layer = layerRef.current;
    if (!enabled || !layer) return undefined;
    if (seenLang.current !== lang) { seenLang.current = lang; seenText.current.clear(); checked.current.clear(); }

    let alive = true;
    const timers = new Set();
    const claimed = new Set();
    const sleepers = new Set();
    const tracked = new Set();
    const pending = new Set();
    const canType = typeof Highlight !== 'undefined' && !!window.CSS?.highlights;
    const hidden = canType ? new Highlight() : null;
    if (canType) CSS.highlights.set(HIGHLIGHT, hidden);

    const sleep = ms => new Promise(resolve => {
      const id = setTimeout(() => { timers.delete(id); resolve(); }, ms);
      timers.add(id);
    });
    const untilWork = () => new Promise(resolve => sleepers.add(resolve));
    const wakeCrew = () => {
      sleepers.forEach(resolve => resolve());
      sleepers.clear();
    };

    // Once the page is finished the free agents circle the contact card in single file.
    let finale = false;
    let busy = 0;
    let lastFrame = performance.now();
    const stepOrbit = now => {
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      if (!finale) return;
      const target = ORBIT_TARGETS.map(selector => document.querySelector(selector)).find(el => el?.getClientRects().length);
      if (!target) return;
      const r = target.getBoundingClientRect();
      const t = now / 1000;
      const centerX = r.left + r.width / 2;
      const centerY = r.top + r.height / 2 + window.scrollY;
      const radiusX = Math.min(r.width / 2 + ORBIT_MARGIN, window.innerWidth / 2 - 14);
      const radiusY = r.height / 2 + ORBIT_MARGIN;
      const step = ORBIT_GAP / ((radiusX + radiusY) / 2);
      let place = 0;
      agents.forEach(agent => {
        if (!agent.orbiting) return;
        place += 1;
        const angle = t * ORBIT_SPEED - place * step;
        const tangentRawX = -radiusX * Math.sin(angle);
        const tangentRawY = radiusY * Math.cos(angle);
        const length = Math.hypot(tangentRawX, tangentRawY);
        const tangentX = tangentRawX / length;
        const tangentY = tangentRawY / length;
        const sway = Math.sin(t * 6 * agent.jitter + agent.phase) * ORBIT_WIGGLE * agent.jitter;
        const slotX = centerX + radiusX * Math.cos(angle) - tangentY * sway;
        const slotY = centerY + radiusY * Math.sin(angle) + tangentX * sway;
        const far = Math.hypot(slotX - agent.x, slotY - agent.y) > 80;
        const ease = 1 - Math.exp(-dt * (far ? 4 : 16));
        agent.x += (slotX - agent.x) * ease;
        agent.y += (slotY - agent.y) * ease;
        const facing = Math.atan2(tangentY, tangentX) * 180 / Math.PI + ICON_ANGLE;
        agent.angle += (((facing - agent.angle + 540) % 360) - 180) * ease;
        agent.icon.style.transform = `rotate(${agent.angle}deg)`;
        agent.cursor.style.transitionDuration = '0ms';
        agent.cursor.style.transform = `translate3d(${agent.x}px, ${agent.y}px, 0)`;
      });
    };

    // Boxes follow their element every frame, because scroll effects and reveals keep moving it.
    let frame = 0;
    const track = () => {
      frame = requestAnimationFrame(track);
      layer.style.transform = `translate3d(0, ${-window.scrollY}px, 0)`;
      const now = performance.now();
      tracked.forEach(agent => {
        const r = agent.target.getBoundingClientRect();
        const left = r.left - PAD;
        const top = r.top + window.scrollY - PAD;
        const progress = 1 - (1 - Math.min(1, (now - agent.drawStart) / DRAW_MS)) ** 3;
        const width = (r.width + PAD * 2) * progress;
        const height = (r.height + PAD * 2) * progress;
        agent.box.style.transform = `translate3d(${left}px, ${top}px, 0)`;
        agent.box.style.width = `${width}px`;
        agent.box.style.height = `${height}px`;
        agent.x = left + width;
        agent.y = top + height;
        agent.cursor.style.transitionDuration = '0ms';
        agent.cursor.style.transform = `translate3d(${agent.x}px, ${agent.y}px, 0)`;
      });
      stepOrbit(now);
    };
    frame = requestAnimationFrame(track);

    const followScroll = () => { layer.style.transform = `translate3d(0, ${-window.scrollY}px, 0)`; };
    followScroll();
    window.addEventListener('scroll', followScroll, { passive: true });

    const reveal = item => { hidden.delete(item.range); pending.delete(item); };

    const blocks = canType ? textBlocks() : new Map();
    const offerText = el => {
      const nodes = blocks.get(el);
      if (!nodes || seenText.current.has(el)) return;
      seenText.current.add(el);
      const last = nodes[nodes.length - 1];
      const range = new Range();
      range.setStart(nodes[0], 0);
      range.setEnd(last, last.length);
      hidden.add(range);
      pending.add({ el, nodes, last, range, deadline: 0 });
      wakeCrew();
    };

    const nextText = agent => {
      let best = null;
      let bestDistance = Infinity;
      pending.forEach(item => {
        const r = item.el.getBoundingClientRect();
        if (r.bottom <= 0 || r.top > window.innerHeight) return;
        const distance = Math.hypot(r.left - agent.x, r.top + window.scrollY - agent.y);
        if (distance < bestDistance) { best = item; bestDistance = distance; }
      });
      if (best) pending.delete(best);
      return best;
    };

    const uncheckedBoxes = () => [...document.querySelectorAll(BOX_TARGETS)].filter(el => {
      if (claimed.has(el) || checked.current.has(el)) return false;
      const r = el.getBoundingClientRect();
      return r.width > 10 && r.height > 10 && r.height < window.innerHeight * 0.7 && r.top > 70 && r.bottom < window.innerHeight - 10 && r.left >= 0 && r.right <= window.innerWidth;
    });

    const nextBox = () => {
      if (claimed.size >= MAX_BOXES) return null;
      const options = uncheckedBoxes();
      if (!options.length) return null;
      const el = pick(options);
      claimed.add(el);
      return el;
    };

    const glide = (agent, x, y, ms) => {
      agent.x = x;
      agent.y = y;
      agent.cursor.style.transitionDuration = `${ms}ms`;
      agent.cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      return sleep(ms);
    };

    // Flights are deliberately messy: one or two random detours on the way to the target.
    const dart = async (agent, x, y, ms) => {
      const startX = agent.x;
      const startY = agent.y;
      const hops = Math.random() < 0.6 ? 2 : 1;
      const spread = Math.hypot(x - startX, y - startY) * 0.22 + 18;
      for (let hop = 1; hop <= hops; hop += 1) {
        const part = hop / (hops + 1);
        await glide(agent, startX + (x - startX) * part + random(-spread, spread), startY + (y - startY) * part + random(-spread, spread), ms / (hops + 1));
        if (!alive) return;
      }
      await glide(agent, x, y, ms / (hops + 1));
    };

    const enter = agent => {
      agent.x = Math.random() < 0.5 ? -40 : window.innerWidth + 40;
      agent.y = window.scrollY + random(0.1, 0.9) * window.innerHeight;
      agent.cursor.style.transitionDuration = '0ms';
      agent.cursor.style.transform = `translate3d(${agent.x}px, ${agent.y}px, 0)`;
      void agent.cursor.offsetWidth;
      agent.cursor.classList.add('is-on');
    };

    const type = async (agent, item) => {
      const { nodes } = item;
      const start = nodes[0];
      const first = new Range();
      first.setStart(start, 0);
      first.setEnd(start, Math.min(1, start.length));
      const at = first.getBoundingClientRect();
      await dart(agent, at.left, at.bottom + window.scrollY, random(340, 620));
      if (!alive) return;

      const length = nodes.reduce((sum, node) => sum + node.length, 0);
      const tick = 32;
      const duration = Math.min(1200, Math.max(300, length * 34));
      const step = Math.max(1, Math.ceil(length / (duration / tick)));
      let range = item.range;
      const giveUpAt = Date.now() + 3000; // a throttled tab must never leave text hidden
      agent.cursor.classList.add('is-typing');
      try {
      typing: for (const node of nodes) {
        for (let offset = 0; offset < node.length; offset += step) {
          if (!alive || Date.now() > giveUpAt) break typing;
          if (!node.isConnected) break;
          const end = Math.min(node.length, offset + step);
          const rest = new Range();
          rest.setStart(node, end);
          rest.setEnd(item.last, item.last.length);
          hidden.delete(range);
          hidden.add(rest);
          range = rest;
          item.range = rest;
          const typed = new Range();
          typed.setStart(node, Math.max(0, end - 1));
          typed.setEnd(node, end);
          const r = typed.getBoundingClientRect();
          if (r.width || r.height) glide(agent, r.right, r.bottom + window.scrollY, tick);
          await sleep(tick);
        }
      }
      } finally {
        hidden.delete(item.range);
        agent.cursor.classList.remove('is-typing');
      }
    };

    const check = async (agent, el) => {
      const { box, tag, cursor } = agent;
      try {
        const r = el.getBoundingClientRect();
        await dart(agent, r.left - PAD, r.top + window.scrollY - PAD, random(460, 780));
        if (!alive) return;

        box.classList.remove('is-done');
        box.classList.toggle('is-compact', el.getBoundingClientRect().height < COMPACT_BOX);
        box.style.width = '0px';
        box.style.height = '0px';
        agent.target = el;
        agent.drawStart = performance.now();
        tracked.add(agent);
        box.classList.add('is-on');
        await sleep(DRAW_MS);
        if (!alive) return;

        const task = pick(TASKS);
        tag.textContent = `${task}…`;
        tag.classList.add('is-on');
        cursor.classList.add('is-clicking');
        await sleep(random(320, 560));
        if (!alive) return;

        cursor.classList.remove('is-clicking');
        tag.textContent = `✓ ${task}`;
        box.classList.add('is-done');
        checked.current.add(el);
        await sleep(random(260, 420));
      } finally {
        tracked.delete(agent);
        tag.classList.remove('is-on');
        box.classList.remove('is-on');
        claimed.delete(el);
      }
    };

    const setOrbiting = (agent, on) => {
      agent.orbiting = on;
      agent.cursor.classList.toggle('is-flock', on);
      if (!on) {
        agent.angle = 0;
        agent.icon.style.transform = '';
      }
    };

    const inView = el => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    };
    const offScreen = agent => agent.x < 0 || agent.x > window.innerWidth || agent.y < window.scrollY || agent.y > window.scrollY + window.innerHeight;
    // Agents left behind by scrolling move down with the reader, then stand still again.
    const catchUp = agent => dart(agent, random(0.06, 0.92) * window.innerWidth, window.scrollY + random(0.14, 0.88) * window.innerHeight, random(700, 1100));

    const clockIn = async agent => {
      await sleep(agent.delay);
      while (alive) {
        if (!agent.cursor.classList.contains('is-on')) enter(agent);
        // Typing and boxes are mixed on purpose: each free agent grabs whichever it happens to reach for.
        let el = Math.random() < BOX_FIRST ? nextBox() : null;
        const item = el ? null : nextText(agent);
        if (!el && !item) el = nextBox();
        if (item || el) {
          setOrbiting(agent, false);
          busy += 1;
          try {
            if (item) await type(agent, item);
            else await check(agent, el);
          } finally {
            busy -= 1;
          }
          continue;
        }
        if (finale) setOrbiting(agent, true);
        else if (offScreen(agent)) await catchUp(agent);
        if (alive) await untilWork();
      }
    };

    const agents = [...layer.querySelectorAll('.crew-agent')]
      .filter(cursor => getComputedStyle(cursor).display !== 'none')
      .map((cursor, i) => {
        const box = layer.querySelectorAll('.crew-box')[i];
        return { cursor, box, tag: box.querySelector('.crew-tag'), icon: cursor.querySelector('svg'), delay: 150 + i * 110, x: 0, y: 0, angle: 0, orbiting: false, jitter: random(0.6, 1.5), phase: random(0, Math.PI * 2) };
      });

    // Never leave visible text hidden for long if nobody got to it, and spot the end of the page.
    const sweeper = setInterval(() => {
      const now = Date.now();
      let waiting = false;
      pending.forEach(item => {
        if (!inView(item.el)) { item.deadline = 0; return; }
        waiting = true;
        if (!item.deadline) item.deadline = now + WAIT_MS;
        else if (now > item.deadline) reveal(item);
      });
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - END_OF_PAGE;
      if (!finale && atEnd && !waiting && busy === 0 && !uncheckedBoxes().length) finale = true;
      wakeCrew();
    }, 400);

    const texts = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) offerText(entry.target);
    }), { rootMargin: '0px 0px 90px 0px' });
    blocks.forEach((_, el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) offerText(el);
      texts.observe(el);
    });

    agents.forEach(clockIn);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      tracked.clear();
      timers.forEach(clearTimeout);
      timers.clear();
      sleepers.clear();
      clearInterval(sweeper);
      texts.disconnect();
      window.removeEventListener('scroll', followScroll);
      if (canType) CSS.highlights.delete(HIGHLIGHT);
      agents.forEach(({ cursor, box, tag, icon }) => {
        icon.style.transform = '';
        cursor.classList.remove('is-on', 'is-clicking', 'is-typing', 'is-flock');
        box.classList.remove('is-on', 'is-done');
        tag.classList.remove('is-on');
      });
    };
  }, [enabled, lang]);

  return <div className="crew" aria-hidden="true"><div className="crew-layer" ref={layerRef}>
    {CREW.map(({ name, color }, i) => <div className={`crew-box ${i >= PHONE_CREW ? 'crew-extra' : ''}`} key={name} style={{ '--crew': color }}><span className="crew-tag"/></div>)}
    {CREW.map(({ name, color }, i) => <div className={`crew-agent ${i >= PHONE_CREW ? 'crew-extra' : ''}`} key={name} style={{ '--crew': color }}>
      <svg viewBox="0 0 20 22" width="20" height="22"><path d="M2 1.5v16.8l4.7-4.3 3 6.7 3.1-1.4-3-6.6 6.4-.4z" fill="var(--crew)" stroke="#090909" strokeWidth="1.4" strokeLinejoin="round"/></svg>
      <i/>
      <span>{name}</span>
    </div>)}
  </div></div>;
}
