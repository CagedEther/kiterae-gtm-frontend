import { Router } from "express";

const router = Router();

let cachedBaseUrl: string | null = null;

async function getBlocksBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;
  try {
    const resp = await fetch("https://config.blocks.ai/config.json");
    if (resp.ok) {
      const config = (await resp.json()) as {
        blocksBackendUrl?: string;
        api?: { baseUrl?: string; apiPrefix?: string };
      };
      const url =
        config.blocksBackendUrl ||
        config.api?.baseUrl ||
        "https://app.blocks.ai";
      cachedBaseUrl = url.replace(/\/+$/, "");
      return cachedBaseUrl;
    }
  } catch {
    // fall through to default
  }
  cachedBaseUrl = "https://app.blocks.ai";
  return cachedBaseUrl;
}

router.post("/blocks-token", async (req, res) => {
  const apiKey = process.env.BLOCKS_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "BLOCKS_API_KEY not configured" });
    return;
  }

  try {
    const baseUrl = await getBlocksBaseUrl();
    const upstream = await fetch(
      `${baseUrl}/api/v1/auth/agent/consumer-token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      },
    );

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      req.log.error(
        { status: upstream.status, body: text },
        "Blocks token exchange failed",
      );
      res
        .status(502)
        .json({ error: `Token exchange failed: ${upstream.status}` });
      return;
    }

    const data = (await upstream.json()) as {
      accessToken: string;
      expiresIn: number;
      userId: string;
    };

    res.json({
      token: data.accessToken,
      expiresIn: data.expiresIn,
      userId: data.userId,
    });
  } catch (err) {
    req.log.error({ err }, "blocks-token error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
