const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

function loadWallets() {
  const dest = path.resolve(__dirname, "../../../.local/xlayer-wallets.json");
  if (!fs.existsSync(dest)) {
    throw new Error("missing .local/xlayer-wallets.json — run: node scripts/gen-xlayer-wallets.mjs");
  }
  return JSON.parse(fs.readFileSync(dest, "utf8"));
}

async function main() {
  if (process.env.COMMIT_ALLOW_XLAYER !== "1") {
    throw new Error("set COMMIT_ALLOW_XLAYER=1 for testnet 1952 only");
  }
  const net = await ethers.provider.getNetwork();
  if (Number(net.chainId) !== 1952) {
    throw new Error(`refusing chainId ${net.chainId}; expected 1952 (never 196)`);
  }

  const keys = loadWallets();
  const provider = ethers.provider;
  const deployer = new ethers.Wallet(keys.deployer.privateKey, provider);
  const buyer = new ethers.Wallet(keys.buyer.privateKey, provider);
  const primary = new ethers.Wallet(keys.primary.privateKey, provider);
  const backup = new ethers.Wallet(keys.backup.privateKey, provider);
  const verifier = new ethers.Wallet(keys.verifier.privateKey, provider);

  const gas = await provider.getBalance(deployer.address);
  if (gas === 0n) {
    const out = {
      chainId: 1952,
      blocked: "NO_GAS",
      faucet: "https://web3.okx.com/xlayer/faucet/xlayerfaucet",
      deployer: deployer.address,
      buyer: buyer.address,
      primary: primary.address,
      backup: backup.address,
      verifier: verifier.address,
      note: "Fund deployer with test OKB, then re-run deploy:xlayer. tCOM has no value.",
    };
    console.log(JSON.stringify(out, null, 2));
    process.exit(2);
  }

  const Token = await ethers.getContractFactory("MockToken", deployer);
  const token = await Token.deploy();
  await token.waitForDeployment();
  const Registry = await ethers.getContractFactory("CommitmentRegistry", deployer);
  const registry = await Registry.deploy(await token.getAddress(), verifier.address, deployer.address, 600);
  await registry.waitForDeployment();

  const UNIT = 1_000_000n;
  const bond = 100_000n;
  const reg = await registry.getAddress();
  const tokenAddr = await token.getAddress();

  for (const a of [deployer, buyer, primary, backup]) {
    const tx = await token.mint(a.address, 10n * UNIT);
    await tx.wait();
  }

  const fundWei = ethers.parseEther("0.02");
  for (const a of [buyer, primary, backup, verifier]) {
    const bal = await provider.getBalance(a.address);
    if (bal < fundWei / 2n) {
      const tx = await deployer.sendTransaction({ to: a.address, value: fundWei });
      await tx.wait();
    }
  }

  await (await token.connect(primary).approve(reg, bond)).wait();
  await (await token.connect(backup).approve(reg, bond)).wait();
  await (await registry.connect(primary).depositBond(bond)).wait();
  await (await registry.connect(backup).depositBond(bond)).wait();

  const out = {
    chainId: 1952,
    rpc: process.env.XLAYER_TESTNET_RPC || "https://testrpc.xlayer.tech/terigon",
    explorer: "https://www.okx.com/web3/explorer/xlayer-test",
    token: tokenAddr,
    registry: reg,
    tokenTx: token.deploymentTransaction()?.hash || null,
    registryTx: registry.deploymentTransaction()?.hash || null,
    seller: deployer.address,
    buyer: buyer.address,
    primary: primary.address,
    backup: backup.address,
    verifier: verifier.address,
    bond: bond.toString(),
    note: "X Layer testnet 1952. tCOM has no value. Mainnet 196 disabled.",
  };
  const dest = path.resolve(__dirname, "../../../.local/xlayer.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
