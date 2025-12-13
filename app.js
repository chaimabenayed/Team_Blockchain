// ===============================
//      CONFIGURATION SEPOLIA
// ===============================

const SEPOLIA_CHAIN_ID = "0xaa36a7";
const CONTRACT_ADDRESS = "0xA02375bb242eB5B16A5A9b6aF91A288Acb3AdC05";

const CONTRACT_ABI = [
    {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldPercentage","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newPercentage","type":"uint256"}],"name":"ApprovalPercentageChanged","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"FundsReceived","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"member","type":"address"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"MemberAdded","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"member","type":"address"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"MemberRemoved","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"proposalId","type":"uint256"},{"indexed":false,"internalType":"string","name":"description","type":"string"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ProposalCreated","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"proposalId","type":"uint256"},{"indexed":false,"internalType":"bool","name":"success","type":"bool"}],"name":"ProposalExecuted","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"proposalId","type":"uint256"},{"indexed":true,"internalType":"address","name":"voter","type":"address"},{"indexed":false,"internalType":"bool","name":"support","type":"bool"}],"name":"Voted","type":"event"},
    {"inputs":[{"internalType":"address","name":"_member","type":"address"}],"name":"addMember","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"approvalPercentage","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"string","name":"_description","type":"string"},{"internalType":"address payable","name":"_recipient","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"uint256","name":"_durationInDays","type":"uint256"}],"name":"createProposal","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"deposit","outputs":[],"stateMutability":"payable","type":"function"},
    {"inputs":[],"name":"destroyContract","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address payable","name":"_to","type":"address"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_proposalId","type":"uint256"}],"name":"executeProposal","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"getAllMembers","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"getBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"getMemberCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_member","type":"address"}],"name":"getMemberInfo","outputs":[{"internalType":"bool","name":"isActive","type":"bool"},{"internalType":"uint256","name":"joinedAt","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_proposalId","type":"uint256"}],"name":"getProposal","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"string","name":"description","type":"string"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"votesFor","type":"uint256"},{"internalType":"uint256","name":"votesAgainst","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"executed","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_proposalId","type":"uint256"},{"internalType":"address","name":"_voter","type":"address"}],"name":"hasVoted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_address","type":"address"}],"name":"isMember","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_proposalId","type":"uint256"}],"name":"isProposalApproved","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"memberList","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"members","outputs":[{"internalType":"bool","name":"isActive","type":"bool"},{"internalType":"uint256","name":"joinedAt","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"proposalCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_member","type":"address"}],"name":"removeMember","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_newPercentage","type":"uint256"}],"name":"setApprovalPercentage","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"_newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_proposalId","type":"uint256"},{"internalType":"bool","name":"_support","type":"bool"}],"name":"vote","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"stateMutability":"payable","type":"receive"}
];

// Variables globales
let web3 = null;
let contract = null;
let userAccount = null;
let isOwner = false;
let isMember = false;
let refreshInterval = null;

// ===============================
//      CONNEXION WALLET
// ===============================

async function connectWallet() {
    console.log('🔍 Connexion au wallet...');

    if (typeof window.ethereum === 'undefined') {
        const msg = '❌ MetaMask non installé! Veuillez installer MetaMask.';
        alert(msg);
        showNotification(msg, 'error');
        return;
    }

    try {
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        if (!accounts || accounts.length === 0) {
            throw new Error('Aucun compte disponible');
        }

        userAccount = accounts[0];
        console.log('✅ Compte connecté:', userAccount);

        // Vérifier le réseau
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        if (chainId !== SEPOLIA_CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: SEPOLIA_CHAIN_ID }]
                });
            } catch (switchError) {
                throw new Error('Veuillez basculer vers le réseau Sepolia dans MetaMask');
            }
        }

        // Initialiser Web3
        if (typeof Web3 === 'undefined') {
            throw new Error('Web3 n\'est pas chargé');
        }
        web3 = new Web3(window.ethereum);
        contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        console.log('✅ Web3 et Contrat initialisés');

        // Vérifier le rôle
        await checkUserRole();
        console.log('✅ Rôle vérifié - Owner:', isOwner, 'Membre:', isMember);

        // Mettre à jour l'interface
        updateUIBasedOnRole();

        // Charger les données
        await refreshData();

        // Auto-refresh
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(refreshData, 10000);

        // Retirer les écouteurs existants avant d'en ajouter de nouveaux
        if (window.ethereum.removeListener) {
            try {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            } catch (e) {}
        }

        // Écouter les changements
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => location.reload());

        showNotification('✅ Wallet connecté!', 'success');
        console.log('🎉 CONNEXION RÉUSSIE');

    } catch (err) {
        console.error('❌ ERREUR:', err);
        showNotification('❌ ' + err.message, 'error');
    }
}

