import fetch from 'node-fetch'

const MCP_URL = process.env.MCP_URL || 'https://mcp-browser-fun.anigok.com'
const AVAILABLE_TOOLS = [
  'get-html-content',
  'get-pdf',
  'scrape-elements',
  'get-screenshot',
  'get-snapshot',
  'get-json',
  'get-links',
  'get-markdown',
  'get-accessibility-tree',
  'crawl-websites',
]

function printUsage() {
  console.log(`Usage: node src/echo_client.js <tool-name> '<json-arguments>'`)
  console.log(`MCP URL: ${MCP_URL}`)
  console.log('Available tools:')
  for (const toolName of AVAILABLE_TOOLS) {
    console.log(`- ${toolName}`)
  }
  console.log('Example:')
  console.log(`node src/echo_client.js get-html-content '{"account_id":"your-account-id","url":"https://example.com"}'`)
}

function parseArguments(rawArguments) {
  if (!rawArguments) {
    return {}
  }

  return JSON.parse(rawArguments)
}

async function callTool(toolName, toolArguments) {
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: toolArguments,
      },
      id: '1',
    }),
  })

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('text/event-stream')) {
    const text = await response.text()
    const match = text.match(/data: (.*)/)
    if (match && match[1]) {
      const result = JSON.parse(match[1])
      console.log(JSON.stringify(result, null, 2))
      return
    }

    console.log('No JSON data found in SSE response:', text)
    return
  }

  const result = await response.json()
  console.log(JSON.stringify(result, null, 2))
}

async function main() {
  const toolName = process.argv[2]
  const rawArguments = process.argv[3]

  if (!toolName) {
    printUsage()
    process.exit(1)
  }

  if (!AVAILABLE_TOOLS.includes(toolName)) {
    console.error(`Unknown tool: ${toolName}`)
    printUsage()
    process.exit(1)
  }

  let toolArguments
  try {
    toolArguments = parseArguments(rawArguments)
  } catch (error) {
    console.error('Arguments must be valid JSON.')
    throw error
  }

  await callTool(toolName, toolArguments)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
