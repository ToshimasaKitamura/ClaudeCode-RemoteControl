document.addEventListener("DOMContentLoaded", () => {

  // ========================================
  // Dark Mode Toggle
  // ========================================
  const darkToggle = document.getElementById("dark-toggle");
  const body = document.body;
  const saved = localStorage.getItem("darkMode");
  if (saved === "true") body.classList.add("dark");
  updateToggleIcon();

  darkToggle.addEventListener("click", () => {
    body.classList.toggle("dark");
    localStorage.setItem("darkMode", body.classList.contains("dark"));
    updateToggleIcon();
  });

  function updateToggleIcon() {
    darkToggle.textContent = body.classList.contains("dark") ? "\u2600\uFE0F" : "\uD83C\uDF19";
  }

  // ========================================
  // Mobile Hamburger Menu
  // ========================================
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.querySelector(".nav-links");

  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navLinks.classList.toggle("open");
  });

  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      hamburger.classList.remove("active");
      navLinks.classList.remove("open");
    });
  });

  // ========================================
  // Navbar scroll effect
  // ========================================
  const navbar = document.querySelector(".navbar");
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 80);
  });

  // ========================================
  // Hero typing effect
  // ========================================
  const typingEl = document.getElementById("typing-text");
  const phrases = [
    "\u30B2\u30FC\u30E0\u5B9F\u6CC1\u8005",
    "\u914D\u4FE1\u8005",
    "\u30A8\u30F3\u30BF\u30FC\u30C6\u30A4\u30CA\u30FC",
    "\u3046\u3093\u3053\u3061\u3083\u3093",
    "\u8853\u9580\u306E\u30DC\u30B9"
  ];
  let phraseIdx = 0;
  let charIdx = 0;
  let deleting = false;

  function typeLoop() {
    const current = phrases[phraseIdx];
    if (!deleting) {
      typingEl.textContent = current.slice(0, charIdx + 1);
      charIdx++;
      if (charIdx === current.length) {
        deleting = true;
        setTimeout(typeLoop, 2000);
        return;
      }
      setTimeout(typeLoop, 120);
    } else {
      typingEl.textContent = current.slice(0, charIdx - 1);
      charIdx--;
      if (charIdx === 0) {
        deleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        setTimeout(typeLoop, 400);
        return;
      }
      setTimeout(typeLoop, 60);
    }
  }
  typeLoop();

  // ========================================
  // Back to top button
  // ========================================
  const backToTop = document.getElementById("back-to-top");

  window.addEventListener("scroll", () => {
    backToTop.classList.toggle("visible", window.scrollY > 500);
  });

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ========================================
  // Scroll reveal animation
  // ========================================
  const revealElements = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealElements.forEach(el => revealObserver.observe(el));

  // ========================================
  // Gallery lightbox
  // ========================================
  const galleryItems = document.querySelectorAll(".gallery-item");
  const lightbox = document.getElementById("lightbox");
  const lightboxTitle = lightbox.querySelector(".lightbox-title");
  const lightboxDesc = lightbox.querySelector(".lightbox-desc");
  const lightboxIcon = lightbox.querySelector(".lightbox-icon");

  galleryItems.forEach(item => {
    item.addEventListener("click", () => {
      lightboxTitle.textContent = item.dataset.title;
      lightboxDesc.textContent = item.dataset.desc;
      lightboxIcon.textContent = item.querySelector(".gallery-icon").textContent;
      lightbox.classList.add("active");
      body.style.overflow = "hidden";
    });
  });

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.classList.contains("lightbox-close")) {
      lightbox.classList.remove("active");
      body.style.overflow = "";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("active")) {
      lightbox.classList.remove("active");
      body.style.overflow = "";
    }
  });

  // ========================================
  // FAQ Accordion
  // ========================================
  document.querySelectorAll(".faq-question").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.parentElement;
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(i => i.classList.remove("open"));
      if (!isOpen) item.classList.add("open");
    });
  });

  // ========================================
  // Fan Poll (localStorage)
  // ========================================
  const pollOptions = document.querySelectorAll(".poll-option");
  const pollResults = document.getElementById("poll-results");
  const pollThanks = document.getElementById("poll-thanks");
  let votes = JSON.parse(localStorage.getItem("fanPollVotes") || '{"game":0,"talk":0,"event":0,"collab":0,"song":0}');
  const hasVoted = localStorage.getItem("fanPollVoted") === "true";

  if (hasVoted) showPollResults();

  pollOptions.forEach(opt => {
    opt.addEventListener("click", () => {
      if (hasVoted) return;
      const key = opt.dataset.key;
      votes[key]++;
      localStorage.setItem("fanPollVotes", JSON.stringify(votes));
      localStorage.setItem("fanPollVoted", "true");
      showPollResults();
      pollThanks.classList.add("visible");
    });
  });

  function showPollResults() {
    const total = Object.values(votes).reduce((a, b) => a + b, 0) || 1;
    pollResults.classList.add("visible");
    document.querySelectorAll(".poll-option").forEach(opt => {
      opt.classList.add("voted");
    });
    document.querySelectorAll(".poll-bar-fill").forEach(bar => {
      const key = bar.dataset.key;
      const pct = Math.round((votes[key] / total) * 100);
      bar.style.width = pct + "%";
      bar.parentElement.querySelector(".poll-pct").textContent = pct + "%";
    });
  }

  // ========================================
  // Fan Message Board (localStorage)
  // ========================================
  const msgForm = document.getElementById("msg-form");
  const msgInput = document.getElementById("msg-input");
  const msgName = document.getElementById("msg-name");
  const msgList = document.getElementById("msg-list");
  let messages = JSON.parse(localStorage.getItem("fanMessages") || "[]");

  renderMessages();

  msgForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    const name = msgName.value.trim() || "\u533F\u540D\u306E\u8853\u9580";
    if (!text) return;

    const msg = {
      id: Date.now(),
      name: name,
      text: text,
      date: new Date().toLocaleDateString("ja-JP"),
      likes: 0
    };
    messages.unshift(msg);
    if (messages.length > 50) messages = messages.slice(0, 50);
    localStorage.setItem("fanMessages", JSON.stringify(messages));
    msgInput.value = "";
    renderMessages();
  });

  function renderMessages() {
    if (messages.length === 0) {
      msgList.innerHTML = '<p class="msg-empty">\u307E\u3060\u30E1\u30C3\u30BB\u30FC\u30B8\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u6700\u521D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u66F8\u3044\u3066\u307F\u307E\u3057\u3087\u3046\uFF01</p>';
      return;
    }
    msgList.innerHTML = messages.map(m => `
      <div class="msg-item">
        <div class="msg-header">
          <span class="msg-author">${escapeHTML(m.name)}</span>
          <span class="msg-date">${escapeHTML(m.date)}</span>
        </div>
        <p class="msg-text">${escapeHTML(m.text)}</p>
        <button class="msg-like" data-id="${m.id}">&#x2764; <span>${m.likes}</span></button>
      </div>
    `).join("");

    msgList.querySelectorAll(".msg-like").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const msg = messages.find(m => m.id === id);
        if (msg) {
          msg.likes++;
          localStorage.setItem("fanMessages", JSON.stringify(messages));
          btn.querySelector("span").textContent = msg.likes;
          btn.classList.add("liked");
        }
      });
    });
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ========================================
  // Particle background for hero
  // ========================================
  const canvas = document.getElementById("hero-particles");
  const ctx = canvas.getContext("2d");
  let particles = [];

  function resizeCanvas() {
    const hero = document.querySelector(".hero");
    canvas.width = hero.offsetWidth;
    canvas.height = hero.offsetHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.5,
      dy: (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.4 + 0.1
    });
  }

  function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(247, 201, 72, ${p.alpha})`;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(247, 201, 72, ${0.06 * (1 - dist / 120)})`;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(drawParticles);
  }
  drawParticles();

  // ========================================
  // Stats counter animation
  // ========================================
  const statNumbers = document.querySelectorAll(".stat-number[data-count]");
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(el => statsObserver.observe(el));

  function animateCount(el) {
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const duration = 2000;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(target * eased).toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

});
