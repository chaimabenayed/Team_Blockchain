// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReentrancyAttacker
 * @dev Contrat malveillant pour tester la protection contre la reentrancy
 * @notice CE CONTRAT EST POUR LES TESTS UNIQUEMENT
 */

interface ISafeClub {
    function executeProposal(uint256 proposalId) external;
    function createProposal(
        string memory description,
        address payable recipient,
        uint256 amount,
        uint256 durationInDays
    ) external;
    function vote(uint256 proposalId, bool support) external;
    function getBalance() external view returns (uint256);
}

contract ReentrancyAttacker {
    ISafeClub public targetContract;
    uint256 public proposalId;
    uint256 public attackCount;
    bool public isAttacking;
    address public owner;
    
    event AttackAttempt(uint256 attemptNumber, uint256 contractBalance);
    event AttackBlocked(string reason);
    event FundsReceived(uint256 amount);
    
    constructor(address _targetContract) {
        targetContract = ISafeClub(_targetContract);
        owner = msg.sender;
        attackCount = 0;
        isAttacking = false;
    }
    
    /**
     * @dev Lance l'attaque de reentrancy
     */
    function attack(uint256 _proposalId) external {
        require(msg.sender == owner, "Only owner can attack");
        proposalId = _proposalId;
        isAttacking = true;
        attackCount = 0;
        
        // Première tentative d'exécution
        try targetContract.executeProposal(_proposalId) {
            emit AttackAttempt(1, address(targetContract).balance);
        } catch Error(string memory reason) {
            emit AttackBlocked(reason);
            isAttacking = false;
        }
    }
    
    /**
     * @dev Fonction receive appelée quand le contrat reçoit de l'ETH
     * C'est ici que se fait la tentative de reentrancy
     */
    receive() external payable {
        emit FundsReceived(msg.value);
        
        // Si on est en mode attaque, tenter de ré-entrer
        if (isAttacking) {
            attackCount++;
            
            uint256 targetBalance = address(targetContract).balance;
            
            // Tenter de ré-exécuter la proposition
            if (targetBalance >= 1 ether && attackCount < 10) {
                emit AttackAttempt(attackCount + 1, targetBalance);
                
                try targetContract.executeProposal(proposalId) {
                    // Si ça passe, continuer l'attaque
                } catch Error(string memory reason) {
                    // Si ça échoue, arrêter l'attaque
                    emit AttackBlocked(reason);
                    isAttacking = false;
                }
            } else {
                isAttacking = false;
            }
        }
    }
    
    /**
     * @dev Permet au propriétaire de retirer les fonds volés (si l'attaque réussit)
     */
    function withdraw() external {
        require(msg.sender == owner, "Only owner");
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * @dev Retourne le solde du contrat attaquant
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Retourne le nombre de tentatives de reentrancy
     */
    function getAttackCount() external view returns (uint256) {
        return attackCount;
    }
}