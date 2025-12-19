// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SafeClub - Trésorerie Sécurisée
 * @author Votre Groupe
 * @notice Smart contract pour gérer la trésorerie d'un club étudiant
 * @dev Implémente toutes les protections de sécurité requises
 */
contract SafeClub is Ownable, ReentrancyGuard {
    
    // ========== CONSTANTES ==========
    
    uint256 public constant MAX_PROPOSAL_AMOUNT = 50 ether;
    uint256 public constant MIN_PROPOSAL_DURATION = 1 minutes;
    uint256 public constant MAX_PROPOSAL_DURATION = 1 minutes;
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
        address proposer;
        uint256 createdAt;
    }
    
    struct Member {
        bool isActive;
        uint256 joinedAt;
        uint256 proposalsCreated;
        uint256 votesCount;
        string name;
        string role;
    }
    
    // ========== VARIABLES D'ÉTAT ==========
    
    mapping(address => Member) public members;
    address[] private memberList;
    Proposal[] private proposalList;
    mapping(uint256 => mapping(address => bool)) private proposalVotes;
    uint256 public activeProposalsCount;
    uint256 public quorumPercentage = 50;
    uint256 public approvalPercentage = 60;
    
    // ========== ÉVÉNEMENTS ==========
    
    event MemberAdded(address indexed member, string name, string role, uint256 timestamp);
    event MemberUpdated(address indexed member, string newName, string newRole, uint256 timestamp);
    event MemberRemoved(address indexed member, uint256 timestamp);
    event FundsReceived(address indexed from, uint256 amount, uint256 timestamp);
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        address indexed recipient,
        uint256 amount,
        uint256 deadline
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votesFor,
        uint256 votesAgainst
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed recipient,
        uint256 amount
    );
    event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum);
    event ApprovalUpdated(uint256 oldApproval, uint256 newApproval);
    
    // ========== MODIFICATEURS ==========
    
    modifier onlyMember() {
        require(members[msg.sender].isActive, "Not a member");
        _;
    }
    
    modifier proposalExists(uint256 _proposalId) {
        require(_proposalId < proposalList.length, "Proposal does not exist");
        _;
    }
    
    modifier notExecuted(uint256 _proposalId) {
        require(!proposalList[_proposalId].executed, "Proposal already executed");
        _;
    }
    
    modifier validAddress(address _address) {
        require(_address != address(0), "Invalid address");
        require(_address != address(this), "Cannot target contract");
        _;
    }
    
    modifier validAmount(uint256 _amount) {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= MAX_PROPOSAL_AMOUNT, "Amount exceeds maximum");
        require(_amount <= address(this).balance, "Insufficient funds");
        _;
    }
    
    // ========== CONSTRUCTEUR ==========
    
    constructor() Ownable(msg.sender) {
        _addMember(msg.sender, "Admin", "Admin");
    }
    
    // ========== GESTION DES MEMBRES ==========
    
    function addMember(
        address _member,
        string memory _name,
        string memory _role
    ) 
        external 
        onlyOwner 
        validAddress(_member)
    {
        require(!members[_member].isActive, "Already a member");
        require(memberList.length < MAX_MEMBERS, "Member limit reached");
        require(bytes(_name).length > 0 && bytes(_name).length <= 50, "Invalid name");
        require(bytes(_role).length > 0 && bytes(_role).length <= 50, "Invalid role");
        
        _addMember(_member, _name, _role);
    }
    
    function _addMember(address _member, string memory _name, string memory _role) internal {
        members[_member] = Member({
            isActive: true,
            joinedAt: block.timestamp,
            proposalsCreated: 0,
            votesCount: 0,
            name: _name,
            role: _role
        });
        memberList.push(_member);
        
        emit MemberAdded(_member, _name, _role, block.timestamp);
    }
    
    function updateMember(
        address _member,
        string memory _name,
        string memory _role
    ) 
        external 
        onlyOwner 
    {
        require(members[_member].isActive, "Not a member");
        require(bytes(_name).length > 0 && bytes(_name).length <= 50, "Invalid name");
        require(bytes(_role).length > 0 && bytes(_role).length <= 50, "Invalid role");
        
        members[_member].name = _name;
        members[_member].role = _role;
        
        emit MemberUpdated(_member, _name, _role, block.timestamp);
    }
    
    function removeMember(address _member) external onlyOwner {
        require(members[_member].isActive, "Not a member");
        require(_member != owner(), "Cannot remove owner");
        
        members[_member].isActive = false;
        
        // Remove from array
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
    
    function getMemberInfo(address _member) 
        external 
        view 
        returns (string memory name, string memory role, bool isActive, uint256 joinedAt) 
    {
        Member storage member = members[_member];
        return (member.name, member.role, member.isActive, member.joinedAt);
    }
    
    function isMember(address _address) external view returns (bool) {
        return members[_address].isActive;
    }
    
    // ========== GESTION DES FONDS ==========
    
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value, block.timestamp);
    }
    
    fallback() external payable {
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
        uint256 _durationInMinutes
    ) 
        external 
        onlyMember 
        validAddress(_recipient)
        validAmount(_amount)
    {
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(bytes(_description).length <= 500, "Description too long");
        require(_durationInMinutes == 1, "Duration must be exactly 1 minute");
        require(activeProposalsCount < MAX_ACTIVE_PROPOSALS, "Too many active proposals");
        
        uint256 deadline = block.timestamp + 1 minutes;
        
        Proposal memory newProposal = Proposal({
            id: proposalList.length,
            description: _description,
            recipient: _recipient,
            amount: _amount,
            votesFor: 0,
            votesAgainst: 0,
            deadline: deadline,
            executed: false,
            proposer: msg.sender,
            createdAt: block.timestamp
        });
        
        proposalList.push(newProposal);
        activeProposalsCount++;
        members[msg.sender].proposalsCreated++;
        
        emit ProposalCreated(
            newProposal.id,
            msg.sender,
            _description,
            _recipient,
            _amount,
            deadline
        );
    }
    
    function vote(uint256 _proposalId, bool _support) 
        external 
        onlyMember 
        proposalExists(_proposalId) 
        notExecuted(_proposalId)
    {
        Proposal storage proposal = proposalList[_proposalId];
        
        require(block.timestamp <= proposal.deadline, "Voting period ended");
        require(!proposalVotes[_proposalId][msg.sender], "Already voted");
        
        proposalVotes[_proposalId][msg.sender] = true;
        members[msg.sender].votesCount++;
        
        if (_support) {
            proposal.votesFor++;
        } else {
            proposal.votesAgainst++;
        }
        
        emit VoteCast(_proposalId, msg.sender, _support, proposal.votesFor, proposal.votesAgainst);
    }
    
    function executeProposal(uint256 _proposalId) 
        external 
        onlyMember 
        proposalExists(_proposalId) 
        notExecuted(_proposalId)
        nonReentrant
    {
        Proposal storage proposal = proposalList[_proposalId];
        
        require(block.timestamp > proposal.deadline, "Voting still in progress");
        require(address(this).balance >= proposal.amount, "Insufficient funds");
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        uint256 memberCount = getMemberCount();
        
        require(totalVotes > 0, "No votes cast");
        require((totalVotes * 100) >= (memberCount * quorumPercentage), "Quorum not reached");
        require((proposal.votesFor * 100) >= (totalVotes * approvalPercentage), "Proposal rejected");
        
        proposal.executed = true;
        activeProposalsCount--;
        
        (bool success, ) = proposal.recipient.call{value: proposal.amount}("");
        require(success, "Transfer failed");
        
        emit ProposalExecuted(_proposalId, proposal.recipient, proposal.amount);
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
        Proposal storage proposal = proposalList[_proposalId];
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
        return proposalVotes[_proposalId][_voter];
    }
    
    function isProposalApproved(uint256 _proposalId) 
        external 
        view 
        proposalExists(_proposalId) 
        returns (bool) 
    {
        Proposal storage proposal = proposalList[_proposalId];
        
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
    
    function proposalCount() external view returns (uint256) {
        return proposalList.length;
    }
    
    // ========== CONFIGURATION ==========
    
    function setQuorumPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage > 0 && _percentage <= 100, "Invalid percentage");
        uint256 oldQuorum = quorumPercentage;
        quorumPercentage = _percentage;
        emit QuorumUpdated(oldQuorum, _percentage);
    }
    
    function setApprovalPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage > 0 && _percentage <= 100, "Invalid percentage");
        uint256 oldApproval = approvalPercentage;
        approvalPercentage = _percentage;
        emit ApprovalUpdated(oldApproval, _percentage);
    }
}