const bench = () => {
    const w = 1000;
    const h = 1000;
    const data = new Uint8ClampedArray(w * h * 4);
    const tE = new Uint8ClampedArray(w * 8 * 4);
    const bE = new Uint8ClampedArray(w * 8 * 4);

    for(let i=0; i<data.length; i++) data[i] = Math.random() * 255;
    for(let i=0; i<tE.length; i++) tE[i] = Math.random() * 255;
    for(let i=0; i<bE.length; i++) bE[i] = Math.random() * 255;

    const strength = 0.95;
    const noiseLevel = 15;

    const start = performance.now();

    // Optimized code
    let px = 0;
    let py = 0;
    for (let i = 0; i < data.length; i += 4) {
        const wY = py / h;
        const invWY = 1 - wY;
        const pIdx = px * 4;

        for (let c = 0; c < 3; c++) {
          const sampled = (tE[pIdx + c] * invWY) + (bE[pIdx + c] * wY);
          const noise = (Math.random() - 0.5) * noiseLevel;
          data[i + c] = Math.max(0, Math.min(255, (sampled * strength) + (data[i + c] * (1 - strength)) + noise));
        }
        data[i + 3] = 255;

        px++;
        if (px >= w) {
            px = 0;
            py++;
        }
    }

    const end = performance.now();
    console.log(`Optimized Time: ${end - start} ms`);
}

bench();