// ===============================
//      GESTION CHANGEMENT DE COMPTE
// ===============================

function handleAccountsChanged(accounts) {
    console.log('📱 Changement de compte détecté:', accounts);
    
    if (accounts.length === 0) {
        console.log('❌ Aucun compte - Déconnexion');
        disconnectWallet();
    } else {
        const newAccount = accounts[0];
        
        // Vérifier si c'est vraiment un changement
        if (userAccount && userAccount.toLowerCase() === newAccount.toLowerCase()) {
            console.log('✅ Même compte - Pas de reconnexion');
            return;
        }
        
        console.log('✅ Nouveau compte détecté:', newAccount);
        
        // Réinitialiser avant reconnexion
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
        
        web3 = null;
        contract = null;
        isOwner = false;
        isMember = false;
        
        userAccount = newAccount;
        console.log('🔄 Reconnexion avec:', userAccount);
        
        // Reconnexion avec le nouveau compte
        connectWallet();
    }
}

// ===============================
//      DÉCONNEXION WALLET
// ===============================

function disconnectWallet() {
    console.log('🔌 Déconnexion en cours...');
    
    try {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
        
        if (window.ethereum && window.ethereum.removeListener) {
            try {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            } catch (e) {}
        }
        
        web3 = null;
        contract = null;
        userAccount = null;
        isOwner = false;
        isMember = false;
        
        document.getElementById('ownerSection').classList.remove('active');
        document.getElementById('memberSection').classList.remove('active');
        document.getElementById('nonMemberSection').classList.remove('active');
        
        document.getElementById('walletInfo').classList.remove('connected');
        document.getElementById('roleBadge').classList.remove('visible');
        document.getElementById('notConnected').style.display = 'block';
        document.getElementById('switchBtn').style.display = 'none';
        
        const connectBtn = document.getElementById('connectBtn');
        connectBtn.textContent = 'Connecter Wallet';
        connectBtn.disabled = false;
        const newBtn = connectBtn.cloneNode(true);
        connectBtn.parentNode.replaceChild(newBtn, connectBtn);
        newBtn.addEventListener('click', connectWallet);
        
        showNotification('👋 Déconnecté', 'success');
        console.log('🎉 Déconnexion réussie');
        
    } catch (err) {
        console.error('❌ Erreur déconnexion:', err);
        setTimeout(() => location.reload(), 1000);
    }
}

// ===============================
//      CHANGER DE COMPTE
// ===============================

async function switchAccount() {
    console.log('🔄 Ouverture de MetaMask pour changer de compte...');
    
    if (typeof window.ethereum === 'undefined') {
        showNotification('❌ MetaMask non installé!', 'error');
        return;
    }

    try {
        showNotification('💡 Changez de compte dans MetaMask', 'warning');
        
        // Demander à MetaMask de montrer la liste des comptes
        await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{
                eth_accounts: {}
            }]
        });
        
    } catch (err) {
        console.error('❌ Erreur changement:', err);
        if (err.code !== 4001) { // 4001 = user rejected
            showNotification('❌ Erreur lors du changement', 'error');
        }
    }
}

// ===============================
//      VÉRIFIER LE RÔLE
// ===============================

async function checkUserRole() {
    try {
        console.log('🔍 Vérification du rôle pour:', userAccount);
        
        const ownerAddress = await contract.methods.owner().call();
        isOwner = userAccount.toLowerCase() === ownerAddress.toLowerCase();
        console.log('Est Owner?', isOwner);

        isMember = await contract.methods.isMember(userAccount).call();
        console.log('Est Membre?', isMember);

        console.log('👤 Rôle détecté:', isOwner ? 'OWNER' : isMember ? 'MEMBRE' : 'NON-MEMBRE');
        
    } catch (err) {
        console.error('❌ Erreur vérification rôle:', err);
        throw err;
    }
}

