const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, buyer2, primary, backup, verifier] = await ethers.getSigners();
  const token = await (await ethers.getContractFactory("MockToken")).deploy();
  const registry = await (await ethers.getContractFactory("CommitmentRegistry")).deploy(
    await token.getAddress(),
    verifier.address,
    deployer.address,
    600,
  );
  const UNIT = 1_000_000n;
  const bond = 100_000n;
  const reg = await registry.getAddress();
  for (const a of [deployer, buyer2, primary, backup]) {
    await token.mint(a.address, 10n * UNIT);
  }
  await token.connect(primary).approve(reg, bond);
  await token.connect(backup).approve(reg, bond);
  await registry.connect(primary).depositBond(bond);
  await registry.connect(backup).depositBond(bond);

  const out = {
    chainId: 31337,
    rpc: "http://127.0.0.1:8545",
    token: await token.getAddress(),
    registry: reg,
    seller: deployer.address,
    buyer: buyer2.address,
    primary: primary.address,
    backup: backup.address,
    verifier: verifier.address,
    bond: bond.toString(),
    note: "Local Hardhat only. tCOM has no value. Contest chain remains 1952.",
  };
  const dest = path.resolve(__dirname, "../../../.local/chain.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
