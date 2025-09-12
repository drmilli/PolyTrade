"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import ResearchCard from "@/components/research-card";
// import { AgentStreamErrorBoundary } from "@/components/error-boundary";

// Import the newly created types
import {
  AgentEvent,
  AgentMessage,
  ExternalResearchInfo,
  AnalysisInfo,
  TradeInfo,
  ReflectionArtifact,
} from "@/types/agent-stream-types";
import TradeExecutionCard from "@/components/trade-execution-card";
import {
  validateAgentEvent,
  DataValidationError,
  safeJsonParse,
} from "@/lib/utils/data-validation";

/**
 * Each event from the agent's streamed updates is stored in `agentEvents`.
 * `streamOutput` is the raw output (lines) from the streaming if we want to debug.
 */
interface StreamingAgentConsoleProps {
  isStreaming: boolean;
  streamOutput: string[];
  agentEvents: AgentEvent[];
  onTradeConfirmation?: (decision: "YES" | "NO") => void;
}

/**
 * We'll display each AgentEvent as a card or sub-card, depending on the node name.
 * Some events may contain reflection artifacts that we color-code.
 */

export default function StreamingAgentConsole({
  isStreaming,
  agentEvents,
  onTradeConfirmation,
}: Omit<StreamingAgentConsoleProps, 'streamOutput'>) {
  const [showTradeConfirmation, setShowTradeConfirmation] = useState(false);
  const [tradeToConfirm, setTradeToConfirm] = useState<TradeInfo | null>(null);
  const [,] = useState<{
    run_id: string;
    attempt: number;
  } | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Track research and trade data for tabs
  const [, setResearchData] = useState<{
    report: string;
    learnings: string[];
    visited_urls?: string[];
  } | null>(null);
  const [, setTradeData] = useState<{
    orderID: string;
    takingAmount: string;
    makingAmount: string;
    status: string;
    transactionsHashes: string[];
    success: boolean;
    errorMsg?: string;
  } | null>(null);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  // Handle scroll button visibility
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll to bottom if user hasn't manually scrolled away
  useEffect(() => {
    if (!showScrollButton) {
      scrollToBottom();
    }
  }, [agentEvents, showScrollButton, scrollToBottom]);

  // Check for trade events that need confirmation
  useEffect(() => {
    console.log("=== TRADE POPUP DEBUG ===");
    console.log("Total agentEvents:", agentEvents.length);
    
    agentEvents.forEach((event, index) => {
      console.log(`Event ${index}:`, {
        name: event.name,
        hasData: !!event.data,
        dataKeys: event.data ? Object.keys(event.data) : [],
        trade_decision: event.data?.trade_decision,
        trade_info: event.data?.trade_info
      });
      
      // Check for trade decision in complete state data
      if (event.data?.trade_decision) {
        console.log("🎯 FOUND trade_decision:", event.data.trade_decision);
        const tradeDecision = event.data.trade_decision;
        if (tradeDecision.side && tradeDecision.side !== "NO_TRADE") {
          console.log("🚀 TRIGGERING POPUP for decision:", tradeDecision);
          setTradeToConfirm(tradeDecision);
          setShowTradeConfirmation(true);
          return; // Exit early once we find a trade
        }
      }
      
      // Legacy check for trade_info
      if (event.name === "trade_agent" && event.data?.trade_info) {
        console.log("🎯 FOUND trade_info:", event.data.trade_info);
        const tradeInfo = event.data.trade_info as TradeInfo;
        if (tradeInfo.side && tradeInfo.side !== "NO_TRADE") {
          console.log("🚀 TRIGGERING POPUP for info:", tradeInfo);
          setTradeToConfirm(tradeInfo);
          setShowTradeConfirmation(true);
          return; // Exit early once we find a trade
        }
      }
      
      // Check for any trade-related data in any event
      if (event.data && typeof event.data === 'object') {
        const dataStr = JSON.stringify(event.data).toLowerCase();
        if (dataStr.includes('trade') || dataStr.includes('buy') || dataStr.includes('sell')) {
          console.log("🔍 Event contains trade-related data:", event);
        }
      }
    });
    
    console.log("Current popup state:", { showTradeConfirmation, tradeToConfirm });
    console.log("=== END TRADE POPUP DEBUG ===");
  }, [agentEvents, showTradeConfirmation, tradeToConfirm]);

  // Process events to update research and trade data with validation
  useEffect(() => {
    agentEvents.forEach((event) => {
      try {
        // Validate event structure
        const validatedEvent = validateAgentEvent(event);
        
        if (validatedEvent.name === "research_tools" && validatedEvent.data?.messages?.[0]) {
          try {
            const data = safeJsonParse(validatedEvent.data.messages[0].content || '{}', {}) as Record<string, unknown>;
            if (data && typeof data === 'object' && data.report && data.learnings) {
              setResearchData({
                report: String(data.report),
                learnings: Array.isArray(data.learnings) ? data.learnings : [],
                visited_urls: Array.isArray(data.visited_urls) ? data.visited_urls : [],
              });
            }
          } catch (e) {
            console.warn("Failed to parse research data:", e);
          }
        }

        if (validatedEvent.name === "process_human_input" && validatedEvent.data?.messages?.[0]) {
          try {
            const content = validatedEvent.data.messages[0].content || '';
            if (content.includes("Trade executed successfully")) {
              const match = content.match(/Order response: ({.*})/);
              if (match) {
                const orderData = safeJsonParse(match[1].replace(/'/g, '"'), {}) as Record<string, unknown>;
                if (orderData && typeof orderData === 'object' && orderData.orderID) {
                  setTradeData({
                    orderID: String(orderData.orderID),
                    takingAmount: String(orderData.takingAmount || '0'),
                    makingAmount: String(orderData.makingAmount || '0'),
                    status: String(orderData.status || 'unknown'),
                    transactionsHashes: Array.isArray(orderData.transactionsHashes) ? orderData.transactionsHashes.map(String) : [],
                    success: typeof orderData.success === 'boolean' ? orderData.success : true,
                    errorMsg: orderData.errorMsg ? String(orderData.errorMsg) : undefined,
                  });

                  // Show toast notification
                  toast({
                    title: "Trade Executed Successfully",
                    description: `Order ${String(orderData.orderID).slice(
                      0,
                      8
                    )}... has been ${orderData.status || 'processed'}`,
                  });
                }
              }
            }
          } catch (e) {
            console.warn("Failed to parse trade data:", e);
          }
        }
      } catch (validationError) {
        if (validationError instanceof DataValidationError) {
          console.warn(`Data validation error for event ${event.name}:`, validationError.message);
        } else {
          console.error("Unexpected error processing event:", validationError);
        }
      }
    });
  }, [agentEvents, toast]);

  const handleTradeDecision = (decision: "YES" | "NO") => {
    setShowTradeConfirmation(false);
    setTradeToConfirm(null);
    onTradeConfirmation?.(decision);
  };

  return (
    <div className="w-full space-y-6">
      <div className="rounded-lg bg-white dark:bg-gray-800 shadow-lg p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Polytrader Agent Console
          </h2>
          {isStreaming && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Streaming...
              </span>
            </div>
          )}
        </div>


        {/* <div className="mt-6">
          <AnalysisTabs
            researchData={researchData || undefined}
            tradeData={tradeData || undefined}
          />
        </div> */}
      </div>

      {/* Trade confirmation modal */}
      {showTradeConfirmation && tradeToConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Confirm Trade</h3>
            <div className="space-y-4 mb-6">
              <p className="text-gray-600 dark:text-gray-300">
                Would you like to proceed with the following trade?
              </p>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
                <p>
                  <span className="font-semibold">Outcome:</span>{" "}
                  {tradeToConfirm.outcome}
                </p>
                <p>
                  <span className="font-semibold">Side:</span>{" "}
                  {tradeToConfirm.side}
                </p>
                <p>
                  <span className="font-semibold">Size:</span>{" "}
                  {tradeToConfirm.size}
                </p>
                <p>
                  <span className="font-semibold">Confidence:</span>{" "}
                  {tradeToConfirm.confidence}
                </p>
                <p>
                  <span className="font-semibold">Reason:</span>{" "}
                  {tradeToConfirm.reason}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => handleTradeDecision("NO")}
              >
                Reject
              </Button>
              <Button
                onClick={() => handleTradeDecision("YES")}
                className="bg-primary hover:bg-primary/90"
              >
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="space-y-4 max-h-[32rem] overflow-y-auto custom-scrollbar pr-2 relative"
      >
        {agentEvents.map((evt, idx) => (
          <AgentEventCard key={idx} name={evt.name} data={evt.data} />
        ))}

        {isStreaming && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-6 right-6 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:bg-primary/90 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * AgentEventCard decides how to render each event node based on `name` (e.g. "research_agent").
 */
function AgentEventCard({
  name,
  data,
}: {
  name: string;
  data: AgentEvent["data"];
}) {
  console.log("AgentEventCard - name:", name, "data:", data);
  console.log("Data type:", typeof data, "Is array:", Array.isArray(data), "Keys:", data ? Object.keys(data) : 'none');
  
  // Return early if data is null or undefined, but allow empty objects
  if (data === null || data === undefined) {
    return (
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
        <h3 className="font-bold text-lg text-primary mb-2">{name}</h3>
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }
  
  // Check if data is an empty object
  if (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0) {
    return (
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
        <h3 className="font-bold text-lg text-primary mb-2">{name}</h3>
        <p className="text-sm text-muted-foreground">Empty data object received</p>
      </div>
    );
  }
  
  switch (name) {
    case "fetch_market_data":
      return <FetchMarketDataCard data={data} />;
    case "research_tools":
      return <ResearchToolsCard data={data} />;
    case "research_agent":
      return <ResearchAgentCard data={data} />;
    case "reflect_on_research":
      return <ReflectionCard data={data} agentType="Research" />;
    case "analysis_agent":
      return <AnalysisAgentCard data={data} />;
    case "reflect_on_analysis":
      return <ReflectionCard data={data} agentType="Analysis" />;
    case "trade_agent":
      return <TradeAgentCard data={data} />;
    case "reflect_on_trade":
      return <ReflectionCard data={data} agentType="Trade" />;
    case "process_human_input":
      if (data && typeof data === 'object' && 'order_response' in data && data.order_response) {
        return <TradeExecutionCard orderData={data.order_response} />;
      } else {
        console.log("No order response found");
        return <div>No order response found</div>;
      }
    case "analysis_tools":
      return <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
        <h3 className="font-bold text-lg text-primary mb-2">Analysis Tools</h3>
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </div>;
    case "trade_tools":
      return <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
        <h3 className="font-bold text-lg text-primary mb-2">Trade Tools</h3>
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </div>;
    case "human_confirmation":
    case "human_confirmation_js":
      return <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
        <h3 className="font-bold text-lg text-primary mb-2">Human Confirmation</h3>
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </div>;
    default:
      // fallback - log what we're getting
      console.log("Unknown node:", name);
      console.log("data", data);
      return (
        <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
          <h3 className="font-bold text-lg mb-2">Unknown Node: {name}</h3>
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
  }
}

/* ============================ */
/* CARDS / COMPONENTS BY NODE  */
/* ============================ */

/** 1) fetch_market_data node */
function FetchMarketDataCard({ data }: { data: AgentEvent["data"] }) {
  console.log("FetchMarketDataCard received data:", data);
  
  const messages = data?.messages || [];
  const marketData = data?.market_data;

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
      <h3 className="font-bold mb-2 text-lg text-primary">
        Market Data Fetched
      </h3>
      
      {/* Debug info */}
      <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
        <p>Messages count: {messages.length}</p>
        <p>Market data exists: {marketData ? 'Yes' : 'No'}</p>
        <p>Raw data keys: {data ? Object.keys(data).join(', ') : 'none'}</p>
      </div>
      
      {messages.length > 0 && (
        <div className="mb-2">
          {messages.map((msg: AgentMessage, idx: number) => (
            <p key={idx} className="text-sm">
              {msg.content}
            </p>
          ))}
        </div>
      )}
      
      {marketData && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="market_data">
            <AccordionTrigger>Show Raw Market Data</AccordionTrigger>
            <AccordionContent>
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(marketData, null, 2)}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      
      {!marketData && messages.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No market data or messages received from backend
        </p>
      )}
    </div>
  );
}

/** 2) research_tools node */
function ResearchToolsCard({ data }: { data: AgentEvent["data"] }) {
  const messages = data?.messages || [];
  const researchData = messages && messages.length > 0 && messages[0]?.content
    ? JSON.parse(messages[0].content)
    : null;

  if (!researchData) {
    return (
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
        <h3 className="font-bold text-lg text-primary mb-2">Research Tools</h3>
        <p className="text-sm">No research data available.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
      <h3 className="font-bold text-lg text-primary mb-2">Research Tools</h3>
      <ResearchCard
        report={researchData.report}
        learnings={researchData.learnings}
        visited_urls={researchData.visited_urls}
      />
    </div>
  );
}

/** Shared ToolCallsCard component for displaying tool calls */
function ToolCallsCard({ messages }: { messages: AgentMessage[] }) {
  // Get the last message's tool calls
  const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;
  const toolCalls = lastMessage?.tool_calls || [];

  if (!toolCalls.length) return null;

  return (
    <div className="mt-4 space-y-4">
      <h4 className="font-semibold text-sm text-muted-foreground">
        Tool Calls
      </h4>
      <div className="space-y-2">
        {toolCalls.map((call) => (
          <div
            key={call.id}
            className="bg-muted/50 rounded-md p-3 text-sm space-y-2"
          >
            <p className="font-medium text-primary">{call.name}</p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(call.args, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 3) research_agent node */
function ResearchAgentCard({ data }: { data: AgentEvent["data"] }) {
  const ext = data?.external_research_info as ExternalResearchInfo | undefined;
  const researchReport = data?.research_report;
  const messages = data?.messages || [];

  console.log("ResearchAgentCard - data:", data);
  console.log("research_report:", researchReport);
  console.log("messages", messages);

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
      <h3 className="font-bold text-lg text-primary mb-2">Research Agent</h3>

      {/* Show research report if available */}
      {researchReport && (
        <div className="mb-4">
          <ResearchCard
            report={researchReport.report}
            learnings={researchReport.learnings}
            visited_urls={researchReport.visited_urls}
          />
        </div>
      )}

      <ToolCallsCard messages={messages} />
      {ext ? (
        <>
          <p className="text-sm mb-2">
            <span className="font-semibold">Research Summary:</span>{" "}
            {ext.research_summary}
          </p>
          <p className="text-sm mb-2">
            <span className="font-semibold">Confidence:</span> {ext.confidence}
          </p>

          {ext.source_links && ext.source_links.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="sources">
                <AccordionTrigger>Show Sources</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc list-inside text-sm">
                    {ext.source_links.map((s: string, i: number) => (
                      <li key={i}>
                        <a
                          href={s}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-blue-600"
                        >
                          {s}
                        </a>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </>
      ) : !researchReport ? (
        <ToolCallsCard messages={messages} />
      ) : null}
    </div>
  );
}

function ReflectionCard({
  data,
  agentType,
}: {
  data: AgentEvent["data"];
  agentType: string;
}) {
  const messages = data?.messages || [];

  // We'll look for reflection artifacts in the messages
  // Typically it's in the "additional_kwargs.artifact"
  // We will display them color-coded by is_satisfactory
  const reflectionMessages = messages.filter((m: AgentMessage) => {
    return m.additional_kwargs?.artifact;
  });

  if (reflectionMessages.length === 0) {
    // No reflection artifact found
    return (
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
        <h3 className="font-bold text-lg text-primary mb-2">
          {agentType} Reflection
        </h3>
        <p className="text-sm">No reflection artifact found.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
      <h3 className="font-bold text-lg text-primary mb-2">
        {agentType} Reflection
      </h3>
      <div className="space-y-4">
        {reflectionMessages.map((msg, idx) => {
          const art = msg.additional_kwargs?.artifact as ReflectionArtifact;
          const { is_satisfactory, improvement_instructions } = art;

          return (
            <div key={idx}>
              {is_satisfactory && (
                <p
                  className={
                    "p-3 rounded text-sm " +
                    (is_satisfactory
                      ? "bg-green-50 text-green-800 border border-green-300"
                      : "bg-red-50 text-red-800 border border-red-300")
                  }
                >
                  {msg.content}
                </p>
              )}

              {/* If not satisfactory, show improvement instructions */}
              {!is_satisfactory && improvement_instructions && (
                <p className="text-sm text-red-600 mt-2">
                  <strong>Improvement Needed:</strong>{" "}
                  {improvement_instructions}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 5) analysis_agent node */
function AnalysisAgentCard({ data }: { data: AgentEvent["data"] }) {
  const analysisInfo = data?.analysis_info as AnalysisInfo | undefined;
  const messages = data?.messages || [];

  if (!analysisInfo) {
    return (
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
        <h3 className="font-bold text-lg text-primary mb-2">Analysis Agent</h3>
        <p className="text-sm">No analysis info yet.</p>
        <ToolCallsCard messages={messages} />
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
      <h3 className="font-bold text-lg text-primary mb-2">Analysis Agent</h3>
      <p className="text-sm mb-2">
        <span className="font-semibold">Summary:</span>{" "}
        {analysisInfo.analysis_summary}
      </p>
      <p className="text-sm mb-2">
        <span className="font-semibold">Confidence:</span>{" "}
        {analysisInfo.confidence}
      </p>
      <Accordion type="multiple" className="mt-4">
        <AccordionItem value="metrics">
          <AccordionTrigger>Market Metrics</AccordionTrigger>
          <AccordionContent>
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify(analysisInfo.market_metrics, null, 2)}
            </pre>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="orderbook_analysis">
          <AccordionTrigger>Orderbook Analysis</AccordionTrigger>
          <AccordionContent>
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify(analysisInfo.orderbook_analysis, null, 2)}
            </pre>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="trading_signals">
          <AccordionTrigger>Trading Signals</AccordionTrigger>
          <AccordionContent>
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify(analysisInfo.trading_signals, null, 2)}
            </pre>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="execution_recommendation">
          <AccordionTrigger>Execution Recommendation</AccordionTrigger>
          <AccordionContent>
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify(analysisInfo.execution_recommendation, null, 2)}
            </pre>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/** 6) trade_agent node */
function TradeAgentCard({ data }: { data: AgentEvent["data"] }) {
  const tradeInfo = data?.trade_info as TradeInfo | undefined;
  if (!tradeInfo) {
    return (
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow">
        <h3 className="font-bold text-lg text-primary mb-2">Trade Agent</h3>
        <p className="text-sm">No trade decision yet.</p>
      </div>
    );
  }

  const {
    side,
    reason,
    confidence,
    market_id,
    token_id,
    size,
    trade_evaluation_of_market_data,
  } = tradeInfo;

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow space-y-3">
      <h3 className="font-bold text-lg text-primary">Trade Agent</h3>
      <p className="text-sm">
        <span className="font-semibold">Side:</span> {side}
      </p>
      {side !== "NO_TRADE" && (
        <>
          <p className="text-sm">
            <span className="font-semibold">Market ID:</span> {market_id}
          </p>
          <p className="text-sm">
            <span className="font-semibold">Token ID:</span> {token_id}
          </p>
          <p className="text-sm">
            <span className="font-semibold">Size:</span> {size}
          </p>
        </>
      )}
      {side === "NO_TRADE" && (
        <p className="text-sm text-muted-foreground">
          No position taken. (side=NO_TRADE)
        </p>
      )}
      <p className="text-sm">
        <span className="font-semibold">Confidence:</span> {confidence}
      </p>
      <p className="text-sm mb-2">
        <span className="font-semibold">Reason:</span> {reason}
      </p>

      {trade_evaluation_of_market_data && (
        <p className="text-sm mb-2">
          <span className="font-semibold">Market Evaluation:</span>{" "}
          {trade_evaluation_of_market_data}
        </p>
      )}
    </div>
  );
}
