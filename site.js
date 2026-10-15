/* BeepBoop Studios: the robot, the toys and a couple of easter eggs.
   Plain JavaScript, no libraries, no trackers. Everything here is optional
   polish: the page reads fine without it. Motion respects
   prefers-reduced-motion, and sound only plays after a click or key press. */
(() => {
  'use strict'

  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s))
  const rand = (a, b) => a + Math.random() * (b - a)
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const now = () => performance.now()
  const reflow = (el) => void el.getBoundingClientRect()

  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  let reduce = mqReduce.matches
  const onReduce = (e) => { reduce = e.matches }
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduce)
  else if (mqReduce.addListener) mqReduce.addListener(onReduce)
  const coarse = window.matchMedia('(hover: none)').matches

  const store = {
    get (k) { try { return window.localStorage.getItem(k) } catch (e) { return null } },
    set (k, v) { try { window.localStorage.setItem(k, v) } catch (e) { /* private mode */ } }
  }

  // Calls cb(true/false) as an element enters or leaves the viewport.
  const seen = (el, cb, opts) => {
    if (!el) return
    if (!('IntersectionObserver' in window)) { cb(true); return }
    new IntersectionObserver((entries) => entries.forEach((e) => cb(e.isIntersecting)), opts || { threshold: 0.05 }).observe(el)
  }

  /* ───────────────────────── Sound (Web Audio, made on the fly) ── */
  let actx = null
  let soundOn = store.get('bb-sound') !== 'off'
  const audio = () => {
    if (!actx) {
      const C = window.AudioContext || window.webkitAudioContext
      if (!C) return null
      try { actx = new C() } catch (e) { return null }
    }
    if (actx.state === 'suspended') actx.resume()
    return actx
  }
  const tone = (freq, at, dur, type, vol, glide) => {
    const c = audio()
    if (!c) return
    const t0 = c.currentTime + at
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type || 'square'
    o.frequency.setValueAtTime(freq, t0)
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol || 0.05, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g)
    g.connect(c.destination)
    o.start(t0)
    o.stop(t0 + dur + 0.03)
  }
  const sfx = {
    beepBoop () { tone(988, 0, 0.11, 'square', 0.045); tone(660, 0.13, 0.19, 'square', 0.045, 494) },
    boopBeep () { tone(523, 0, 0.11, 'square', 0.045); tone(1046, 0.13, 0.15, 'square', 0.04) },
    blip () { tone(880, 0, 0.07, 'sine', 0.08, 1320) },
    tick () { tone(2400, 0, 0.022, 'square', 0.018) },
    whirr () { tone(140, 0, 1.1, 'sawtooth', 0.02, 820) },
    tada () { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.22, 'triangle', 0.08)) },
    cheat () { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.065, 0.12, 'square', 0.03)); tone(1568, 0.36, 0.34, 'square', 0.03) }
  }
  const play = (name) => { if (soundOn && sfx[name]) { try { sfx[name]() } catch (e) { /* no audio, no problem */ } } }

  /* ───────────────────────── Toast ── */
  const toastEl = $('.toast')
  let toastT = 0
  const toast = (html, ms) => {
    if (!toastEl) return
    toastEl.classList.remove('show')
    toastEl.innerHTML = html
    reflow(toastEl)
    toastEl.classList.add('show')
    clearTimeout(toastT)
    toastT = setTimeout(() => toastEl.classList.remove('show'), ms || 4000)
  }

  /* ───────────────────────── Confetti (one canvas, made on demand) ── */
  const confetti = (opts) => {
    if (reduce) return
    const o = opts || {}
    const cv = document.createElement('canvas')
    cv.className = 'confetti'
    cv.setAttribute('aria-hidden', 'true')
    document.body.appendChild(cv)
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const W = window.innerWidth
    const H = window.innerHeight
    cv.width = Math.round(W * dpr)
    cv.height = Math.round(H * dpr)
    const ctx = cv.getContext('2d')
    ctx.scale(dpr, dpr)
    const colors = ['#a78bfa', '#3b82f6', '#2dd4bf', '#fbbf24', '#f472b6', '#ffffff', '#7dd3fc']
    const parts = []
    const n = o.count || 160
    for (let i = 0; i < n; i++) {
      let x, y, vx, vy
      if (o.rain) {
        x = rand(0, W); y = rand(-H * 0.4, -10); vx = rand(-2, 2); vy = rand(2, 7)
      } else {
        const a = rand(-Math.PI * 0.94, -Math.PI * 0.06)
        const v = rand(7, 17)
        x = o.x; y = o.y; vx = Math.cos(a) * v; vy = Math.sin(a) * v
      }
      parts.push({ x, y, vx, vy, w: rand(6, 11), h: rand(8, 15), r: rand(0, 6.28), vr: rand(-0.25, 0.25), c: pick(colors), round: Math.random() < 0.28, wob: rand(0, 6.28) })
    }
    const life = o.rain ? 4200 : 3600
    const start = now()
    const frame = (t) => {
      const el = t - start
      ctx.clearRect(0, 0, W, H)
      ctx.globalAlpha = clamp((life - el) / 700, 0, 1)
      let alive = 0
      for (const p of parts) {
        p.vy += o.rain ? 0.06 : 0.34
        p.vx *= 0.985
        p.vy *= 0.985
        p.x += p.vx + (o.rain ? Math.sin(p.wob) * 0.8 : 0)
        p.y += p.vy
        p.r += p.vr
        p.wob += 0.14
        if (p.y < H + 40) alive++
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.r)
        ctx.fillStyle = p.c
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w * 0.42, 0, 6.283); ctx.fill() } else { ctx.scale(1, Math.cos(p.wob)); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h) }
        ctx.restore()
      }
      if (alive && el < life) requestAnimationFrame(frame)
      else cv.remove()
    }
    requestAnimationFrame(frame)
  }

  /* ───────────────────────── Scroll reveals ── */
  // IntersectionObserver does the work; the scroll check below is a safety net so
  // nothing can stay hidden if the browser skipped frames during a fast jump.
  let pending = $$('[data-reveal]')
  const reveal = (el) => { el.classList.add('is-in'); pending = pending.filter((x) => x !== el) }
  const sweepReveals = () => {
    if (!pending.length) return
    const line = window.innerHeight * 0.94
    pending.slice().forEach((el) => { if (el.getBoundingClientRect().top < line) reveal(el) })
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target) } })
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    pending.forEach((el) => io.observe(el))
  } else {
    pending.slice().forEach(reveal)
  }

  /* ───────────────────────── Top bar + scroll parallax ── */
  const topbar = $('.topbar')
  const heroBg = $('.hero-bg')
  let heroOn = true
  seen($('.hero'), (v) => { heroOn = v })
  let sraf = 0
  const onScroll = () => {
    if (sraf) return
    sraf = requestAnimationFrame(() => {
      sraf = 0
      const y = window.scrollY
      if (topbar) topbar.classList.toggle('scrolled', y > 10)
      if (heroBg && !reduce && y < 1400) heroBg.style.setProperty('--sy', y.toFixed(0))
      sweepReveals()
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  if (heroBg && !coarse) {
    let mx = 0, my = 0, cx = 0, cy = 0, praf = 0
    const pstep = () => {
      praf = 0
      cx += (mx - cx) * 0.07
      cy += (my - cy) * 0.07
      heroBg.style.setProperty('--mx', cx.toFixed(3))
      heroBg.style.setProperty('--my', cy.toFixed(3))
      if (Math.abs(mx - cx) + Math.abs(my - cy) > 0.002) praf = requestAnimationFrame(pstep)
    }
    window.addEventListener('pointermove', (e) => {
      if (reduce || !heroOn) return
      mx = (e.clientX / window.innerWidth) * 2 - 1
      my = (e.clientY / window.innerHeight) * 2 - 1
      if (!praf) praf = requestAnimationFrame(pstep)
    }, { passive: true })
  }

  /* ───────────────────────── Headline letters hop on hover ── */
  $$('.ltr > b').forEach((b) => {
    b.addEventListener('pointerenter', () => {
      if (reduce) return
      b.classList.remove('hop')
      reflow(b)
      b.classList.add('hop')
    })
    b.addEventListener('animationend', () => b.classList.remove('hop'))
  })

  /* ───────────────────────── The robot ── */
  const bot = $('.bot')
  const svg = $('.bot-svg')
  let say = () => {}
  let setMood = () => {}
  if (bot && svg) {
    const face = $('.bot-face', svg)
    const eyes = $('.bot-eyes', svg)
    const head = $('.bot-head', svg)
    const squash = $('.bot-squash', svg)
    const heroBot = $('.hero-bot')
    const bubble = $('.bubble')
    const bubbleText = $('.bubble-text')
    const hint = $('.bot-hint')

    const idleLines = [
      'Beep boop! Hello, human.',
      coarse ? 'Psst. Poke me. I dare you.' : 'Psst. I can see your cursor.',
      'Adulting is hard. So we made it a game.',
      'History homework? I know a time machine.',
      'Built in Texas. Powered by snacks.',
      'Fun fact: I have never once paid a bill.',
      'My antenna is 90% confidence.',
      'Scroll down. The professors are waiting.'
    ]
    const clickLines = ['Beep boop!', 'Boop beep?', 'Hehe, that tickles.', 'Systems: delighted.', 'Again! Again!', 'You found my button.', 'Bleep bloop bleep.']

    let lastSay = 0
    let moodT = 0
    let hovering = false
    let hintDone = false

    say = (text) => {
      if (!bubble || !bubbleText) return
      bubbleText.textContent = text
      bubble.classList.remove('pop')
      reflow(bubble)
      if (!reduce) bubble.classList.add('pop')
      lastSay = now()
    }
    setMood = (m, ms) => {
      svg.setAttribute('data-mood', m)
      clearTimeout(moodT)
      if (ms) moodT = setTimeout(() => svg.setAttribute('data-mood', hovering ? 'happy' : ''), ms)
    }
    if (!reduce && bubble) bubble.classList.add('pop')

    // Eyes follow the cursor or finger: the whole face slides like it's on a turning head.
    const tgt = { x: 0, y: 0 }
    const cur = { x: 0, y: 0 }
    let raf = 0
    let lastPtr = 0
    const apply = () => {
      face.setAttribute('transform', 'translate(' + (cur.x * 13).toFixed(2) + ' ' + (cur.y * 10).toFixed(2) + ')')
      eyes.setAttribute('transform', 'translate(' + (cur.x * 5).toFixed(2) + ' ' + (cur.y * 4).toFixed(2) + ')')
      head.setAttribute('transform', 'rotate(' + (cur.x * 5).toFixed(2) + ' 128 140)')
    }
    const step = () => {
      raf = 0
      cur.x += (tgt.x - cur.x) * 0.12
      cur.y += (tgt.y - cur.y) * 0.12
      apply()
      if (Math.abs(tgt.x - cur.x) + Math.abs(tgt.y - cur.y) > 0.003) raf = requestAnimationFrame(step)
    }
    const lookAt = (x, y) => {
      tgt.x = clamp(x, -1, 1)
      tgt.y = clamp(y, -1, 1)
      if (!raf) raf = requestAnimationFrame(step)
    }
    const onPtr = (e) => {
      if (reduce || !heroOn) return
      const r = svg.getBoundingClientRect()
      const cx = r.left + r.width * 0.5
      const cy = r.top + r.height * 0.52
      lookAt((e.clientX - cx) / Math.max(240, window.innerWidth * 0.45), (e.clientY - cy) / Math.max(240, window.innerHeight * 0.5))
      lastPtr = now()
    }
    window.addEventListener('pointermove', onPtr, { passive: true })
    window.addEventListener('pointerdown', onPtr, { passive: true })

    // When nobody is pointing, it looks around on its own.
    const wander = () => {
      if (!reduce && heroOn && !document.hidden && now() - lastPtr > 3500) {
        if (Math.random() < 0.25) lookAt(0, 0)
        else lookAt(rand(-0.8, 0.8), rand(-0.6, 0.5))
      }
      setTimeout(wander, rand(1400, 3000))
    }
    setTimeout(wander, 2600)

    // Blinks, sometimes twice.
    const blinkOnce = (ms) => {
      svg.classList.add('blink')
      setTimeout(() => svg.classList.remove('blink'), ms)
    }
    const blink = () => {
      if (!reduce && heroOn && !document.hidden) {
        blinkOnce(130)
        if (Math.random() < 0.22) setTimeout(() => blinkOnce(120), 270)
      }
      setTimeout(blink, rand(2200, 5200))
    }
    setTimeout(blink, 1700)

    // Chatty speech bubble.
    let li = 0
    const chatter = () => {
      if (!reduce && heroOn && !document.hidden && now() - lastSay > 4600) {
        li = (li + 1) % idleLines.length
        say(idleLines[li])
        setMood('talk', 380)
      }
      setTimeout(chatter, 5200)
    }
    setTimeout(chatter, 5600)


    // Hover makes it blush.
    bot.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return
      hovering = true
      if (!svg.getAttribute('data-mood')) setMood('happy')
    })
    bot.addEventListener('pointerleave', () => {
      hovering = false
      if (svg.getAttribute('data-mood') === 'happy') setMood('')
    })

    if (hint) {
      if (coarse) hint.textContent = 'Tap me!'
      setTimeout(() => { if (!hintDone) hint.classList.add('show') }, 3400)
    }

    const boing = () => {
      if (reduce) return
      squash.classList.remove('boing')
      reflow(squash)
      squash.classList.add('boing')
    }
    squash.addEventListener('animationend', (e) => { if (e.animationName === 'boing') squash.classList.remove('boing'); if (e.animationName === 'hello') squash.classList.remove('hello') })

    // Little stars pop out of the antenna.
    const sparks = (n) => {
      if (reduce || !heroBot) return
      const r = svg.getBoundingClientRect()
      const hr = heroBot.getBoundingClientRect()
      const ax = r.left - hr.left + ((128 + 30) / 316) * r.width
      const ay = r.top - hr.top + ((10 + 60) / 380) * r.height
      for (let i = 0; i < n; i++) {
        const s = document.createElement('span')
        s.className = 'spark'
        s.setAttribute('aria-hidden', 'true')
        const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3)
        const d = rand(40, 76)
        s.style.left = ax + 'px'
        s.style.top = ay + 'px'
        s.style.setProperty('--tx', (Math.cos(a) * d).toFixed(1) + 'px')
        s.style.setProperty('--ty', (Math.sin(a) * d).toFixed(1) + 'px')
        s.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 0c1 6 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-6 12-12z" fill="' + pick(['#fde68a', '#c4b5fd', '#5eead4', '#ffffff']) + '"/></svg>'
        heroBot.appendChild(s)
        setTimeout(() => s.remove(), 820)
      }
    }

    // Says hello on arrival: a little hop, a happy tilt and a puff of antenna sparks.
    setTimeout(() => {
      if (reduce) return
      squash.classList.add('hello')
      setMood('happy', 1300)
      setTimeout(() => sparks(6), 180)
    }, 750)

    // Easter egg 1: five quick clicks = party mode.
    let partyT = 0
    const party = () => {
      svg.classList.add('party')
      setMood('happy')
      say('PARTY MODE! 🎉')
      play('tada')
      boing()
      const r = svg.getBoundingClientRect()
      confetti({ x: r.left + r.width / 2, y: r.top + r.height * 0.3, count: 170 })
      toast('<span class="toast-ico">x5</span><span>Party mode unlocked. The robot is thrilled.</span>')
      clearTimeout(partyT)
      partyT = setTimeout(() => { svg.classList.remove('party'); setMood('') }, 9000)
    }

    let taps = []
    bot.addEventListener('click', () => {
      const t = now()
      taps = taps.filter((x) => t - x < 2400)
      taps.push(t)
      hintDone = true
      if (hint) hint.classList.remove('show')
      if (taps.length >= 5) { taps = []; party(); return }
      play(Math.random() < 0.5 ? 'beepBoop' : 'boopBeep')
      if (taps.length === 3) say('Ooh. Keep going...')
      else if (taps.length === 4) say('One more! One more!')
      else say(pick(clickLines))
      setMood('talk', 460)
      boing()
      sparks(7)
    })

    // Sound on or off, remembered on this device.
    const st = $('.sound-toggle')
    if (st) {
      const sync = () => {
        st.setAttribute('aria-pressed', String(soundOn))
        st.title = soundOn ? 'Robot sounds: on' : 'Robot sounds: off'
      }
      sync()
      st.addEventListener('click', () => {
        soundOn = !soundOn
        store.set('bb-sound', soundOn ? 'on' : 'off')
        sync()
        if (soundOn) play('blip')
        say(soundOn ? 'Volume: robot.' : 'Shh. Silent mode.')
      })
    }

    // Easter egg 2: the Konami code. Easter egg 3: type "beep".
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
    let ki = 0
    let typed = ''
    const cheat = () => {
      const on = !svg.classList.contains('cool')
      svg.classList.toggle('cool', on)
      play('cheat')
      if (on) {
        say('Cheat code accepted. Deal with it.')
        setMood('happy', 2400)
        toast('<span class="toast-ico">XP</span><span>Cheat code accepted. +100 XP<span class="toast-xp"><i></i></span></span>', 4600)
        confetti({ rain: true, count: 190 })
      } else {
        say('Shades off. Back to work.')
      }
    }
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (k === code[ki]) ki++
      else ki = k === 'ArrowUp' ? (ki === 2 ? 2 : 1) : 0
      if (ki === code.length) { ki = 0; cheat() }
      if (k && k.length === 1 && k >= 'a' && k <= 'z') {
        typed = (typed + k).slice(-4)
        if (typed === 'beep') { typed = ''; play('boopBeep'); say('...boop!'); setMood('talk', 500); boing() }
      }
    })
  }

  const footer = $('.footer')
  seen(footer, (v) => { if (v) footer.classList.add('is-in') }, { threshold: 0.4 })

  /* ───────────────────────── Holo app icons tilt toward the pointer ── */
  if (!coarse) {
    $$('.app-head').forEach((area) => {
      const ic = $('.app-icon', area)
      if (!ic) return
      area.addEventListener('pointermove', (e) => {
        if (reduce) return
        const r = ic.getBoundingClientRect()
        const px = clamp((e.clientX - r.left) / r.width, -0.5, 1.5)
        const py = clamp((e.clientY - r.top) / r.height, -0.5, 1.5)
        ic.classList.add('tracking')
        ic.style.setProperty('--ry', ((px - 0.5) * 24).toFixed(1) + 'deg')
        ic.style.setProperty('--rx', ((0.5 - py) * 24).toFixed(1) + 'deg')
        ic.style.setProperty('--px', (130 - px * 150).toFixed(0) + '%')
      })
      area.addEventListener('pointerleave', () => {
        ic.classList.remove('tracking')
        ic.style.removeProperty('--rx')
        ic.style.removeProperty('--ry')
        ic.style.removeProperty('--px')
      })
    })
  }

  /* ───────────────────────── Pointer depth (Level: Adult scene, Historian dial) ── */
  // Eases --px / --py (-1..1) on each scene: the phone and dial tilt toward the pointer and the
  // cutouts and lamps drift at different depths. Phones get a slow idle drift (or device tilt
  // where that needs no permission prompt). Off under reduced motion.
  const depthScenes = $$('.la-scene, .cart-lh').map((el) => ({ el, on: false, tx: 0, ty: 0, x: 0, y: 0 }))
  if (depthScenes.length) {
    let draf = 0
    let tilt = null
    const dstep = (t) => {
      draf = 0
      let moving = false
      depthScenes.forEach((d) => {
        if (!d.on) return
        if (coarse && !tilt) { d.tx = Math.sin(t / 2600) * 0.35; d.ty = Math.cos(t / 3400) * 0.25 }
        if (coarse && tilt) { d.tx = tilt.x; d.ty = tilt.y }
        d.x += (d.tx - d.x) * 0.08
        d.y += (d.ty - d.y) * 0.08
        d.el.style.setProperty('--px', d.x.toFixed(3))
        d.el.style.setProperty('--py', d.y.toFixed(3))
        if (coarse || Math.abs(d.tx - d.x) + Math.abs(d.ty - d.y) > 0.002) moving = true
      })
      if (moving && !reduce && !document.hidden) draf = requestAnimationFrame(dstep)
    }
    const dkick = () => { if (!draf && !reduce) draf = requestAnimationFrame(dstep) }
    depthScenes.forEach((d) => seen(d.el, (v) => {
      d.on = v
      if (!v || reduce) { d.tx = 0; d.ty = 0 }
      dkick()
    }, { threshold: 0.05 }))
    if (!coarse) {
      window.addEventListener('pointermove', (e) => {
        if (reduce) return
        depthScenes.forEach((d) => {
          if (!d.on) return
          const r = d.el.getBoundingClientRect()
          d.tx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1)
          d.ty = clamp((e.clientY - (r.top + r.height / 2)) / Math.max(300, r.height / 2), -1, 1)
        })
        dkick()
      }, { passive: true })
    } else if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
      let beta0 = null
      window.addEventListener('deviceorientation', (e) => {
        if (reduce || e.gamma === null || e.beta === null) return
        if (beta0 === null) beta0 = e.beta
        tilt = { x: clamp(e.gamma / 30, -1, 1) * 0.6, y: clamp((e.beta - beta0) / 30, -1, 1) * 0.5 }
        dkick()
      }, { passive: true })
    }
    document.addEventListener('visibilitychange', dkick)
  }

  /* ───────────────────────── Level: Adult phone screenshots ── */
  // Dots pick a screen; a tap on the phone goes to the next one; a swipe goes either way.
  const shots = $$('.shot')
  const dots = $$('.shot-dot')
  const cap = $('.shot-caption')
  const stage = $('.la-stage')
  const tap = $('.phone-tap')
  if (shots.length && dots.length === shots.length && stage) {
    let si = 0
    let stageOn = false
    let hold = false
    let userT = 0
    const show = (i) => {
      i = (i + shots.length) % shots.length
      if (i === si) return
      const prev = shots[si]
      prev.classList.remove('is-on')
      prev.classList.add('was-on')
      setTimeout(() => prev.classList.remove('was-on'), 750)
      si = i
      shots[si].classList.remove('was-on')
      shots[si].classList.add('is-on')
      dots.forEach((d, k) => d.setAttribute('aria-pressed', String(k === si)))
      if (cap) cap.textContent = dots[si].dataset.cap || ''
    }
    dots.forEach((d, k) => d.addEventListener('click', () => { userT = now(); show(k) }))
    if (tap) {
      let x0 = null
      let swiped = false
      tap.addEventListener('pointerdown', (e) => { x0 = e.clientX; swiped = false })
      tap.addEventListener('pointerup', (e) => {
        if (x0 === null) return
        const dx = e.clientX - x0
        x0 = null
        if (Math.abs(dx) > 34) { swiped = true; userT = now(); show(si + (dx < 0 ? 1 : -1)) }
      })
      tap.addEventListener('click', () => {
        if (swiped) { swiped = false; return }
        userT = now()
        show(si + 1)
      })
    }
    stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hold = true })
    stage.addEventListener('pointerleave', () => { hold = false })
    stage.addEventListener('focusin', () => { hold = true })
    stage.addEventListener('focusout', () => { hold = false })
    seen(stage, (v) => { stageOn = v }, { threshold: 0.3 })
    setInterval(() => {
      if (!reduce && stageOn && !hold && !document.hidden && now() - userT > 9000) show(si + 1)
    }, 3600)
  }

  /* ───────────────────────── Level: Historian time machine ── */
  const machine = $('.machine')
  if (machine) {
    const needle = $('.needle', machine)
    const mcap = $('.machine-caption', machine)
    const dialBtn = $('.dial-btn', machine)
    const strips = $$('.wheel-strip', machine)
    let angle = 120 // resting at IV keeps the dial labels readable
    let mOn = false
    let odoDone = false
    let spinning = false

    strips.forEach((s) => {
      let h = ''
      for (let r = 0; r < 3; r++) for (let d = 0; d < 10; d++) h += '<b>' + d + '</b>'
      s.innerHTML = h
      s.style.setProperty('--dur', '0s')
      s.style.setProperty('--n', '0')
    })
    const rollOdo = () => {
      strips.forEach((s, i) => {
        s.style.setProperty('--dur', (1.5 + i * 0.32).toFixed(2) + 's')
        s.style.setProperty('--n', String(20 + Number(s.dataset.target || 0)))
      })
    }
    const shuffleOdo = () => {
      strips.forEach((s) => {
        s.style.setProperty('--dur', '0s')
        s.style.setProperty('--n', String(Math.floor(rand(0, 10))))
      })
      strips.forEach(reflow)
      requestAnimationFrame(() => requestAnimationFrame(rollOdo))
    }
    const turn = (deg) => { angle += deg; needle.style.transform = 'rotate(' + angle + 'deg)' }

    seen(machine, (v) => {
      mOn = v
      machine.classList.toggle('paused', !v || reduce)
      machine.classList.toggle('live', v && !reduce)
      if (v && !odoDone) { odoDone = true; requestAnimationFrame(() => requestAnimationFrame(rollOdo)) }
    }, { threshold: 0.3 })
    setInterval(() => { if (!reduce && mOn && !spinning && !document.hidden) turn(30) }, 1500)

    const lines = [
      'Destination locked. Departure: soon.',
      'Calibrating the flux. Hold onto your hat.',
      'A fussy mummy is tidying the waiting room.',
      'The shieldmaiden is warming up a saga.',
      'Twelve professors. Zero boring lectures.',
      'Arriving on iOS and Android. Bring snacks.'
    ]
    let lineI = -1
    if (dialBtn && needle) {
      dialBtn.addEventListener('click', () => {
        lineI = (lineI + 1) % lines.length
        if (mcap) mcap.textContent = lines[lineI]
        if (reduce) { turn(30 * Math.ceil(rand(1, 11))); play('blip'); return }
        spinning = true
        needle.classList.add('whirl')
        turn(720 + 30 * Math.ceil(rand(1, 11)))
        machine.classList.add('flash')
        play('whirr')
        for (let i = 0; i < 9; i++) setTimeout(() => play('tick'), 90 + i * i * 15)
        shuffleOdo()
        setTimeout(() => {
          needle.classList.remove('whirl')
          machine.classList.remove('flash')
          spinning = false
          play('blip')
        }, 1650)
      })
    }
  }

  /* ───────────────────────── Copy email buttons ── */
  $$('[data-copy]').forEach((b) => {
    const tip = $('.copy-tip', b)
    const label = b.getAttribute('aria-label') || ''
    b.addEventListener('click', async () => {
      const text = b.dataset.copy
      let ok = false
      try {
        await navigator.clipboard.writeText(text)
        ok = true
      } catch (e) {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        try { ok = document.execCommand('copy') } catch (err) { ok = false }
        ta.remove()
      }
      if (tip) tip.textContent = ok ? 'Copied!' : 'Select it'
      b.classList.toggle('done', ok)
      if (ok) {
        b.setAttribute('aria-label', 'Copied ' + text)
        play('blip')
        const r = b.getBoundingClientRect()
        confetti({ x: r.left + r.width / 2, y: r.top, count: 36 })
      }
      setTimeout(() => { if (tip) tip.textContent = 'Copy'; b.classList.remove('done'); b.setAttribute('aria-label', label) }, 1900)
    })
  })

  /* ───────────────────────── Hello, fellow tinkerer ── */
  try {
    console.log('%cBeep boop!%c\nCurious how this page works? We like curious people.\nadmin@beepboopstudios.com', 'font: 800 22px system-ui; color: #a78bfa', 'font: 13px system-ui; color: inherit')
  } catch (e) { /* no console, no worries */ }
})()
