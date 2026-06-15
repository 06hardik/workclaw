const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiAgent {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey && this.apiKey !== "your_google_ai_studio_api_key_here") {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      this.enabled = true;
      console.log("[Gemini] AI verification enabled (gemini-2.0-flash)");
    } else {
      this.enabled = false;
      console.warn("[Gemini] No API key found. Using demo scoring mode.");
    }
  }

  /**
   * Verify a deliverable against the job scope.
   * Returns { score, reasoning, approved, action, verdict, strengths, concerns }
   */
  async verifyDeliverable(jobTitle, jobDescription, jobScope, proposalCoverLetter, deliverableContent) {
    if (!this.enabled) {
      return this._demoVerification(deliverableContent);
    }

    const prompt = `You are WorkClaw's autonomous AI verification agent for a Web3 freelance platform.
Your job is to evaluate whether a freelancer's submitted work meets the client's requirements.

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

AGREED SCOPE / REQUIREMENTS:
${jobScope || "As described in the job description"}

FREELANCER'S PROPOSAL COMMITMENT:
${proposalCoverLetter}

SUBMITTED DELIVERABLE:
${deliverableContent}

---
Evaluate the deliverable against the scope and proposal commitment.
Respond in this EXACT JSON format (no markdown, no explanation outside JSON):
{
  "score": <integer 0-100>,
  "verdict": "<APPROVED|DISPUTED>",
  "reasoning": "<2-3 sentence explanation of your decision>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "concerns": ["<concern 1>"]
}

Score guide: 80-100 = Excellent, 70-79 = Good (auto-approve threshold), 50-69 = Partial, 0-49 = Insufficient.
Score >= 70 means APPROVED. Score < 70 means DISPUTED.`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const score = Math.min(100, Math.max(0, parseInt(parsed.score) || 0));

      return {
        score,
        reasoning: parsed.reasoning || "Evaluation complete.",
        approved: score >= 70,
        action: score >= 70 ? "AUTO_RELEASE" : "DISPUTE",
        strengths: parsed.strengths || [],
        concerns: parsed.concerns || [],
        verdict: parsed.verdict || (score >= 70 ? "APPROVED" : "DISPUTED"),
      };
    } catch (err) {
      console.error("[Gemini] verifyDeliverable error:", err.message);
      return this._demoVerification(deliverableContent);
    }
  }

  /**
   * Generate a dispute resolution split.
   * Returns { clientShareBps, freelancerShareBps, reasoning, resolution }
   */
  async resolveDispute(jobTitle, jobDescription, deliverableContent, clientClaim, freelancerResponse) {
    if (!this.enabled) {
      return {
        clientShareBps: 3000,
        freelancerShareBps: 7000,
        reasoning: "Demo: Partial payment awarded based on work submitted (70% to freelancer, 30% refund to client).",
        resolution: "PARTIAL_PAYMENT",
      };
    }

    const prompt = `You are WorkClaw's dispute arbitration AI. Provide an unbiased resolution.

JOB: ${jobTitle}
DESCRIPTION: ${jobDescription}
DELIVERABLE: ${deliverableContent}
CLIENT CLAIM: ${clientClaim || "Work does not meet requirements"}
FREELANCER RESPONSE: ${freelancerResponse || "Work was completed as specified"}

Respond in JSON only:
{
  "clientShareBps": <0-10000>,
  "freelancerShareBps": <0-10000>,
  "reasoning": "<fair explanation>",
  "resolution": "<FULL_REFUND|PARTIAL_PAYMENT|FULL_PAYMENT>"
}
clientShareBps + freelancerShareBps must equal 10000 (basis points of total funds incl. yield).`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text().trim().replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      return {
        clientShareBps: Math.min(10000, Math.max(0, parseInt(parsed.clientShareBps) || 5000)),
        freelancerShareBps: 10000 - (Math.min(10000, Math.max(0, parseInt(parsed.clientShareBps) || 5000))),
        reasoning: parsed.reasoning || "Resolution computed.",
        resolution: parsed.resolution || "PARTIAL_PAYMENT",
      };
    } catch (err) {
      console.error("[Gemini] resolveDispute error:", err.message);
      return {
        clientShareBps: 5000,
        freelancerShareBps: 5000,
        reasoning: "Equal split applied due to evaluation error.",
        resolution: "PARTIAL_PAYMENT",
      };
    }
  }

  _demoVerification(deliverableContent) {
    const len = (deliverableContent || "").length;
    const score = len > 200 ? 85 : len > 50 ? 72 : 45;
    return {
      score,
      reasoning: score >= 70
        ? "Demo evaluation: Deliverable appears substantial and meets the outlined requirements."
        : "Demo evaluation: Deliverable appears incomplete or insufficient for the stated scope.",
      approved: score >= 70,
      action: score >= 70 ? "AUTO_RELEASE" : "DISPUTE",
      strengths: score >= 70 ? ["Deliverable content provided", "Scope addressed"] : [],
      concerns: score < 70 ? ["Insufficient detail in submission"] : [],
      verdict: score >= 70 ? "APPROVED" : "DISPUTED",
    };
  }
}

module.exports = new GeminiAgent();
