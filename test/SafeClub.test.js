const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * TESTS DE SÉCURITÉ POUR SAFECLUB
 * 
 * Scénarios testés:
 * 1. Protection contre la réentrance
 * 2. Contrôle d'accès strict
 * 3. Validation des montants et états
 * 4. Protection double exécution
 * 5. Attaques de type DOS
 * 6. Mécanisme de pause d'urgence
 * 7. Workflow complet sécurisé
 */

describe("SafeClub - Tests de Sécurité", function () {
  
  // Fixture de base
  async function deploySafeClubFixture() {
    const [owner, member1, member2, attacker, recipient] = await ethers.getSigners();
    
    const SafeClub = await ethers.getContractFactory("SafeClub");
    const safeClub = await SafeClub.deploy();
    
    return { safeClub, owner, member1, member2, attacker, recipient };
  }

  // ==================== SCÉNARIO 1: PROTECTION REENTRANCY ====================
  
  describe("🔒 SCÉNARIO 1: Protection contre la Réentrance", function () {
    
    it("Devrait bloquer une attaque de réentrance lors de l'exécution", async function () {
      const { safeClub, owner, member1, recipient } = await loadFixture(deploySafeClubFixture);
      
      // Déployer un contrat malveillant qui tente la réentrance
      const MaliciousContract = await ethers.getContractFactory("ReentrancyAttacker");
      const attacker = await MaliciousContract.deploy(safeClub.target);
      
      // Setup: ajouter membre, déposer fonds
      await safeClub.addMember(member1.address);
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      
      // Créer proposition vers contrat malveillant
      await safeClub.createProposal(
        "Attaque réentrance",
        attacker.target,
        ethers.parseEther("5"),
        1
      );
      
      // Votes
      await safeClub.vote(0, true);
      await safeClub.connect(member1).vote(0, true);
      
      // Attendre fin du vote
      await time.increase(2 * 24 * 60 * 60);
      
      // L'attaque de réentrance devrait échouer grâce à nonReentrant
      await expect(
        safeClub.executeProposal(0)
      ).to.not.be.reverted; // La première exécution réussit
      
      // Vérifier qu'une seule exécution a eu lieu
      const proposal = await safeClub.getProposal(0);
      expect(proposal.executed).to.be.true;
      
      // Le contrat ne devrait avoir transféré qu'une seule fois
      const attackerBalance = await ethers.provider.getBalance(attacker.target);
      expect(attackerBalance).to.equal(ethers.parseEther("5"));
    });
    
    it("Devrait empêcher la double exécution", async function () {
      const { safeClub, owner, member1, recipient } = await loadFixture(deploySafeClubFixture);
      
      await safeClub.addMember(member1.address);
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      
      await safeClub.createProposal("Test", recipient.address, ethers.parseEther("1"), 1);
      await safeClub.vote(0, true);
      await safeClub.connect(member1).vote(0, true);
      await time.increase(2 * 24 * 60 * 60);
      
      // Première exécution
      await safeClub.executeProposal(0);
      
      // Tentative de seconde exécution
      await expect(
        safeClub.executeProposal(0)
      ).to.be.revertedWith("SafeClub: deja executee");
    });
    
    it("Devrait marquer executed AVANT le transfert", async function () {
      const { safeClub, owner, member1, recipient } = await loadFixture(deploySafeClubFixture);
      
      await safeClub.addMember(member1.address);
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      
      await safeClub.createProposal("Test", recipient.address, ethers.parseEther("1"), 1);
      await safeClub.vote(0, true);
      await safeClub.connect(member1).vote(0, true);
      await time.increase(2 * 24 * 60 * 60);
      
      await safeClub.executeProposal(0);
      
      // Vérifier que executed est true
      const proposal = await safeClub.getProposal(0);
      expect(proposal.executed).to.be.true;
    });
  });

  // ==================== SCÉNARIO 2: CONTRÔLE D'ACCÈS ====================
  
  describe("🔐 SCÉNARIO 2: Contrôle d'Accès Strict", function () {
    
    it("ATTAQUE: Un non-membre tente de créer une proposition", async function () {
      const { safeClub, owner, attacker, recipient } = await loadFixture(deploySafeClubFixture);
      
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      
      await expect(
        safeClub.connect(attacker).createProposal(
          "Attaque",
          recipient.address,
          ethers.parseEther("5"),
          7
        )
      ).to.be.revertedWith("SafeClub: appelant non membre");
    });
    
    it("ATTAQUE: Un non-membre tente de voter", async function () {
      const { safeClub, owner, attacker } = await loadFixture(deploySafeClubFixture);
      
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      await safeClub.createProposal("Test", owner.address, ethers.parseEther("1"), 7);
      
      await expect(
        safeClub.connect(attacker).vote(0, true)
      ).to.be.revertedWith("SafeClub: appelant non membre");
    });
    
    it("ATTAQUE: Un non-membre tente d'exécuter", async function () {
      const { safeClub, owner, member1, attacker, recipient } = await loadFixture(deploySafeClubFixture);
      
      await safeClub.addMember(member1.address);
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      await safeClub.createProposal("Test", recipient.address, ethers.parseEther("1"), 1);
      await safeClub.vote(0, true);
      await safeClub.connect(member1).vote(0, true);
      await time.increase(2 * 24 * 60 * 60);
      
      await expect(
        safeClub.connect(attacker).executeProposal(0)
      ).to.be.revertedWith("SafeClub: appelant non membre");
    });
    
    it("ATTAQUE: Un membre tente d'ajouter un autre membre", async function () {
      const { safeClub, owner, member1, member2 } = await loadFixture(deploySafeClubFixture);
      
      await safeClub.addMember(member1.address);
      
      await expect(
        safeClub.connect(member1).addMember(member2.address)
      ).to.be.revertedWithCustomError(safeClub, "OwnableUnauthorizedAccount");
    });
    
    it("ATTAQUE: Un membre tente de retirer l'owner", async function () {
      const { safeClub, owner, member1 } = await loadFixture(deploySafeClubFixture);
      
      await safeClub.addMember(member1.address);
      
      await expect(
        safeClub.removeMember(owner.address)
      ).to.be.revertedWith("SafeClub: impossible retirer owner");
    });
  });

  // ==================== SCÉNARIO 3: VALIDATION DES MONTANTS ====================
  
  describe("💰 SCÉNARIO 3: Validation des Montants et États", function () {
    
    it("ATTAQUE: Créer proposition avec montant 0", async function () {
      const { safeClub, owner, recipient } = await loadFixture(deploySafeClubFixture);
      
      await expect(
        safeClub.createProposal("Test", recipient.address, 0, 7)
      ).to.be.revertedWith("SafeClub: montant nul");
    });
    
    it("ATTAQUE: Créer proposition dépassant MAX_PROPOSAL_AMOUNT", async function () {
      const { safeClub, owner, recipient } = await loadFixture(deploySafeClubFixture);
      
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("100") });
      
      await expect(
        safeClub.createProposal(
          "Drainage",
          recipient.address,
          ethers.parseEther("51"), // Plus que MAX (50 ETH)
          7
        )
      ).to.be.revertedWith("SafeClub: montant trop eleve");
    });
    
    it("ATTAQUE: Créer proposition sans fonds suffisants", async function () {
      const { safeClub, owner, recipient } = await loadFixture(deploySafeClubFixture);
      
      await expect(
        safeClub.createProposal(
          "Sans fonds",
          recipient.address,
          ethers.parseEther("10"),
          7
        )
      ).to.be.revertedWith("SafeClub: fonds insuffisants");
    });
    
    it("ATTAQUE: Voter après la deadline", async function () {
      const { safeClub, owner, recipient } = await loadFixture(deploySafeClubFixture);
      
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      await safeClub.createProposal("Test", recipient.address, ethers.parseEther("1"), 1);
      
      // Avancer le temps après deadline
      await time.increase(2 * 24 * 60 * 60);
      
      await expect(
        safeClub.vote(0, true)
      ).to.be.revertedWith("SafeClub: vote termine");
    });
    
    it("ATTAQUE: Voter deux fois", async function () {
      const { safeClub, owner, recipient } = await loadFixture(deploySafeClubFixture);
      
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      await safeClub.createProposal("Test", recipient.address, ethers.parseEther("1"), 7);
      
      await safeClub.vote(0, true);
      
      await expect(
        safeClub.vote(0, true)
      ).to.be.revertedWith("SafeClub: deja vote");
    });
    
    it("ATTAQUE: Exécuter avant la deadline", async function () {
      const { safeClub, owner, member1, recipient } = await loadFixture(deploySafeClubFixture);
      
      await safeClub.addMember(member1.address);
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      await safeClub.createProposal("Test", recipient.address, ethers.parseEther("1"), 7);
      await safeClub.vote(0, true);
      await safeClub.connect(member1).vote(0, true);
      
      await expect(
        safeClub.executeProposal(0)
      ).to.be.revertedWith("SafeClub: vote en cours");
    });
    
    it("ATTAQUE: Exécuter sans quorum", async function () {
      const { safeClub, owner, member1, member2, recipient } = await loadFixture(deploySafeClubFixture);
      
      await safeClub.addMember(member1.address);
      await safeClub.addMember(member2.address);
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      await safeClub.createProposal("Test", recipient.address, ethers.parseEther("1"), 1);
      
      // Seulement 1 vote sur 3 membres (33% < 50% quorum)
      await safeClub.vote(0, true);
      await time.increase(2 * 24 * 60 * 60);
      
      await expect(
        safeClub.executeProposal(0)
      ).to.be.revertedWith("SafeClub: quorum non atteint");
    });
    
    it("ATTAQUE: Exécuter avec majorité contre", async function () {
      const { safeClub, owner, member1, recipient } = await loadFixture(deploySafeClubFixture);
      
      await safeClub.addMember(member1.address);
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      await safeClub.createProposal("Test", recipient.address, ethers.parseEther("1"), 1);
      
      // 1 POUR, 1 CONTRE = 50% < 60% requis
      await safeClub.vote(0, true);
      await safeClub.connect(member1).vote(0, false);
      await time.increase(2 * 24 * 60 * 60);
      
      await expect(
        safeClub.executeProposal(0)
      ).to.be.revertedWith("SafeClub: proposition rejetee");
    });
  });

  // ==================== SCÉNARIO 4: VALIDATION DES ADRESSES ====================
  
  describe("📍 SCÉNARIO 4: Validation des Adresses", function () {
    
    it("ATTAQUE: Ajouter adresse zéro comme membre", async function () {
      const { safeClub } = await loadFixture(deploySafeClubFixture);
      
      await expect(
        safeClub.addMember(ethers.ZeroAddress)
      ).to.be.revertedWith("SafeClub: adresse zero");
    });
    
    it("ATTAQUE: Créer proposition vers adresse zéro", async function () {
      const { safeClub, owner } = await loadFixture(deploySafeClubFixture);
      
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      
      await expect(
        safeClub.createProposal(
          "Vers zero",
          ethers.ZeroAddress,
          ethers.parseEther("1"),
          7
        )
      ).to.be.revertedWith("SafeClub: adresse zero");
    });
    
    it("ATTAQUE: Créer proposition vers l'adresse du contrat", async function () {
      const { safeClub, owner } = await loadFixture(deploySafeClubFixture);
      
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      
      await expect(
        safeClub.createProposal(
          "Vers contrat",
          safeClub.target,
          ethers.parseEther("1"),
          7
        )
      ).to.be.revertedWith("SafeClub: adresse contrat");
    });
  });

  // ==================== SCÉNARIO 5: ATTAQUES DOS ====================
  
  describe("⚠️ SCÉNARIO 5: Protection contre les Attaques DOS", function () {
    
    it("ATTAQUE: Créer trop de propositions actives", async function () {
      const { safeClub, owner, recipient } = await loadFixture(deploySafeClubFixture);
      
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("100") });
      
      // Créer MAX_ACTIVE_PROPOSALS propositions
      for (let i = 0; i < 20; i++) {
        await safeClub.createProposal(
          `Proposition ${i}`,
          recipient.address,
          ethers.parseEther("0.1"),
          7
        );
      }
      
      // La 21ème devrait échouer
      await expect(
        safeClub.createProposal(
          "DOS Attack",
          recipient.address,
          ethers.parseEther("0.1"),
          7
        )
      ).to.be.revertedWith("SafeClub: trop de propositions actives");
    });
    
    it("ATTAQUE: Ajouter trop de membres", async function () {
      const { safeClub } = await loadFixture(deploySafeClubFixture);
      
      // Ajouter MAX_MEMBERS - 1 membres (owner déjà ajouté)
      for (let i = 0; i < 99; i++) {
        const wallet = ethers.Wallet.createRandom();
        await safeClub.addMember(wallet.address);
      }
      
      // Le 101ème devrait échouer
      const wallet = ethers.Wallet.createRandom();
      await expect(
        safeClub.addMember(wallet.address)
      ).to.be.revertedWith("SafeClub: limite atteinte");
    });
    
    it("ATTAQUE: Description trop longue", async function () {
      const { safeClub, owner, recipient } = await loadFixture(deploySafeClubFixture);
      
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      
      const longDescription = "A".repeat(501);
      
      await expect(
        safeClub.createProposal(
          longDescription,
          recipient.address,
          ethers.parseEther("1"),
          7
        )
      ).to.be.revertedWith("SafeClub: description trop longue");
    });
  });

  // ==================== SCÉNARIO 6: MÉCANISME DE PAUSE ====================
  
  describe("⏸️ SCÉNARIO 6: Mécanisme de Pause d'Urgence", function () {
    
    it("Owner peut mettre en pause le contrat", async function () {
      const { safeClub } = await loadFixture(deploySafeClubFixture);
      
      await expect(safeClub.pause())
        .to.emit(safeClub, "ContractPaused");
    });
    
    it("Les opérations sont bloquées quand en pause", async function () {
      const { safeClub, owner, member1 } = await loadFixture(deploySafeClubFixture);
      
      await safeClub.pause();
      
      // Ajouter membre devrait échouer
      await expect(
        safeClub.addMember(member1.address)
      ).to.be.revertedWithCustomError(safeClub, "EnforcedPause");
      
      // Recevoir des fonds devrait échouer
      await expect(
        owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(safeClub, "EnforcedPause");
    });
    
    it("Owner peut reprendre les opérations", async function () {
      const { safeClub, owner } = await loadFixture(deploySafeClubFixture);
      
      await safeClub.pause();
      
      await expect(safeClub.unpause())
        .to.emit(safeClub, "ContractUnpaused");
      
      // Les opérations devraient fonctionner
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("1") });
    });
    
    it("Seul l'owner peut mettre en pause", async function () {
      const { safeClub, member1 } = await loadFixture(deploySafeClubFixture);
      
      await safeClub.addMember(member1.address);
      
      await expect(
        safeClub.connect(member1).pause()
      ).to.be.revertedWithCustomError(safeClub, "OwnableUnauthorizedAccount");
    });
  });

  // ==================== SCÉNARIO 7: WORKFLOW COMPLET SÉCURISÉ ====================
  
  describe("✅ SCÉNARIO 7: Workflow Complet Sécurisé", function () {
    
    it("Scénario réussi: Création → Vote → Exécution", async function () {
      const { safeClub, owner, member1, member2, recipient } = await loadFixture(deploySafeClubFixture);
      
      console.log("\n🔹 ÉTAPE 1: Ajout des membres");
      await safeClub.addMember(member1.address);
      await safeClub.addMember(member2.address);
      expect(await safeClub.getMemberCount()).to.equal(3);
      
      console.log("🔹 ÉTAPE 2: Dépôt de fonds");
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      expect(await safeClub.getBalance()).to.equal(ethers.parseEther("10"));
      
      console.log("🔹 ÉTAPE 3: Création de proposition");
      await expect(
        safeClub.createProposal(
          "Achat équipement",
          recipient.address,
          ethers.parseEther("2"),
          1
        )
      ).to.emit(safeClub, "ProposalCreated");
      
      console.log("🔹 ÉTAPE 4: Votes des membres");
      await safeClub.vote(0, true);
      await safeClub.connect(member1).vote(0, true);
      await safeClub.connect(member2).vote(0, false);
      
      const proposalBefore = await safeClub.getProposal(0);
      expect(proposalBefore.votesFor).to.equal(2);
      expect(proposalBefore.votesAgainst).to.equal(1);
      
      console.log("🔹 ÉTAPE 5: Attente fin du vote");
      await time.increase(2 * 24 * 60 * 60);
      
      console.log("🔹 ÉTAPE 6: Vérification approbation");
      expect(await safeClub.isProposalApproved(0)).to.be.true;
      
      console.log("🔹 ÉTAPE 7: Exécution sécurisée");
      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
      
      await expect(safeClub.executeProposal(0))
        .to.emit(safeClub, "ProposalExecuted");
      
      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(ethers.parseEther("2"));
      
      console.log("✅ Workflow complet réussi avec toutes les protections!\n");
    });
  });
});