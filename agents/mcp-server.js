#!/usr/bin/env node
/**
 * NeuroSwarm MCP Server for AionUi Integration
 * 
 * This exposes NeuroSwarm's 14-agent team as an MCP (Model Context Protocol)
 * server that AionUi can discover and use as a tool provider.
 * 
 * MCP allows AionUi to:
 * - Send tasks to NeuroSwarm agents
 * - Read NeuroSwarm memory/logs
 * - Trigger NeuroSwarm workflows from any AionUi agent
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const axios = require('axios');

const NEUROSWARM_API = process.env.NEUROSWARM_API_URL || 'http://localhost:3000';

const server = new Server(
  {
    name: 'neuroswarm-mcp',
    version: '2.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools that AionUi can call
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'neuroswarm_command',
        description: 'Send a command to the NeuroSwarm 14-agent AI team',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The task or command to execute'
            },
            priority: {
              type: 'string',
              enum: ['low', 'normal', 'high'],
              description: 'Task priority',
              default: 'normal'
            }
          },
          required: ['command']
        }
      },
      {
        name: 'neuroswarm_status',
        description: 'Get NeuroSwarm system status',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'neuroswarm_research',
        description: 'Deep web research via NeuroSwarm researcher agent',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Research query'
            },
            depth: {
              type: 'number',
              description: 'Number of sources to fetch',
              default: 3
            }
          },
          required: ['query']
        }
      },
      {
        name: 'neuroswarm_crypto_analyze',
        description: 'Analyze cryptocurrency via NeuroSwarm crypto agent',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Crypto symbol (e.g., BTCUSDT)'
            }
          },
          required: ['symbol']
        }
      },
      {
        name: 'neuroswarm_translate',
        description: 'Translate text via NeuroSwarm linguist agent',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            targetLang: { type: 'string' },
            sourceLang: { type: 'string', default: 'auto' }
          },
          required: ['text', 'targetLang']
        }
      },
      {
        name: 'neuroswarm_scrape',
        description: 'Scrape a webpage via NeuroSwarm scraper agent',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string' }
          },
          required: ['url']
        }
      }
    ]
  };
});

// Handle tool calls from AionUi
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'neuroswarm_command': {
        const res = await axios.post(`${NEUROSWARM_API}/api/command`, {
          command: args.command,
          priority: args.priority || 'normal'
        }, { timeout: 30000 });
        return {
          content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }]
        };
      }

      case 'neuroswarm_status': {
        const res = await axios.get(`${NEUROSWARM_API}/api/status`, { timeout: 10000 });
        return {
          content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }]
        };
      }

      case 'neuroswarm_research': {
        // Trigger a research task
        const res = await axios.post(`${NEUROSWARM_API}/api/command`, {
          command: `Research: ${args.query}`,
          priority: 'normal'
        }, { timeout: 30000 });
        return {
          content: [{ type: 'text', text: `Research task started. Task ID: ${res.data.taskId}` }]
        };
      }

      case 'neuroswarm_crypto_analyze': {
        const res = await axios.get(`${NEUROSWARM_API}/api/crypto/analyze/${args.symbol}`, { timeout: 15000 });
        return {
          content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }]
        };
      }

      case 'neuroswarm_translate': {
        const res = await axios.post(`${NEUROSWARM_API}/api/translate`, {
          text: args.text,
          targetLang: args.targetLang,
          sourceLang: args.sourceLang || 'auto'
        }, { timeout: 15000 });
        return {
          content: [{ type: 'text', text: res.data.translatedText || JSON.stringify(res.data) }]
        };
      }

      case 'neuroswarm_scrape': {
        const res = await axios.post(`${NEUROSWARM_API}/api/scraper/article`, {
          url: args.url
        }, { timeout: 20000 });
        return {
          content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// Start MCP server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('NeuroSwarm MCP Server running on stdio');
}

main().catch(console.error);
