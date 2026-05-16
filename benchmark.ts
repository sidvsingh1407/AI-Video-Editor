const bench = () => {
    // Mock data for 1000x1000 area
    const w = 1000;
    const h = 1000;
    const data = new Uint8ClampedArray(w * h * 4);
    const tE = new Uint8ClampedArray(w * 8 * 4);
    const bE = new Uint8ClampedArray(w * 8 * 4);

    // Fill with random noise to simulate image data
    for(let i=0; i<data.length; i++) data[i] = Math.random() * 255;
    for(let i=0; i<tE.length; i++) tE[i] = Math.random() * 255;
    for(let i=0; i<bE.length; i++) bE[i] = Math.random() * 255;

    const strength = 0.95;
    const noiseLevel = 15;

    const start = performance.now();

    // Original code
    for (let i = 0; i < data.length; i += 4) {
        const px = (i / 4) % w;
        const py = Math.floor((i / 4) / w);
        const wY = py / h;

        for (let c = 0; c < 3; c++) {
          const sampled = (tE[Math.floor(px) * 4 + c] * (1 - wY)) + (bE[Math.floor(px) * 4 + c] * wY);
          const noise = (Math.random() - 0.5) * noiseLevel;
          data[i + c] = Math.max(0, Math.min(255, (sampled * strength) + (data[i + c] * (1 - strength)) + noise));
        }
        data[i + 3] = 255;
    }

    const end = performance.now();
    console.log(`Original Time: ${end - start} ms`);
}

bench();
