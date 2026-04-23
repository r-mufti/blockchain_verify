// scripts/deploy.js
// Run: npx hardhat run scripts/deploy.js --network <network>

const { ethers, network, run } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await deployer.provider.getBalance(deployer.address);

  console.log("═══════════════════════════════════════════════════");
  console.log("  CertificateRegistry — Deployment Script");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Network  : ${network.name}`);
  console.log(`  Deployer : ${deployer.address}`);
  console.log(`  Balance  : ${ethers.formatEther(balance)} ETH`);
  console.log("───────────────────────────────────────────────────\n");

  // ── Deploy ────────────────────────────────────────────────────────────────
  console.log("⏳  Deploying CertificateRegistry...");
  const Factory = await ethers.getContractFactory("CertificateRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log(`✅  Deployed at : ${address}`);
  console.log(`   Tx hash     : ${deployTx.hash}`);
  console.log(`   Block       : ${deployTx.blockNumber ?? "pending"}\n`);

  // ── Authorize sample issuers (optional, edit as needed) ──────────────────
  const sampleIssuers = process.env.INITIAL_ISSUERS
    ? process.env.INITIAL_ISSUERS.split(",")
    : [];

  for (const issuer of sampleIssuers) {
    if (ethers.isAddress(issuer.trim())) {
      console.log(`⏳  Authorizing issuer: ${issuer.trim()}`);
      const tx = await contract.authorizeIssuer(issuer.trim());
      await tx.wait();
      console.log(`✅  Authorized: ${issuer.trim()}`);
    }
  }

  // ── Save deployment info ──────────────────────────────────────────────────
  const deploymentInfo = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    contractAddress: address,
    deployer: deployer.address,
    txHash: deployTx.hash,
    deployedAt: new Date().toISOString(),
    abi: JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json")
      )
    ).abi,
  };

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄  Deployment info saved → ${outFile}`);

  // ── Verify on Etherscan (skip for localhost) ──────────────────────────────
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n⏳  Waiting 6 confirmations before Etherscan verification...");
    await deployTx.wait(6);

    try {
      await run("verify:verify", {
        address,
        constructorArguments: [],
      });
      console.log("✅  Contract verified on Etherscan");
    } catch (err) {
      if (err.message.includes("Already Verified")) {
        console.log("ℹ️   Already verified on Etherscan");
      } else {
        console.error("⚠️   Verification failed:", err.message);
      }
    }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Deployment Complete 🎉");
  console.log("═══════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
