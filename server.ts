import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory job store
  const renderJobs = new Map<string, any>();

  // API Route - Simulate Render
  app.post("/api/render", async (req, res) => {
    const { videoId, plans } = req.body;
    const jobId = `job_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[NovaCut Engine] Initializing render job ${jobId} for asset: ${videoId}`);
    
    renderJobs.set(jobId, {
      id: jobId,
      status: 'processing',
      asset: videoId,
      startTime: Date.now(),
      plans
    });

    // Detailed Engine Logs (Simulation of Python/FFMPEG Handoff)
    const logs = [
      `[*] Scanning stream structure for ${videoId}...`,
      `[*] Detected 24fps H.264 stream.`,
      `[+] Applying ${plans?.length || 0} AI Instruction Plans`,
      plans?.some((p: any) => p.operations.some((o: any) => o.type === 'talking_head')) ? "[*] SADTALKER_V1: Extracting audio for lip-sync synchronization..." : null,
      plans?.some((p: any) => p.operations.some((o: any) => o.type === 'talking_head')) ? "[*] SADTALKER_V1: Analyzing facial landmarks for stable structure..." : null,
      `[*] Constructing TimelineGraph with ${plans?.flatMap((p: any) => p.operations).length || 0} nodes`,
      `[SYNTHESIS] Shuttling frames to GPU buffer...`
    ].filter(Boolean) as string[];

    logs.forEach((log, index) => {
      setTimeout(() => console.log(`[${jobId}] ${log}`), index * 500);
    });

    res.json({ 
      success: true, 
      message: "Synthesis engine started.",
      jobId,
      logs
    });
  });

  // Get Job Status
  app.get("/api/render/:jobId", (req, res) => {
    const job = renderJobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    
    const elapsed = Date.now() - job.startTime;
    if (elapsed > 5000) job.status = 'complete';

    res.json(job);
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Explicitly disable HMR in middleware mode
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NovaCut Server running on http://localhost:${PORT}`);
  });
}

startServer();
