const hre = require("hardhat");

async function main() {
  // REMPLACE par l'adresse réelle de SafeClub sur Sepolia
  const SAFECLUB_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

  if (!hre.ethers.isAddress(SAFECLUB_ADDRESS)) {
    throw new Error("▸ Adresse SafeClub invalide");
  }

  console.log("▸ Déploiement de ReentrancyAttacker...");
  console.log("▸ SafeClub cible :", SAFECLUB_ADDRESS);

  const [deployer] = await hre.ethers.getSigners();
  console.log("▸ Déployeur :", deployer.address);

  const Attacker = await hre.ethers.getContractFactory("ReentrancyAttacker");
  const attacker = await Attacker.deploy(SAFECLUB_ADDRESS);

  await attacker.waitForDeployment();

  const attackerAddress = await attacker.getAddress();

  console.log("✓ ReentrancyAttacker déployé à :", attackerAddress);
  console.log("▸ Adresse à utiliser pour la proposition :", attackerAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("✗ Erreur lors du déploiement :", error);
    process.exit(1);
  });