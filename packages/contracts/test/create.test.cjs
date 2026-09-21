const { expect } = require("chai");
const { ethers } = require("hardhat");

const UNIT = 1_000_000n;
const unitPrice = 10_000n;
const fee = 20_000n;
const bond = 100_000n;
const qty = 20n;
const buyerTotal = qty * unitPrice + fee + fee;

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
    penaltyPerAttempt: 20_000n,
    termsVersion: "v0.1",
  };
}

async function deploy() {
  const [deployer, buyer, primary, backup, verifier] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("MockToken");
  const token = await Token.deploy();
  const Registry = await ethers.getContractFactory("CommitmentRegistry");
  const registry = await Registry.deploy(await token.getAddress(), verifier.address, deployer.address, 600);
  await token.mint(buyer.address, 10n * UNIT);
  await token.mint(primary.address, 10n * UNIT);
  await token.mint(backup.address, 10n * UNIT);
  return { deployer, buyer, primary, backup, verifier, token, registry };
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

async function signAll({ registry, buyer, primary, backup, verifier, terms, reservationId, nonce, deadline }) {
  const termsHash = await registry.hashTerms(terms);
  const value = {
    buyer: buyer.address,
    reservationId,
    termsHash,
    primary: primary.address,
    backup: backup.address,
    nonce,
    deadline,
  };
  const d = await domain(registry);
  return {
    termsHash,
    sigs: {
      buyer: await buyer.signTypedData(d, CREATE_TYPES, value),
      primary: await primary.signTypedData(d, CREATE_TYPES, value),
      backup: await backup.signTypedData(d, CREATE_TYPES, value),
      verifier: await verifier.signTypedData(d, CREATE_TYPES, value),
    },
  };
}

describe("W06 create and bonds", () => {
  it("hashes terms the same way as abi.encode", async () => {
    const { registry, token } = await deploy();
    const net = await ethers.provider.getNetwork();
    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    const terms = termsShape(await token.getAddress(), net.chainId, now + 60n, now + 660n);
    const onchain = await registry.hashTerms(terms);
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      [
        "string","string","uint256","uint64","uint64","uint32","uint32","uint32","uint32",
        "string","string","uint256","address","uint256","uint256","uint256","uint256","uint256","string",
      ],
      [
        terms.schemaVersion, terms.serviceClass, terms.quantity, terms.start, terms.end,
        terms.maxConcurrency, terms.minIntervalMs, terms.attemptTimeoutMs, terms.maxAttempts,
        terms.primaryName, terms.backupName, terms.chainId, terms.asset, terms.unitPrice,
        terms.primaryReservationFee, terms.backupReservationFee, terms.bondPerProvider,
        terms.penaltyPerAttempt, terms.termsVersion,
      ],
    );
    expect(onchain).to.equal(ethers.keccak256(encoded));
  });

  it("creates when both bonds and buyer funds are present", async () => {
    const ctx = await deploy();
    const { buyer, primary, backup, verifier, token, registry } = ctx;
    await token.connect(primary).approve(await registry.getAddress(), bond);
    await token.connect(backup).approve(await registry.getAddress(), bond);
    await registry.connect(primary).depositBond(bond);
    await registry.connect(backup).depositBond(bond);
    await token.connect(buyer).approve(await registry.getAddress(), buyerTotal);

    const net = await ethers.provider.getNetwork();
    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    const terms = termsShape(await token.getAddress(), net.chainId, now + 60n, now + 660n);
    const deadline = now + 120n;
    const { sigs } = await signAll({
      registry, buyer, primary, backup, verifier, terms, reservationId: 1n, nonce: 0n, deadline,
    });
    await registry.connect(buyer).createCommitment(1n, 0n, deadline, primary.address, backup.address, terms, sigs);
    const c = await registry.commitments(1);
    expect(c.owner).to.equal(buyer.address);
    expect(c.escrow).to.equal(qty * unitPrice);
    expect(await registry.claimable(primary.address)).to.equal(fee);
    expect(await registry.freeBond(primary.address)).to.equal(0n);
  });

  it("T03 reverts the whole create if backup bond is missing", async () => {
    const { buyer, primary, backup, verifier, token, registry } = await deploy();
    await token.connect(primary).approve(await registry.getAddress(), bond);
    await registry.connect(primary).depositBond(bond);
    await token.connect(buyer).approve(await registry.getAddress(), buyerTotal);
    const before = await token.balanceOf(buyer.address);
    const net = await ethers.provider.getNetwork();
    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    const terms = termsShape(await token.getAddress(), net.chainId, now + 60n, now + 660n);
    const deadline = now + 120n;
    const { sigs } = await signAll({
      registry, buyer, primary, backup, verifier, terms, reservationId: 7n, nonce: 0n, deadline,
    });
    await expect(
      registry.connect(buyer).createCommitment(7n, 0n, deadline, primary.address, backup.address, terms, sigs),
    ).to.be.revertedWithCustomError(registry, "InsufficientBond");
    expect(await token.balanceOf(buyer.address)).to.equal(before);
    expect(await registry.nextId()).to.equal(1n);
    expect(await registry.freeBond(primary.address)).to.equal(bond);
  });

  it("T16 rejects a signature for the wrong chain or contract", async () => {
    const { buyer, primary, backup, verifier, token, registry } = await deploy();
    await token.connect(primary).approve(await registry.getAddress(), bond);
    await token.connect(backup).approve(await registry.getAddress(), bond);
    await registry.connect(primary).depositBond(bond);
    await registry.connect(backup).depositBond(bond);
    await token.connect(buyer).approve(await registry.getAddress(), buyerTotal);
    const net = await ethers.provider.getNetwork();
    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    const terms = termsShape(await token.getAddress(), net.chainId, now + 60n, now + 660n);
    const deadline = now + 120n;
    const termsHash = await registry.hashTerms(terms);
    const value = {
      buyer: buyer.address,
      reservationId: 3n,
      termsHash,
      primary: primary.address,
      backup: backup.address,
      nonce: 0n,
      deadline,
    };
    const wrongChain = {
      name: "CommitProtocol",
      version: "1",
      chainId: 1,
      verifyingContract: await registry.getAddress(),
    };
    const sigs = {
      buyer: await buyer.signTypedData(wrongChain, CREATE_TYPES, value),
      primary: await primary.signTypedData(wrongChain, CREATE_TYPES, value),
      backup: await backup.signTypedData(wrongChain, CREATE_TYPES, value),
      verifier: await verifier.signTypedData(wrongChain, CREATE_TYPES, value),
    };
    await expect(
      registry.connect(buyer).createCommitment(3n, 0n, deadline, primary.address, backup.address, terms, sigs),
    ).to.be.revertedWithCustomError(registry, "InvalidSignature");

    const wrongContract = {
      name: "CommitProtocol",
      version: "1",
      chainId: net.chainId,
      verifyingContract: buyer.address,
    };
    const sigs2 = {
      buyer: await buyer.signTypedData(wrongContract, CREATE_TYPES, value),
      primary: await primary.signTypedData(wrongContract, CREATE_TYPES, value),
      backup: await backup.signTypedData(wrongContract, CREATE_TYPES, value),
      verifier: await verifier.signTypedData(wrongContract, CREATE_TYPES, value),
    };
    await expect(
      registry.connect(buyer).createCommitment(3n, 0n, deadline, primary.address, backup.address, terms, sigs2),
    ).to.be.revertedWithCustomError(registry, "InvalidSignature");
  });

  it("T25 cannot withdraw claimable twice", async () => {
    const { buyer, primary, backup, verifier, token, registry } = await deploy();
    await token.connect(primary).approve(await registry.getAddress(), bond);
    await token.connect(backup).approve(await registry.getAddress(), bond);
    await registry.connect(primary).depositBond(bond);
    await registry.connect(backup).depositBond(bond);
    await token.connect(buyer).approve(await registry.getAddress(), buyerTotal);
    const net = await ethers.provider.getNetwork();
    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    const terms = termsShape(await token.getAddress(), net.chainId, now + 60n, now + 660n);
    const deadline = now + 120n;
    const { sigs } = await signAll({
      registry, buyer, primary, backup, verifier, terms, reservationId: 9n, nonce: 0n, deadline,
    });
    await registry.connect(buyer).createCommitment(9n, 0n, deadline, primary.address, backup.address, terms, sigs);
    const before = await token.balanceOf(primary.address);
    await registry.connect(primary).withdraw();
    expect(await token.balanceOf(primary.address)).to.equal(before + fee);
    expect(await registry.claimable(primary.address)).to.equal(0n);
    await expect(registry.connect(primary).withdraw()).to.be.revertedWithCustomError(registry, "NothingToWithdraw");
  });
});
