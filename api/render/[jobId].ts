export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { jobId } = req.query;

    // TODO: Connect to a persistent database (e.g. Upstash Redis, PostgreSQL) here.
    // Example: const job = await redis.get(jobId);
    // if (!job) return res.status(404).json({ error: "Job not found" });

    // Mocking state since Vercel Serverless Functions are stateless
    const mockJob = {
      id: jobId,
      status: 'complete', // Mocked as complete for client testing
      asset: 'mock_asset_id',
      startTime: Date.now() - 6000,
      plans: []
    };

    res.status(200).json(mockJob);
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
