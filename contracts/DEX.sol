// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Decentralized Exchange with Automated Market Maker
/// @notice Implements a constant product formula AMM for token swaps and liquidity provision
contract DEX is ERC20("DEX LP Token", "DEXLP"), ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Token pairs
    IERC20 public tokenA;
    IERC20 public tokenB;

    // Reserves
    uint256 public reserveA;
    uint256 public reserveB;

    // Fee in basis points (e.g., 30 = 0.3%)
    uint256 public constant FEE = 30;
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    // Accumulated fees
    uint256 public accumulatedFeeA;
    uint256 public accumulatedFeeB;

    // Events
    event Swap(address indexed user, uint256 amountIn, uint256 amountOut, address tokenIn, address tokenOut);
    event LiquidityAdded(address indexed user, uint256 amountA, uint256 amountB, uint256 lpTokens);
    event LiquidityRemoved(address indexed user, uint256 amountA, uint256 amountB, uint256 lpTokens);
    event FeeCollected(uint256 feeA, uint256 feeB);

    /// @notice Initialize the DEX with two tokens
    /// @param _tokenA Address of first token
    /// @param _tokenB Address of second token
    constructor(address _tokenA, address _tokenB) {
        require(_tokenA != address(0) && _tokenB != address(0), "Invalid token address");
        require(_tokenA != _tokenB, "Tokens must be different");
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    /// @notice Get the product invariant (k = x * y)
    /// @return The product of reserves
    function getProductInvariant() public view returns (uint256) {
        return reserveA * reserveB;
    }

    /// @notice Add liquidity to the pool
    /// @param amountA Amount of token A to add
    /// @param amountB Amount of token B to add
    /// @param minLPTokens Minimum LP tokens to mint (slippage protection)
    /// @return lpTokens Amount of LP tokens minted
    function addLiquidity(
        uint256 amountA,
        uint256 amountB,
        uint256 minLPTokens
    ) external nonReentrant returns (uint256 lpTokens) {
        require(amountA > 0 && amountB > 0, "Amounts must be greater than 0");

        // Transfer tokens from user
        tokenA.safeTransferFrom(msg.sender, address(this), amountA);
        tokenB.safeTransferFrom(msg.sender, address(this), amountB);

        // Calculate LP tokens to mint
        if (totalSupply() == 0) {
            lpTokens = _sqrt(amountA * amountB);
            require(lpTokens > MINIMUM_LIQUIDITY, "Insufficient initial liquidity");
            // Burn minimum liquidity
            _mint(address(1), MINIMUM_LIQUIDITY);
        } else {
            uint256 lpTokensA = (amountA * totalSupply()) / reserveA;
            uint256 lpTokensB = (amountB * totalSupply()) / reserveB;
            lpTokens = lpTokensA < lpTokensB ? lpTokensA : lpTokensB;
        }

        require(lpTokens >= minLPTokens, "Insufficient LP tokens");

        // Update reserves
        reserveA += amountA;
        reserveB += amountB;

        // Mint LP tokens
        _mint(msg.sender, lpTokens);

        emit LiquidityAdded(msg.sender, amountA, amountB, lpTokens);
    }

    /// @notice Remove liquidity from the pool
    /// @param lpTokens Amount of LP tokens to burn
    /// @param minAmountA Minimum token A to receive
    /// @param minAmountB Minimum token B to receive
    function removeLiquidity(
        uint256 lpTokens,
        uint256 minAmountA,
        uint256 minAmountB
    ) external nonReentrant {
        require(lpTokens > 0, "LP tokens must be greater than 0");
        require(balanceOf(msg.sender) >= lpTokens, "Insufficient LP tokens");

        uint256 totalSupplyAmount = totalSupply();
        uint256 amountA = (lpTokens * reserveA) / totalSupplyAmount;
        uint256 amountB = (lpTokens * reserveB) / totalSupplyAmount;

        require(amountA >= minAmountA && amountB >= minAmountB, "Slippage exceeded");

        // Burn LP tokens
        _burn(msg.sender, lpTokens);

        // Update reserves
        reserveA -= amountA;
        reserveB -= amountB;

        // Transfer tokens to user
        tokenA.safeTransfer(msg.sender, amountA);
        tokenB.safeTransfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, lpTokens);
    }

    /// @notice Swap tokens using the constant product formula
    /// @param amountIn Amount of input token
    /// @param minAmountOut Minimum amount of output token
    /// @param isAtoB True if swapping A for B, false if B for A
    /// @return amountOut Amount of output token received
    function swap(
        uint256 amountIn,
        uint256 minAmountOut,
        bool isAtoB
    ) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be greater than 0");

        IERC20 tokenIn = isAtoB ? tokenA : tokenB;
        IERC20 tokenOut = isAtoB ? tokenB : tokenA;
        uint256 reserveIn = isAtoB ? reserveA : reserveB;
        uint256 reserveOut = isAtoB ? reserveB : reserveA;

        // Transfer input token
        tokenIn.safeTransferFrom(msg.sender, address(this), amountIn);

        // Calculate fee
        uint256 feeAmount = (amountIn * FEE) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - feeAmount;

        // Calculate output using constant product formula
        uint256 numerator = amountInAfterFee * reserveOut;
        uint256 denominator = reserveIn + amountInAfterFee;
        amountOut = numerator / denominator;

        require(amountOut > 0 && amountOut >= minAmountOut, "Insufficient output");

        // Update reserves and fees
        if (isAtoB) {
            reserveA += amountIn;
            reserveB -= amountOut;
            accumulatedFeeA += feeAmount;
        } else {
            reserveB += amountIn;
            reserveA -= amountOut;
            accumulatedFeeB += feeAmount;
        }

        // Transfer output token
        tokenOut.safeTransfer(msg.sender, amountOut);

        emit Swap(msg.sender, amountIn, amountOut, address(tokenIn), address(tokenOut));
    }

    /// @notice Get the amount out for a given amount in
    /// @param amountIn Amount of input token
    /// @param isAtoB True if swapping A for B
    /// @return amountOut Amount of output token
    function getAmountOut(uint256 amountIn, bool isAtoB) external view returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be greater than 0");
        require(reserveA > 0 && reserveB > 0, "Insufficient liquidity");

        uint256 reserveIn = isAtoB ? reserveA : reserveB;
        uint256 reserveOut = isAtoB ? reserveB : reserveA;

        uint256 feeAmount = (amountIn * FEE) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - feeAmount;

        uint256 numerator = amountInAfterFee * reserveOut;
        uint256 denominator = reserveIn + amountInAfterFee;
        amountOut = numerator / denominator;
    }

    /// @notice Collect accumulated fees
    function collectFees() external {
        uint256 feeA = accumulatedFeeA;
        uint256 feeB = accumulatedFeeB;
        
        if (feeA > 0) {
            accumulatedFeeA = 0;
            tokenA.safeTransfer(msg.sender, feeA);
        }
        if (feeB > 0) {
            accumulatedFeeB = 0;
            tokenB.safeTransfer(msg.sender, feeB);
        }
        
        emit FeeCollected(feeA, feeB);
    }

    /// @notice Square root calculation for fixed point numbers
    /// @param x Number to calculate square root of
    /// @return y The square root
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
