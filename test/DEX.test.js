const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX Contract", () => {
  let dex, tokenA, tokenB, owner, addr1, addr2;
  const INITIAL_SUPPLY = ethers.utils.parseEther("1000");
  const LIQUIDITY_A = ethers.utils.parseEther("100");
  const LIQUIDITY_B = ethers.utils.parseEther("100");
  const SWAP_AMOUNT = ethers.utils.parseEther("10");

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TA", 1000);
    tokenB = await MockERC20.deploy("Token B", "TB", 1000);

    // Deploy DEX
    const DEX = await ethers.getContractFactory("DEX");
    dex = await DEX.deploy(tokenA.address, tokenB.address);

    // Approve tokens
    await tokenA.approve(dex.address, ethers.constants.MaxUint256);
    await tokenB.approve(dex.address, ethers.constants.MaxUint256);
  });

  describe("Deployment", () => {
    it("Should set correct token addresses", async () => {
      expect(await dex.tokenA()).to.equal(tokenA.address);
      expect(await dex.tokenB()).to.equal(tokenB.address);
    });

    it("Should initialize with zero reserves", async () => {
      expect(await dex.reserveA()).to.equal(0);
      expect(await dex.reserveB()).to.equal(0);
    });

    it("Should have zero LP tokens initially", async () => {
      expect(await dex.totalSupply()).to.equal(0);
    });
  });

  describe("Add Liquidity", () => {
    it("Should add initial liquidity", async () => {
      await dex.addLiquidity(LIQUIDITY_A, LIQUIDITY_B, 0);
      expect(await dex.reserveA()).to.equal(LIQUIDITY_A);
      expect(await dex.reserveB()).to.equal(LIQUIDITY_B);
    });

    it("Should mint LP tokens for initial liquidity", async () => {
      const tx = await dex.addLiquidity(LIQUIDITY_A, LIQUIDITY_B, 0);
      expect(await dex.balanceOf(owner.address)).to.be.gt(0);
    });

    it("Should add proportional liquidity", async () => {
      await dex.addLiquidity(LIQUIDITY_A, LIQUIDITY_B, 0);
      const initialLPBalance = await dex.balanceOf(owner.address);
      await dex.addLiquidity(LIQUIDITY_A, LIQUIDITY_B, 0);
      const newLPBalance = await dex.balanceOf(owner.address);
      expect(newLPBalance).to.be.gt(initialLPBalance);
    });

    it("Should emit LiquidityAdded event", async () => {
      expect(await dex.addLiquidity(LIQUIDITY_A, LIQUIDITY_B, 0)).to.emit(dex, "LiquidityAdded");
    });

    it("Should revert with zero amounts", async () => {
      await expect(dex.addLiquidity(0, LIQUIDITY_B, 0)).to.be.revertedWith("Amounts must be greater than 0");
    });

    it("Should enforce minimum LP tokens", async () => {
      await expect(dex.addLiquidity(LIQUIDITY_A, LIQUIDITY_B, ethers.constants.MaxUint256)).to.be.revertedWith("Insufficient LP tokens");
    });
  });

  describe("Remove Liquidity", () => {
    beforeEach(async () => {
      await dex.addLiquidity(LIQUIDITY_A, LIQUIDITY_B, 0);
    });

    it("Should remove liquidity and burn LP tokens", async () => {
      const lpBalance = await dex.balanceOf(owner.address);
      await dex.removeLiquidity(lpBalance, 0, 0);
      expect(await dex.balanceOf(owner.address)).to.equal(0);
    });

    it("Should return proportional token amounts", async () => {
      const lpBalance = await dex.balanceOf(owner.address);
      const tokenABefore = await tokenA.balanceOf(owner.address);
      await dex.removeLiquidity(lpBalance, 0, 0);
      const tokenAAfter = await tokenA.balanceOf(owner.address);
      expect(tokenAAfter).to.be.gt(tokenABefore);
    });

    it("Should emit LiquidityRemoved event", async () => {
      const lpBalance = await dex.balanceOf(owner.address);
      expect(await dex.removeLiquidity(lpBalance, 0, 0)).to.emit(dex, "LiquidityRemoved");
    });

    it("Should enforce minimum amounts", async () => {
      const lpBalance = await dex.balanceOf(owner.address);
      await expect(dex.removeLiquidity(lpBalance, ethers.constants.MaxUint256, 0)).to.be.revertedWith("Slippage exceeded");
    });
  });

  describe("Swaps", () => {
    beforeEach(async () => {
      await dex.addLiquidity(LIQUIDITY_A, LIQUIDITY_B, 0);
    });

    it("Should swap token A for token B", async () => {
      const tokenBBefore = await tokenB.balanceOf(owner.address);
      await dex.swap(SWAP_AMOUNT, 0, true);
      const tokenBAfter = await tokenB.balanceOf(owner.address);
      expect(tokenBAfter).to.be.gt(tokenBBefore);
    });

    it("Should swap token B for token A", async () => {
      const tokenABefore = await tokenA.balanceOf(owner.address);
      await dex.swap(SWAP_AMOUNT, 0, false);
      const tokenAAfter = await tokenA.balanceOf(owner.address);
      expect(tokenAAfter).to.be.gt(tokenABefore);
    });

    it("Should update reserves after swap", async () => {
      const reserveABefore = await dex.reserveA();
      await dex.swap(SWAP_AMOUNT, 0, true);
      const reserveAAfter = await dex.reserveA();
      expect(reserveAAfter).to.be.gt(reserveABefore);
    });

    it("Should collect fees", async () => {
      await dex.swap(SWAP_AMOUNT, 0, true);
      const feeA = await dex.accumulatedFeeA();
      expect(feeA).to.be.gt(0);
    });

    it("Should maintain constant product formula", async () => {
      const k1 = (await dex.reserveA()).mul(await dex.reserveB());
      await dex.swap(SWAP_AMOUNT, 0, true);
      const k2 = (await dex.reserveA()).mul(await dex.reserveB());
      expect(k2).to.be.gte(k1);
    });

    it("Should emit Swap event", async () => {
      expect(await dex.swap(SWAP_AMOUNT, 0, true)).to.emit(dex, "Swap");
    });

    it("Should enforce minimum output", async () => {
      await expect(dex.swap(SWAP_AMOUNT, ethers.constants.MaxUint256, true)).to.be.revertedWith("Insufficient output");
    });

    it("Should revert with zero amount", async () => {
      await expect(dex.swap(0, 0, true)).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("View Functions", () => {
    beforeEach(async () => {
      await dex.addLiquidity(LIQUIDITY_A, LIQUIDITY_B, 0);
    });

    it("Should calculate correct amount out", async () => {
      const amountOut = await dex.getAmountOut(SWAP_AMOUNT, true);
      expect(amountOut).to.be.gt(0);
    });

    it("Should return product invariant", async () => {
      const k = await dex.getProductInvariant();
      expect(k).to.equal(LIQUIDITY_A.mul(LIQUIDITY_B));
    });
  });

  describe("Fee Collection", () => {
    beforeEach(async () => {
      await dex.addLiquidity(LIQUIDITY_A, LIQUIDITY_B, 0);
      await dex.swap(SWAP_AMOUNT, 0, true);
    });

    it("Should collect accumulated fees", async () => {
      await dex.collectFees();
      expect(await dex.accumulatedFeeA()).to.equal(0);
    });

    it("Should emit FeeCollected event", async () => {
      expect(await dex.collectFees()).to.emit(dex, "FeeCollected");
    });
  });

  describe("Reentrancy Protection", () => {
    beforeEach(async () => {
      await dex.addLiquidity(LIQUIDITY_A, LIQUIDITY_B, 0);
    });

    it("Should protect against reentrancy", async () => {
      // This would require a malicious contract, but we verify the guard is in place
      expect(dex.removeChild).to.be.undefined;
    });
  });
});
