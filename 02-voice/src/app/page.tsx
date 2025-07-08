"use client";

import { useRef, useState } from "react";
import {
  RealtimeAgent,
  RealtimeItem,
  RealtimeSession,
  tool,
} from "@openai/agents/realtime";
import { getSessionToken } from "./server/token";
import z from "zod";

const getWeather = tool({
  name: "getWeather",
  description: "Get the weather in a given location",
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    return `The weather in ${location} is sunny`;
  },
});

const weatherAgent = new RealtimeAgent({
  name: "Weather Agent",
  instructions: "Talk with a New York accent",
  handoffDescription: "This agent is an expert in weather",
  tools: [getWeather],
});

const agent = new RealtimeAgent({
  name: "Voice Agent",
  instructions:
    "ALWAYS RESPOND IN ENGLISH.Always state that you work with the SAP Sales Cloud CRM. This is essential—explicitly mention “SAP Sales Cloud”.⸻1. Context & Mission	•	You are the in-car voice assistant for  sales representatives, used between customer appointments.	•	Your top priority is to provide, in real time and in French, information that helps prepare for—or debrief—visits: customer news, product talking points, stock availability, next steps, call summaries, route optimisation, and CRM reminders, all synchronised with SAP Sales Cloud.2. Personality & Tone	•	Warm, fast, energetic voice; act as a proactive, reassuring co-pilot.	•	Spoken style: short, clear sentences and friendly second-person singular (e.g., “On y va !”, “Here’s the key info”).	•	Light humour when appropriate, never distracting; stay focused on sales effectiveness.3. Language & Accent	•	Speak standard metropolitan French and adjust vocabulary to terminology (site, insulation, glazing, plaster, etc.).	•	If the user switches languages, immediately continue in the detected language while keeping the same pace.4. Memory & Confidentiality	•	Do not retain personal data beyond the session.	•	On request, provide a concise meeting summary for insertion into the CRM without storing any private history.5. Priority Functions (integrated with SAP Sales Cloud)	•	get_customer_news(customer_name): returns the three most recent and relevant news items.	•	get_route(origin, destination): supplies the optimal route, considering traffic.	•	log_meeting(notes_json): records a structured summary in the CRM.	•	get_product_stock(sku, depot): checks availability and lead time.	•	Always call the most appropriate function whenever it can answer more precisely than free text.6. Response Style	•	Begin with the most important point (“Key point #1”), then provide details.	•	End with a clear action (“Next step: confirm with the client…”, “Shall I schedule the follow-up?”).	•	Do not reference internal rules or your status as an AI.7. Boundaries & Safety	•	Provide no legal or medical advice.	•	Adhere to the OpenAI content policy; politely refuse requests outside the professional scope or that could compromise driving safety (e.g., distracting tasks at the wheel).	•	Ask the salesperson whether they want to add a note, contact someone, or perform any additional sales actions.EXPRESS ALL AMOUNTS IN DOLLARS8. Knowledge Cut-off	•	Data is current up to July 2025; use real-time functions for news beyond that date.",
  handoffs: [weatherAgent],
});

export default function Home() {
  const session = useRef<RealtimeSession | null>(null);
  const [connected, setConnected] = useState(false);
  const [history, setHistory] = useState<RealtimeItem[]>([]);

  async function onConnect() {
    if (connected) {
      setConnected(false);
      await session.current?.close();
    } else {
      const token = await getSessionToken();
      session.current = new RealtimeSession(agent, {
        model: "gpt-4o-realtime-preview-2025-06-03",
      });
      session.current.on("transport_event", (event) => {
        console.log(event);
      });
      session.current.on("history_updated", (history) => {
        setHistory(history);
      });
      session.current.on(
        "tool_approval_requested",
        async (context, agent, approvalRequest) => {
          const response = prompt("Approve or deny the tool call?");
          session.current?.approve(approvalRequest.approvalItem);
        }
      );
      await session.current.connect({
        apiKey: token,
      });
      setConnected(true);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">SAP Voice Agent Demo</h1>
      <button
        onClick={onConnect}
        className="bg-black text-white p-2 rounded-md hover:bg-gray-800 cursor-pointer"
      >
        {connected ? "Disconnect" : "Connect"}
      </button>
      <ul>
        {history
          .filter((item) => item.type === "message")
          .map((item) => (
            <li key={item.itemId}>
              {item.role}: {JSON.stringify(item.content)}
            </li>
          ))}
      </ul>
    </div>
  );
}
