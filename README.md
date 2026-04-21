# 🎓 Blockchain Certificate Registry

A tamper-proof, decentralized system for issuing and verifying academic & professional certificates on Ethereum/Polygon.

---

## Features

| Feature | Details |
|---|---|
| ✅ On-chain Issuance | Certificates stored with unique keccak256 IDs |
| 🔍 Instant Verification | Anyone can verify by Certificate ID |
| 🚫 Fraud Prevention | Immutable records, issuer whitelist |
| ❌ Revocation | Issuers/admin can revoke with a reason |
| ⏰ Expiry | Optional time-bound certificates |
| 📁 IPFS Storage | Full PDF stored on IPFS; only hash on-chain |
| 🏛️ Multi-Issuer | Multiple authorized institutions supported |

---

## Project Structure

```
blockchain-cert/
├── contracts/
│   └── CertificateRegistry.sol   ← Core smart contract
├── scripts/
│   └── deploy.js                 ← Deployment script
├── test/
│   └── CertificateRegistry.test.js
├── deployments/                  ← Auto-generated after deploy
├── hardhat.config.js
├── package.json
└── .env.example
```

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env
# → Fill in your PRIVATE_KEY, INFURA_KEY, etc.

# 3. Compile the contract
npm run compile

# 4. Run tests
npm test

# 5. Start a local node (separate terminal)
npm run node

# 6. Deploy locally
npm run deploy:local
```

---

## Deploying to Testnets

```bash
# Sepolia (Ethereum testnet)
npm run deploy:sepolia

# Mumbai (Polygon testnet)
npm run deploy:mumbai
```

Get testnet ETH from:
- Sepolia: https://sepoliafaucet.com
- Mumbai: https://faucet.polygon.technology

---

## Deploying to Mainnet

```bash
# Ethereum mainnet ($$$ gas)
npm run deploy:mainnet

# Polygon mainnet (cheap gas — recommended)
npm run deploy:polygon
```

---

## Contract API

### Issue a Certificate
```solidity
function issueCertificate(
    address  recipient,
    string   recipientName,
    string   courseName,
    string   ipfsHash,
    uint256  expiresAt      // 0 = never expires
) returns (bytes32 certId)
```

### Verify a Certificate
```solidity
function verifyCertificate(bytes32 certId)
    returns (bool valid, Certificate cert, string status)
// status: "VALID" | "REVOKED" | "EXPIRED" | "NOT_FOUND"
```

### Revoke a Certificate
```solidity
function revokeCertificate(bytes32 certId, string reason)
```

### Manage Issuers (Owner only)
```solidity
function authorizeIssuer(address issuer)
function revokeIssuerAccess(address issuer)
```

---

## Frontend Integration (ethers.js)

```javascript
import { ethers } from "ethers";
import deployment from "./deployments/polygon.json";

const provider = new ethers.BrowserProvider(window.ethereum);
const signer   = await provider.getSigner();
const contract = new ethers.Contract(
  deployment.contractAddress,
  deployment.abi,
  signer
);

// Issue
const tx = await contract.issueCertificate(
  recipientAddress, "Alice Smith",
  "Blockchain Dev", ipfsCid, 0
);
const receipt = await tx.wait();

// Verify
const [valid, cert, status] = await contract.verifyCertificate(certId);
console.log(status); // "VALID"
```

---

## Recommended Networks

| Network | Gas Cost | Speed | Recommendation |
|---|---|---|---|
| Polygon | ~$0.001 | Fast | ✅ Best for production |
| Ethereum | ~$5–$20 | Moderate | Large orgs |
| Sepolia | Free | Fast | Testing |

---

## License

MIT
