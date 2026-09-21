const { expect } = require("chai");
const { ethers } = require("hardhat");

const UNIT = 1_000_000n;
const unitPrice = 10_000n;
const fee = 20_000n;
const bond = 100_000n;
const penalty = 20_000n;
const qty = 20n;
const buyerTotal = qty * unitPrice + fee + fee;
const transferPrice = 150_000n;

const CREATE_TYPES = {
  CreateCommitment: [
    { name: "buyer", type: "address" },
    { name: "reservationId", type: "uint256" },
    { name: "termsHash", type: "bytes32" },
    { name: "primary", type: "address" },
    { name: "backup", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

const CP_TYPES = {
  Checkpoint: [
    { name: "commitmentId", type: "uint256" },
    { name: "ownerEpoch", type: "uint64" },
    { name: "sequence", type: "uint64" },
    { name: "successPrimary", type: "uint256" },
    { name: "successBackup", type: "uint256" },
    { name: "breachPrimary", type: "uint256" },
    { name: "breachBackup", type: "uint256" },
    { name: "evidenceHash", type: "bytes32" },
    { name: "purpose", type: "uint8" },
    { name: "deadline", type: "uint256" },
    { name: "listingPrice", type: "uint256" },
    { name: "designatedBuyer", type: "address" },
    { name: "listingExpiry", type: "uint256" },
  ],
};

function termsShape(token, chainId, start, end) {
  return {
    schemaVersion: "search.v1",
    serviceClass: "search",
    quantity: qty,
    start,
    end,
    maxConcurrency: 1,
    minIntervalMs: 1000,
    attemptTimeoutMs: 8000,
    maxAttempts: 2,
    primaryName: "SearchNode",
    backupName: "Nova",
    chainId,
    asset: token,
    unitPrice,
    primaryReservationFee: fee,
    backupReservationFee: fee,
    bondPerProvider: bond,
    penaltyPerAttempt: penalty,
    termsVersion: "v0.1",
  };
}

async function domain(registry) {
  const net = await ethers.provider.getNetwork();
  return {
    name: "CommitProtocol",
    version: "1",
    chainId: net.chainId,
    verifyingContract: await registry.getAddress(),
  };
}

async function warp(seconds) {
  await ethers.provider.send("evm_increaseTime", [Number(seconds)]);
  await ethers.provider.send("evm_mine", []);
}

async function deploy() {
  const [deployer, buyer, primary, backup, verifier, buyerC] = await ethers.getSigners();
  const token = await (await ethers.getContractFactory("MockToken")).deploy();
  const registry = await (await ethers.getContractFactory("CommitmentRegistry")).deploy(
    await token.getAddress(),
    verifier.address,
    deployer.address,
    600,
  );
  for (const a of [buyer, primary, backup, buyerC]) {
    await token.mint(a.address, 10n * UNIT);
  }
  return { deployer, buyer, primary, backup, verifier, buyerC, token, registry };
}

async function fundAndCreate(ctx, reservationId = 1n) {
  const { buyer, primary, backup, verifier, token, registry } = ctx;
  const reg = await registry.getAddress();
  await token.connect(primary).approve(reg, bond);
  await token.connect(backup).approve(reg, bond);
  await registry.connect(primary).depositBond(bond);
  await registry.connect(backup).depositBond(bond);
  await token.connect(buyer).approve(reg, buyerTotal);
  const net = await ethers.provider.getNetwork();
  const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
  const start = now + 60n;
  const end = start + 600n;
  const terms = termsShape(await token.getAddress(), net.chainId, start, end);
  const deadline = now + 120n;
  const termsHash = await registry.hashTerms(terms);
  const value = {
    buyer: buyer.address,
    reservationId,
    termsHash,
    primary: primary.address,
    backup: backup.address,
    nonce: 0n,
    deadline,
  };
  const d = await domain(registry);
  const sigs = {
    buyer: await buyer.signTypedData(d, CREATE_TYPES, value),
    primary: await primary.signTypedData(d, CREATE_TYPES, value),
    backup: await backup.signTypedData(d, CREATE_TYPES, value),
    verifier: await verifier.signTypedData(d, CREATE_TYPES, value),
  };
  await registry.connect(buyer).createCommitment(reservationId, 0n, deadline, primary.address, backup.address, terms, sigs);
  await warp(60);
  return { start, end, terms };
}

function emptyList(cp) {
  return { ...cp, listingPrice: 0n, designatedBuyer: ethers.ZeroAddress, listingExpiry: 0n };
}

async function signCp(ctx, cp) {
  const d = await domain(ctx.registry);
  return ctx.verifier.signTypedData(d, CP_TYPES, cp);
}

describe("W07 checkpoints and settle", () => {
  it("T15 rejects replay and regressing counts", async () => {
    const ctx = await deploy();
    await fundAndCreate(ctx);
    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    const cp = emptyList({
      commitmentId: 1n,
      ownerEpoch: 1n,
      sequence: 1n,
      successPrimary: 1n,
      successBackup: 0n,
      breachPrimary: 0n,
      breachBackup: 0n,
      evidenceHash: ethers.ZeroHash,
      purpose: 0,
      deadline: now + 120n,
    });
    const sig = await signCp(ctx, cp);
    await ctx.registry.submitCheckpoint(cp, sig);
    await expect(ctx.registry.submitCheckpoint(cp, sig)).to.be.revertedWithCustomError(ctx.registry, "WrongSequence");
    const back = emptyList({ ...cp, sequence: 2n, successPrimary: 0n });
    const sig2 = await signCp(ctx, back);
    await expect(ctx.registry.submitCheckpoint(back, sig2)).to.be.revertedWithCustomError(ctx.registry, "CountsRegressed");
  });

  it("T23 early close refunds unused escrow and unlocks remaining bond", async () => {
    const ctx = await deploy();
    await fundAndCreate(ctx);
    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    const usage = emptyList({
      commitmentId: 1n,
      ownerEpoch: 1n,
      sequence: 1n,
      successPrimary: 1n,
      successBackup: 0n,
      breachPrimary: 0n,
      breachBackup: 0n,
      evidenceHash: ethers.ZeroHash,
      purpose: 0,
      deadline: now + 120n,
    });
    await ctx.registry.submitCheckpoint(usage, await signCp(ctx, usage));
    const close = emptyList({ ...usage, sequence: 2n, purpose: 2 });
    await ctx.registry.connect(ctx.buyer).closeWithCheckpoint(close, await signCp(ctx, close));
    await ctx.registry.settle(1);
    expect(await ctx.registry.claimable(ctx.buyer.address)).to.equal(qty * unitPrice - unitPrice);
    expect(await ctx.registry.freeBond(ctx.primary.address)).to.equal(bond);
    expect(await ctx.registry.freeBond(ctx.backup.address)).to.equal(bond);
    const c = await ctx.registry.commitments(1);
    expect(c.status).to.equal(2);
  });

  it("T24 forceSettle after grace uses last confirmed state", async () => {
    const ctx = await deploy();
    const { end } = await fundAndCreate(ctx);
    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    const usage = emptyList({
      commitmentId: 1n,
      ownerEpoch: 1n,
      sequence: 1n,
      successPrimary: 2n,
      successBackup: 0n,
      breachPrimary: 0n,
      breachBackup: 0n,
      evidenceHash: ethers.ZeroHash,
      purpose: 0,
      deadline: now + 120n,
    });
    await ctx.registry.submitCheckpoint(usage, await signCp(ctx, usage));
    const latest = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    await warp(Number(end - latest + 601n));
    await ctx.registry.connect(ctx.buyerC).forceSettle(1);
    expect(await ctx.registry.claimable(ctx.buyer.address)).to.equal(qty * unitPrice - 2n * unitPrice);
    expect(await ctx.registry.claimable(ctx.primary.address)).to.equal(fee + 2n * unitPrice);
    expect(await ctx.registry.freeBond(ctx.primary.address)).to.equal(bond);
  });

  it("T26 extra breaches cannot slash more than remaining locked bond", async () => {
    const ctx = await deploy();
    await fundAndCreate(ctx);
    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    const cp = emptyList({
      commitmentId: 1n,
      ownerEpoch: 1n,
      sequence: 1n,
      successPrimary: 0n,
      successBackup: 0n,
      breachPrimary: 10n,
      breachBackup: 0n,
      evidenceHash: ethers.ZeroHash,
      purpose: 0,
      deadline: now + 120n,
    });
    await ctx.registry.submitCheckpoint(cp, await signCp(ctx, cp));
    const c = await ctx.registry.commitments(1);
    expect(c.lockedBondP).to.equal(0n);
    expect(await ctx.registry.claimable(ctx.buyer.address)).to.equal(bond);
    expect(await ctx.registry.freeBond(ctx.backup.address)).to.equal(0n);
    expect(c.lockedBondB).to.equal(bond);
  });

  it("T30 standard play conserves 0.59 = 0.44 + 0.15 transfer", async () => {
    const ctx = await deploy();
    await fundAndCreate(ctx, 11n);
    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    const usage1 = emptyList({
      commitmentId: 1n,
      ownerEpoch: 1n,
      sequence: 1n,
      successPrimary: 2n,
      successBackup: 0n,
      breachPrimary: 0n,
      breachBackup: 0n,
      evidenceHash: ethers.ZeroHash,
      purpose: 0,
      deadline: now + 300n,
    });
    await ctx.registry.submitCheckpoint(usage1, await signCp(ctx, usage1));
    const usage2 = emptyList({
      ...usage1,
      sequence: 2n,
      successPrimary: 2n,
      successBackup: 1n,
      breachPrimary: 1n,
    });
    await ctx.registry.submitCheckpoint(usage2, await signCp(ctx, usage2));

    const listExpiry = now + 400n;
    const list = {
      ...usage2,
      sequence: 3n,
      purpose: 1,
      listingPrice: transferPrice,
      designatedBuyer: ctx.buyerC.address,
      listingExpiry: listExpiry,
    };
    await ctx.registry.connect(ctx.buyer).checkpointAndList(list, await signCp(ctx, list));
    await ctx.token.connect(ctx.buyerC).approve(await ctx.registry.getAddress(), transferPrice);
    await ctx.registry.connect(ctx.buyerC).buyListing(1);

    const usage3 = emptyList({
      commitmentId: 1n,
      ownerEpoch: 2n,
      sequence: 4n,
      successPrimary: 2n,
      successBackup: 2n,
      breachPrimary: 1n,
      breachBackup: 0n,
      evidenceHash: ethers.ZeroHash,
      purpose: 0,
      deadline: now + 500n,
    });
    await ctx.registry.submitCheckpoint(usage3, await signCp(ctx, usage3));
    const close = emptyList({ ...usage3, sequence: 5n, purpose: 2 });
    await ctx.registry.connect(ctx.buyerC).closeWithCheckpoint(close, await signCp(ctx, close));
    await ctx.registry.settle(1);

    expect(await ctx.registry.claimable(ctx.primary.address)).to.equal(40_000n);
    expect(await ctx.registry.claimable(ctx.backup.address)).to.equal(40_000n);
    expect(await ctx.registry.claimable(ctx.buyer.address)).to.equal(20_000n + transferPrice);
    expect(await ctx.registry.claimable(ctx.buyerC.address)).to.equal(160_000n);
    expect(await ctx.registry.freeBond(ctx.primary.address)).to.equal(80_000n);
    expect(await ctx.registry.freeBond(ctx.backup.address)).to.equal(100_000n);

    const sum =
      (await ctx.registry.claimable(ctx.primary.address)) +
      (await ctx.registry.claimable(ctx.backup.address)) +
      (await ctx.registry.claimable(ctx.buyer.address)) +
      (await ctx.registry.claimable(ctx.buyerC.address)) +
      (await ctx.registry.freeBond(ctx.primary.address)) +
      (await ctx.registry.freeBond(ctx.backup.address));
    expect(sum).to.equal(590_000n);
  });
});
