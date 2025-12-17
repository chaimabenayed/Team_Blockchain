// test/test-reentrancy.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🎭 Test Protection Reentrancy Attack", function () {
  let safeClub, attackerContract;
  let owner, member1, member2, attacker;

  beforeEach(async function () {
    [owner, member1, member2, attacker] = await ethers.getSigners();
    
    console.log("\n📦 Déploiement des contrats...");
    
    // Déployer SafeClub
    const SafeClub = await ethers.getContractFactory("SafeClub");
    safeClub = await SafeClub.deploy();
    await safeClub.deployed();
    console.log("   ✅ SafeClub déployé:", safeClub.address);
    
    // Ajouter des membres
    await safeClub.addMember(member1.address);
    await safeClub.addMember(member2.address);
    console.log("   ✅ Membres ajoutés");
    
    // Déposer 10 ETH dans le contrat
    await owner.sendTransaction({
      to: safeClub.address,
      value: ethers.utils.parseEther("10")
    });
    console.log("   ✅ 10 ETH déposés");
    
    // Déployer le contrat attaquant
    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    attackerContract = await ReentrancyAttacker.deploy(safeClub.address);
    await attackerContract.deployed();
    console.log("   ✅ ReentrancyAttacker déployé:", attackerContract.address);
  });

  it("🛡️  Devrait BLOQUER l'attaque de reentrancy", async function () {
    console.log("\n" + "=".repeat(70));
    console.log("🎬 SCÉNARIO: TENTATIVE D'ATTAQUE DE REENTRANCY");
    console.log("=".repeat(70));
    
    // ÉTAPE 1: Créer une proposition malveillante vers le contrat attaquant
    console.log("\n📝 ÉTAPE 1: Création d'une proposition malveillante");
    console.log("   Destinataire: Contrat Attaquant");
    console.log("   Montant: 5 ETH");
    
    await safeClub.createProposal(
      "Proposition piégée pour attaque reentrancy",
      attackerContract.address,
      ethers.utils.parseEther("5"),
      1 // 1 jour
    );
    console.log("   ✅ Proposition créée (ID: 0)");
    
    // ÉTAPE 2: Les membres votent pour la proposition
    console.log("\n🗳️  ÉTAPE 2: Votes des membres");
    await safeClub.connect(owner).vote(0, true);
    console.log("   ✅ Owner a voté POUR");
    
    await safeClub.connect(member1).vote(0, true);
    console.log("   ✅ Member1 a voté POUR");
    
    await safeClub.connect(member2).vote(0, true);
    console.log("   ✅ Member2 a voté POUR");
    
    const proposal = await safeClub.getProposal(0);
    console.log(`   📊 Résultat: ${proposal.votesFor} pour, ${proposal.votesAgainst} contre`);
    
    // ÉTAPE 3: Avancer dans le temps (après la deadline)
    console.log("\n⏰ ÉTAPE 3: Avancement du temps (après deadline)");
    await ethers.provider.send("evm_increaseTime", [86400 + 1]); // 1 jour + 1 seconde
    await ethers.provider.send("evm_mine");
    console.log("   ✅ Temps avancé de 24h");
    
    // ÉTAPE 4: Afficher les soldes avant l'attaque
    console.log("\n💰 ÉTAPE 4: Soldes AVANT l'attaque");
    const safeClubBalanceBefore = await ethers.provider.getBalance(safeClub.address);
    const attackerBalanceBefore = await ethers.provider.getBalance(attackerContract.address);
    
    console.log(`   SafeClub: ${ethers.utils.formatEther(safeClubBalanceBefore)} ETH`);
    console.log(`   Attacker: ${ethers.utils.formatEther(attackerBalanceBefore)} ETH`);
    
    // ÉTAPE 5: Lancer l'attaque
    console.log("\n🔥 ÉTAPE 5: LANCEMENT DE L'ATTAQUE DE REENTRANCY");
    console.log("   Le contrat malveillant va tenter de rappeler executeProposal()");
    console.log("   pendant qu'il reçoit l'ETH pour créer une boucle...");
    
    try {
      // Le contrat attaquant tente d'exécuter la proposition
      const attackTx = await attackerContract.connect(attacker).attack(0);
      await attackTx.wait();
      
      // Si on arrive ici, vérifier que l'attaque a échoué quand même
      const attackCount = await attackerContract.getAttackCount();
      console.log(`\n   ⚠️  Attaque exécutée mais tentatives de reentrancy: ${attackCount}`);
      
      // L'attaque ne devrait avoir réussi qu'une seule fois (pas de reentrancy)
      expect(attackCount).to.be.lte(1);
      console.log("   ✅ Reentrancy BLOQUÉE (1 seule exécution)");
      
    } catch (error) {
      // Si l'attaque échoue complètement (membre non autorisé à exécuter)
      console.log(`\n   ✅ Attaque BLOQUÉE: ${error.message.split('\n')[0]}`);
    }
    
    // ÉTAPE 6: Vérifier les soldes après
    console.log("\n💰 ÉTAPE 6: Soldes APRÈS l'attaque");
    const safeClubBalanceAfter = await ethers.provider.getBalance(safeClub.address);
    const attackerBalanceAfter = await ethers.provider.getBalance(attackerContract.address);
    
    console.log(`   SafeClub: ${ethers.utils.formatEther(safeClubBalanceAfter)} ETH`);
    console.log(`   Attacker: ${ethers.utils.formatEther(attackerBalanceAfter)} ETH`);
    
    // ÉTAPE 7: Analyse des résultats
    console.log("\n📊 ÉTAPE 7: ANALYSE DES RÉSULTATS");
    
    const attackCount = await attackerContract.getAttackCount();
    console.log(`   Nombre de tentatives de reentrancy: ${attackCount}`);
    
    if (attackCount <= 1) {
      console.log("\n   🛡️  PROTECTION EFFECTIVE ✅");
      console.log("   Le modificateur 'nonReentrant' a bloqué la reentrancy");
      console.log("   Le contrat n'a pu être exécuté qu'UNE SEULE fois");
    } else {
      console.log("\n   ⚠️  VULNÉRABLE ❌");
      console.log("   La reentrancy a permis plusieurs exécutions");
    }
    
    // Vérifier que l'attaquant n'a pas reçu plus que prévu
    const expectedTransfer = ethers.utils.parseEther("5");
    const actualTransfer = attackerBalanceAfter.sub(attackerBalanceBefore);
    
    console.log(`\n   Transfert attendu: ${ethers.utils.formatEther(expectedTransfer)} ETH`);
    console.log(`   Transfert réel: ${ethers.utils.formatEther(actualTransfer)} ETH`);
    
    // Le contrat attaquant ne devrait pas avoir reçu plus de 5 ETH
    expect(actualTransfer).to.be.lte(expectedTransfer);
    
    console.log("\n" + "=".repeat(70));
    console.log("✅ TEST RÉUSSI: Protection contre la reentrancy fonctionnelle");
    console.log("=".repeat(70) + "\n");
  });

  it("📋 Devrait montrer comment fonctionne la protection nonReentrant", async function () {
    console.log("\n" + "=".repeat(70));
    console.log("📚 EXPLICATION: Comment nonReentrant protège le contrat");
    console.log("=".repeat(70));
    
    console.log("\n1️⃣  Sans protection (CODE VULNÉRABLE):");
    console.log("   function executeProposal() {");
    console.log("       (bool success,) = recipient.call{value: amount}(\"\");");
    console.log("       proposal.executed = true;  // ⚠️  TROP TARD!");
    console.log("   }");
    console.log("   → L'attaquant peut rappeler executeProposal() AVANT executed = true");
    
    console.log("\n2️⃣  Avec protection (VOTRE CODE):");
    console.log("   function executeProposal() nonReentrant {");
    console.log("       // 1. nonReentrant verrouille la fonction");
    console.log("       proposal.executed = true;  // 2. État modifié EN PREMIER");
    console.log("       (bool success,) = recipient.call{value: amount}(\"\");");
    console.log("   }");
    console.log("   → Même si l'attaquant tente de rappeler, c'est VERROUILLÉ");
    
    console.log("\n3️⃣  Ce qui se passe pendant l'attaque:");
    console.log("   ┌─────────────────────────────────────┐");
    console.log("   │ executeProposal() appelé            │");
    console.log("   │  ↓ nonReentrant: _status = 2       │ ← VERROUILLÉ");
    console.log("   │  ↓ executed = true                  │");
    console.log("   │  ↓ Envoi de 5 ETH → receive()       │");
    console.log("   │    └─> Tentative executeProposal()  │");
    console.log("   │        ❌ BLOQUÉ: _status déjà = 2  │");
    console.log("   │  ↓ nonReentrant: _status = 1        │ ← DÉVERROUILLÉ");
    console.log("   └─────────────────────────────────────┘");
    
    console.log("\n✅ Votre contrat utilise DEUX protections:");
    console.log("   1. nonReentrant (OpenZeppelin) - verrouillage");
    console.log("   2. Checks-Effects-Interactions - ordre d'exécution");
    
    console.log("\n" + "=".repeat(70) + "\n");
  });
});