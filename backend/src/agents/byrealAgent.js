const { execSync } = require("child_process");

const DEMO_MODE = process.env.DEMO_MODE !== "false";
const APY = parseFloat(process.env.BYREAL_APY || "18.3") / 100;
const POOL_ID = process.env.BYREAL_POOL_ID || "ByRealUSDC_USDT_Demo_Pool";

// In-memory store for demo positions: positionId -> { contractId, amountUsdc, openedAt }
const demoPositions = new Map();

class ByrealAgent {
  constructor() {
    this.demoMode = DEMO_MODE;
    this.apy = APY;
    this.poolId = POOL_ID;
    console.log(`[Byreal] Initialized in ${this.demoMode ? "DEMO" : "LIVE"} mode. Pool: ${this.poolId} (${(this.apy * 100).toFixed(1)}% APY)`);
  }

  /**
   * Open a CLMM position for an escrow amount (in USDC)
   * byreal-cli positions open --pool <id> --amount <usdc> --auto-swap --confirm -o json
   */
  async openPosition(contractId, amountUsdc, openedAt) {
    if (this.demoMode) {
      const positionId = `BYREAL_POS_${contractId}_${Date.now()}`;
      demoPositions.set(positionId, {
        contractId,
        amountUsdc,
        openedAt: openedAt || Date.now(),
        poolId: this.poolId,
        status: "OPEN",
      });
      console.log(`[Byreal] DEMO: Opened position ${positionId} for ${amountUsdc} USDC in ${this.poolId}`);
      return { success: true, positionId, amountUsdc, pool: this.poolId };
    }

    try {
      const result = execSync(
        `byreal-cli positions open --pool ${this.poolId} --price-lower 0.99 --price-upper 1.01 --base USDC --amount ${amountUsdc} --auto-swap --confirm -o json`,
        { encoding: "utf8", timeout: 30000 }
      );
      const data = JSON.parse(result);
      return { success: true, positionId: data.positionId || data.id, amountUsdc, pool: this.poolId };
    } catch (err) {
      console.error("[Byreal] openPosition error:", err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get current accrued yield (USDC) for a position
   * byreal-cli positions list --position <id> -o json
   */
  async getYield(positionId, contractId, createdAtMs, fallbackAmountUsdc = 0) {
    if (this.demoMode || positionId.startsWith("BYREAL_POS_") || positionId.startsWith("demo_pos_")) {
      const pos = demoPositions.get(positionId);
      const baseAmount = pos?.amountUsdc ?? fallbackAmountUsdc;
      const openedAt = pos?.openedAt ?? createdAtMs;
      const ageSeconds = (Date.now() - openedAt) / 1000;
      const ageDays = ageSeconds / 86400;
      const yieldUsdc = baseAmount * this.apy * (ageDays / 365);
      return { yieldUsdc, ageDays, positionId, amountUsdc: baseAmount };
    }

    try {
      const result = execSync(
        `byreal-cli positions list --position ${positionId} -o json`,
        { encoding: "utf8", timeout: 15000 }
      );
      const data = JSON.parse(result);
      const pos = Array.isArray(data) ? data[0] : data;
      return {
        yieldUsdc: parseFloat(pos.yieldUsdc || pos.yield || 0),
        ageDays: pos.ageDays || 0,
        positionId,
        amountUsdc: parseFloat(pos.amountUsdc || 0),
      };
    } catch (err) {
      console.error("[Byreal] getYield error:", err.message);
      return { yieldUsdc: 0, ageDays: 0, positionId, amountUsdc: 0 };
    }
  }

  /**
   * Close a position, returning final yield in USDC
   * byreal-cli positions close --position <id> --confirm -o json
   */
  async closePosition(positionId) {
    if (this.demoMode) {
      const pos = demoPositions.get(positionId);
      if (!pos) return { success: true, yieldUsdc: 0, ageDays: 0 };

      const ageSeconds = (Date.now() - pos.openedAt) / 1000;
      const ageDays = ageSeconds / 86400;
      const yieldUsdc = pos.amountUsdc * this.apy * (ageDays / 365);
      demoPositions.delete(positionId);
      console.log(`[Byreal] DEMO: Closed position ${positionId}, yield: ${yieldUsdc.toFixed(6)} USDC over ${ageDays.toFixed(4)} days`);
      return { success: true, yieldUsdc, ageDays };
    }

    try {
      const result = execSync(
        `byreal-cli positions close --position ${positionId} --confirm -o json`,
        { encoding: "utf8", timeout: 30000 }
      );
      const data = JSON.parse(result);
      return { success: true, yieldUsdc: parseFloat(data.yieldUsdc || 0), ageDays: data.ageDays || 0 };
    } catch (err) {
      console.error("[Byreal] closePosition error:", err.message);
      return { success: false, error: err.message, yieldUsdc: 0, ageDays: 0 };
    }
  }

  getPoolInfo() {
    return {
      poolId: this.poolId,
      apy: this.apy * 100,
      token: "USDC-USDT",
      chain: "Solana",
      demoMode: this.demoMode,
      bridgeNote: "Simulated bridge (Demo Mode): escrowed USDC value is mirrored to a Byreal CLMM position via the agent wallet.",
    };
  }
}

module.exports = new ByrealAgent();
