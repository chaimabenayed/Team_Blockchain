const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n ========== DÉPLOIEMENT SAFECLUB ==========\n");

  try {
    // Obtenir le déployeur
    const [deployer] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    
    console.log(" Réseau:", hre.network.name);
    console.log(" Déployeur:", deployer.address);
    console.log(" Solde:", hre.ethers.formatEther(balance), "ETH\n");

    // Vérifier qu'on a assez de fonds
    const balanceInEth = parseFloat(hre.ethers.formatEther(balance));
    if (hre.network.name === "sepolia" && balanceInEth < 0.01) {
      throw new Error("❌ Fonds insuffisants pour déployer sur Sepolia. Minimum: 0.01 ETH. Actuel: " + balanceInEth + " ETH");
    }

    // Compiler d'abord si nécessaire
    console.log(" 📦 Compilation du contrat...");
    try {
      const artifact = require("../artifacts/contracts/SafeClub.sol/SafeClub.json");
      console.log(" ✅ Contrat compilé\n");
    } catch (e) {
      console.log(" Compilation en cours...");
      await hre.run('compile');
      console.log(" ✅ Contrat compilé\n");
    }

    // Déployer le contrat
    console.log(" 🚀 Déploiement en cours...");
    const SafeClub = await hre.ethers.getContractFactory("SafeClub");
    const safeClub = await SafeClub.deploy();
    
    console.log(" ⏳ Transaction envoyée. Hash:", safeClub.deploymentTransaction()?.hash);
    console.log(" ⏳ En attente de la confirmation...");
    
    const receipt = await safeClub.waitForDeployment();
    const contractAddress = await safeClub.getAddress();
    
    console.log(" ✅ SafeClub déployé à:", contractAddress);
    console.log(" ✅ Block confirmé\n");
    
    // Attendre quelques blocs avant de vérifier les infos
    if (hre.network.name === "sepolia") {
      console.log(" ⏳ Attente de confirmation supplémentaire...");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Obtenir l'ABI
    const artifact = await hre.artifacts.readArtifact("SafeClub");
    
    // Afficher les informations du contrat
    console.log("\n 📊 Informations du Contrat:");
    try {
      const owner = await safeClub.owner();
      const memberCount = await safeClub.getMemberCount();
      const balance = await safeClub.getBalance();
      const quorum = await safeClub.quorumPercentage();
      const approval = await safeClub.approvalPercentage();
      
      console.log("   - Owner:", owner);
      console.log("   - Membres:", memberCount.toString());
      console.log("   - Solde:", hre.ethers.formatEther(balance), "ETH");
      console.log("   - Quorum:", quorum.toString() + "%");
      console.log("   - Approbation:", approval.toString() + "%");
    } catch (err) {
      console.log("   ⚠️  Impossible de récupérer les infos (attendez quelques secondes et réessayez)");
      console.log("   Erreur:", err.message);
    }
    
    // Sauvegarder les informations de déploiement
    const deploymentInfo = {
      network: hre.network.name,
      contractAddress: contractAddress,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      blockNumber: await hre.ethers.provider.getBlockNumber(),
      abi: artifact.abi
    };
    
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }
    
    const deploymentPath = path.join(deploymentsDir, `${hre.network.name}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n 💾 Informations sauvegardées dans:", deploymentPath);
    
    // Mettre à jour app.js si c'est un déploiement Sepolia
    if (hre.network.name === "sepolia") {
      updateAppJs(contractAddress);
    }
    
    // Instructions pour la vérification
    if (hre.network.name === "sepolia") {
      console.log("\n 🔍 Vérification sur Etherscan (optionnel):");
      console.log(`   npx hardhat verify --network sepolia ${contractAddress}`);
    }
    
    console.log("\n ✨ Déploiement terminé avec succès!");
    console.log("\n 🌐 Accédez à votre contrat:");
    console.log(`   https://sepolia.etherscan.io/address/${contractAddress}`);
    console.log("\n");
    
    return contractAddress;

  } catch (error) {
    console.error("\n ❌ Erreur lors du déploiement:");
    console.error("   Message:", error.message);
    
    if (error.message.includes("timeout")) {
      console.error("\n 💡 Solutions possibles:");
      console.error("   1. Vérifiez votre connexion internet");
      console.error("   2. Changez le RPC dans .env:");
      console.error("      SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY");
      console.error("   3. Réessayez dans quelques secondes");
    }
    
    if (error.message.includes("insufficient")) {
      console.error("\n 💡 Vous manquez de fonds Sepolia");
      console.error("   Obtenez du Sepolia ETH: https://sepoliafaucet.com");
    }
    
    process.exit(1);
  }
}

function updateAppJs(contractAddress) {
  const appJsPath = path.join(__dirname, "..", "app.js");
  
  if (fs.existsSync(appJsPath)) {
    let content = fs.readFileSync(appJsPath, "utf8");
    
    // Remplacer l'adresse du contrat
    const regex = /const CONTRACT_ADDRESS = "0x[a-fA-F0-9]{40}"/;
    const newLine = `const CONTRACT_ADDRESS = "${contractAddress}"`;
    
    if (regex.test(content)) {
      content = content.replace(regex, newLine);
      fs.writeFileSync(appJsPath, content);
      console.log(" ✅ app.js mis à jour avec la nouvelle adresse");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n ❌ Erreur fatale:", error.message);
    process.exit(1);
  });