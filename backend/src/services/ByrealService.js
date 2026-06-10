import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * ByrealService — wraps byreal-cli and byreal-perps-cli calls.
 * All commands output JSON via `-o json` flag.
 * 
 * NOTE: In a hackathon/demo context, the actual Byreal CLMM positions are on
 * Solana. For the Mantle smart contract, we track yield amounts and record
 * the Solana txSignature in the on-chain logs.
 */
export class ByrealService {
  
  // ── Pool Data ────────────────────────────────────────────────────────────────

  /**
   * Get the best USDC pool by 24h APR (for demo: simulated stable pool)
   */
  async getBestStablePool() {
    try {
      const { stdout } = await execAsync("byreal-cli pools list --sort-field apr24h -o json");
      const pools = JSON.parse(stdout);
      
      // Find a stable pool (USDC/USDT or similar) with best APR
      const stablePools = Array.isArray(pools) 
        ? pools.filter(p => this._isStablePool(p))
        : [];
      
      if (stablePools.length > 0) {
        return stablePools[0];
      }
      
      // Return the first pool if no stable-specific filter matches
      return Array.isArray(pools) ? pools[0] : null;
    } catch (err) {
      console.error("⚠️  byreal-cli pools list failed:", err.message);
      return this._getMockPoolData();
    }
  }

  /**
   * Get detailed pool analysis for a specific pool
   */
  async analyzePool(poolAddress) {
    try {
      const { stdout } = await execAsync(
        `byreal-cli pools analyze ${poolAddress} -o json`
      );
      return JSON.parse(stdout);
    } catch (err) {
      console.error(`⚠️  Pool analyze failed for ${poolAddress}:`, err.message);
      return this._getMockPoolAnalysis(poolAddress);
    }
  }

  /**
   * Get real-time overview of Byreal DEX
   */
  async getOverview() {
    try {
      const { stdout } = await execAsync("byreal-cli overview -o json");
      return JSON.parse(stdout);
    } catch (err) {
      console.error("⚠️  byreal-cli overview failed:", err.message);
      return { tvl: "N/A", volume24h: "N/A", error: err.message };
    }
  }

  // ── CLMM Position Management ─────────────────────────────────────────────────

  /**
   * Preview opening a CLMM position (dry-run)
   * @param {string} poolAddress - CLMM pool address
   * @param {number} amountUsd - Amount in USD to deploy
   * @returns {object} Preview result with estimated yields
   */
  async previewOpenPosition(poolAddress, amountUsd) {
    try {
      const { stdout } = await execAsync(
        `byreal-cli positions open ` +
        `--pool ${poolAddress} ` +
        `--price-lower 0.9998 ` +
        `--price-upper 1.0002 ` +
        `--amount ${amountUsd} ` +
        `--auto-swap ` +
        `--dry-run ` +
        `-o json`
      );
      return { success: true, preview: JSON.parse(stdout) };
    } catch (err) {
      console.error("⚠️  Position preview failed:", err.message);
      return {
        success: false,
        preview: this._getMockPositionPreview(amountUsd),
        error: err.message,
      };
    }
  }

  /**
   * Open a CLMM position (execute)
   * @param {string} poolAddress - CLMM pool address
   * @param {number} amountUsd   - Amount in USD to deploy
   * @returns {object} Transaction result with signature
   */
  async openPosition(poolAddress, amountUsd) {
    try {
      const { stdout } = await execAsync(
        `byreal-cli positions open ` +
        `--pool ${poolAddress} ` +
        `--price-lower 0.9998 ` +
        `--price-upper 1.0002 ` +
        `--amount ${amountUsd} ` +
        `--auto-swap ` +
        `--confirm ` +
        `-o json`
      );
      const result = JSON.parse(stdout);
      return {
        success:      true,
        txSignature:  result.txSignature,
        poolAddress:  result.poolAddress || poolAddress,
        amountDeployed: amountUsd,
        estimatedApr: result.estimatedApr || "18.3%",
      };
    } catch (err) {
      console.error("⚠️  Open position failed:", err.message);
      // In demo mode, return a simulated response
      return this._getMockOpenPositionResult(poolAddress, amountUsd);
    }
  }

