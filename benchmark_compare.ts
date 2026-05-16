const bench = () => {
    const w = 1000;
    const h = 1000;
    const data1 = new Uint8ClampedArray(w * h * 4);
    const data2 = new Uint8ClampedArray(w * h * 4);
    const tE = new Uint8ClampedArray(w * 8 * 4);
    const bE = new Uint8ClampedArray(w * 8 * 4);

    for(let i=0; i<data1.length; i++) {
        const val = Math.random() * 255;
        data1[i] = val;
        data2[i] = val;
    }
    for(let i=0; i<tE.length; i++) tE[i] = Math.random() * 255;
    for(let i=0; i<bE.length; i++) bE[i] = Math.random() * 255;

    const strength = 0.95;
    const noiseLevel = 15;

    // Run multiple iterations
    let origTotal = 0;
    let optTotal = 0;
    const iters = 5;

    for (let it = 0; it < iters; it++) {
        const startOrig = performance.now();
        for (let i = 0; i < data1.length; i += 4) {
            const px = (i / 4) % w;
            const py = Math.floor((i / 4) / w);
            const wY = py / h;

            for (let c = 0; c < 3; c++) {
              const sampled = (tE[Math.floor(px) * 4 + c] * (1 - wY)) + (bE[Math.floor(px) * 4 + c] * wY);
              const noise = (Math.random() - 0.5) * noiseLevel;
              data1[i + c] = Math.max(0, Math.min(255, (sampled * strength) + (data1[i + c] * (1 - strength)) + noise));
            }
            data1[i + 3] = 255;
        }
        origTotal += performance.now() - startOrig;

        const startOpt = performance.now();
        let px = 0;
        let py = 0;
        for (let i = 0; i < data2.length; i += 4) {
            const wY = py / h;
            const invWY = 1 - wY;
            const pIdx = px * 4;

            for (let c = 0; c < 3; c++) {
              const sampled = (tE[pIdx + c] * invWY) + (bE[pIdx + c] * wY);
              const noise = (Math.random() - 0.5) * noiseLevel;
              data2[i + c] = Math.max(0, Math.min(255, (sampled * strength) + (data2[i + c] * (1 - strength)) + noise));
            }
            data2[i + 3] = 255;

            px++;
            if (px >= w) {
                px = 0;
                py++;
            }
        }
        optTotal += performance.now() - startOpt;
    }

    console.log(`Original Avg Time: ${origTotal / iters} ms`);
    console.log(`Optimized Avg Time: ${optTotal / iters} ms`);
    console.log(`Improvement: ${((origTotal - optTotal) / origTotal * 100).toFixed(2)}%`);
}

bench();
