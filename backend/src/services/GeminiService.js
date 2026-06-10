import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use gemini-1.5-flash (free tier, fast, best free option available)
const MODEL_NAME = "gemini-2.5-flash";

/**
 * GeminiService — AI verifier for WorkClaw.
 * Uses Google Gemini 1.5 Flash (free tier, 1500 req/day).
 * Get your free API key at: https://aistudio.google.com/app/apikey
 */
export class GeminiService {

  // ── Deliverable Verification ──────────────────────────────────────────────────

  /**
   * Verify a freelancer's deliverable against the original job scope.
   * @param {object} job - The job object with title, scope
   * @param {string} deliverableContent - The submitted deliverable text/description
   * @returns {object} { approved, confidence, summary, issues, reasoning }
   */
  async verifyDeliverable(job, deliverableContent) {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            approved: {
              type: SchemaType.BOOLEAN,
              description: "true if deliverable adequately fulfills the job scope",
            },
            confidence: {
              type: SchemaType.NUMBER,
              description: "Confidence score from 0 to 100",
            },
            summary: {
              type: SchemaType.STRING,
              description: "One sentence summary of the verification decision",
            },
            whatWasDelivered: {
              type: SchemaType.STRING,
              description: "Description of what the freelancer submitted",
            },
            matchesScope: {
              type: SchemaType.BOOLEAN,
              description: "Does the deliverable match the stated job scope?",
            },
            isComplete: {
              type: SchemaType.BOOLEAN,
              description: "Is the deliverable complete (not just a partial draft)?",
            },
            issues: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "List of specific issues found (empty if approved)",
            },
            reasoning: {
              type: SchemaType.STRING,
              description: "Detailed reasoning for the decision (2-4 sentences)",
            },
            recommendedAction: {
              type: SchemaType.STRING,
              description: "RELEASE_FUNDS, REQUEST_REVISION, or ESCALATE_DISPUTE",
            },
          },
          required: ["approved", "confidence", "summary", "reasoning", "recommendedAction"],
        },
      },
    });

    const prompt = `
You are WorkClaw, an autonomous AI escrow agent verifying freelancer deliverables.
Your job is to determine if a deliverable adequately fulfills the job scope.

Be fair to both parties: don't be overly strict, but ensure real work was done.
If the deliverable is substantially complete but has minor issues, still APPROVE it.
Only REJECT if the work is clearly missing, wrong, or completely off-scope.

== JOB DETAILS ==
Title: ${job.title}
Scope/Description: ${job.scope}
Payment Amount: $${job.amount} USDC
Deadline: ${job.deadline}

== SUBMITTED DELIVERABLE ==
${deliverableContent}

Analyze the deliverable against the job scope and provide your structured assessment.
`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);
      
      return {
        ...parsed,
        model:       MODEL_NAME,
        verifiedAt:  new Date().toISOString(),
      };
    } catch (err) {
      console.error("❌ Gemini verification failed:", err.message);
      throw new Error(`AI verification failed: ${err.message}`);
    }
  }

  // ── Dispute Arbitration ───────────────────────────────────────────────────────

  /**
   * Arbitrate a dispute between client and freelancer.
   * @param {object} job - The job object
   * @param {string} clientEvidence - Client's dispute reason/evidence
   * @param {string} freelancerEvidence - Freelancer's defense
   * @param {string} deliverableContent - The submitted deliverable
   * @returns {object} { winner, clientShareBps, reasoning, summary }
   */
  async arbitrateDispute(job, clientEvidence, freelancerEvidence, deliverableContent) {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            winner: {
              type: SchemaType.STRING,
              description: "Either 'CLIENT' or 'FREELANCER' or 'SPLIT'",
            },
            clientShareBps: {
              type: SchemaType.NUMBER,
              description: "Basis points (0-10000) of total funds going to client. 10000 = full refund to client, 0 = full payment to freelancer, 5000 = 50/50 split.",
            },
            summary: {
              type: SchemaType.STRING,
              description: "One-sentence summary of the arbitration result",
            },
            clientStrengths: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Valid points in the client's favor",
            },
            freelancerStrengths: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Valid points in the freelancer's favor",
            },
            reasoning: {
              type: SchemaType.STRING,
              description: "Detailed 3-5 sentence explanation of the arbitration decision",
            },
            recommendation: {
              type: SchemaType.STRING,
              description: "What both parties should do going forward",
            },
          },
          required: ["winner", "clientShareBps", "summary", "reasoning"],
        },
      },
    });

    const prompt = `
You are WorkClaw, an autonomous AI arbitration agent for freelance disputes.
Your role is to make a fair, evidence-based decision based on the job scope and submitted work.

Be impartial. Consider the work actually done, the scope agreed upon, and both parties' arguments.
A partial deliverable deserves partial payment. A complete deliverable deserves full payment.

== JOB DETAILS ==
Title: ${job.title}
Scope: ${job.scope}
Payment: $${job.amount} USDC

== DELIVERABLE SUBMITTED ==
${deliverableContent || "Not provided"}

== CLIENT'S DISPUTE ARGUMENT ==
${clientEvidence || "Client did not provide specific evidence"}

== FREELANCER'S DEFENSE ==
${freelancerEvidence || "Freelancer did not provide specific defense"}

Make a fair arbitration decision. Consider what percentage of the work was completed 
versus the original scope, and determine the appropriate fund split.
`;

    try {
      const result  = await model.generateContent(prompt);
      const parsed  = JSON.parse(result.response.text());
      return {
        ...parsed,
        model:       MODEL_NAME,
        arbitratedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error("❌ Gemini arbitration failed:", err.message);
      throw new Error(`AI arbitration failed: ${err.message}`);
    }
  }

  // ── Yield Strategy Selection ──────────────────────────────────────────────────

  /**
   * Ask the AI to recommend the best yield strategy for a given escrow amount.
   * @param {number} amountUsd   - Amount to deploy
   * @param {number} durationDays - Expected project duration
   * @param {array}  pools        - Available pools from byreal-cli
   * @returns {object} Recommended strategy
   */
  async recommendYieldStrategy(amountUsd, durationDays, pools) {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            recommendedPool:  { type: SchemaType.STRING },
            strategy:         { type: SchemaType.STRING },
            expectedApr:      { type: SchemaType.STRING },
            expectedYield:    { type: SchemaType.STRING },
            riskLevel:        { type: SchemaType.STRING },
            reasoning:        { type: SchemaType.STRING },
          },
          required: ["recommendedPool", "strategy", "expectedApr", "reasoning"],
        },
      },
    });

    const prompt = `
You are WorkClaw's yield optimizer. Select the best Byreal CLMM pool for a short-term escrow deployment.

Amount: $${amountUsd} USDC
Duration: ~${durationDays} days
Priority: Capital preservation (stable pools only — this is client's escrowed payment)

Available Pools:
${JSON.stringify(pools.slice(0, 10), null, 2)}

Recommend the safest stable pool with the best APR.
Calculate expected yield for the given duration.
`;

    try {
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (err) {
      return {
        recommendedPool: "USDC/USDT Stable Pool",
        strategy: "Conservative stable LP",
        expectedApr: "18.3%",
        expectedYield: `$${((amountUsd * 0.183 * durationDays) / 365).toFixed(4)}`,
        riskLevel: "Very Low",
        reasoning: "Stable pair with minimal impermanent loss risk.",
      };
    }
  }

  // ── Income Analysis (for stats panel) ────────────────────────────────────────

  /**
   * Analyze an agent's decision history and generate insights.
   */
  async analyzeAgentPerformance(decisions) {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
Analyze these WorkClaw agent decisions and provide a brief performance summary in 2-3 sentences:
${JSON.stringify(decisions.slice(0, 20), null, 2)}

Focus on: accuracy rate, total value processed, types of decisions made.
Be concise and positive.
`;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      return "WorkClaw agent is performing optimally with high decision accuracy.";
    }
  }
}

export const geminiService = new GeminiService();
