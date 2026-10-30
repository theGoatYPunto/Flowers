(() => {
    'use strict';

    const canvas = document.getElementById('screen');
    const ctx = canvas.getContext('2d');
    const off = document.createElement('canvas');
    const octx = off.getContext('2d', { willReadFrequently: true });

    const RAMP = ' .:-=+*cxoaX#%&@';
    const W = 1000;
    const H = 1100;
    const FPS = 30;

    let cols, rows, cellW, cellH, fontSize, dpr;
    let started = false;
    let T = 0;
    let startTime = 0;
    let lastFrame = 0;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;

    function progress(t, start, duration) {
        return clamp((t - start) / duration, 0, 1);
    }

    function ease(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function smooth(a, b, t) {
        const x = clamp((t - a) / (b - a), 0, 1);
        return x * x * (3 - 2 * x);
    }

    function hex(c) {
        const n = parseInt(c.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function bezier(p, t) {
        const u = 1 - t;
        return [
            u * u * u * p[0][0] + 3 * u * u * t * p[1][0] +
            3 * u * t * t * p[2][0] + t * t * t * p[3][0],

            u * u * u * p[0][1] + 3 * u * u * t * p[1][1] +
            3 * u * t * t * p[2][1] + t * t * t * p[3][1]
        ];
    }

    function sway(x, y) {
        const lift = clamp((1100 - y) / 800, 0, 1);
        return [
            x + Math.sin(T * .9 + y * .006) * 7 * lift,
            y
        ];
    }

    // ------------------------------------------------
    // FLOWERS
    // ------------------------------------------------

    const flowers = [
        { x: 280, y: 470, type: 'sun', start: 5, size: 1.0 },
        { x: 390, y: 330, type: 'lily', start: 7, size: .9 },
        { x: 500, y: 270, type: 'sun', start: 8, size: 1.1 },
        { x: 620, y: 350, type: 'lily', start: 10, size: .9 },
        { x: 730, y: 470, type: 'sun', start: 12, size: .95 },
        { x: 350, y: 590, type: 'lily', start: 14, size: .75 },
        { x: 650, y: 590, type: 'sun', start: 16, size: .8 }
    ];

    const leaves = [
        [400, 850, 300, 760, -1],
        [430, 790, 260, 680, -1],
        [450, 740, 300, 620, 1],
        [480, 870, 650, 730, 1],
        [520, 820, 730, 660, 1],
        [550, 760, 700, 600, -1],
        [470, 900, 340, 820, -1],
        [530, 910, 680, 820, 1],
        [490, 700, 380, 580, -1],
        [510, 690, 620, 560, 1],
        [440, 840, 260, 780, -1],
        [560, 850, 750, 770, 1]
    ];

    function drawStem(g, f, p) {
        const baseX = 500 + (f.x - 500) * .15;
        const base = [baseX, 1040];
        const top = [f.x, f.y + 15];

        const control1 = [baseX, 850];
        const control2 = [lerp(baseX, f.x, .75), f.y + 180];

        const points = [base, control1, control2, top];

        g.beginPath();

        for (let i = 0; i <= 35; i++) {
            const q = bezier(points, i / 35 * p);
            const [x, y] = sway(q[0], q[1]);

            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
        }

        g.strokeStyle = '#4d9435';
        g.lineWidth = 9;
        g.lineCap = 'round';
        g.stroke();
    }

    function drawLeaf(g, leaf, p) {
        if (p <= 0) return;

        const [x, y, tx, ty, side] = leaf;
        const [sx, sy] = sway(x, y);
        const length = Math.hypot(tx - x, ty - y) * p;
        const angle = Math.atan2(ty - y, tx - x);

        g.save();
        g.translate(sx, sy);
        g.rotate(angle);

        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(
            length * .3, -22 * side,
            length * .7, -18 * side,
            length, 0
        );
        g.bezierCurveTo(
            length * .7, 18 * side,
            length * .3, 22 * side,
            0, 0
        );

        const grad = g.createLinearGradient(0, 0, length, 0);
        grad.addColorStop(0, '#285c28');
        grad.addColorStop(.6, '#4c9a35');
        grad.addColorStop(1, '#82bc50');

        g.fillStyle = grad;
        g.fill();

        g.strokeStyle = '#244e22';
        g.lineWidth = 3;
        g.stroke();

        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(length, 0);
        g.strokeStyle = '#9bc76b';
        g.lineWidth = 2;
        g.stroke();

        g.restore();
    }

    // ------------------------------------------------
    // SUNFLOWERS
    // ------------------------------------------------

    function drawSunflower(g, x, y, size, open) {
        const bloom = ease(open);
        const radius = size * 65;
        const petalLength = radius * 1.35 * bloom;
        const petalWidth = radius * .28 * bloom;

        g.save();
        g.translate(x, y);

        // 24 yellow petals
        for (let i = 0; i < 24; i++) {
            const angle = i * Math.PI * 2 / 24;

            g.save();
            g.rotate(angle);

            const grad = g.createLinearGradient(
                radius * .25, 0,
                radius + petalLength, 0
            );

            grad.addColorStop(0, '#d98a12');
            grad.addColorStop(.4, '#ffd52b');
            grad.addColorStop(1, '#fff49a');

            g.fillStyle = grad;
            g.strokeStyle = '#a96b16';
            g.lineWidth = 3;

            g.beginPath();
            g.ellipse(
                radius + petalLength * .5,
                0,
                petalLength * .5,
                petalWidth,
                0, 0, Math.PI * 2
            );
            g.fill();
            g.stroke();

            g.restore();
        }

        // Dark brown center
        const centerRadius = radius * (.65 + .35 * bloom);

        const grad = g.createRadialGradient(
            0, 0, 2,
            0, 0, centerRadius
        );

        grad.addColorStop(0, '#a66b2b');
        grad.addColorStop(.4, '#673813');
        grad.addColorStop(1, '#241006');

        g.fillStyle = grad;
        g.beginPath();
        g.arc(0, 0, centerRadius, 0, Math.PI * 2);
        g.fill();

        // Seeds
        if (bloom > .4) {
            for (let i = 0; i < 150; i++) {
                const angle = i * 2.399;
                const distance = Math.sqrt(i / 150) * centerRadius * .88;

                g.fillStyle = i % 2 ? '#d09a45' : '#39200d';
                g.beginPath();
                g.arc(
                    Math.cos(angle) * distance,
                    Math.sin(angle) * distance,
                    2.5,
                    0, Math.PI * 2
                );
                g.fill();
            }
        }

        g.restore();
    }

    // ------------------------------------------------
    // LILIES
    // ------------------------------------------------

    function drawLily(g, x, y, size, open) {
        const bloom = ease(open);

        g.save();
        g.translate(x, y);

        // Six long petals
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI * 2 / 6;

            g.save();
            g.rotate(angle);

            const length = size * 105 * bloom;
            const width = size * 25 * bloom;

            const grad = g.createLinearGradient(0, 0, length, 0);
            grad.addColorStop(0, '#b86b8b');
            grad.addColorStop(.35, '#e99db8');
            grad.addColorStop(1, '#fff0f5');

            g.fillStyle = grad;
            g.strokeStyle = '#8f4768';
            g.lineWidth = 3;

            g.beginPath();
            g.moveTo(0, 0);
            g.bezierCurveTo(
                length * .3, -width,
                length * .75, -width * .8,
                length, 0
            );
            g.bezierCurveTo(
                length * .75, width * .8,
                length * .3, width,
                0, 0
            );
            g.fill();
            g.stroke();

            // Petal vein
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(length * .9, 0);
            g.strokeStyle = 'rgba(140,55,85,.55)';
            g.lineWidth = 2;
            g.stroke();

            g.restore();
        }

        // Lily center
        g.fillStyle = '#d5b65a';
        g.beginPath();
        g.arc(0, 0, size * 13 * bloom, 0, Math.PI * 2);
        g.fill();

        // Stamens
        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI / 3 + i * Math.PI / 6;
            const length = size * 65 * bloom;

            g.strokeStyle = '#d9d6a0';
            g.lineWidth = 3;
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
            g.stroke();

            g.fillStyle = '#6b351d';
            g.beginPath();
            g.arc(
                Math.cos(angle) * length,
                Math.sin(angle) * length,
                size * 5 * bloom,
                0, Math.PI * 2
            );
            g.fill();
        }

        g.restore();
    }

    // ------------------------------------------------
    // BOUQUET WRAPPING
    // ------------------------------------------------

    function drawWrapper(g, open) {
        const p = ease(open);

        if (p <= 0) return;

        g.save();
        g.globalAlpha = p;

        // Paper cone
        g.beginPath();
        g.moveTo(350, 780);
        g.lineTo(650, 780);
        g.lineTo(575, 1050);
        g.lineTo(425, 1050);
        g.closePath();

        const grad = g.createLinearGradient(350, 800, 650, 1000);
        grad.addColorStop(0, '#b89b75');
        grad.addColorStop(.5, '#e4cfaa');
        grad.addColorStop(1, '#9b7c59');

        g.fillStyle = grad;
        g.fill();

        g.strokeStyle = '#dbc49d';
        g.lineWidth = 5;
        g.stroke();

        // Paper folds
        g.beginPath();
        g.moveTo(500, 790);
        g.lineTo(500, 1035);
        g.moveTo(350, 780);
        g.lineTo(465, 1000);
        g.moveTo(650, 780);
        g.lineTo(535, 1000);

        g.strokeStyle = 'rgba(90,60,35,.5)';
        g.lineWidth = 4;
        g.stroke();

        // Ribbon
        g.strokeStyle = '#bd4545';
        g.lineWidth = 12;
        g.beginPath();
        g.moveTo(450, 900);
        g.quadraticCurveTo(500, 925, 550, 900);
        g.stroke();

        g.restore();
    }

    // ------------------------------------------------
    // COMPLETE SCENE
    // ------------------------------------------------

    function drawScene(g) {
        // Leaves and stems
        for (let i = 0; i < flowers.length; i++) {
            const f = flowers[i];
            const stem = ease(progress(T, f.start - 3, 3));

            drawStem(g, f, stem);
        }

        leaves.forEach((leaf, i) => {
            const p = ease(progress(T, 2 + i * .35, 2));
            drawLeaf(g, leaf, p);
        });

        // Small white filler flowers
        for (let i = 0; i < 65; i++) {
            const angle = i * 2.399;
            const radius = 110 + (i % 7) * 28;

            const x = 500 + Math.cos(angle) * radius;
            const y = 650 + Math.sin(angle) * radius * .65;

            const p = ease(progress(T, 5 + i * .12, 2));

            if (p <= 0) continue;

            g.save();
            g.translate(x, y);
            g.globalAlpha = p;

            for (let j = 0; j < 5; j++) {
                const a = j * Math.PI * 2 / 5;

                g.fillStyle = '#fff8e9';
                g.beginPath();
                g.arc(
                    Math.cos(a) * 5,
                    Math.sin(a) * 5,
                    4,
                    0, Math.PI * 2
                );
                g.fill();
            }

            g.fillStyle = '#e6c76b';
            g.beginPath();
            g.arc(0, 0, 3, 0, Math.PI * 2);
            g.fill();

            g.restore();
        }

        // Flower heads
        flowers.forEach(f => {
            const open = progress(T, f.start, 3.5);
            const [x, y] = sway(f.x, f.y);

            if (f.type === 'sun') {
                drawSunflower(g, x, y, f.size, open);
            } else {
                drawLily(g, x, y, f.size, open);
            }
        });

        // Wrapper appears at the end
        drawWrapper(g, progress(T, 12, 3));
    }

    // ------------------------------------------------
    // ASCII RENDERER
    // ------------------------------------------------

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);

        const w = window.innerWidth;
        const h = window.innerHeight;

        fontSize = clamp(Math.floor(Math.min(w / 100, h / 85)), 5, 11);

        ctx.font = `bold ${fontSize}px monospace`;

        cellW = ctx.measureText('M').width;
        cellH = fontSize;

        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);

        cols = Math.ceil(w / cellW);
        rows = Math.ceil(h / cellH);

        off.width = cols;
        off.height = rows;
    }

    function render() {
        const aspect = cellH / cellW;

        const scale = Math.min(
            cols / W,
            rows * aspect / H
        ) * .96;

        octx.setTransform(1, 0, 0, 1, 0, 0);
        octx.fillStyle = '#000';
        octx.fillRect(0, 0, cols, rows);

        octx.setTransform(
            scale, 0, 0, scale / aspect,
            (cols - W * scale) / 2,
            (rows - H * scale / aspect) / 2
        );

        drawScene(octx);

        const pixels = octx.getImageData(
            0, 0, cols, rows
        ).data;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        ctx.textBaseline = 'top';

        const max = RAMP.length - 1;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const i = (y * cols + x) * 4;

                const r = pixels[i];
                const green = pixels[i + 1];
                const b = pixels[i + 2];

                const brightness = Math.max(r, green, b);

                if (brightness < 14) continue;

                const value = brightness / 255;
                const index = clamp(
                    Math.round(Math.pow(value, .7) * max),
                    1, max
                );

                ctx.fillStyle = `rgb(${r},${green},${b})`;
                ctx.fillText(
                    RAMP[index],
                    x * cellW,
                    y * cellH
                );
            }
        }
    }

    // ------------------------------------------------
    // ANIMATION AND BUTTON
    // ------------------------------------------------

    function frame(now) {
        requestAnimationFrame(frame);

        if (now - lastFrame < 1000 / FPS) return;
        lastFrame = now;

        if (!started) return;

        T = (now - startTime) / 1000;

        render();
    }

    document.getElementById('discover').addEventListener('click', () => {
        if (started) return;

        started = true;
        startTime = performance.now();

        document.getElementById('gate').classList.add('hidden');

        document.getElementById('message').classList.add('visible');
    });

    window.addEventListener('resize', resize);

    resize();
    requestAnimationFrame(frame);

})();