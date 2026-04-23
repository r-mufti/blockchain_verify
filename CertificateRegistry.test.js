// test/CertificateRegistry.test.js
// Run: npx hardhat test

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CertificateRegistry", function () {
  let registry;
  let owner, issuer1, issuer2, student1, student2, stranger;

  const COURSE = "Blockchain Development Fundamentals";
  const IPFS   = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

  beforeEach(async () => {
    [owner, issuer1, issuer2, student1, student2, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CertificateRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  // ── Deployment ──────────────────────────────────────────────────────────
  describe("Deployment", () => {
    it("sets owner correctly", async () => {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("owner is auto-authorized as issuer", async () => {
      expect(await registry.authorizedIssuers(owner.address)).to.be.true;
    });
  });

  // ── Authorization ────────────────────────────────────────────────────────
  describe("Issuer Authorization", () => {
    it("owner can authorize issuers", async () => {
      await registry.authorizeIssuer(issuer1.address);
      expect(await registry.authorizedIssuers(issuer1.address)).to.be.true;
    });

    it("emits IssuerAuthorized event", async () => {
      await expect(registry.authorizeIssuer(issuer1.address))
        .to.emit(registry, "IssuerAuthorized")
        .withArgs(issuer1.address);
    });

    it("non-owner cannot authorize issuers", async () => {
      await expect(
        registry.connect(stranger).authorizeIssuer(issuer1.address)
      ).to.be.revertedWith("CertReg: not owner");
    });

    it("owner can revoke issuer access", async () => {
      await registry.authorizeIssuer(issuer1.address);
      await registry.revokeIssuerAccess(issuer1.address);
      expect(await registry.authorizedIssuers(issuer1.address)).to.be.false;
    });
  });

  // ── Issuance ─────────────────────────────────────────────────────────────
  describe("Certificate Issuance", () => {
    beforeEach(async () => {
      await registry.authorizeIssuer(issuer1.address);
    });

    it("authorized issuer can issue a certificate", async () => {
      const tx = await registry
        .connect(issuer1)
        .issueCertificate(student1.address, "Alice Smith", COURSE, IPFS, 0);

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (l) => l.fragment?.name === "CertificateIssued"
      );
      expect(event).to.exist;
    });

    it("emits CertificateIssued with correct args", async () => {
      const tx = registry
        .connect(issuer1)
        .issueCertificate(student1.address, "Alice Smith", COURSE, IPFS, 0);

      await expect(tx)
        .to.emit(registry, "CertificateIssued")
        .withArgs(
          /* certId - any */   ethers.isHexString,
          issuer1.address,
          student1.address,
          COURSE,
          /* timestamp - any */ await time.latest().then((t) => t + 1)
        );
    });

    it("unauthorized address cannot issue", async () => {
      await expect(
        registry
          .connect(stranger)
          .issueCertificate(student1.address, "Bob", COURSE, IPFS, 0)
      ).to.be.revertedWith("CertReg: not an authorized issuer");
    });

    it("rejects zero-address recipient", async () => {
      await expect(
        registry
          .connect(issuer1)
          .issueCertificate(ethers.ZeroAddress, "Alice", COURSE, IPFS, 0)
      ).to.be.revertedWith("CertReg: zero recipient");
    });

    it("rejects expiry in the past", async () => {
      const past = (await time.latest()) - 1000;
      await expect(
        registry
          .connect(issuer1)
          .issueCertificate(student1.address, "Alice", COURSE, IPFS, past)
      ).to.be.revertedWith("CertReg: expiry in the past");
    });
  });

  // ── Verification ─────────────────────────────────────────────────────────
  describe("Certificate Verification", () => {
    let certId;

    beforeEach(async () => {
      await registry.authorizeIssuer(issuer1.address);
      const tx = await registry
        .connect(issuer1)
        .issueCertificate(student1.address, "Alice Smith", COURSE, IPFS, 0);
      const receipt = await tx.wait();
      const event = receipt.logs.find((l) => l.fragment?.name === "CertificateIssued");
      certId = event.args[0]; // certId is first indexed arg
    });

    it("returns VALID for a fresh certificate", async () => {
      const [valid, , status] = await registry.verifyCertificate(certId);
      expect(valid).to.be.true;
      expect(status).to.equal("VALID");
    });

    it("returns NOT_FOUND for unknown certId", async () => {
      const fake = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      const [valid, , status] = await registry.verifyCertificate(fake);
      expect(valid).to.be.false;
      expect(status).to.equal("NOT_FOUND");
    });

    it("returns EXPIRED after expiry date", async () => {
      const future = (await time.latest()) + 3600; // +1 hour
      const tx = await registry
        .connect(issuer1)
        .issueCertificate(student1.address, "Alice", "Short Course", IPFS, future);
      const receipt = await tx.wait();
      const event = receipt.logs.find((l) => l.fragment?.name === "CertificateIssued");
      const shortCertId = event.args[0];

      await time.increaseTo(future + 1);

      const [valid, , status] = await registry.verifyCertificate(shortCertId);
      expect(valid).to.be.false;
      expect(status).to.equal("EXPIRED");
    });

    it("returns REVOKED after revocation", async () => {
      await registry.connect(issuer1).revokeCertificate(certId, "Academic dishonesty");
      const [valid, cert, status] = await registry.verifyCertificate(certId);
      expect(valid).to.be.false;
      expect(status).to.equal("REVOKED");
      expect(cert.revocationNote).to.equal("Academic dishonesty");
    });

    it("stores all certificate fields correctly", async () => {
      const [, cert] = await registry.verifyCertificate(certId);
      expect(cert.issuer).to.equal(issuer1.address);
      expect(cert.recipient).to.equal(student1.address);
      expect(cert.recipientName).to.equal("Alice Smith");
      expect(cert.courseName).to.equal(COURSE);
      expect(cert.ipfsHash).to.equal(IPFS);
      expect(cert.revoked).to.be.false;
    });
  });

  // ── Revocation ────────────────────────────────────────────────────────────
  describe("Revocation", () => {
    let certId;

    beforeEach(async () => {
      await registry.authorizeIssuer(issuer1.address);
      const tx = await registry
        .connect(issuer1)
        .issueCertificate(student1.address, "Bob Jones", COURSE, IPFS, 0);
      const receipt = await tx.wait();
      const event = receipt.logs.find((l) => l.fragment?.name === "CertificateIssued");
      certId = event.args[0];
    });

    it("issuer can revoke their own certificate", async () => {
      await expect(registry.connect(issuer1).revokeCertificate(certId, "Fraud"))
        .to.emit(registry, "CertificateRevoked")
        .withArgs(certId, "Fraud");
    });

    it("owner can revoke any certificate", async () => {
      await expect(registry.connect(owner).revokeCertificate(certId, "Policy"))
        .to.emit(registry, "CertificateRevoked");
    });

    it("stranger cannot revoke", async () => {
      await expect(
        registry.connect(stranger).revokeCertificate(certId, "Malicious")
      ).to.be.revertedWith("CertReg: not authorized to revoke");
    });

    it("cannot revoke twice", async () => {
      await registry.connect(issuer1).revokeCertificate(certId, "Fraud");
      await expect(
        registry.connect(issuer1).revokeCertificate(certId, "Again")
      ).to.be.revertedWith("CertReg: already revoked");
    });
  });

  // ── Lookup ───────────────────────────────────────────────────────────────
  describe("Lookup helpers", () => {
    beforeEach(async () => {
      await registry.authorizeIssuer(issuer1.address);
      await registry
        .connect(issuer1)
        .issueCertificate(student1.address, "Alice", "Course A", IPFS, 0);
      await registry
        .connect(issuer1)
        .issueCertificate(student1.address, "Alice", "Course B", IPFS, 0);
    });

    it("returns all certs for a recipient", async () => {
      const certs = await registry.getCertsByRecipient(student1.address);
      expect(certs.length).to.equal(2);
    });

    it("returns all certs issued by an issuer", async () => {
      const certs = await registry.getCertsByIssuer(issuer1.address);
      expect(certs.length).to.equal(2);
    });
  });
});
