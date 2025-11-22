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
        });
    }

    // Drag & Drop + filename update for predictor page
    const fileInput = document.getElementById('file-input');
    const dropzone = document.getElementById('dropzone');
    const fileNameEl = document.getElementById('file-name');
    const browseBtn = document.getElementById('browse-btn');

    function setFileName(name) {
        if (fileNameEl) fileNameEl.textContent = name || 'No file selected';
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
                const file = e.dataTransfer.files[0];
                fileInput.files = e.dataTransfer.files;
                setFileName(file.name);
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files && fileInput.files[0];
            setFileName(file ? file.name : '');
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
});


