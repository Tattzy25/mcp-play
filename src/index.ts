import express from "express";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
// Import Express types correctly
import type { Request, Response } from "express";

// Enable debug logging to see what's happening
process.env.DEBUG = "mcp:*";

const app = express();
app.use(express.json());

const server = new McpServer({
  name: "Echo",
  version: "1.0.0"
});

// Register our capabilities
server.resource(
  "echo",
  new ResourceTemplate("echo://{message}", { list: undefined }),
  async (uri, { message }) => ({
    contents: [{
      uri: uri.href,
      text: `Resource echo: ${message}`
    }]
  })
);

server.prompt(
  "echo",
  { message: z.string() },
  ({ message }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please process this message: ${message}`
      }
    }]
  })
);

app.post('/mcp', async (req: Request, res: Response) => {
  try {
    // Log incoming request for debugging
    console.log('Received request:', JSON.stringify(req.body, null, 2));
    
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    
    res.on('close', () => {
      console.log('Request closed');
      transport.close();
    });
    
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

app.get('/mcp', async (req: Request, res: Response) => {
  console.log('Received GET MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed. Use POST to interact with the MCP server. Follow README for details."
    },
    id: null
  }));
});

app.delete('/mcp', async (req: Request, res: Response) => {
  console.log('Received DELETE MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed. Use POST to interact with the MCP server. Follow README for details."
    },
    id: null
  }));
});

// Start the server
const PORT = process.env.MCP_SERVER_PORT || 8080;
app.listen(PORT, () => {
  console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});

// Base URL for the API, can be overridden by the environment variable MCP_API_URL
const API_URL = process.env.MCP_API_URL || "https://mcp-browser-fun.anigok.com";

// Helper function for making API requests
async function makeAPIRequest<T>(url: string, method: string, body?: any): Promise<T | null> {
  const headers = {
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making API request:", error);
    return null;
  }
}

// Interfaces for request and response types
interface BrowserRenderingContentResponse {
  html: string;
}

interface BrowserRenderingPDFResponse {
  pdf: string;
}

interface BrowserRenderingScrapeResponse {
  elements: any[];
}

interface BrowserRenderingScreenshotResponse {
  screenshot: string;
}

interface BrowserRenderingSnapshotResponse {
  html: string;
  screenshot: string;
}

interface BrowserRenderingJsonResponse {
  json: any;
}

interface BrowserRenderingLinksResponse {
  links: string[];
}

interface BrowserRenderingMarkdownResponse {
  markdown: string;
}

interface BrowserRenderingAccessibilityTreeResponse {
  accessibilityTree: any;
}

interface BrowserRenderingCrawlResponse {
  result: any;
}

// Register browser rendering tools
// @ts-ignore
server.tool(
  "get-html-content",
  "Get HTML content.",
  {
    account_id: z.string(),
    url: z.string().url(),
  },
  async ({ account_id, url }) => {
    const contentUrl = `${API_URL}/accounts/${account_id}/browser-rendering/content`;
    const response = await makeAPIRequest<BrowserRenderingContentResponse>(contentUrl, "POST", { url });

    if (!response) {
      return { content: [{ type: "text", text: "Failed to retrieve HTML content." }] };
    }

    return { content: [{ type: "text", text: response.html }] };
  },
);

// @ts-ignore
server.tool(
  "get-pdf",
  "Get PDF.",
  {
    account_id: z.string(),
    url: z.string().url(),
  },
  async ({ account_id, url }) => {
    const pdfUrl = `${API_URL}/accounts/${account_id}/browser-rendering/pdf`;
    const response = await makeAPIRequest<BrowserRenderingPDFResponse>(pdfUrl, "POST", { url });

    if (!response) {
      return { content: [{ type: "text", text: "Failed to retrieve PDF." }] };
    }

    return { content: [{ type: "text", text: response.pdf }] };
  },
);

// @ts-ignore
server.tool(
  "scrape-elements",
  "Scrape elements.",
  {
    account_id: z.string(),
    url: z.string().url(),
    selectors: z.array(z.string()),
  },
  async ({ account_id, url, selectors }) => {
    const scrapeUrl = `${API_URL}/accounts/${account_id}/browser-rendering/scrape`;
    const response = await makeAPIRequest<BrowserRenderingScrapeResponse>(scrapeUrl, "POST", { url, selectors });

    if (!response) {
      return { content: [{ type: "text", text: "Failed to scrape elements." }] };
    }

    return { content: [{ type: "json", json: response.elements }] };
  },
);

// @ts-ignore
server.tool(
  "get-screenshot",
  "Get screenshot.",
  {
    account_id: z.string(),
    url: z.string().url(),
  },
  async ({ account_id, url }) => {
    const screenshotUrl = `${API_URL}/accounts/${account_id}/browser-rendering/screenshot`;
    const response = await makeAPIRequest<BrowserRenderingScreenshotResponse>(screenshotUrl, "POST", { url });

    if (!response) {
      return { content: [{ type: "text", text: "Failed to retrieve screenshot." }] };
    }

    return { content: [{ type: "text", text: response.screenshot }] };
  },
);

// @ts-ignore
server.tool(
  "get-snapshot",
  "Get HTML content and screenshot.",
  {
    account_id: z.string(),
    url: z.string().url(),
  },
  async ({ account_id, url }) => {
    const snapshotUrl = `${API_URL}/accounts/${account_id}/browser-rendering/snapshot`;
    const response = await makeAPIRequest<BrowserRenderingSnapshotResponse>(snapshotUrl, "POST", { url });

    if (!response) {
      return { content: [{ type: "text", text: "Failed to retrieve snapshot." }] };
    }

    return { content: [{ type: "text", text: response.html }, { type: "text", text: response.screenshot }] };
  },
);

// @ts-ignore
server.tool(
  "get-json",
  "Get json.",
  {
    account_id: z.string(),
    url: z.string().url(),
  },
  async ({ account_id, url }) => {
    const jsonUrl = `${API_URL}/accounts/${account_id}/browser-rendering/json`;
    const response = await makeAPIRequest<BrowserRenderingJsonResponse>(jsonUrl, "POST", { url });

    if (!response) {
      return { content: [{ type: "text", text: "Failed to retrieve JSON." }] };
    }

    return { content: [{ type: "json", json: response.json }] };
  },
);

// @ts-ignore
server.tool(
  "get-links",
  "Get Links.",
  {
    account_id: z.string(),
    url: z.string().url(),
  },
  async ({ account_id, url }) => {
    const linksUrl = `${API_URL}/accounts/${account_id}/browser-rendering/links`;
    const response = await makeAPIRequest<BrowserRenderingLinksResponse>(linksUrl, "POST", { url });

    if (!response) {
      return { content: [{ type: "text", text: "Failed to retrieve links." }] };
    }

    return { content: [{ type: "json", json: response.links }] };
  },
);

// @ts-ignore
server.tool(
  "get-markdown",
  "Get markdown.",
  {
    account_id: z.string(),
    url: z.string().url(),
  },
  async ({ account_id, url }) => {
    const markdownUrl = `${API_URL}/accounts/${account_id}/browser-rendering/markdown`;
    const response = await makeAPIRequest<BrowserRenderingMarkdownResponse>(markdownUrl, "POST", { url });

    if (!response) {
      return { content: [{ type: "text", text: "Failed to retrieve markdown." }] };
    }

    return { content: [{ type: "text", text: response.markdown }] };
  },
);

// @ts-ignore
server.tool(
  "get-accessibility-tree",
  "Get accessibility tree page.",
  {
    account_id: z.string(),
    url: z.string().url(),
  },
  async ({ account_id, url }) => {
    const accessibilityTreeUrl = `${API_URL}/accounts/${account_id}/browser-rendering/accessibilityTree`;
    const response = await makeAPIRequest<BrowserRenderingAccessibilityTreeResponse>(accessibilityTreeUrl, "POST", { url });

    if (!response) {
      return { content: [{ type: "text", text: "Failed to retrieve accessibility tree." }] };
    }

    return { content: [{ type: "json", json: response.accessibilityTree }] };
  },
);

// @ts-ignore
server.tool(
  "crawl-websites",
  "Crawl websites.",
  {
    account_id: z.string(),
    urls: z.array(z.string().url()),
  },
  async ({ account_id, urls }) => {
    const crawlUrl = `${API_URL}/accounts/${account_id}/browser-rendering/crawl`;
    const response = await makeAPIRequest<BrowserRenderingCrawlResponse>(crawlUrl, "POST", { urls });

    if (!response) {
      return { content: [{ type: "text", text: "Failed to crawl websites." }] };
    }

    return { content: [{ type: "json", json: response.result }] };
  },
);

// Additional tools can be registered similarly...