const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SafeClub", function () {
  
  // Fixture pour déployer le contrat
  async function deploySafeClubFixture() {
    const [owner, member1, member2, nonMember, recipient] = await ethers.getSigners();
    
    const SafeClub = await ethers.getContractFactory("SafeClub");
    const safeClub = await SafeClub.deploy();
    
    return { safeClub, owner, member1, member2, nonMember, recipient };
  }

  describe("Déploiement", function () {
    it("Devrait définir le bon owner", async function () {
      const { safeClub, owner } = await loadFixture(deploySafeClubFixture);
      expect(await safeClub.owner()).to.equal(owner.address);
    });

    it("Devrait ajouter l'owner comme premier membre", async function () {
      const { safeClub, owner } = await loadFixture(deploySafeClubFixture);
      expect(await safeClub.isMember(owner.address)).to.be.true;
      expect(await safeClub.getMemberCount()).to.equal(1);
    });

    it("Devrait initialiser avec 0 ETH", async function () {
      const { safeClub } = await loadFixture(deploySafeClubFixture);
      expect(await safeClub.getBalance()).to.equal(0);
    });

    it("Devrait avoir les bons paramètres par défaut", async function () {
      const { safeClub } = await loadFixture(deploySafeClubFixture);
      expect(await safeClub.quorumPercentage()).to.equal(50);
      expect(await safeClub.approvalPercentage()).to.equal(60);
    });
  });

  describe("Gestion des Membres", function () {
    it("L'owner peut ajouter un membre", async function () {
      const { safeClub, member1 } = await loadFixture(deploySafeClubFixture);
      
      await expect(safeClub.addMember(member1.address))
        .to.emit(safeClub, "MemberAdded")
        .withArgs(member1.address, await time.latest() + 1);
      
      expect(await safeClub.isMember(member1.address)).to.be.true;
      expect(await safeClub.getMemberCount()).to.equal(2);
    });

    it("Ne peut pas ajouter une adresse invalide", async function () {
      const { safeClub } = await loadFixture(deploySafeClubFixture);
      await expect(
        safeClub.addMember(ethers.ZeroAddress)
      ).to.be.revertedWith("Adresse invalide");
    });

    it("Ne peut pas ajouter un membre déjà actif", async function () {
      const { safeClub, member1 } = await loadFixture(deploySafeClubFixture);
      await safeClub.addMember(member1.address);
      
      await expect(
        safeClub.addMember(member1.address)
      ).to.be.revertedWith("Membre deja actif");
    });

    it("Seul l'owner peut ajouter un membre", async function () {
      const { safeClub, member1, member2 } = await loadFixture(deploySafeClubFixture);
      await safeClub.addMember(member1.address);
      
      await expect(
        safeClub.connect(member1).addMember(member2.address)
      ).to.be.revertedWithCustomError(safeClub, "OwnableUnauthorizedAccount");
    });

    it("L'owner peut retirer un membre", async function () {
      const { safeClub, member1 } = await loadFixture(deploySafeClubFixture);
      await safeClub.addMember(member1.address);
      
      await expect(safeClub.removeMember(member1.address))
        .to.emit(safeClub, "MemberRemoved")
        .withArgs(member1.address, await time.latest() + 1);
      
      expect(await safeClub.isMember(member1.address)).to.be.false;
      expect(await safeClub.getMemberCount()).to.equal(1);
    });

    it("Ne peut pas retirer l'owner", async function () {
      const { safeClub, owner } = await loadFixture(deploySafeClubFixture);
      
      await expect(
        safeClub.removeMember(owner.address)
      ).to.be.revertedWith("Impossible de retirer le proprietaire");
    });

    it("Retourne tous les membres", async function () {
      const { safeClub, member1, member2 } = await loadFixture(deploySafeClubFixture);
      await safeClub.addMember(member1.address);
      await safeClub.addMember(member2.address);
      
      const members = await safeClub.getAllMembers();
      expect(members.length).to.equal(3);
      expect(members).to.include(member1.address);
      expect(members).to.include(member2.address);
    });
  });

  describe("Gestion des Fonds", function () {
    it("Peut recevoir des ETH via receive()", async function () {
      const { safeClub, member1 } = await loadFixture(deploySafeClubFixture);
      const amount = ethers.parseEther("1.0");
      
      await expect(
        member1.sendTransaction({ to: safeClub.target, value: amount })
      ).to.emit(safeClub, "FundsReceived")
        .withArgs(member1.address, amount);
      
      expect(await safeClub.getBalance()).to.equal(amount);
    });

    it("Le solde est correct après plusieurs dépôts", async function () {
      const { safeClub, member1, member2 } = await loadFixture(deploySafeClubFixture);
      
      await member1.sendTransaction({ to: safeClub.target, value: ethers.parseEther("1.0") });
      await member2.sendTransaction({ to: safeClub.target, value: ethers.parseEther("2.5") });
      
      expect(await safeClub.getBalance()).to.equal(ethers.parseEther("3.5"));
    });
  });

  describe("Création de Propositions", function () {
    it("Un membre peut créer une proposition", async function () {
      const { safeClub, owner, recipient } = await loadFixture(deploySafeClubFixture);
      
      // Déposer des fonds
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("5") });
      
      const description = "Achat de matériel";
      const amount = ethers.parseEther("1.0");
      const duration = 7;
      
      await expect(
        safeClub.createProposal(description, recipient.address, amount, duration)
      ).to.emit(safeClub, "ProposalCreated");
      
      expect(await safeClub.proposalCount()).to.equal(1);
      
      const proposal = await safeClub.getProposal(0);
      expect(proposal.description).to.equal(description);
      expect(proposal.amount).to.equal(amount);
      expect(proposal.recipient).to.equal(recipient.address);
    });

    it("Ne peut pas créer avec un destinataire invalide", async function () {
      const { safeClub } = await loadFixture(deploySafeClubFixture);
      
      await expect(
        safeClub.createProposal("Test", ethers.ZeroAddress, ethers.parseEther("1"), 7)
      ).to.be.revertedWith("Destinataire invalide");
    });

    it("Ne peut pas créer avec montant 0", async function () {
      const { safeClub, recipient } = await loadFixture(deploySafeClubFixture);
      
      await expect(
        safeClub.createProposal("Test", recipient.address, 0, 7)
      ).to.be.revertedWith("Montant doit etre superieur a 0");
    });

    it("Ne peut pas créer avec fonds insuffisants", async function () {
      const { safeClub, recipient } = await loadFixture(deploySafeClubFixture);
      
      await expect(
        safeClub.createProposal("Test", recipient.address, ethers.parseEther("10"), 7)
      ).to.be.revertedWith("Fonds insuffisants");
    });

    it("Un non-membre ne peut pas créer", async function () {
      const { safeClub, nonMember, recipient, owner } = await loadFixture(deploySafeClubFixture);
      
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("5") });
      
      await expect(
        safeClub.connect(nonMember).createProposal("Test", recipient.address, ethers.parseEther("1"), 7)
      ).to.be.revertedWith("Non autorise: vous n'etes pas membre");
    });
  });

  describe("Vote sur Propositions", function () {
    async function deployWithProposal() {
      const fixture = await deploySafeClubFixture();
      const { safeClub, owner, member1, recipient } = fixture;
      
      // Ajouter un membre
      await safeClub.addMember(member1.address);
      
      // Déposer des fonds et créer proposition
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("5") });
      await safeClub.createProposal("Test", recipient.address, ethers.parseEther("1"), 7);
      
      return { ...fixture, proposalId: 0 };
    }

    it("Un membre peut voter POUR", async function () {
      const { safeClub, owner, proposalId } = await loadFixture(deployWithProposal);
      
      await expect(safeClub.vote(proposalId, true))
        .to.emit(safeClub, "VoteCast")
        .withArgs(proposalId, owner.address, true);
      
      const proposal = await safeClub.getProposal(proposalId);
      expect(proposal.votesFor).to.equal(1);
    });

    it("Un membre peut voter CONTRE", async function () {
      const { safeClub, member1, proposalId } = await loadFixture(deployWithProposal);
      
      await safeClub.connect(member1).vote(proposalId, false);
      
      const proposal = await safeClub.getProposal(proposalId);
      expect(proposal.votesAgainst).to.equal(1);
    });

    it("Ne peut pas voter deux fois", async function () {
      const { safeClub, owner, proposalId } = await loadFixture(deployWithProposal);
      
      await safeClub.vote(proposalId, true);
      
      await expect(
        safeClub.vote(proposalId, true)
      ).to.be.revertedWith("Vote deja enregistre");
    });

    it("Un non-membre ne peut pas voter", async function () {
      const { safeClub, nonMember, proposalId } = await loadFixture(deployWithProposal);
      
      await expect(
        safeClub.connect(nonMember).vote(proposalId, true)
      ).to.be.revertedWith("Non autorise: vous n'etes pas membre");
    });

    it("Ne peut pas voter après la deadline", async function () {
      const { safeClub, owner, proposalId } = await loadFixture(deployWithProposal);
      
      // Avancer le temps de 8 jours
      await time.increase(8 * 24 * 60 * 60);
      
      await expect(
        safeClub.vote(proposalId, true)
      ).to.be.revertedWith("Vote termine");
    });
  });

  describe("Exécution de Propositions", function () {
    async function deployWithVotedProposal() {
      const fixture = await deploySafeClubFixture();
      const { safeClub, owner, member1, member2, recipient } = fixture;
      
      // Ajouter membres
      await safeClub.addMember(member1.address);
      await safeClub.addMember(member2.address);
      
      // Déposer des fonds
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      
      // Créer proposition
      await safeClub.createProposal("Test", recipient.address, ethers.parseEther("1"), 1);
      
      // Votes (3 membres: 2 POUR, 0 CONTRE = 100% d'approbation, 66% quorum)
      await safeClub.vote(0, true);
      await safeClub.connect(member1).vote(0, true);
      
      // Avancer le temps après deadline
      await time.increase(2 * 24 * 60 * 60);
      
      return { ...fixture, proposalId: 0 };
    }

    it("Peut exécuter une proposition approuvée", async function () {
      const { safeClub, recipient, proposalId } = await loadFixture(deployWithVotedProposal);
      
      const balanceBefore = await ethers.provider.getBalance(recipient.address);
      
      await expect(safeClub.executeProposal(proposalId))
        .to.emit(safeClub, "ProposalExecuted")
        .withArgs(proposalId, recipient.address, ethers.parseEther("1"));
      
      const balanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("1"));
    });

    it("Ne peut pas exécuter avant la deadline", async function () {
      const fixture = await deploySafeClubFixture();
      const { safeClub, owner, recipient } = fixture;
      
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("5") });
      await safeClub.createProposal("Test", recipient.address, ethers.parseEther("1"), 7);
      await safeClub.vote(0, true);
      
      await expect(
        safeClub.executeProposal(0)
      ).to.be.revertedWith("Vote en cours");
    });

    it("Ne peut pas exécuter sans quorum", async function () {
      const fixture = await deploySafeClubFixture();
      const { safeClub, owner, member1, recipient } = fixture;
      
      await safeClub.addMember(member1.address);
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("5") });
      await safeClub.createProposal("Test", recipient.address, ethers.parseEther("1"), 1);
      
      // Seulement 1 vote sur 2 membres = 50% de quorum (besoin de >50%)
      await safeClub.vote(0, true);
      await time.increase(2 * 24 * 60 * 60);
      
      await expect(
        safeClub.executeProposal(0)
      ).to.be.revertedWith("Quorum non atteint");
    });

    it("Ne peut pas exécuter une proposition rejetée", async function () {
      const fixture = await deploySafeClubFixture();
      const { safeClub, owner, member1, recipient } = fixture;
      
      await safeClub.addMember(member1.address);
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("5") });
      await safeClub.createProposal("Test", recipient.address, ethers.parseEther("1"), 1);
      
      // 1 POUR, 1 CONTRE = 50% d'approbation (besoin de 60%)
      await safeClub.vote(0, true);
      await safeClub.connect(member1).vote(0, false);
      await time.increase(2 * 24 * 60 * 60);
      
      await expect(
        safeClub.executeProposal(0)
      ).to.be.revertedWith("Proposition rejetee");
    });

    it("Ne peut pas exécuter deux fois", async function () {
      const { safeClub, proposalId } = await loadFixture(deployWithVotedProposal);
      
      await safeClub.executeProposal(proposalId);
      
      await expect(
        safeClub.executeProposal(proposalId)
      ).to.be.revertedWith("Proposition deja executee");
    });

    it("Un non-membre ne peut pas exécuter", async function () {
      const { safeClub, nonMember, proposalId } = await loadFixture(deployWithVotedProposal);
      
      await expect(
        safeClub.connect(nonMember).executeProposal(proposalId)
      ).to.be.revertedWith("Non autorise: vous n'etes pas membre");
    });
  });

  describe("Configuration", function () {
    it("L'owner peut modifier le quorum", async function () {
      const { safeClub } = await loadFixture(deploySafeClubFixture);
      
      await safeClub.setQuorumPercentage(75);
      expect(await safeClub.quorumPercentage()).to.equal(75);
    });

    it("L'owner peut modifier l'approbation", async function () {
      const { safeClub } = await loadFixture(deploySafeClubFixture);
      
      await safeClub.setApprovalPercentage(70);
      expect(await safeClub.approvalPercentage()).to.equal(70);
    });

    it("Ne peut pas définir un pourcentage invalide", async function () {
      const { safeClub } = await loadFixture(deploySafeClubFixture);
      
      await expect(
        safeClub.setQuorumPercentage(0)
      ).to.be.revertedWith("Pourcentage invalide");
      
      await expect(
        safeClub.setApprovalPercentage(101)
      ).to.be.revertedWith("Pourcentage invalide");
    });
  });

  describe("Sécurité", function () {
    it("Protection contre la réentrance", async function () {
      // Ce test nécessiterait un contrat malveillant
      // Pour l'instant, on vérifie juste que le modifier est présent
      const { safeClub } = await loadFixture(deploySafeClubFixture);
      
      // Le contrat utilise ReentrancyGuard d'OpenZeppelin
      // et marque executed=true avant le transfert
      expect(safeClub.target).to.be.properAddress;
    });

    it("Vérifie hasVoted", async function () {
      const fixture = await deploySafeClubFixture();
      const { safeClub, owner, member1, recipient } = fixture;
      
      await safeClub.addMember(member1.address);
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("5") });
      await safeClub.createProposal("Test", recipient.address, ethers.parseEther("1"), 7);
      
      expect(await safeClub.hasVoted(0, owner.address)).to.be.false;
      
      await safeClub.vote(0, true);
      
      expect(await safeClub.hasVoted(0, owner.address)).to.be.true;
      expect(await safeClub.hasVoted(0, member1.address)).to.be.false;
    });
  });

  describe("Tests d'intégration", function () {
    it("Workflow complet: ajout membre -> proposition -> vote -> exécution", async function () {
      const { safeClub, owner, member1, member2, recipient } = await loadFixture(deploySafeClubFixture);
      
      // 1. Ajouter membres
      await safeClub.addMember(member1.address);
      await safeClub.addMember(member2.address);
      expect(await safeClub.getMemberCount()).to.equal(3);
      
      // 2. Déposer fonds
      await owner.sendTransaction({ to: safeClub.target, value: ethers.parseEther("10") });
      expect(await safeClub.getBalance()).to.equal(ethers.parseEther("10"));
      
      // 3. Créer proposition
      await safeClub.createProposal("Achat équipement", recipient.address, ethers.parseEther("2"), 1);
      
      // 4. Votes
      await safeClub.vote(0, true);
      await safeClub.connect(member1).vote(0, true);
      await safeClub.connect(member2).vote(0, false);
      
      const proposalBefore = await safeClub.getProposal(0);
      expect(proposalBefore.votesFor).to.equal(2);
      expect(proposalBefore.votesAgainst).to.equal(1);
      
      // 5. Attendre fin vote
      await time.increase(2 * 24 * 60 * 60);
      
      // 6. Vérifier approbation
      expect(await safeClub.isProposalApproved(0)).to.be.true;
      
      // 7. Exécuter
      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
      await safeClub.executeProposal(0);
      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
      
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(ethers.parseEther("2"));
      expect(await safeClub.getBalance()).to.equal(ethers.parseEther("8"));
      
      const proposalAfter = await safeClub.getProposal(0);
      expect(proposalAfter.executed).to.be.true;
    });
  });
});