  /**
   * Open a Delta-Neutral Hedge on Byreal Perps
   * @param {string} coin - The asset to hedge (e.g. MNT, BTC)
   * @param {number} amountUsd - Size of the hedge
   */
  async openPerpsHedge(coin, amountUsd) {
    try {
      const { stdout } = await execAsync(
        `byreal-perps-cli trade open ` +
        `--market ${coin}-USD ` +
        `--side short ` +
        `--size-usd ${amountUsd} ` +
        `--leverage 1x ` +
        `--confirm ` +
        `-o json`
      );
      const result = JSON.parse(stdout);
      return {
        success:      true,
        txSignature:  result.txSignature,
        poolAddress:  `${coin}-PERP-HEDGE`,
        amountDeployed: amountUsd,
        estimatedApr: "Hedged (Funding Rate APY)",
      };
    } catch (err) {
      console.error("⚠️  Perps Hedge failed:", err.message);
      return {
        success:        true,
        txSignature:    `DEMO_PERPS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        poolAddress:    `${coin}-PERP-HEDGE`,
        amountDeployed: amountUsd,
        estimatedApr:   "Hedged (0% Volatility)",
        _demo: true,
      };
    }
  }
  /**
   * List all current positions
   */
  async listPositions() {
    try {
      const { stdout } = await execAsync("byreal-cli positions list -o json");
      return JSON.parse(stdout);
    } catch (err) {
      console.error("⚠️  List positions failed:", err.message);
      return [];
    }
  }

  /**
   * Close a CLMM position and return funds
   * @param {string} positionAddress - On-chain position address
   * @returns {object} Closing result with yield earned
   */
  async closePosition(positionAddress) {
    try {
      const { stdout } = await execAsync(
        `byreal-cli positions close --position ${positionAddress} --confirm -o json`
      );
      const result = JSON.parse(stdout);
      return {
        success:     true,
        txSignature: result.txSignature,
        yieldEarned: result.yieldEarned || "0",
      };
    } catch (err) {
      console.error("⚠️  Close position failed:", err.message);
      return this._getMockClosePositionResult(positionAddress);
    }
  }

  /**
   * Claim fees/rewards from a position (without closing)
   */
  async claimFees(positionAddress) {
    try {
      const { stdout } = await execAsync(
        `byreal-cli positions claim --position ${positionAddress} --confirm -o json`
      );
      const result = JSON.parse(stdout);
      return { success: true, txSignature: result.txSignature, feesEarned: result.feesEarned };
    } catch (err) {
      console.error("⚠️  Claim fees failed:", err.message);
      return { success: false, error: err.message, feesEarned: "0" };
    }
  }

  // ── Swap ─────────────────────────────────────────────────────────────────────

  /**
   * Swap tokens (e.g., SOL → USDC before deploying to stable pool)
   */
  async swap(inputMint, outputMint, amount) {
    try {
      // First, dry-run to check price
      const { stdout: previewOut } = await execAsync(
        `byreal-cli swap execute ` +
        `--input-mint ${inputMint} ` +
        `--output-mint ${outputMint} ` +
        `--amount ${amount} ` +
        `--dry-run -o json`
      );
      const preview = JSON.parse(previewOut);
      
      // Execute the swap
      const { stdout } = await execAsync(
        `byreal-cli swap execute ` +
        `--input-mint ${inputMint} ` +
        `--output-mint ${outputMint} ` +
        `--amount ${amount} ` +
        `--confirm -o json`
      );
      const result = JSON.parse(stdout);
      return {
        success:     true,
        txSignature: result.txSignature,
        preview:     preview,
        result:      result,
      };
    } catch (err) {
      console.error("⚠️  Swap failed:", err.message);
      return { success: false, error: err.message };
    }
  }

  // ── Wallet / Balance ─────────────────────────────────────────────────────────

  async getBalance() {
    try {
      const { stdout } = await execAsync("byreal-cli balance -o json");
      return JSON.parse(stdout);
    } catch (err) {
      return { error: err.message };
    }
  }

  // ── Market Signals (via Perps CLI) ───────────────────────────────────────────

  /**
   * Get technical signals for a market (useful for the demo stats panel)
   */
  async getSignals(coin = "BTC") {
    try {
      const { stdout } = await execAsync(
        `byreal-perps-cli signal detail ${coin} -o json`
      );
      return JSON.parse(stdout);
    } catch (err) {
      return { error: err.message, coin };
    }
  }

  // ── Private helpers + Mock data for demo ─────────────────────────────────────

  _isStablePool(pool) {
    const name = (pool.tokenA + pool.tokenB).toLowerCase();
    return name.includes("usdc") || name.includes("usdt") || name.includes("dai");
  }

  _getMockPoolData() {
    return {
      poolAddress: "ByRealUSDC_USDT_Demo_Pool_Address_Here",
      tokenA: "USDC",
      tokenB: "USDT",
      tvl: "$2.4M",
      volume24h: "$890K",
      apr24h: "18.3%",
      fee: "0.01%",
      _demo: true,
    };
  }

  _getMockPoolAnalysis(poolAddress) {
    return {
      poolAddress,
      risk: "LOW",
      volatility: "Very Low (stablecoin pair)",
      recommendedRange: { lower: 0.9998, upper: 1.0002 },
      estimatedApr: "18.3%",
      _demo: true,
    };
  }

  _getMockPositionPreview(amountUsd) {
    return {
      tokenARequired: amountUsd / 2,
      tokenBRequired: amountUsd / 2,
      estimatedApr:   "18.3%",
      estimatedWeeklyYield: ((amountUsd * 0.183) / 52).toFixed(4),
      priceImpact: "< 0.01%",
      _demo: true,
    };
  }

  _getMockOpenPositionResult(poolAddress, amountUsd) {
    const mockTxSig = `DEMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success:        true,
      txSignature:    mockTxSig,
      poolAddress:    poolAddress || "ByReal_USDC_USDT_Pool",
      amountDeployed: amountUsd,
      estimatedApr:   "18.3%",
      _demo: true,
    };
  }

  _getMockClosePositionResult(positionAddress) {
    const days    = Math.floor(Math.random() * 7) + 1;
    const apr     = 0.183;
    const amount  = 100;
    const yield_  = ((amount * apr * days) / 365).toFixed(4);
    return {
      success:     true,
      txSignature: `DEMO_CLOSE_${Date.now()}`,
      yieldEarned: yield_,
      _demo: true,
    };
  }
}

export const byrealService = new ByrealService();
