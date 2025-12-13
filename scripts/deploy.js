const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Déploiement de SafeClub...\n");

  // Obtenir le déployeur
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log("📍 Réseau:", hre.network.name);
  console.log("👤 Déployeur:", deployer.address);
  console.log("💰 Solde:", hre.ethers.formatEther(balance), "ETH\n");

  // Déployer le contrat
  console.log("⏳ Déploiement en cours...");
  const SafeClub = await hre.ethers.getContractFactory("SafeClub");
  const safeClub = await SafeClub.deploy();
  
  await safeClub.waitForDeployment();
  const contractAddress = await safeClub.getAddress();
  
  console.log("✅ SafeClub déployé à:", contractAddress);
  
  // Obtenir l'ABI
  const artifact = await hre.artifacts.readArtifact("SafeClub");
  
  // Informations du contrat
  console.log("\n📊 Informations du contrat:");
  console.log("- Owner:", await safeClub.owner());
  console.log("- Membres:", await safeClub.getMemberCount());
  console.log("- Quorum:", await safeClub.quorumPercentage(), "%");
  console.log("- Approbation:", await safeClub.approvalPercentage(), "%");
  
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
  
  console.log("\n💾 Informations sauvegardées dans:", deploymentPath);
  
  // Mettre à jour app.js si c'est un déploiement Sepolia
  if (hre.network.name === "sepolia") {
    updateAppJs(contractAddress);
  }
  
  // Instructions de vérification
  if (hre.network.name === "sepolia") {
    console.log("\n🔍 Pour vérifier le contrat sur Etherscan:");
    console.log(`npx hardhat verify --network sepolia ${contractAddress}`);
  }
  
  console.log("\n✨ Déploiement terminé avec succès!");
}

function updateAppJs(contractAddress) {
  const appJsPath = path.join(__dirname, "..", "app.js");
  
  if (fs.existsSync(appJsPath)) {
    let content = fs.readFileSync(appJsPath, "utf8");
    
    // Remplacer l'adresse du contrat
    const regex = /const CONTRACT_ADDRESS = "0x[a-fA-F0-9]{40}";/;
    const newLine = `const CONTRACT_ADDRESS = "${contractAddress}";`;
    
    if (regex.test(content)) {
      content = content.replace(regex, newLine);
      fs.writeFileSync(appJsPath, content);
      console.log("\n✅ app.js mis à jour avec la nouvelle adresse");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
  });
