document.addEventListener('DOMContentLoaded', () => {
    // 1. Intersection Observer for Scroll Animations
    const observerOptions = {
        threshold: 0.2
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing once visible if you want one-time animation
                // observer.unobserve(entry.target);
            } else {
                // Remove to re-animate when scrolling back
               // entry.target.classList.remove('visible');
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate');
    animatedElements.forEach(el => observer.observe(el));

    // 2. Canvas Particle Background
    const canvas = document.getElementById('bg-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 2; // Tiny stars
                this.alpha = Math.random();
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;
            }

            draw() {
                ctx.fillStyle = `rgba(180, 200, 255, ${this.alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function initParticles() {
            particles = [];
            for (let i = 0; i < 100; i++) {
                particles.push(new Particle());
            }
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);
            
            // Draw connecting lines
            ctx.strokeStyle = 'rgba(0, 255, 157, 0.03)';
            ctx.lineWidth = 1;
            for(let i=0; i<particles.length; i++) {
                for(let j=i+1; j<particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resize);
        resize();
        initParticles();
        animate();
    }

    // 3. Keyboard Navigation
    const sections = document.querySelectorAll('section');
    let currentSectionIndex = 0;

    // Determine current section on load/scroll manually
    const updateCurrentSection = () => {
        let maxVisiblePct = 0;
        sections.forEach((section, index) => {
             const rect = section.getBoundingClientRect();
             const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
             if (visibleHeight > 0) {
                 const pct = visibleHeight / window.innerHeight;
                 if (pct > maxVisiblePct) {
                     maxVisiblePct = pct;
                     currentSectionIndex = index;
                 }
             }
        });
    };
    
    // Initial sync
    updateCurrentSection();
    window.addEventListener('scroll', () => {
         // Debounce or just update occasionally? 
         // For key nav, we just want to know where we roughly are.
         updateCurrentSection();
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
        if (lightbox.style.display === "block" && e.key === "Escape") {
             lightbox.style.display = "none";
             return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (currentSectionIndex < sections.length - 1) {
                currentSectionIndex++;
                sections[currentSectionIndex].scrollIntoView({ behavior: 'smooth' });
            }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            if (currentSectionIndex > 0) {
                currentSectionIndex--;
                sections[currentSectionIndex].scrollIntoView({ behavior: 'smooth' });
            }
        }
    });

    // 4. Lightbox Logic
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox-modal';
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
        <span class="close">&times;</span>
        <img class="lightbox-content" id="lightbox-img">
    `;
    document.body.appendChild(lightbox);

    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close');

    document.querySelectorAll('img').forEach(img => {
        if (!img.classList.contains('lightbox-content')) {
            img.classList.add('clickable-img');
            img.onclick = function(){
                lightbox.style.display = "block";
                lightboxImg.src = this.src;
                // Optional: Use higher res source if available
            }
        }
    });

    closeBtn.onclick = function() {
        lightbox.style.display = "none";
    }

    lightbox.onclick = function(e) {
        if(e.target === lightbox) {
            lightbox.style.display = "none";
        }
    }

});