// ===============================
//      AFFICHER L'INTERFACE SELON LE RÔLE
// ===============================

function updateUIBasedOnRole() {
    console.log('🎨 Mise à jour UI - Rôle:', isOwner ? 'OWNER' : isMember ? 'MEMBRE' : 'NON-MEMBRE');
    
    document.getElementById('walletAddress').textContent =
        userAccount.substring(0, 6) + '...' + userAccount.substring(38);
    document.getElementById('walletInfo').classList.add('connected');
    document.getElementById('notConnected').style.display = 'none';

    const roleBadge = document.getElementById('roleBadge');
    
    document.getElementById('ownerSection').classList.remove('active');
    document.getElementById('memberSection').classList.remove('active');
    document.getElementById('nonMemberSection').classList.remove('active');

    if (isOwner) {
        console.log('✅ Affichage: SECTION OWNER');
        roleBadge.textContent = '👑 ADMINISTRATEUR';
        roleBadge.className = 'role-badge visible owner';
        document.getElementById('ownerSection').classList.add('active');

    } else if (isMember) {
        console.log('✅ Affichage: SECTION MEMBRE');
        roleBadge.textContent = '✅ MEMBRE';
        roleBadge.className = 'role-badge visible member';
        document.getElementById('memberSection').classList.add('active');

    } else {
        console.log('✅ Affichage: SECTION NON-MEMBRE');
        roleBadge.textContent = '❌ NON-MEMBRE';
        roleBadge.className = 'role-badge visible non-member';
        document.getElementById('nonMemberSection').classList.add('active');
        document.getElementById('yourAddress').textContent = userAccount;
    }

    const connectBtn = document.getElementById('connectBtn');
    connectBtn.textContent = '🔌 Déconnecter';
    connectBtn.disabled = false;
    const newBtn = connectBtn.cloneNode(true);
    connectBtn.parentNode.replaceChild(newBtn, connectBtn);
    newBtn.addEventListener('click', disconnectWallet);
    
    const switchBtn = document.getElementById('switchBtn');
    switchBtn.style.display = 'block';
    const newSwitchBtn = switchBtn.cloneNode(true);
    switchBtn.parentNode.replaceChild(newSwitchBtn, switchBtn);
    newSwitchBtn.addEventListener('click', switchAccount);
}

// ===============================
//      RAFRAÎCHIR LES DONNÉES
// ===============================

async function refreshData() {
    if (!contract || !userAccount) return;

    try {
        const balance = await contract.methods.getBalance().call();
        const memberCount = await contract.methods.getMemberCount().call();
        const proposalCount = await contract.methods.proposalCount().call();

        ['totalBalance1', 'totalBalance2', 'totalBalance3'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = (balance / 1e18).toFixed(4) + ' ETH';
        });

        ['memberCount1', 'memberCount2', 'memberCount3'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = memberCount;
        });

        ['totalProposals1', 'totalProposals2'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = proposalCount;
        });

        await Promise.all([loadProposals(), loadMembers()]);
        console.log('✅ Données rafraîchies');
    } catch (err) {
        console.error('❌ Erreur refresh:', err);
    }
}

// ===============================
//      CHARGER LES PROPOSITIONS
// ===============================

