document.addEventListener('DOMContentLoaded', function () {
    // Button ripple effect
    document.querySelectorAll('.btn-ripple').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            const rect = btn.getBoundingClientRect();
            const ripple = document.createElement('span');
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            ripple.className = 'ripple';
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Predict form submit spinner
    const form = document.getElementById('predict-form');
    if (form) {
        form.addEventListener('submit', function () {
            const btn = form.querySelector('button[type="submit"]');
            if (!btn) return;
            const label = btn.querySelector('.btn-label');
            const spinner = btn.querySelector('.btn-spinner');
            if (label && spinner) {
                label.style.opacity = '0.6';
                spinner.classList.remove('d-none');
                btn.setAttribute('disabled', 'disabled');
            }
            showToast('Uploading and predicting...', 'info');
        });
    }

    // Drag & Drop + filename update for predictor page
    const fileInput = document.getElementById('file-input');
    const dropzone = document.getElementById('dropzone');
    const fileNameEl = document.getElementById('file-name');
    const browseBtn = document.getElementById('browse-btn');

    function setFileName(name) {
        if (fileNameEl) fileNameEl.textContent = name || 'No files selected';
    }

    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', () => fileInput.click());
    }

    if (dropzone && fileInput) {
        // Click dropzone to open file dialog
        dropzone.addEventListener('click', (e) => {
            // Avoid clicking "browse" button twice
            if (e.target && (e.target.id === 'browse-btn' || e.target.closest('#browse-btn'))) return;
            fileInput.click();
        });
        dropzone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                // Merge DataTransfer files into the input (not all browsers allow programmatic set for multiple easily)
                fileInput.files = e.dataTransfer.files;
                const names = Array.from(e.dataTransfer.files).map(f => f.name).join(', ');
                setFileName(names);
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const files = fileInput.files ? Array.from(fileInput.files) : [];
            const names = files.map(f => f.name).join(', ');
            setFileName(names || '');
        });
    }

    // Confetti on results page
    if (document.getElementById('confetti-on-load')) {
        launchConfetti(700);
        setTimeout(() => launchConfetti(400), 400);
    }

    // Copy prediction helper
    const copyBtn = document.getElementById('copy-prediction-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const text = copyBtn.getAttribute('data-pred') || '';
            try {
                await navigator.clipboard.writeText(text);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => (copyBtn.textContent = 'Copy Result'), 1200);
            } catch (e) {
                // ignore
            }
        });
    }

    // Lightweight confetti
    function launchConfetti(durationMs) {
        const canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        const colors = ['#6610f2', '#007bff', '#00c76e', '#ffdd57', '#ff6b6b'];
        const particles = Array.from({ length: 120 }, () => ({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * 100,
            r: 4 + Math.random() * 4,
            c: colors[Math.floor(Math.random() * colors.length)],
            vx: -2 + Math.random() * 4,
            vy: 2 + Math.random() * 3,
            a: 0.9 + Math.random() * 0.1
        }));
        let start = performance.now();
        (function frame(now) {
            const elapsed = now - start;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.03; // gravity
                ctx.globalAlpha = p.a;
                ctx.fillStyle = p.c;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            });
            if (elapsed < durationMs) {
                requestAnimationFrame(frame);
            } else {
                canvas.remove();
            }
        })(start);
    }

    // Dark mode toggle persisted
    const themeToggle = document.getElementById('theme-toggle');
    const applyTheme = (mode) => {
        if (mode === 'dark') document.body.classList.add('dark');
        else document.body.classList.remove('dark');
    };
    const saved = localStorage.getItem('theme');
    if (saved) applyTheme(saved);
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const next = document.body.classList.contains('dark') ? 'light' : 'dark';
            localStorage.setItem('theme', next);
            applyTheme(next);
        });
    }

    // Confidence badge coloring
    document.querySelectorAll('.confidence-badge').forEach((el) => {
        const c = parseFloat(el.getAttribute('data-confidence') || '0');
        if (c >= 80) {
            el.style.background = 'rgba(0, 200, 110, 0.12)';
            el.style.color = '#0b5';
            el.style.borderColor = 'rgba(0, 200, 110, 0.35)';
        } else if (c >= 50) {
            el.style.background = 'rgba(255, 221, 87, 0.15)';
            el.style.color = '#a67a00';
            el.style.borderColor = 'rgba(255, 221, 87, 0.4)';
        } else {
            el.style.background = 'rgba(255, 107, 107, 0.12)';
            el.style.color = '#d83a3a';
            el.style.borderColor = 'rgba(255, 107, 107, 0.35)';
        }
    });

    // Download result card as PNG
    // Download result card(s) as PNG
    function attachDownloadHandler(btn, targetCard) {
        btn.addEventListener('click', async () => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            s.onload = async () => {
                const card = targetCard || document.querySelector('.result-card');
                if (!card) return;
                const canvas = await window.html2canvas(card, { backgroundColor: null, scale: 2 });
                const link = document.createElement('a');
                link.download = 'prediction.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            };
            document.body.appendChild(s);
        });
    }
    const singleDownloadBtn = document.getElementById('download-card-btn');
    if (singleDownloadBtn) attachDownloadHandler(singleDownloadBtn);
    document.querySelectorAll('.download-card-btn').forEach((b) => {
        const card = b.closest('.result-card');
        attachDownloadHandler(b, card);
    });

    // Keyboard shortcuts on predictor page
    if (form) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                // submit if focused in form area
                if (document.activeElement && document.activeElement.tagName !== 'TEXTAREA') {
                    form.requestSubmit();
                }
            } else if (e.key === 'Escape') {
                if (fileInput) {
                    fileInput.value = '';
                    setFileName('');
                }
            }
        });
    }

    // Toast utilities
    function showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${mapType(type)} border-0 show`;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button></div>`;
        container.appendChild(toast);
        const closeBtn = toast.querySelector('.btn-close');
        if (closeBtn) closeBtn.addEventListener('click', () => toast.remove());
        setTimeout(() => toast.remove(), 3000);
    }
    function mapType(type) {
        switch (type) {
            case 'success': return 'success';
            case 'error': return 'danger';
            case 'warning': return 'warning';
            default: return 'primary';
        }
    }
});


