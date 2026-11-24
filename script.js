/* 振博财税 · 交互脚本（零依赖） */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 导航滚动态 ---------- */
  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('is-solid', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- 移动端菜单 ---------- */
  var burger = document.getElementById('burger');
  var links = document.getElementById('navLinks');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      links.classList.toggle('is-open', !open);
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        burger.setAttribute('aria-expanded', 'false');
        links.classList.remove('is-open');
      }
    });
  }

  /* ---------- 滚动显现 + 错峰 ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    /* 同一父元素下的元素按顺序取延迟；上限 6 档，列表长了也不至于等太久 */
    var groups = new Map();
    reveals.forEach(function (el) {
      var p = el.parentNode;
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(el);
    });
    groups.forEach(function (list) {
      list.forEach(function (el, i) {
        if (i > 0) el.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms');
      });
    });

    if (reduce || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
      reveals.forEach(function (el) { io.observe(el); });

      /* 兜底：已在视口内却没被触发的，1.2 秒后强制显示。
         内容站宁可少一次动画，也不能让文字停在不可见状态。 */
      setTimeout(function () {
        var vh = window.innerHeight || document.documentElement.clientHeight;
        document.querySelectorAll('.reveal:not(.in)').forEach(function (el) {
          if (el.getBoundingClientRect().top < vh) el.classList.add('in');
        });
      }, 1200);
    }
  }

  /* ---------- 数字递增 ---------- */
  function countUp(el) {
    var node = el.firstChild;
    if (!node || node.nodeType !== 3) return;
    var target = parseInt(node.nodeValue, 10);
    if (!target || target < 1) return;

    /* 用定时器步进而不是 rAF：数字类动画不该依赖合成器帧率，
       后台标签页、无 GPU 环境下 rAF 会被节流甚至停摆，数字就会卡在错值上。 */
    if (document.hidden) return;

    var step = 0, total = 28;
    var timer = setInterval(function () {
      step++;
      var p = Math.min(1, step / total);
      if (p >= 1) {
        clearInterval(timer);
        node.nodeValue = String(target);
        return;
      }
      node.nodeValue = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
    }, 30);
  }

  if (!reduce && 'IntersectionObserver' in window) {
    var counters = document.querySelectorAll('.stat .v');
    if (counters.length) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          cio.unobserve(en.target);
          countUp(en.target);
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---------- 鼠标聚光灯（仅栏目卡片） ---------- */
  if (!reduce) {
    document.querySelectorAll('.pillar').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- 磁吸按钮 ---------- */
  if (!reduce) {
    document.querySelectorAll('[data-magnetic]').forEach(function (btn) {
      var raf = null, tx = 0, ty = 0;
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        tx = Math.max(-8, Math.min(8, (e.clientX - (r.left + r.width / 2)) * 0.16));
        ty = Math.max(-6, Math.min(6, (e.clientY - (r.top + r.height / 2)) * 0.22));
        if (raf) return;
        raf = requestAnimationFrame(function () {
          btn.style.setProperty('--tx', tx.toFixed(1) + 'px');
          btn.style.setProperty('--ty', ty.toFixed(1) + 'px');
          raf = null;
        });
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--tx', '0px');
        btn.style.setProperty('--ty', '0px');
      });
    });
  }

  /* ---------- 视差：首屏面板的线条层 ---------- */
  var panel = document.querySelector('.hero-art-panel');
  if (panel && !reduce && window.innerWidth > 1080) {
    var artSvg = panel.querySelector('svg');
    var ticking = false;
    if (artSvg) {
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var y = Math.min(window.scrollY, 700);
          artSvg.style.transform = 'translate3d(0,' + (y * 0.06).toFixed(1) + 'px,0)';
          ticking = false;
        });
      }, { passive: true });
    }
  }

  /* ---------- 文章列表筛选 ---------- */
  var chips = document.querySelectorAll('.chip[data-cat]');
  var items = document.querySelectorAll('[data-articles] .card-wrap');
  var empty = document.getElementById('emptyState');
  if (chips.length && items.length) {
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('is-on'); c.setAttribute('aria-pressed', 'false'); });
        chip.classList.add('is-on');
        chip.setAttribute('aria-pressed', 'true');

        var cat = chip.getAttribute('data-cat');
        var shown = 0;
        items.forEach(function (it) {
          var ok = cat === 'all' || it.getAttribute('data-cat') === cat;
          it.style.display = ok ? '' : 'none';
          if (ok) shown++;
        });
        if (empty) empty.hidden = shown !== 0;
      });
    });
  }
})();