async function loadProposals() {
    const containers = ['proposalsList1', 'proposalsList2'];

    try {
        const count = await contract.methods.proposalCount().call();
        let html = '';
        let activeCount = 0;

        if (count == 0) {
            containers.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '<div class="empty-state">🌟 Aucune proposition</div>';
            });
            return;
        }

        for (let i = 0; i < count; i++) {
            const proposal = await contract.methods.getProposal(i).call();
            const hasVoted = await contract.methods.hasVoted(i, userAccount).call();
            const isApproved = await contract.methods.isProposalApproved(i).call();

            const totalVotes = parseInt(proposal.votesFor) + parseInt(proposal.votesAgainst);
            const percentage = totalVotes > 0 ? 
                (parseInt(proposal.votesFor) / totalVotes * 100).toFixed(0) : 0;

            const now = Math.floor(Date.now() / 1000);
            const isExpired = now > parseInt(proposal.deadline);

            if (!proposal.executed && !isExpired) activeCount++;

            const statusBadge = proposal.executed
                ? '<span class="status-badge" style="background: rgba(124, 58, 237, 0.2); color: #7c3aed;">✅ Exécutée</span>'
                : isExpired
                    ? '<span class="status-badge status-pending">⏱️ Terminée</span>'
                    : '<span class="status-badge status-active">🗳️ En Vote</span>';

            const canExecute = isExpired && !proposal.executed && isApproved && isMember;
            const canVote = !isExpired && !hasVoted && !proposal.executed && isMember;

            html += `
                <div class="proposal-item">
                    <div class="proposal-header">
                        <div>
                            <div class="proposal-title">${escapeHtml(proposal.description)}</div>
                            ${statusBadge}
                        </div>
                        <div class="proposal-amount">${(proposal.amount / 1e18).toFixed(4)} ETH</div>
                    </div>
                    <div class="proposal-description">
                        📋 ${proposal.recipient.substring(0, 6)}...${proposal.recipient.substring(38)}
                    </div>
                    <div class="vote-bar">
                        <div class="vote-progress" style="width: ${percentage}%"></div>
                    </div>
                    <div class="vote-info">
                        <span>✅ Pour: ${proposal.votesFor}</span>
                        <span>❌ Contre: ${proposal.votesAgainst}</span>
                        <span>📊 ${percentage}%</span>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-success" onclick="voteProposal(${i}, true)" 
                            ${!canVote ? 'disabled' : ''}>
                            ${hasVoted ? '✓ Voté' : isMember ? '👍 Pour' : '🔒 Membres'}
                        </button>
                        <button class="btn btn-danger" onclick="voteProposal(${i}, false)" 
                            ${!canVote ? 'disabled' : ''}>
                            ${hasVoted ? '✓ Voté' : isMember ? '👎 Contre' : '🔒 Membres'}
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="executeProposal(${i})" 
                            ${!canExecute ? 'disabled' : ''}>
                            ⚡ Exécuter
                        </button>
                    </div>
                </div>
            `;
        }

        ['activeProposals1', 'activeProposals2'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = activeCount;
        });

        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        });

    } catch (err) {
        console.error('❌ Erreur propositions:', err);
    }
}

// ===============================
//      CHARGER LES MEMBRES
// ===============================

async function loadMembers() {
    const containers = ['membersList1', 'membersList2'];

    try {
        const members = await contract.methods.getAllMembers().call();
        let html = '';

        if (members.length === 0) {
            containers.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '<div class="empty-state">👥 Aucun membre</div>';
            });
            return;
        }

        const owner = await contract.methods.owner().call();

        for (let addr of members) {
            const initials = addr.substring(2, 4).toUpperCase();
            const isCurrentUser = addr.toLowerCase() === userAccount.toLowerCase();
            const isOwnerAddr = addr.toLowerCase() === owner.toLowerCase();

            html += `
                <div class="member-item">
                    <div class="member-info">
                        <div class="member-avatar">${initials}</div>
                        <div>
                            <strong>${addr.substring(0, 6)}...${addr.substring(38)}</strong>
                            ${isCurrentUser ? ' <small style="color: var(--primary);">👤 (Vous)</small>' : ''}
                            ${isOwnerAddr ? ' <small style="color: var(--accent);">👑 (Owner)</small>' : ''}
                        </div>
                    </div>
                    <span class="status-badge status-active">✅ Actif</span>
                </div>
            `;
        }

        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        });

    } catch (err) {
        console.error('❌ Erreur membres:', err);
    }
}

// ===============================
//      CRÉER UNE PROPOSITION
// ===============================

async function createProposal(e) {
    e.preventDefault();

    if (!isMember) {
        showNotification('❌ Seuls les membres peuvent créer', 'error');
        return;
    }

    const btn = document.getElementById('submitPropBtn');
    const errorDiv = document.getElementById('propError');
    errorDiv.textContent = '';

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span> Création...';

        const desc = document.getElementById('propDesc').value.trim();
        const recipient = document.getElementById('propRecipient').value.trim();
        const amount = document.getElementById('propAmount').value;
        const duration = document.getElementById('propDuration').value;

        if (!web3.utils.isAddress(recipient)) throw new Error('Adresse invalide');
        if (amount <= 0) throw new Error('Montant > 0 requis');

        const amountWei = web3.utils.toWei(amount, 'ether');

        await contract.methods.createProposal(desc, recipient, amountWei, duration)
            .send({ from: userAccount });

        showNotification('🎉 Proposition créée!', 'success');
        closeModal('proposalModal');
        document.getElementById('proposalForm').reset();
        await refreshData();

    } catch (err) {
        console.error('❌ Erreur:', err);
        errorDiv.textContent = '❌ ' + err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Créer';
    }
}

