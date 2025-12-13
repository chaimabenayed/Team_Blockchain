// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SafeClub
 * @dev Smart contract pour gérer la trésorerie sécurisée d'un club étudiant
 * @notice Permet la gestion des membres, propositions de dépenses et votes
 */
contract SafeClub is Ownable, ReentrancyGuard {
    
    // ========== STRUCTURES ==========
    
    struct Proposal {
        uint256 id;
        string description;
        address payable recipient;
        uint256 amount;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool executed;
        bool exists;
        mapping(address => bool) hasVoted;
    }
    
    struct Member {
        bool isActive;
        uint256 joinedAt;
    }
    
    // ========== VARIABLES D'ÉTAT ==========
    
    mapping(address => Member) public members;
    address[] public memberList;
    
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    
    uint256 public quorumPercentage = 50; // 50% des membres doivent voter
    uint256 public approvalPercentage = 60; // 60% de votes "pour" nécessaires
    
    // ========== ÉVÉNEMENTS ==========
    
    event MemberAdded(address indexed member, uint256 timestamp);
    event MemberRemoved(address indexed member, uint256 timestamp);
    event FundsReceived(address indexed from, uint256 amount);
    event ProposalCreated(
        uint256 indexed proposalId,
        string description,
        address indexed recipient,
        uint256 amount,
        uint256 deadline
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed recipient,
        uint256 amount
    );
    
    // ========== MODIFICATEURS ==========
    
    modifier onlyMember() {
        require(members[msg.sender].isActive, "Non autorise: vous n'etes pas membre");
        _;
    }
    
    modifier proposalExists(uint256 _proposalId) {
        require(proposals[_proposalId].exists, "Proposition inexistante");
        _;
    }
    
    modifier notExecuted(uint256 _proposalId) {
        require(!proposals[_proposalId].executed, "Proposition deja executee");
        _;
    }
    
    // ========== CONSTRUCTEUR ==========
    
    constructor() Ownable(msg.sender) {
        // Le créateur du contrat est automatiquement membre
        _addMember(msg.sender);
    }
    
    // ========== FONCTIONS DE GESTION DES MEMBRES ==========
    
    /**
     * @dev Ajoute un nouveau membre au club
     * @param _member Adresse du membre à ajouter
     */
    function addMember(address _member) external onlyOwner {
        require(_member != address(0), "Adresse invalide");
        require(!members[_member].isActive, "Membre deja actif");
        
        _addMember(_member);
    }
    
    /**
     * @dev Fonction interne pour ajouter un membre
     */
    function _addMember(address _member) internal {
        members[_member] = Member({
            isActive: true,
            joinedAt: block.timestamp
        });
        memberList.push(_member);
        
        emit MemberAdded(_member, block.timestamp);
    }
    
    /**
     * @dev Retire un membre du club
     * @param _member Adresse du membre à retirer
     */
    function removeMember(address _member) external onlyOwner {
        require(members[_member].isActive, "Membre non actif");
        require(_member != owner(), "Impossible de retirer le proprietaire");
        
        members[_member].isActive = false;
        
        // Retirer de la liste des membres
        for (uint256 i = 0; i < memberList.length; i++) {
            if (memberList[i] == _member) {
                memberList[i] = memberList[memberList.length - 1];
                memberList.pop();
                break;
            }
        }
        
        emit MemberRemoved(_member, block.timestamp);
    }
    
    /**
     * @dev Retourne le nombre de membres actifs
     */
    function getMemberCount() public view returns (uint256) {
        return memberList.length;
    }
    
    /**
     * @dev Retourne la liste complète des membres
     */
    function getAllMembers() external view returns (address[] memory) {
        return memberList;
    }
    
    /**
     * @dev Vérifie si une adresse est membre
     */
    function isMember(address _address) external view returns (bool) {
        return members[_address].isActive;
    }
    
    // ========== FONCTIONS DE GESTION DES FONDS ==========
    
    /**
     * @dev Fonction pour recevoir des ETH
     */
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }
    
    /**
     * @dev Fonction fallback pour recevoir des ETH
     */
    fallback() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }
    
    /**
     * @dev Retourne le solde du contrat
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // ========== FONCTIONS DE GESTION DES PROPOSITIONS ==========
    
    /**
     * @dev Crée une nouvelle proposition de dépense
     * @param _description Description de la proposition
     * @param _recipient Destinataire des fonds
     * @param _amount Montant en Wei
     * @param _durationInDays Durée de vote en jours
     */
    function createProposal(
        string memory _description,
        address payable _recipient,
        uint256 _amount,
        uint256 _durationInDays
    ) external onlyMember {
        require(_recipient != address(0), "Destinataire invalide");
        require(_amount > 0, "Montant doit etre superieur a 0");
        require(_amount <= address(this).balance, "Fonds insuffisants");
        require(_durationInDays > 0, "Duree invalide");
        require(bytes(_description).length > 0, "Description requise");
        
        uint256 proposalId = proposalCount++;
        uint256 deadline = block.timestamp + (_durationInDays * 1 days);
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.description = _description;
        newProposal.recipient = _recipient;
        newProposal.amount = _amount;
        newProposal.votesFor = 0;
        newProposal.votesAgainst = 0;
        newProposal.deadline = deadline;
        newProposal.executed = false;
        newProposal.exists = true;
        
        emit ProposalCreated(
            proposalId,
            _description,
            _recipient,
            _amount,
            deadline
        );
    }
    
    /**
     * @dev Permet à un membre de voter sur une proposition
     * @param _proposalId ID de la proposition
     * @param _support true pour voter pour, false pour voter contre
     */
    function vote(uint256 _proposalId, bool _support) 
        external 
        onlyMember 
        proposalExists(_proposalId) 
        notExecuted(_proposalId) 
    {
        Proposal storage proposal = proposals[_proposalId];
        
        require(block.timestamp <= proposal.deadline, "Vote termine");
        require(!proposal.hasVoted[msg.sender], "Vote deja enregistre");
        
        proposal.hasVoted[msg.sender] = true;
        
        if (_support) {
            proposal.votesFor++;
        } else {
            proposal.votesAgainst++;
        }
        
        emit VoteCast(_proposalId, msg.sender, _support);
    }
    
    /**
     * @dev Exécute une proposition acceptée
     * @param _proposalId ID de la proposition à exécuter
     */
    function executeProposal(uint256 _proposalId) 
        external 
        onlyMember 
        proposalExists(_proposalId) 
        notExecuted(_proposalId)
        nonReentrant
    {
        Proposal storage proposal = proposals[_proposalId];
        
        require(block.timestamp > proposal.deadline, "Vote en cours");
        require(address(this).balance >= proposal.amount, "Fonds insuffisants");
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        uint256 memberCount = getMemberCount();
        
        // Vérification du quorum
        require(
            (totalVotes * 100) >= (memberCount * quorumPercentage),
            "Quorum non atteint"
        );
        
        // Vérification de l'approbation
        require(
            (proposal.votesFor * 100) >= (totalVotes * approvalPercentage),
            "Proposition rejetee"
        );
        
        // Marquer comme exécutée AVANT le transfert (protection reentrancy)
        proposal.executed = true;
        
        // Transfert sécurisé
        (bool success, ) = proposal.recipient.call{value: proposal.amount}("");
        require(success, "Transfert echoue");
        
        emit ProposalExecuted(_proposalId, proposal.recipient, proposal.amount);
    }
    
    /**
     * @dev Retourne les détails d'une proposition
     */
    function getProposal(uint256 _proposalId) 
        external 
        view 
        proposalExists(_proposalId) 
        returns (
            uint256 id,
            string memory description,
            address recipient,
            uint256 amount,
            uint256 votesFor,
            uint256 votesAgainst,
            uint256 deadline,
            bool executed
        ) 
    {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.description,
            proposal.recipient,
            proposal.amount,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.deadline,
            proposal.executed
        );
    }
    
    /**
     * @dev Vérifie si une adresse a voté sur une proposition
     */
    function hasVoted(uint256 _proposalId, address _voter) 
        external 
        view 
        proposalExists(_proposalId) 
        returns (bool) 
    {
        return proposals[_proposalId].hasVoted[_voter];
    }
    
    /**
     * @dev Vérifie si une proposition est acceptée
     */
    function isProposalApproved(uint256 _proposalId) 
        external 
        view 
        proposalExists(_proposalId) 
        returns (bool) 
    {
        Proposal storage proposal = proposals[_proposalId];
        
        if (block.timestamp <= proposal.deadline) {
            return false; // Vote toujours en cours
        }
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        uint256 memberCount = getMemberCount();
        
        // Vérifier quorum et approbation
        bool quorumReached = (totalVotes * 100) >= (memberCount * quorumPercentage);
        bool approved = (proposal.votesFor * 100) >= (totalVotes * approvalPercentage);
        
        return quorumReached && approved;
    }
    
    // ========== FONCTIONS DE CONFIGURATION ==========
    
    /**
     * @dev Modifie le pourcentage de quorum requis
     */
    function setQuorumPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage > 0 && _percentage <= 100, "Pourcentage invalide");
        quorumPercentage = _percentage;
    }
    
    /**
     * @dev Modifie le pourcentage d'approbation requis
     */
    function setApprovalPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage > 0 && _percentage <= 100, "Pourcentage invalide");
        approvalPercentage = _percentage;
    }
}