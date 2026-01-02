# DEX - Decentralized Exchange with Automated Market Maker

A complete implementation of a Decentralized Exchange (DEX) using the Automated Market Maker (AMM) model. This project features smart contracts for liquidity management, token swaps, and fee distribution, with comprehensive test coverage and Docker support.

## Overview

This DEX implementation uses the constant product formula (x * y = k) to determine token prices and facilitate swaps between trading pairs. The protocol enables users to provide liquidity, swap tokens, and collect trading fees.

## Features

- **Constant Product Formula**: Implements x * y = k for deterministic price calculations
- **Liquidity Management**: Add and remove liquidity with LP token minting/burning
- **Token Swaps**: Efficient token exchanges with fee collection (0.3%)
- **Slippage Protection**: Optional minimum output parameters for safe swaps
- **Fee Distribution**: Accumulated fees can be collected by protocol operators
- **Reentrancy Protection**: SafeERC20 and ReentrancyGuard for security
- **Comprehensive Tests**: 25+ test cases covering all functionality
- **Docker Support**: Containerized testing and deployment

## Architecture

### Smart Contracts

#### DEX.sol
Main AMM contract implementing:
- `addLiquidity()`: Provide liquidity to the pool
- `removeLiquidity()`: Withdraw liquidity and receive tokens
- `swap()`: Exchange tokens using constant product formula
- `getAmountOut()`: Calculate output amount for a given input
- `getProductInvariant()`: Returns k (x * y)
- `collectFees()`: Withdraw accumulated trading fees

#### MockERC20.sol
Test token contract for testing and deployment

### Directory Structure

```
.
├── contracts/
│   ├── DEX.sol
│   └── MockERC20.sol
├── test/
│   └── DEX.test.js
├── scripts/
│   └── deploy.js
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .gitignore
├── hardhat.config.js
├── package.json
└── README.md
```

## Mathematical Implementation

The DEX uses the constant product formula for pricing:

- **Invariant**: `k = reserveA * reserveB` (constant)
- **Output Calculation**: `amountOut = (amountIn * (1 - fee)) * reserveOut / (reserveIn + amountIn * (1 - fee))`
- **Fee**: 0.3% (30 basis points) collected from input amount
- **LP Tokens**: Represent ownership share of the pool
  - Initial mint: `sqrt(amountA * amountB)`
  - Subsequent mints: `min((amountA / reserveA) * totalSupply, (amountB / reserveB) * totalSupply)`

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dex-amm
```

2. Install dependencies:
```bash
npm install
```

3. Compile contracts:
```bash
npm run compile
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run coverage
```

### Docker Setup

```bash
# Build and run tests in Docker
docker-compose up -d

# Compile contracts
docker-compose exec app npm run compile

# Run tests
docker-compose exec app npm test

# Check coverage
docker-compose exec app npm run coverage

# Stop container
docker-compose down
```

### Deployment

```bash
npm run deploy
```

## Test Coverage

The test suite includes 25+ test cases covering:

- **Deployment**: Initialization and state verification
- **Liquidity Management**: Adding and removing liquidity
- **Token Swaps**: Token exchanges and invariant maintenance
- **Slippage Protection**: Minimum output enforcement
- **Fee Collection**: Fee accumulation and distribution
- **Event Emissions**: Proper event logging
- **Error Handling**: Input validation and revert conditions
- **Edge Cases**: Zero amounts, extreme values, etc.

## Contract Addresses

Will be populated after deployment to testnet or mainnet.

## Known Limitations

1. **Single Trading Pair**: Only supports trading between two specific tokens (Token A and Token B)
2. **No Price Oracle**: Uses internal pool state for pricing (vulnerable to flash loans)
3. **No Governance**: No DAO or governance mechanisms
4. **Simplified Fee Model**: Fixed 0.3% fee, no variable fee tiers
5. **No Wrapped ETH**: Doesn't handle native chain currency directly

## Security Considerations

1. **Reentrancy Protection**: Uses OpenZeppelin's ReentrancyGuard
2. **Safe Token Transfers**: Uses SafeERC20 to handle non-standard ERC20 implementations
3. **Integer Overflow/Underflow**: Solidity 0.8.19+ has built-in overflow checks
4. **Access Control**: Currently centralized fee collection (could be improved with governance)
5. **Flash Loan Attacks**: Current implementation is vulnerable to flash swaps (use price oracle for production)

## Optional Bonus Features

Potential enhancements for production:

- **Multiple Trading Pairs**: Factory pattern for multiple DEX pairs
- **Flash Swaps**: Uncollateralized loans with constraints
- **Deadline Protection**: Time-bound transaction execution
- **Slippage Protection**: Automatic slippage calculation
- **Price Oracle Integration**: Chainlink or other oracle providers
- **Governance Token**: DAO-based fee adjustment and protocol upgrades
- **Staking Rewards**: Incentivize liquidity provision
- **Multi-hop Swaps**: Token routing through multiple pairs

## Development

### Code Quality Tools

The project uses:
- **Hardhat**: Smart contract development framework
- **Chai**: Assertion library for tests
- **Ethers.js**: Ethereum JavaScript library
- **Solidity Coverage**: Code coverage tool

### Code Style

- **NatSpec Comments**: Full documentation on all public functions
- **Event Logging**: Comprehensive event emissions
- **Error Messages**: Clear, descriptive revert messages

## Performance Considerations

- **Gas Optimization**: Uses efficient math operations
- **Storage Layout**: Optimized for minimal storage reads
- **Event Logs**: Indexed parameters for efficient filtering
- **Batch Operations**: Consider batch swaps for user convenience

## Troubleshooting

### Tests Failing

1. Ensure all dependencies are installed: `npm install`
2. Clear cache: `rm -rf artifacts cache`
3. Recompile: `npm run compile`

### Docker Issues

1. Ensure Docker is running
2. Remove old containers: `docker-compose down -v`
3. Rebuild: `docker-compose up --build`

## Contributing

Feel free to fork and submit pull requests for improvements.

## License

MIT License - See LICENSE file for details

## References

- [Uniswap V2 Whitepaper](https://uniswap.org/whitepaper.pdf)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/)
- [Solidity Documentation](https://docs.soliditylang.org/)

## Support

For issues and questions, please create an issue in the repository.