// ===============================
//      AJOUTER UN MEMBRE
// ===============================

async function addMember(e) {
    e.preventDefault();

    if (!isOwner) {
        showNotification('❌ Seul l\'owner peut ajouter', 'error');
        return;
    }

    const btn = document.getElementById('submitMemberBtn');
    const errorDiv = document.getElementById('memberError');
    errorDiv.textContent = '';

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span> Ajout...';

        const addr = document.getElementById('memberAddr').value.trim();

        if (!web3.utils.isAddress(addr)) throw new Error('Adresse invalide');

        await contract.methods.addMember(addr).send({ from: userAccount });

        showNotification('🎉 Membre ajouté!', 'success');
        closeModal('memberModal');
        document.getElementById('memberForm').reset();
        await refreshData();

    } catch (err) {
        console.error('❌ Erreur:', err);
        errorDiv.textContent = '❌ ' + err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Ajouter';
    }
}

// ===============================
//      VOTER
// ===============================

async function voteProposal(proposalId, support) {
    if (!isMember) {
        showNotification('❌ Seuls les membres votent', 'error');
        return;
    }

    try {
        showNotification('⏳ Vote en cours...', 'warning');
        
        await contract.methods.vote(proposalId, support)
            .send({ from: userAccount });
        
        showNotification(`✅ Vote ${support ? 'POUR' : 'CONTRE'} enregistré!`, 'success');
        await refreshData();
    } catch (err) {
        console.error('❌ Erreur:', err);
        showNotification('❌ ' + (err.message || 'Erreur vote'), 'error');
    }
}

// ===============================
//      EXÉCUTER PROPOSITION
// ===============================

async function executeProposal(proposalId) {
    if (!isMember) {
        showNotification('❌ Seuls les membres exécutent', 'error');
        return;
    }

    try {
        showNotification('⏳ Exécution...', 'warning');
        
        await contract.methods.executeProposal(proposalId)
            .send({ from: userAccount });
        
        showNotification('🎉 Exécutée!', 'success');
        await refreshData();
    } catch (err) {
        console.error('❌ Erreur:', err);
        showNotification('❌ ' + (err.message || 'Erreur exécution'), 'error');
    }
}

// ===============================
//      DÉPOSER DES FONDS
// ===============================

async function depositFunds(e) {
    e.preventDefault();

    const btn = document.getElementById('submitDepositBtn');
    const errorDiv = document.getElementById('depositError');
    errorDiv.textContent = '';

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span> Dépôt...';

        const amount = document.getElementById('depositAmount').value;
        if (amount <= 0) throw new Error('Montant > 0 requis');

        const amountWei = web3.utils.toWei(amount, 'ether');

        await web3.eth.sendTransaction({
            from: userAccount,
            to: CONTRACT_ADDRESS,
            value: amountWei
        });

        showNotification(`🎉 ${amount} ETH déposés!`, 'success');
        closeModal('depositModal');
        document.getElementById('depositForm').reset();
        await refreshData();

    } catch (err) {
        console.error('❌ Erreur:', err);
        errorDiv.textContent = '❌ ' + err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Déposer';
    }
}

// ===============================
//      GESTION DES MODALS
// ===============================

function openModal(id) {
    if (id === 'proposalModal' && !isMember) {
        showNotification('❌ Seuls les membres créent', 'error');
        return;
    }
    if (id === 'memberModal' && !isOwner) {
        showNotification('❌ Seul l\'owner ajoute', 'error');
        return;
    }

    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = 'auto';
}

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal.id);
    });
});

// ===============================
//      UTILITAIRES
// ===============================

function showNotification(message, type) {
    const div = document.createElement('div');
    div.className = `notification ${type}`;
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}