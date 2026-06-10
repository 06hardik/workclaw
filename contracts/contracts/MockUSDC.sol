// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Test USDC for Mantle Sepolia testnet.
 *         Anyone can mint up to 10,000 WCUSDC for testing.
 */
contract MockUSDC is ERC20 {
    uint8 private constant DECIMALS = 6;
    uint256 public constant FAUCET_AMOUNT = 10_000 * 10 ** 6; // 10,000 USDC

    constructor() ERC20("WorkClaw Test USDC", "wcUSDC") {}

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /// @notice Anyone can call this to get test tokens
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Owner can mint arbitrary amounts
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
