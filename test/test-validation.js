// test/test-validation.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("⚖️ Test Protection Validation des Montants et États", function () {
  let safeClub;
  let owner, member1, member2, recipient;

  beforeEach(async function () {
    [owner, member1, member2, recipient] = await ethers.getSigners();
    
    // Déployer SafeClub
    const SafeClub = await ethers.getContractFactory("SafeClub");
    safeClub = await SafeClub.deploy();
    await safeClub.deployed();
    
    // Ajouter des membres
    await safeClub.addMember(member1.address);
    await safeClub.addMember(member2.address);
    
    // Déposer 10 ETH
    await owner.sendTransaction({
      to: safeClub.address,
      value: ethers.utils.parseEther("10")
    });
  });

  describe("🔴 MENACE 1: Double Exécution", function () {
    it("❌ Ne PEUT PAS exécuter une proposition deux fois", async function () {
      console.log("\n🔒 Test: Tentative de double exécution");
      
      // Créer une proposition
      await safeClub.connect(member1).createProposal(
        "Test double execution",
        recipient.address,
        ethers.utils.parseEther("1"),
        1
      );
      
      // Voter
      await safeClub.connect(owner).vote(0, true);
      await safeClub.connect(member1).vote(0, true);
      await safeClub.connect(member2).vote(0, true);
      
      // Avancer dans le temps
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");
      
      // Première exécution
      const balanceBefore = await ethers.provider.getBalance(recipient.address);
      await safeClub.connect(member1).executeProposal(0);
      const balanceAfter = await ethers.provider.getBalance(recipient.address);
      
      const transferred = balanceAfter.sub(balanceBefore);
      console.log(`   1ère exécution: ✅ ${ethers.utils.formatEther(transferred)} ETH transférés`);
      
      // Vérifier que la proposition est marquée comme exécutée
      let proposal = await safeClub.getProposal(0);
      expect(proposal.executed).to.be.true;
      
      // Tentative de seconde exécution
      await expect(
        safeClub.connect(member1).executeProposal(0)
      ).to.be.revertedWith("Proposition deja executee");
      
      console.log("   2ème exécution: ❌ BLOQUÉE par notExecuted modifier");
      console.log("   ✅ Protection effective contre la double exécution");
    });
  });

  describe("🔴 MENACE 2: Fonds Insuffisants", function () {
    it("❌ Ne PEUT PAS créer proposition avec montant > solde", async function () {
      console.log("\n🔒 Test: Création avec montant trop élevé");
      
      const balance = await safeClub.getBalance();
      const tooMuch = balance.add(ethers.utils.parseEther("1"));
      
      console.log(`   Solde contrat: ${ethers.utils.formatEther(balance)} ETH`);
      console.log(`   Montant demandé: ${ethers.utils.formatEther(tooMuch)} ETH`);
      
      await expect(
        safeClub.connect(member1).createProposal(
          "Montant trop élevé",
          recipient.address,
          tooMuch,
          1
        )
      ).to.be.revertedWith("Fonds insuffisants");
      
      console.log("   ✅ BLOQUÉ: Vérification à la création");
    });

    it("❌ Ne PEUT PAS exécuter si le solde a diminué", async function () {
      console.log("\n🔒 Test: Exécution après diminution du solde");
      
      // Créer deux propositions de 6 ETH chacune
      await safeClub.connect(member1).createProposal(
        "Proposition 1",
        recipient.address,
        ethers.utils.parseEther("6"),
        1
      );
      
      await safeClub.connect(member1).createProposal(
        "Proposition 2",
        recipient.address,
        ethers.utils.parseEther("6"),
        1
      );
      
      console.log("   ✅ 2 propositions créées (6 ETH chacune)");
      console.log("   💰 Solde: 10 ETH");
      
      // Voter pour les deux
      await safeClub.connect(owner).vote(0, true);
      await safeClub.connect(member1).vote(0, true);
      await safeClub.connect(member2).vote(0, true);
      
      await safeClub.connect(owner).vote(1, true);
      await safeClub.connect(member1).vote(1, true);
      await safeClub.connect(member2).vote(1, true);
      
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");
      
      // Exécuter la première (6 ETH sortent)
      await safeClub.connect(member1).executeProposal(0);
      console.log("   ✅ Proposition 1 exécutée (6 ETH sortis)");
      
      const balanceAfter = await safeClub.getBalance();
      console.log(`   💰 Solde restant: ${ethers.utils.formatEther(balanceAfter)} ETH`);
      
      // Tenter d'exécuter la seconde (besoin de 6 ETH mais seulement 4 restent)
      await expect(
        safeClub.connect(member1).executeProposal(1)
      ).to.be.revertedWith("Fonds insuffisants");
      
      console.log("   ✅ BLOQUÉ: Double vérification à l'exécution");
    });
  });

  describe("🔴 MENACE 3: Manipulation de Deadline", function () {
    it("❌ Ne PEUT PAS voter après la deadline", async function () {
      console.log("\n🔒 Test: Vote après expiration de la deadline");
      
      await safeClub.connect(member1).createProposal(
        "Test deadline vote",
        recipient.address,
        ethers.utils.parseEther("1"),
        1 // 1 jour
      );
      
      const proposal = await safeClub.getProposal(0);
      const deadline = new Date(proposal.deadline.toNumber() * 1000);
      console.log(`   Deadline: ${deadline.toLocaleString()}`);
      
      // Avancer au-delà de la deadline
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");
      
      console.log("   ⏰ Temps avancé de 24h (après deadline)");
      
      await expect(
        safeClub.connect(member1).vote(0, true)
      ).to.be.revertedWith("Vote termine");
      
      console.log("   ✅ BLOQUÉ: Vote impossible après deadline");
    });

    it("❌ Ne PEUT PAS exécuter AVANT la deadline", async function () {
      console.log("\n🔒 Test: Exécution avant expiration de la deadline");
      
      await safeClub.connect(member1).createProposal(
        "Test execution prematuree",
        recipient.address,
        ethers.utils.parseEther("1"),
        1
      );
      
      // Voter immédiatement
      await safeClub.connect(owner).vote(0, true);
      await safeClub.connect(member1).vote(0, true);
      await safeClub.connect(member2).vote(0, true);
      
      console.log("   ✅ Votes enregistrés (3/3)");
      console.log("   ⏰ Tentative d'exécution IMMÉDIATE");
      
      // Tenter d'exécuter AVANT la deadline
      await expect(
        safeClub.connect(member1).executeProposal(0)
      ).to.be.revertedWith("Vote en cours");
      
      console.log("   ✅ BLOQUÉ: Exécution impossible avant deadline");
    });
  });

  describe("🔴 MENACE 4: Quorum et Approbation insuffisants", function () {
    it("❌ Ne PEUT PAS exécuter sans quorum (50%)", async function () {
      console.log("\n🔒 Test: Exécution sans quorum");
      
      await safeClub.connect(member1).createProposal(
        "Test quorum",
        recipient.address,
        ethers.utils.parseEther("1"),
        1
      );
      
      // Seulement 1 vote sur 3 membres = 33% < 50%
      await safeClub.connect(member1).vote(0, true);
      
      const memberCount = await safeClub.getMemberCount();
      const quorum = await safeClub.quorumPercentage();
      
      console.log(`   Membres: ${memberCount}`);
      console.log(`   Votes: 1 (33%)`);
      console.log(`   Quorum requis: ${quorum}%`);
      
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");
      
      await expect(
        safeClub.connect(member1).executeProposal(0)
      ).to.be.revertedWith("Quorum non atteint");
      
      console.log("   ✅ BLOQUÉ: Quorum non atteint");
    });

    it("❌ Ne PEUT PAS exécuter sans approbation (60%)", async function () {
      console.log("\n🔒 Test: Exécution sans approbation suffisante");
      
      await safeClub.connect(member1).createProposal(
        "Test approbation",
        recipient.address,
        ethers.utils.parseEther("1"),
        1
      );
      
      // 3 votes: 1 pour, 2 contre = 33% d'approbation < 60%
      await safeClub.connect(owner).vote(0, true);
      await safeClub.connect(member1).vote(0, false);
      await safeClub.connect(member2).vote(0, false);
      
      const proposal = await safeClub.getProposal(0);
      const approval = await safeClub.approvalPercentage();
      
      console.log(`   Votes: ${proposal.votesFor} pour, ${proposal.votesAgainst} contre`);
      console.log(`   Approbation: ${proposal.votesFor}/3 = 33%`);
      console.log(`   Approbation requise: ${approval}%`);
      
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");
      
      await expect(
        safeClub.connect(member1).executeProposal(0)
      ).to.be.revertedWith("Proposition rejetee");
      
      console.log("   ✅ BLOQUÉ: Approbation insuffisante");
    });

    it("✅ PEUT exécuter avec quorum ET approbation", async function () {
      console.log("\n🔓 Test: Exécution valide");
      
      await safeClub.connect(member1).createProposal(
        "Proposition valide",
        recipient.address,
        ethers.utils.parseEther("1"),
        1
      );
      
      // 3 votes: 2 pour, 1 contre = 67% d'approbation > 60%
      await safeClub.connect(owner).vote(0, true);
      await safeClub.connect(member1).vote(0, true);
      await safeClub.connect(member2).vote(0, false);
      
      const proposal = await safeClub.getProposal(0);
      const totalVotes = proposal.votesFor.add(proposal.votesAgainst);
      const approvalPercent = proposal.votesFor.mul(100).div(totalVotes);
      
      console.log(`   Votes: ${proposal.votesFor} pour, ${proposal.votesAgainst} contre`);
      console.log(`   Quorum: ${totalVotes}/3 = 100% ✅`);
      console.log(`   Approbation: ${approvalPercent}% ✅ (>60%)`);
      
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");
      
      const balanceBefore = await ethers.provider.getBalance(recipient.address);
      await safeClub.connect(member1).executeProposal(0);
      const balanceAfter = await ethers.provider.getBalance(recipient.address);
      
      const received = balanceAfter.sub(balanceBefore);
      expect(received).to.equal(ethers.utils.parseEther("1"));
      
      console.log(`   ✅ Exécution réussie: ${ethers.utils.formatEther(received)} ETH transférés`);
    });
  });

  describe("🔴 MENACE 5: Validation des Inputs", function () {
    it("❌ Adresse destinataire invalide (0x0)", async function () {
      console.log("\n🔒 Test: Adresse invalide");
      
      await expect(
        safeClub.connect(member1).createProposal(
          "Test adresse",
          ethers.constants.AddressZero,
          ethers.utils.parseEther("1"),
          1
        )
      ).to.be.revertedWith("Destinataire invalide");
      
      console.log("   ✅ BLOQUÉ: Adresse 0x0 rejetée");
    });

    it("❌ Montant zéro", async function () {
      console.log("\n🔒 Test: Montant zéro");
      
      await expect(
        safeClub.connect(member1).createProposal(
          "Test montant",
          recipient.address,
          0,
          1
        )
      ).to.be.revertedWith("Montant doit etre superieur a 0");
      
      console.log("   ✅ BLOQUÉ: Montant zéro rejeté");
    });

    it("❌ Durée invalide (0 jours)", async function () {
      console.log("\n🔒 Test: Durée invalide");
      
      await expect(
        safeClub.connect(member1).createProposal(
          "Test duree",
          recipient.address,
          ethers.utils.parseEther("1"),
          0
        )
      ).to.be.revertedWith("Duree invalide");
      
      console.log("   ✅ BLOQUÉ: Durée zéro rejetée");
    });

    it("❌ Description vide", async function () {
      console.log("\n🔒 Test: Description vide");
      
      await expect(
        safeClub.connect(member1).createProposal(
          "",
          recipient.address,
          ethers.utils.parseEther("1"),
          1
        )
      ).to.be.revertedWith("Description requise");
      
      console.log("   ✅ BLOQUÉ: Description vide rejetée");
    });
  });

  describe("📊 Résumé des Validations", function () {
    it("📋 Afficher toutes les validations implémentées", async function () {
      console.log("\n" + "=".repeat(70));
      console.log("📊 RÉSUMÉ DES VALIDATIONS");
      console.log("=".repeat(70));
      
      console.log("\n🛡️  Validations d'État:");
      console.log("   ✅ notExecuted modifier      → Empêche double exécution");
      console.log("   ✅ proposalExists modifier   → Vérifie existence proposition");
      console.log("   ✅ hasVoted mapping          → Empêche double vote");
      
      console.log("\n💰 Validations de Montants:");
      console.log("   ✅ À la création             → amount <= balance");
      console.log("   ✅ À l'exécution             → balance >= amount");
      console.log("   ✅ Montant > 0               → Pas de proposition à 0");
      
      console.log("\n⏰ Validations Temporelles:");
      console.log("   ✅ Vote                      → timestamp <= deadline");
      console.log("   ✅ Exécution                 → timestamp > deadline");
      console.log("   ✅ Durée > 0                 → Pas de deadline instantanée");
      
      console.log("\n🗳️  Validations de Gouvernance:");
      console.log("   ✅ Quorum (50%)              → Minimum de participation");
      console.log("   ✅ Approbation (60%)         → Majorité qualifiée");
      
      console.log("\n📝 Validations d'Inputs:");
      console.log("   ✅ recipient != 0x0          → Adresse valide");
      console.log("   ✅ amount > 0                → Montant positif");
      console.log("   ✅ duration > 0              → Durée positive");
      console.log("   ✅ description.length > 0    → Description requise");
      
      console.log("\n" + "=".repeat(70) + "\n");
    });
  });
});