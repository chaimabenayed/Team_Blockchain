const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Tests de sécurité pour SafeClub
 * Alignés avec les signatures correctes du contrat
 */

describe("SafeClub - Tests de Sécurité", function () {
  let SafeClub, safeClub;
  let owner, member1, member2, attacker;

  const ONE_MIN = 60;
  const MAX_AMOUNT = ethers.parseEther("50");

  beforeEach(async function () {
    [owner, member1, member2, attacker] = await ethers.getSigners();
    SafeClub = await ethers.getContractFactory("SafeClub");
    safeClub = await SafeClub.deploy();

    // Funding du contrat
    await owner.sendTransaction({
      to: await safeClub.getAddress(),
      value: ethers.parseEther("10"),
    });

    // Ajouter 2 membres avec les 3 paramètres requis
    await safeClub.addMember(member1.address, "Member 1", "Treasurer");
    await safeClub.addMember(member2.address, "Member 2", "Member");
  });

  // ==============================
  // SCÉNARIO 1 : RÉENTRANCE
  // ==============================
  describe("🔒 SCÉNARIO 1: Protection contre la Réentrance", function () {
    it("Devrait bloquer la double exécution", async function () {
      // Créer une proposition
      await safeClub
        .connect(member1)
        .createProposal("Test Reentrancy", member2.address, ethers.parseEther("1"), 1);

      // Voter pour la proposition
      await safeClub.connect(member1).vote(0, true);
      await safeClub.connect(member2).vote(0, true);

      // Avancer le temps d'une minute
      await ethers.provider.send("evm_increaseTime", [ONE_MIN + 1]);
      await ethers.provider.send("evm_mine");

      // Première exécution - devrait réussir
      await expect(safeClub.executeProposal(0)).to.not.be.reverted;

      // Deuxième exécution - devrait échouer
      await expect(
        safeClub.executeProposal(0)
      ).to.be.revertedWith("Proposal already executed");
    });
  });

  // ==============================
  // SCÉNARIO 2 : CONTRÔLE D'ACCÈS
  // ==============================
  describe("🔐 SCÉNARIO 2: Contrôle d'Accès Strict", function () {
    it("ATTAQUE: Non-membre crée proposition", async function () {
      await expect(
        safeClub
          .connect(attacker)
          .createProposal("Hack", attacker.address, ethers.parseEther("1"), 1)
      ).to.be.revertedWith("Not a member");
    });

    it("ATTAQUE: Non-membre vote", async function () {
      await safeClub
        .connect(member1)
        .createProposal("Test", member2.address, ethers.parseEther("1"), 1);

      await expect(
        safeClub.connect(attacker).vote(0, true)
      ).to.be.revertedWith("Not a member");
    });

    it("ATTAQUE: Membre tente d'ajouter membre", async function () {
      await expect(
        safeClub.connect(member1).addMember(attacker.address, "Attacker", "Hacker")
      ).to.be.reverted;
    });
  });

  // ==============================
  // SCÉNARIO 3 : VALIDATION
  // ==============================
  describe("💰 SCÉNARIO 3: Validation des Montants et États", function () {
    it("Montant nul", async function () {
      await expect(
        safeClub
          .connect(member1)
          .createProposal("Test", member2.address, 0, 1)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Montant trop élevé", async function () {
      await expect(
        safeClub
          .connect(member1)
          .createProposal("Test", member2.address, MAX_AMOUNT + 1n, 1)
      ).to.be.revertedWith("Amount exceeds maximum");
    });

    it("Vote après deadline", async function () {
      await safeClub
        .connect(member1)
        .createProposal("Test", member2.address, ethers.parseEther("1"), 1);

      // Avancer le temps d'une minute
      await ethers.provider.send("evm_increaseTime", [ONE_MIN + 1]);
      await ethers.provider.send("evm_mine");

      // Essayer de voter - devrait échouer
      await expect(
        safeClub.connect(member1).vote(0, true)
      ).to.be.revertedWith("Voting period ended");
    });

    it("Exécuter avant la fin du vote", async function () {
      await safeClub
        .connect(member1)
        .createProposal("Test", member2.address, ethers.parseEther("1"), 1);

      await safeClub.connect(member1).vote(0, true);
      await safeClub.connect(member2).vote(0, true);

      // Essayer d'exécuter avant la deadline - devrait échouer
      await expect(
        safeClub.executeProposal(0)
      ).to.be.revertedWith("Voting still in progress");
    });
  });

  // ==============================
  // SCÉNARIO 4 : ADRESSES
  // ==============================
  describe("👤 SCÉNARIO 4: Validation des Adresses", function () {
    it("Adresse zéro membre", async function () {
      await expect(
        safeClub.addMember(ethers.ZeroAddress, "Zero", "Admin")
      ).to.be.revertedWith("Invalid address");
    });

    it("Proposition vers adresse zéro", async function () {
      await expect(
        safeClub
          .connect(member1)
          .createProposal("Test", ethers.ZeroAddress, ethers.parseEther("1"), 1)
      ).to.be.revertedWith("Invalid address");
    });

    it("Proposition vers l'adresse du contrat", async function () {
      const contractAddr = await safeClub.getAddress();
      await expect(
        safeClub
          .connect(member1)
          .createProposal("Test", contractAddr, ethers.parseEther("1"), 1)
      ).to.be.revertedWith("Cannot target contract");
    });
  });

  // ==============================
  // SCÉNARIO 5 : DOS
  // ==============================
  describe("⚠️ SCÉNARIO 5: Protection DOS", function () {
    it("Description vide", async function () {
      await expect(
        safeClub
          .connect(member1)
          .createProposal("", member2.address, ethers.parseEther("1"), 1)
      ).to.be.revertedWith("Description cannot be empty");
    });

    it("Description trop longue", async function () {
      const longDesc = "A".repeat(600);
      await expect(
        safeClub
          .connect(member1)
          .createProposal(longDesc, member2.address, ethers.parseEther("1"), 1)
      ).to.be.revertedWith("Description too long");
    });

    it("Trop de propositions actives", async function () {
      // Créer 20 propositions (limite max)
      for (let i = 0; i < 20; i++) {
        await safeClub
          .connect(member1)
          .createProposal(`Proposal ${i}`, member2.address, ethers.parseEther("0.1"), 1);
      }

      // La 21ème devrait échouer
      await expect(
        safeClub
          .connect(member1)
          .createProposal("Proposal 21", member2.address, ethers.parseEther("0.1"), 1)
      ).to.be.revertedWith("Too many active proposals");
    });
  });

  // ==============================
  // SCÉNARIO 6 : DURÉE DE VOTE
  // ==============================
  describe("⏱️ SCÉNARIO 6: Durée de Vote (1 minute exacte)", function () {
    it("Durée doit être exactement 1 minute", async function () {
      // Essayer avec 2 minutes
      await expect(
        safeClub
          .connect(member1)
          .createProposal("Test", member2.address, ethers.parseEther("1"), 2)
      ).to.be.revertedWith("Duration must be exactly 1 minute");

      // Essayer avec 0 minute
      await expect(
        safeClub
          .connect(member1)
          .createProposal("Test", member2.address, ethers.parseEther("1"), 0)
      ).to.be.revertedWith("Duration must be exactly 1 minute");
    });
  });

  // ==============================
  // SCÉNARIO 7 : WORKFLOW COMPLET
  // ==============================
  describe("✅ SCÉNARIO 7: Workflow Complet", function () {
    it("Création → Vote → Exécution", async function () {
      // Créer une proposition
      const tx = await safeClub
        .connect(member1)
        .createProposal("Workflow Test", member2.address, ethers.parseEther("1"), 1);

      expect(tx).to.emit(safeClub, "ProposalCreated");

      // Vérifier la proposition
      const proposal = await safeClub.getProposal(0);
      expect(proposal.description).to.equal("Workflow Test");
      expect(proposal.executed).to.equal(false);

      // Voter
      await safeClub.connect(member1).vote(0, true);
      await safeClub.connect(member2).vote(0, true);

      // Vérifier les votes
      expect(await safeClub.hasVoted(0, member1.address)).to.be.true;
      expect(await safeClub.hasVoted(0, member2.address)).to.be.true;

      // Attendre la deadline
      await ethers.provider.send("evm_increaseTime", [ONE_MIN + 1]);
      await ethers.provider.send("evm_mine");

      // Vérifier que la proposition est approuvée
      expect(await safeClub.isProposalApproved(0)).to.be.true;

      // Exécuter
      const balanceBefore = await ethers.provider.getBalance(member2.address);
      await safeClub.executeProposal(0);
      const balanceAfter = await ethers.provider.getBalance(member2.address);

      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });

    it("Rejet si quorum non atteint", async function () {
      await safeClub
        .connect(member1)
        .createProposal("Rejected", member2.address, ethers.parseEther("1"), 1);

      // Seul member1 vote
      await safeClub.connect(member1).vote(0, true);

      // Attendre
      await ethers.provider.send("evm_increaseTime", [ONE_MIN + 1]);
      await ethers.provider.send("evm_mine");

      // Vérifier que le quorum n'est pas atteint
      expect(await safeClub.isProposalApproved(0)).to.be.false;

      // Exécution devrait échouer
      await expect(
        safeClub.executeProposal(0)
      ).to.be.revertedWith("Quorum not reached");
    });
  });

  // ==============================
  // SCÉNARIO 8 : GESTION DES MEMBRES
  // ==============================
  describe("👥 SCÉNARIO 8: Gestion des Membres", function () {
    it("Owner peut ajouter des membres", async function () {
      await safeClub.addMember(attacker.address, "New Member", "Contributor");
      expect(await safeClub.isMember(attacker.address)).to.be.true;
    });

    it("Owner peut modifier les membres", async function () {
      await safeClub.updateMember(member1.address, "Updated Name", "President");
      const info = await safeClub.getMemberInfo(member1.address);
      expect(info.name).to.equal("Updated Name");
      expect(info.role).to.equal("President");
    });

    it("Owner peut supprimer les membres", async function () {
      await safeClub.removeMember(member1.address);
      expect(await safeClub.isMember(member1.address)).to.be.false;
    });

    it("Ne peut pas supprimer l'owner", async function () {
      await expect(
        safeClub.removeMember(owner.address)
      ).to.be.revertedWith("Cannot remove owner");
    });
  });

  // ==============================
  // SCÉNARIO 9 : CONFIGURATION
  // ==============================
  describe("⚙️ SCÉNARIO 9: Configuration du Quorum et Approbation", function () {
    it("Owner peut changer le quorum", async function () {
      await safeClub.setQuorumPercentage(75);
      expect(await safeClub.quorumPercentage()).to.equal(75);
    });

    it("Owner peut changer le pourcentage d'approbation", async function () {
      await safeClub.setApprovalPercentage(80);
      expect(await safeClub.approvalPercentage()).to.equal(80);
    });
  });
});