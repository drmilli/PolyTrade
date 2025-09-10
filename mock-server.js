const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 2024;

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'polytrader-mock-agent' });
});

// Create thread (simulate LangGraph SDK)
app.post('/threads', (req, res) => {
  const threadId = uuidv4();
  res.json({ thread_id: threadId });
});

// Stream agent run (simulate LangGraph agent execution)
app.post('/threads/:threadId/runs/stream', (req, res) => {
  const { threadId } = req.params;
  const { market_id, tokens, from_js } = req.body.input || req.body;
  
  console.log(`Starting mock agent for market ${market_id}`);
  
  // Set headers for Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Mock agent workflow events
  const events = [
    {
      event: 'updates',
      data: {
        fetch_market_data: {
          messages: [{
            content: `Fetching market data for market ${market_id}...`,
            type: 'ai',
            name: null,
            id: uuidv4()
          }],
          market_data: {
            market_id: market_id,
            tokens: tokens,
            volume: 125000,
            liquidity: 85000,
            current_prices: tokens.map(t => ({ outcome: t.outcome, price: t.price }))
          }
        }
      }
    },
    {
      event: 'updates', 
      data: {
        research_agent: {
          messages: [{
            content: 'Conducting research on market factors...',
            type: 'ai',
            name: null,
            id: uuidv4(),
            tool_calls: [{
              name: 'exa_search',
              args: { query: `market analysis ${market_id}` },
              id: uuidv4()
            }]
          }],
          external_research_info: {
            research_summary: 'Based on current market trends and recent news, the market shows moderate volatility with key factors including regulatory developments and market sentiment.',
            confidence: 0.75,
            source_links: [
              'https://example.com/market-analysis-1',
              'https://example.com/market-analysis-2'
            ]
          }
        }
      }
    },
    {
      event: 'updates',
      data: {
        reflect_on_research: {
          messages: [{
            content: 'Research quality is satisfactory. Proceeding with analysis.',
            type: 'ai',
            name: null,
            id: uuidv4(),
            additional_kwargs: {
              artifact: {
                reason: ['Research covers key market factors', 'Sources are reliable', 'Timeline is appropriate for 2025'],
                is_satisfactory: true,
                improvement_instructions: null
              }
            }
          }]
        }
      }
    },
    {
      event: 'updates',
      data: {
        analysis_agent: {
          messages: [{
            content: 'Analyzing market data and research findings...',
            type: 'ai', 
            name: null,
            id: uuidv4()
          }],
          analysis_info: {
            analysis_summary: 'Market shows bullish sentiment with strong fundamentals. Price momentum indicates potential upward movement.',
            confidence: 0.82,
            market_metrics: {
              price_analysis: 'Current price at 0.65 shows undervaluation compared to fundamentals',
              volume_analysis: 'Trading volume increased 15% over past week',
              liquidity_analysis: 'Sufficient liquidity for medium-sized positions'
            },
            orderbook_analysis: {
              market_depth: 'Good depth on both sides with tight spreads',
              execution_analysis: 'Low slippage expected for trades up to $10k',
              liquidity_distribution: 'Balanced distribution across price levels'
            },
            trading_signals: {
              price_momentum: 'Positive momentum with RSI at 58',
              market_efficiency: 'Market appears fairly efficient with minimal arbitrage',
              risk_factors: 'Regulatory uncertainty remains key risk'
            },
            execution_recommendation: {
              optimal_size: '$2,500 - $5,000 position size recommended',
              entry_strategy: 'Gradual entry over 2-3 transactions',
              key_levels: 'Support at 0.62, resistance at 0.72'
            }
          }
        }
      }
    },
    {
      event: 'updates',
      data: {
        reflect_on_analysis: {
          messages: [{
            content: 'Analysis is comprehensive and well-reasoned. Proceeding to trade decision.',
            type: 'ai',
            name: null,
            id: uuidv4(),
            additional_kwargs: {
              artifact: {
                reason: ['Analysis covers all key metrics', 'Risk assessment is thorough', 'Recommendations are actionable'],
                is_satisfactory: true,
                improvement_instructions: null
              }
            }
          }]
        }
      }
    },
    {
      event: 'updates',
      data: {
        trade_agent: {
          messages: [{
            content: 'Making trade decision based on analysis...',
            type: 'ai',
            name: null,
            id: uuidv4()
          }],
          trade_info: {
            side: 'BUY',
            outcome: 'YES',
            market_id: market_id,
            token_id: tokens.find(t => t.outcome === 'YES')?.token_id || 'token_1',
            size: 3500,
            reason: 'Strong fundamentals and positive momentum indicate good buying opportunity. Research shows undervaluation with catalysts for price appreciation.',
            confidence: 0.78,
            trade_evaluation_of_market_data: 'Market data supports bullish thesis with increasing volume and favorable price action'
          }
        }
      }
    }
  ];

  let eventIndex = 0;
  
  const sendEvent = () => {
    if (eventIndex < events.length) {
      const event = events[eventIndex];
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      eventIndex++;
      
      // Send next event after delay
      setTimeout(sendEvent, 2000);
    } else {
      // Send final metadata event
      res.write(`data: ${JSON.stringify({
        event: 'metadata',
        data: { run_id: uuidv4(), status: 'completed' }
      })}\n\n`);
      res.end();
    }
  };

  // Start sending events
  setTimeout(sendEvent, 1000);
});

// Handle interrupts (human confirmations)
app.post('/threads/:threadId/runs/:runId/interrupt', (req, res) => {
  console.log('Received interrupt:', req.body);
  res.json({ status: 'success', message: 'Interrupt handled' });
});

app.listen(PORT, () => {
  console.log(`Mock PolyTrade agent server running on http://localhost:${PORT}`);
  console.log('Ready to receive requests from frontend...');
});
