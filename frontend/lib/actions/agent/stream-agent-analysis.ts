"use server";

import { Client, type Config } from "@langchain/langgraph-sdk";
import { Token } from "../polymarket/getMarkets";
import { mockAgentStream } from "./mock-stream";

const DEPLOYMENT_URL = process.env.LANGGRAPH_DEPLOYMENT_URL;
const ASSISTANT_ID = "polytrader";
const USE_MOCK = process.env.NODE_ENV === "development" || !DEPLOYMENT_URL;

export async function streamAgentAnalysis(marketId: number, tokens: Token[]) {
  try {
    console.log("DEPLOYMENT_URL", DEPLOYMENT_URL);
    console.log("USE_MOCK", USE_MOCK);
    
    // Use mock stream if in development or no backend available
    if (USE_MOCK) {
      console.log("Using mock agent stream for testing");
      return {
        stream: mockAgentStream(marketId, tokens),
        config: { configurable: { thread_id: `mock-${Date.now()}` } },
      };
    }
    
    if (!DEPLOYMENT_URL) {
      throw new Error("LANGGRAPH_DEPLOYMENT_URL environment variable is not set");
    }
    
    const client = new Client({ apiUrl: DEPLOYMENT_URL });
    console.log("client", client);

    // Test backend connection
    try {
      const thread = await client.threads.create();
      console.log("Successfully created thread:", thread.thread_id);
    } catch (connectionError) {
      console.error("Failed to connect to LangGraph backend:", connectionError);
      console.log("Falling back to mock stream");
      return {
        stream: mockAgentStream(marketId, tokens),
        config: { configurable: { thread_id: `fallback-${Date.now()}` } },
      };
    }

    const thread = await client.threads.create();

    const input = {
      market_id: marketId.toString(),
      from_js: true,
      tokens: tokens,
    };

    const config: Config = {
      configurable: {
        thread_id: thread.thread_id,
      },
    };

    return {
      stream: client.runs.stream(thread.thread_id, ASSISTANT_ID, {
        input,
        streamMode: "updates",
        interruptBefore: ["human_confirmation_js"],
      }),
      config,
    };
  } catch (error) {
    console.error("Error in streamAgentAnalysis:", error);
    console.log("Falling back to mock stream due to error");
    return {
      stream: mockAgentStream(marketId, tokens),
      config: { configurable: { thread_id: `error-fallback-${Date.now()}` } },
    };
  }
}

// export async function writeStreamToFile(streamData: any) {
//   const date = new Date().toISOString().split("T")[0];
//   const fs = require("fs");
//   const path = require("path");

//   // Create data directory if it doesn't exist
//   const dataDir = path.join(process.cwd(), "data");
//   if (!fs.existsSync(dataDir)) {
//     fs.mkdirSync(dataDir, { recursive: true });
//   }

//   const filename = path.join(dataDir, `stream_${date}.json`);
//   fs.writeFileSync(filename, JSON.stringify(streamData, null, 2));
// }
