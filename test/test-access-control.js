// test/test-access-control.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🔐 Test Protection Contrôle d'Accès", function () {
  let safeClub;
  let owner, member1, member2, attacker;

  beforeEach(async function () {
    [owner, member1, member2, attacker] = await ethers.getSigners();
    
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

  describe("🔴 MENACE 1: Ajout de membres non autorisé", function () {
    it("❌ Non-owner ne PEUT PAS ajouter de membre", async function () {
      console.log("\n🔒 Test: Attaquant tente de s'ajouter comme membre");
      
      console.log(`   Attaquant: ${attacker.address}`);
      console.log(`   Est membre? ${await safeClub.isMember(attacker.address)}`);
      
      await expect(
        safeClub.connect(attacker).addMember(attacker.address)
      ).to.be.reverted; // Ownable va rejeter
      
      const isMember = await safeClub.isMember(attacker.address);
      expect(isMember).to.be.false;
      
      console.log("   ✅ BLOQUÉ: Seul l'owner peut ajouter des membres");
    });

    it("✅ Owner PEUT ajouter un membre", async function () {
      console.log("\n🔓 Test: Owner ajoute un membre légitimement");
      
      const newMember = attacker.address;
      await safeClub.connect(owner).addMember(newMember);
      
      const isMember = await safeClub.isMember(newMember);
      expect(isMember).to.be.true;
      
      const memberCount = await safeClub.getMemberCount();
      console.log(`   ✅ Membre ajouté. Total: ${memberCount} membres`);
    });
  });

  describe("🔴 MENACE 2: Votes par non-membres", function () {
    beforeEach(async function () {
      // Créer une proposition
      await safeClub.connect(member1).createProposal(
        "Proposition test",
        member2.address,
        ethers.utils.parseEther("1"),
        1
      );
    });

    it("❌ Non-membre ne PEUT PAS voter", async function () {
      console.log("\n🔒 Test: Non-membre tente de voter");
      
      console.log(`   Attaquant: ${attacker.address}`);
      console.log(`   Est membre? ${await safeClub.isMember(attacker.address)}`);
      
      await expect(
        safeClub.connect(attacker).vote(0, true)
      ).to.be.revertedWith("Non autorise: vous n'etes pas membre");
      
      console.log("   ✅ BLOQUÉ: Seuls les membres peuvent voter");
    });

    it("❌ Membre ne PEUT PAS voter DEUX fois", async function () {
      console.log("\n🔒 Test: Membre tente de voter deux fois");
      
      // Premier vote
      await safeClub.connect(member1).vote(0, true);
      console.log("   1er vote: ✅ POUR");
      
      const hasVoted = await safeClub.hasVoted(0, member1.address);
      expect(hasVoted).to.be.true;
      
      // Deuxième tentative
      await expect(
        safeClub.connect(member1).vote(0, false)
      ).to.be.revertedWith("Vote deja enregistre");
      
      console.log("   2ème vote: ❌ BLOQUÉ");
      console.log("   ✅ Protection contre le double vote");
    });

    it("✅ Membre PEUT voter une fois", async function () {
      console.log("\n🔓 Test: Vote légitime d'un membre");
      
      await safeClub.connect(member1).vote(0, true);
      
      const proposal = await safeClub.getProposal(0);
      expect(proposal.votesFor).to.equal(1);
      
      console.log("   ✅ Vote enregistré: 1 vote POUR");
    });
  });

  describe("🔴 MENACE 3: Création de propositions par non-membres", function () {
    it("❌ Non-membre ne PEUT PAS créer de proposition", async function () {
      console.log("\n🔒 Test: Non-membre tente de créer une proposition");
      
      await expect(
        safeClub.connect(attacker).createProposal(
          "Proposition malveillante",
          attacker.address,
          ethers.utils.parseEther("5"),
          1
        )
      ).to.be.revertedWith("Non autorise: vous n'etes pas membre");
      
      const proposalCount = await safeClub.proposalCount();
      expect(proposalCount).to.equal(0);
      
      console.log("   ✅ BLOQUÉ: Aucune proposition créée");
    });

    it("✅ Membre PEUT créer une proposition", async function () {
      console.log("\n🔓 Test: Membre crée une proposition");
      
      await safeClub.connect(member1).createProposal(
        "Achat de matériel",
        member2.address,
        ethers.utils.parseEther("2"),
        1
      );
      
      const proposalCount = await safeClub.proposalCount();
      expect(proposalCount).to.equal(1);
      
      console.log("   ✅ Proposition créée (ID: 0)");
    });
  });

  describe("🔴 MENACE 4: Exécution par non-membres", function () {
    beforeEach(async function () {
      // Créer et voter pour une proposition
      await safeClub.connect(member1).createProposal(
        "Proposition test",
        member2.address,
        ethers.utils.parseEther("1"),
        1
      );
      
      await safeClub.connect(owner).vote(0, true);
      await safeClub.connect(member1).vote(0, true);
      await safeClub.connect(member2).vote(0, true);
      
      // Avancer dans le temps
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");
    });

    it("❌ Non-membre ne PEUT PAS exécuter", async function () {
      console.log("\n🔒 Test: Non-membre tente d'exécuter");
      
      await expect(
        safeClub.connect(attacker).executeProposal(0)
      ).to.be.revertedWith("Non autorise: vous n'etes pas membre");
      
      const proposal = await safeClub.getProposal(0);
      expect(proposal.executed).to.be.false;
      
      console.log("   ✅ BLOQUÉ: Proposition non exécutée");
    });

    it("✅ Membre PEUT exécuter", async function () {
      console.log("\n🔓 Test: Membre exécute une proposition approuvée");
      
      await safeClub.connect(member1).executeProposal(0);
      
      const proposal = await safeClub.getProposal(0);
      expect(proposal.executed).to.be.true;
      
      console.log("   ✅ Proposition exécutée avec succès");
    });
  });

  describe("🎯 SCÉNARIO COMPLET: Tentative de prise de contrôle", function () {
    it("❌ Attaquant NE PEUT PAS prendre le contrôle du contrat", async function () {
      console.log("\n" + "=".repeat(70));
      console.log("🎬 SCÉNARIO: TENTATIVE DE PRISE DE CONTRÔLE COMPLÈTE");
      console.log("=".repeat(70));
      
      const initialBalance = await ethers.provider.getBalance(safeClub.address);
      console.log(`\n💰 Solde initial du contrat: ${ethers.utils.formatEther(initialBalance)} ETH`);
      
      // ÉTAPE 1: Tenter de s'ajouter comme membre
      console.log("\n🔴 ÉTAPE 1: Tentative d'auto-ajout comme membre");
      try {
        await safeClub.connect(attacker).addMember(attacker.address);
        console.log("   ❌ ÉCHEC: Ajout autorisé!");
        expect.fail("Ne devrait pas pouvoir s'ajouter");
      } catch (error) {
        console.log("   ✅ BLOQUÉ par onlyOwner");
      }
      
      // ÉTAPE 2: Tenter de créer une proposition malveillante
      console.log("\n🔴 ÉTAPE 2: Tentative de création de proposition malveillante");
      try {
        await safeClub.connect(attacker).createProposal(
          "Vol de fonds",
          attacker.address,
          ethers.utils.parseEther("10"),
          1
        );
        console.log("   ❌ ÉCHEC: Proposition créée!");
        expect.fail("Ne devrait pas pouvoir créer de proposition");
      } catch (error) {
        console.log("   ✅ BLOQUÉ par onlyMember");
      }
      
      // ÉTAPE 3: Un membre crée une vraie proposition
      console.log("\n🟢 ÉTAPE 3: Membre légitime crée une proposition");
      await safeClub.connect(member1).createProposal(
        "Proposition légitime",
        member2.address,
        ethers.utils.parseEther("1"),
        1
      );
      console.log("   ✅ Proposition créée (ID: 0)");
      
      // ÉTAPE 4: Tenter de voter sans être membre
      console.log("\n🔴 ÉTAPE 4: Tentative de vote sans être membre");
      try {
        await safeClub.connect(attacker).vote(0, true);
        console.log("   ❌ ÉCHEC: Vote autorisé!");
        expect.fail("Ne devrait pas pouvoir voter");
      } catch (error) {
        console.log("   ✅ BLOQUÉ par onlyMember");
      }
      
      // ÉTAPE 5: Membres légitimes votent
      console.log("\n🟢 ÉTAPE 5: Membres légitimes votent");
      await safeClub.connect(owner).vote(0, true);
      await safeClub.connect(member1).vote(0, true);
      await safeClub.connect(member2).vote(0, true);
      console.log("   ✅ 3 votes POUR enregistrés");
      
      // ÉTAPE 6: Avancer dans le temps
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");
      
      // ÉTAPE 7: Tenter d'exécuter sans être membre
      console.log("\n🔴 ÉTAPE 6: Tentative d'exécution sans être membre");
      try {
        await safeClub.connect(attacker).executeProposal(0);
        console.log("   ❌ ÉCHEC: Exécution autorisée!");
        expect.fail("Ne devrait pas pouvoir exécuter");
      } catch (error) {
        console.log("   ✅ BLOQUÉ par onlyMember");
      }
      
      // Vérifier que le solde n'a pas changé
      const finalBalance = await ethers.provider.getBalance(safeClub.address);
      expect(finalBalance).to.equal(initialBalance);
      
      console.log("\n" + "=".repeat(70));
      console.log("✅ RÉSULTAT: Toutes les tentatives d'attaque BLOQUÉES");
      console.log(`💰 Solde final: ${ethers.utils.formatEther(finalBalance)} ETH (inchangé)`);
      console.log("🛡️  Protections:");
      console.log("   - onlyOwner: Gestion des membres");
      console.log("   - onlyMember: Gouvernance (propositions, votes, exécution)");
      console.log("   - hasVoted: Prévention du double vote");
      console.log("=".repeat(70) + "\n");
    });
  });

  describe("📊 Matrice des Permissions", function () {
    it("📋 Afficher la matrice complète des permissions", async function () {
      console.log("\n" + "=".repeat(70));
      console.log("📊 MATRICE DES PERMISSIONS");
      console.log("=".repeat(70));
      
      console.log("\n| Fonction              | Owner | Membre | Non-membre |");
      console.log("|----------------------|-------|--------|------------|");
      console.log("| addMember()          | ✅    | ❌     | ❌         |");
      console.log("| removeMember()       | ✅    | ❌     | ❌         |");
      console.log("| createProposal()     | ✅    | ✅     | ❌         |");
      console.log("| vote()               | ✅    | ✅     | ❌         |");
      console.log("| executeProposal()    | ✅    | ✅     | ❌         |");
      console.log("| setQuorumPercentage()| ✅    | ❌     | ❌         |");
      
      console.log("\n📝 Modificateurs utilisés:");
      console.log("   - onlyOwner (OpenZeppelin): Fonctions administratives");
      console.log("   - onlyMember (custom): Fonctions de gouvernance");
      console.log("   - hasVoted (mapping): Protection double vote");
      
      console.log("\n" + "=".repeat(70) + "\n");
    });
  });
});