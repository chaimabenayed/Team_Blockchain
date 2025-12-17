// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ✅ IMPORTS CORRECTS - Depuis npm (@openzeppelin/contracts)
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SafeClub - Trésorerie Sécurisée
 * @author Votre Groupe
 * @notice Smart contract pour gérer la trésorerie d'un club étudiant
 * @dev Implémente toutes les protections de sécurité requises
 */
contract SafeClub is Ownable, ReentrancyGuard, Pausable {
    
    // ========== CONSTANTES DE SÉCURITÉ ==========
    
    uint256 public constant MAX_PROPOSAL_AMOUNT = 50 ether;
    uint256 public constant MIN_PROPOSAL_DURATION = 1 days;
    uint256 public constant MAX_PROPOSAL_DURATION = 90 days;
    uint256 public constant MAX_MEMBERS = 100;
    uint256 public constant MAX_ACTIVE_PROPOSALS = 20;
    
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
        address proposer;
        uint256 createdAt;
        mapping(address => bool) hasVoted;
    }
    
    struct Member {
        bool isActive;
        uint256 joinedAt;
        uint256 proposalsCreated;
        uint256 votesCount;
    }
    
    // ========== VARIABLES D'ÉTAT ==========
    
    mapping(address => Member) public members;
    address[] public memberList;
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256 public activeProposalsCount;
    uint256 public quorumPercentage = 50;
    uint256 public approvalPercentage = 60;
    
    // ========== ÉVÉNEMENTS ==========
    
    event MemberAdded(address indexed member, uint256 timestamp);
    event MemberRemoved(address indexed member, uint256 timestamp);
    event FundsReceived(address indexed from, uint256 amount, uint256 timestamp);
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        address indexed recipient,
        uint256 amount,
        uint256 deadline,
        uint256 timestamp
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 timestamp
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    event ContractPaused(address indexed by, uint256 timestamp);
    event ContractUnpaused(address indexed by, uint256 timestamp);
    event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum, uint256 timestamp);
    event ApprovalUpdated(uint256 oldApproval, uint256 newApproval, uint256 timestamp);
    
    // ========== MODIFICATEURS ==========
    
    modifier onlyMember() {
        require(members[msg.sender].isActive, "SafeClub: appelant non membre");
        _;
    }
    
    modifier proposalExists(uint256 _proposalId) {
        require(_proposalId < proposalCount, "SafeClub: ID invalide");
        require(proposals[_proposalId].exists, "SafeClub: proposition inexistante");
        _;
    }
    
    modifier notExecuted(uint256 _proposalId) {
        require(!proposals[_proposalId].executed, "SafeClub: deja executee");
        _;
    }
    
    modifier validAddress(address _address) {
        require(_address != address(0), "SafeClub: adresse zero");
        require(_address != address(this), "SafeClub: adresse contrat");
        _;
    }
    
    modifier validAmount(uint256 _amount) {
        require(_amount > 0, "SafeClub: montant nul");
        require(_amount <= MAX_PROPOSAL_AMOUNT, "SafeClub: montant trop eleve");
        require(_amount <= address(this).balance, "SafeClub: fonds insuffisants");
        _;
    }
    
    modifier validDuration(uint256 _durationInDays) {
        uint256 durationInSeconds = _durationInDays * 1 days;
        require(
            durationInSeconds >= MIN_PROPOSAL_DURATION,
            "SafeClub: duree trop courte"
        );
        require(
            durationInSeconds <= MAX_PROPOSAL_DURATION,
            "SafeClub: duree trop longue"
        );
        _;
    }
    
    // ========== CONSTRUCTEUR ==========
    
    constructor() Ownable(msg.sender) {
        _addMember(msg.sender);
    }
    
    // ========== PAUSE D'URGENCE ==========
    
    function pause() external onlyOwner {
        _pause();
        emit ContractPaused(msg.sender, block.timestamp);
    }
    
    function unpause() external onlyOwner {
        _unpause();
        emit ContractUnpaused(msg.sender, block.timestamp);
    }
    
    // ========== GESTION DES MEMBRES ==========
    
    function addMember(address _member) 
        external 
        onlyOwner 
        validAddress(_member)
        whenNotPaused
    {
        require(!members[_member].isActive, "SafeClub: deja membre");
        require(memberList.length < MAX_MEMBERS, "SafeClub: limite atteinte");
        
        _addMember(_member);
    }
    
    function _addMember(address _member) internal {
        members[_member] = Member({
            isActive: true,
            joinedAt: block.timestamp,
            proposalsCreated: 0,
            votesCount: 0
        });
        memberList.push(_member);
        
        emit MemberAdded(_member, block.timestamp);
    }
    
    function removeMember(address _member) 
        external 
        onlyOwner 
        whenNotPaused
    {
        require(members[_member].isActive, "SafeClub: non membre");
        require(_member != owner(), "SafeClub: impossible retirer owner");
        
        members[_member].isActive = false;
        
        for (uint256 i = 0; i < memberList.length; i++) {
            if (memberList[i] == _member) {
                memberList[i] = memberList[memberList.length - 1];
                memberList.pop();
                break;
            }
        }
        
        emit MemberRemoved(_member, block.timestamp);
    }
    
    function getMemberCount() public view returns (uint256) {
        return memberList.length;
    }
    
    function getAllMembers() external view returns (address[] memory) {
        return memberList;
    }
    
    function isMember(address _address) external view returns (bool) {
        return members[_address].isActive;
    }
    
    // ========== GESTION DES FONDS ==========
    
    receive() external payable whenNotPaused {
        require(msg.value > 0, "SafeClub: montant nul");
        emit FundsReceived(msg.sender, msg.value, block.timestamp);
    }
    
    fallback() external payable whenNotPaused {
        require(msg.value > 0, "SafeClub: montant nul");
        emit FundsReceived(msg.sender, msg.value, block.timestamp);
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // ========== GESTION DES PROPOSITIONS ==========
    
    function createProposal(
        string memory _description,
        address payable _recipient,
        uint256 _amount,
        uint256 _durationInDays
    ) 
        external 
        onlyMember 
        whenNotPaused
        validAddress(_recipient)
        validAmount(_amount)
        validDuration(_durationInDays)
    {
        require(bytes(_description).length > 0, "SafeClub: description vide");
        require(bytes(_description).length <= 500, "SafeClub: description trop longue");
        require(
            activeProposalsCount < MAX_ACTIVE_PROPOSALS,
            "SafeClub: trop de propositions actives"
        );
        
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
        newProposal.proposer = msg.sender;
        newProposal.createdAt = block.timestamp;
        
        activeProposalsCount++;
        members[msg.sender].proposalsCreated++;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            _description,
            _recipient,
            _amount,
            deadline,
            block.timestamp
        );
    }
    
    function vote(uint256 _proposalId, bool _support) 
        external 
        onlyMember 
        whenNotPaused
        proposalExists(_proposalId) 
        notExecuted(_proposalId) 
    {
        Proposal storage proposal = proposals[_proposalId];
        
        require(
            block.timestamp <= proposal.deadline,
            "SafeClub: vote termine"
        );
        require(
            !proposal.hasVoted[msg.sender],
            "SafeClub: deja vote"
        );
        
        proposal.hasVoted[msg.sender] = true;
        members[msg.sender].votesCount++;
        
        if (_support) {
            proposal.votesFor++;
        } else {
            proposal.votesAgainst++;
        }
        
        emit VoteCast(
            _proposalId,
            msg.sender,
            _support,
            proposal.votesFor,
            proposal.votesAgainst,
            block.timestamp
        );
    }
    
    function executeProposal(uint256 _proposalId) 
        external 
        onlyMember 
        whenNotPaused
        proposalExists(_proposalId) 
        notExecuted(_proposalId)
        nonReentrant  // ✅ PROTECTION REENTRANCY
    {
        Proposal storage proposal = proposals[_proposalId];
        
        require(
            block.timestamp > proposal.deadline,
            "SafeClub: vote en cours"
        );
        require(
            address(this).balance >= proposal.amount,
            "SafeClub: fonds insuffisants"
        );
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        uint256 memberCount = getMemberCount();
        
        require(
            (totalVotes * 100) >= (memberCount * quorumPercentage),
            "SafeClub: quorum non atteint"
        );
        
        require(
            totalVotes > 0,
            "SafeClub: aucun vote"
        );
        require(
            (proposal.votesFor * 100) >= (totalVotes * approvalPercentage),
            "SafeClub: proposition rejetee"
        );
        
        // ========== EFFECTS AVANT INTERACTIONS ==========
        proposal.executed = true;
        activeProposalsCount--;
        
        // ========== INTERACTION ==========
        (bool success, ) = proposal.recipient.call{value: proposal.amount}("");
        require(success, "SafeClub: transfert echoue");
        
        emit ProposalExecuted(
            _proposalId,
            proposal.recipient,
            proposal.amount,
            block.timestamp
        );
    }
    
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
    
    function hasVoted(uint256 _proposalId, address _voter) 
        external 
        view 
        proposalExists(_proposalId) 
        returns (bool) 
    {
        return proposals[_proposalId].hasVoted[_voter];
    }
    
    function isProposalApproved(uint256 _proposalId) 
        external 
        view 
        proposalExists(_proposalId) 
        returns (bool) 
    {
        Proposal storage proposal = proposals[_proposalId];
        
        if (block.timestamp <= proposal.deadline) {
            return false;
        }
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        
        if (totalVotes == 0) {
            return false;
        }
        
        uint256 memberCount = getMemberCount();
        
        bool quorumReached = (totalVotes * 100) >= (memberCount * quorumPercentage);
        bool approved = (proposal.votesFor * 100) >= (totalVotes * approvalPercentage);
        
        return quorumReached && approved;
    }
    
    // ========== CONFIGURATION ==========
    
    function setQuorumPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage > 0 && _percentage <= 100, "SafeClub: pourcentage invalide");
        uint256 oldQuorum = quorumPercentage;
        quorumPercentage = _percentage;
        emit QuorumUpdated(oldQuorum, _percentage, block.timestamp);
    }
    
    function setApprovalPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage > 0 && _percentage <= 100, "SafeClub: pourcentage invalide");
        uint256 oldApproval = approvalPercentage;
        approvalPercentage = _percentage;
        emit ApprovalUpdated(oldApproval, _percentage, block.timestamp);
    }
}