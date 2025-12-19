// ==================== CONFIGURATION ====================
/* global Web3 */

const SEPOLIA_CHAIN_ID = "0xaa36a7"
const CONTRACT_ADDRESS = "0x5AdCFfBAFBD338F2D86B7aB2143533089f1Aa390"

const CONTRACT_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    inputs: [{ internalType: "address", name: "_member", type: "address" },
             { internalType: "string", name: "_name", type: "string" },
             { internalType: "string", name: "_role", type: "string" }],
    name: "addMember",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_member", type: "address" },
             { internalType: "string", name: "_name", type: "string" },
             { internalType: "string", name: "_role", type: "string" }],
    name: "updateMember",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_member", type: "address" }],
    name: "removeMember",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllMembers",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_member", type: "address" }],
    name: "getMemberInfo",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "role", type: "string" },
      { internalType: "bool", name: "isActive", type: "bool" },
      { internalType: "uint256", name: "joinedAt", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMemberCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_proposalId", type: "uint256" }],
    name: "getProposal",
    outputs: [
      { internalType: "uint256", name: "id", type: "uint256" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "votesFor", type: "uint256" },
      { internalType: "uint256", name: "votesAgainst", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "bool", name: "executed", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_proposalId", type: "uint256" },
      { internalType: "address", name: "_voter", type: "address" },
    ],
    name: "hasVoted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_address", type: "address" }],
    name: "isMember",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_proposalId", type: "uint256" }],
    name: "isProposalApproved",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "proposalCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_description", type: "string" },
      { internalType: "address payable", name: "_recipient", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
      { internalType: "uint256", name: "_durationInMinutes", type: "uint256" },
    ],
    name: "createProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_proposalId", type: "uint256" },
      { internalType: "bool", name: "_support", type: "bool" },
    ],
    name: "vote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_proposalId", type: "uint256" }],
    name: "executeProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
  { stateMutability: "payable", type: "fallback" },
]

// ==================== VARIABLES GLOBALES ====================
let web3 = null
let contract = null
let userAccount = null
let isAdmin = false
let isMember = false
let refreshInterval = null
let timerInterval = null // NOUVEAU: Pour mettre à jour les timers
let memberToEdit = null

// ==================== NAVIGATION ====================
function navigateToPage(pageName) {
  console.log("[SafeClub] Navigation vers:", pageName)
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"))
  const pageElement = document.getElementById(pageName)
  if (pageElement) {
    pageElement.classList.add("active")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (contract && userAccount && (pageName === "adminDashboard" || pageName === "memberDashboard")) {
    refreshData()
  }
}

// ==================== CONNEXION WALLET ====================
async function connectWallet() {
  console.log("[SafeClub] Tentative de connexion...")

  if (!window.ethereum) {
    showNotification("MetaMask non installé", "error")
    return
  }

  try {
    web3 = null
    contract = null
    isAdmin = false
    isMember = false

    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
    if (!accounts || accounts.length === 0) throw new Error("Aucun compte disponible")

    userAccount = accounts[0]
    showNotification(`Compte connecté: ${userAccount.substring(0, 6)}...`, "success")

    await switchToSepolia()
    web3 = new Web3(window.ethereum)
    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS)

    const code = await web3.eth.getCode(CONTRACT_ADDRESS)
    if (code === "0x") throw new Error("Contrat non trouvé")

    await checkUserRole()
    updateUI()
    await refreshData()

    // MODIFIÉ: Refresh toutes les 5 secondes au lieu de 10
    if (refreshInterval) clearInterval(refreshInterval)
    refreshInterval = setInterval(refreshData, 5000)

    // NOUVEAU: Timer mis à jour chaque seconde
    if (timerInterval) clearInterval(timerInterval)
    timerInterval = setInterval(updateTimers, 1000)

    if (window.ethereum) {
      window.ethereum.removeAllListeners("accountsChanged")
      window.ethereum.removeAllListeners("chainChanged")
      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", () => location.reload())
    }

    showNotification("Connecté avec succès", "success")

    setTimeout(() => {
      if (isAdmin) navigateToPage("adminDashboard")
      else if (isMember) navigateToPage("memberDashboard")
      else navigateToPage("nonMemberView")
    }, 500)

  } catch (err) {
    console.error("[SafeClub] Erreur:", err.message)
    showNotification(`${err.message}`, "error")
    userAccount = null
    updateUI()
  }
}

// ==================== BASCULER VERS SEPOLIA ====================
async function switchToSepolia() {
  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" })
    if (chainId !== SEPOLIA_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        })
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: SEPOLIA_CHAIN_ID,
              chainName: "Sepolia",
              rpcUrls: ["https://rpc.sepolia.org"],
              nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
            }],
          })
        }
      }
    }
  } catch (err) {
    throw new Error("Réseau Sepolia non accessible")
  }
}

// ==================== GESTION CHANGEMENT DE COMPTE ====================
function handleAccountsChanged(accounts) {
  if (!accounts || accounts.length === 0) {
    disconnectWallet()
    return
  }
  const newAccount = accounts[0]
  if (userAccount && userAccount.toLowerCase() !== newAccount.toLowerCase()) {
    setTimeout(() => connectWallet(), 1000)
  }
}

// ==================== DÉCONNEXION ====================
function disconnectWallet() {
  if (refreshInterval) clearInterval(refreshInterval)
  if (timerInterval) clearInterval(timerInterval) // NOUVEAU
  if (window.ethereum) {
    window.ethereum.removeAllListeners("accountsChanged")
    window.ethereum.removeAllListeners("chainChanged")
  }
  web3 = null
  contract = null
  userAccount = null
  isAdmin = false
  isMember = false
  updateUI()
  navigateToPage("home")
  showNotification("Déconnecté", "success")
}

// ==================== CHANGER DE COMPTE ====================
async function switchAccount() {
  if (!window.ethereum) return
  try {
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    })
  } catch (err) {
    if (err.code !== 4001) console.error(err)
  }
}

// ==================== VÉRIFIER LE RÔLE ====================
async function checkUserRole() {
  if (!contract || !userAccount) return
  try {
    const owner = await contract.methods.owner().call()
    isAdmin = userAccount.toLowerCase() === owner.toLowerCase()
    isMember = await contract.methods.isMember(userAccount).call()
    if (isAdmin) isMember = true
  } catch (err) {
    console.error("Erreur rôle:", err)
  }
}

// ==================== METTRE À JOUR L'UI ====================
function updateUI() {
  const walletInfo = document.getElementById("walletInfo")
  const connectBtn = document.getElementById("connectBtn")
  const switchBtn = document.getElementById("switchBtn")
  const roleBadge = document.getElementById("roleBadge")
  const walletAddress = document.getElementById("walletAddress")

  if (userAccount) {
    walletAddress.textContent = userAccount.substring(0, 6) + "..." + userAccount.substring(38)
    walletInfo.classList.add("active")
    connectBtn.textContent = "Déconnecter"
    connectBtn.onclick = disconnectWallet
    switchBtn.style.display = "block"

    if (isAdmin) {
      roleBadge.textContent = "ADMIN"
      roleBadge.className = "role-badge admin"
    } else if (isMember) {
      roleBadge.textContent = "MEMBRE"
      roleBadge.className = "role-badge member"
    } else {
      roleBadge.textContent = "NON-MEMBRE"
      roleBadge.className = "role-badge non-member"
    }
  } else {
    walletInfo.classList.remove("active")
    connectBtn.textContent = "Connecter Wallet"
    connectBtn.onclick = connectWallet
    switchBtn.style.display = "none"
  }
}

// ==================== RAFRAÎCHIR LES DONNÉES ====================
async function refreshData() {
  if (!contract || !userAccount) return
  try {
    const balance = await contract.methods.getBalance().call()
    const memberCount = await contract.methods.getMemberCount().call()
    const proposalCount = await contract.methods.proposalCount().call()
    const balanceETH = (balance / 1e18).toFixed(4) + " ETH"

    if (isAdmin) {
      const adminBalance = document.getElementById("adminBalance")
      const adminMemberCount = document.getElementById("adminMemberCount")
      const adminTotalProposals = document.getElementById("adminTotalProposals")
      if (adminBalance) adminBalance.textContent = balanceETH
      if (adminMemberCount) adminMemberCount.textContent = memberCount
      if (adminTotalProposals) adminTotalProposals.textContent = proposalCount
      await loadProposals("adminProposalsList", "adminActiveProposals")
      await loadMembers()
    } else if (isMember) {
      const memberBalance = document.getElementById("memberBalance")
      const memberMemberCount = document.getElementById("memberMemberCount")
      const memberTotalProposals = document.getElementById("memberTotalProposals")
      if (memberBalance) memberBalance.textContent = balanceETH
      if (memberMemberCount) memberMemberCount.textContent = memberCount
      if (memberTotalProposals) memberTotalProposals.textContent = proposalCount
      await loadProposals("memberProposalsList", "memberActiveProposals")
    }
  } catch (err) {
    console.error("Erreur refresh:", err)
  }
}

// ==================== NOUVEAU: FORMATER LE TEMPS RESTANT ====================
function formatTimeRemaining(seconds) {
  if (seconds <= 0) return "Terminé"
  
  if (seconds < 60) {
    return `${seconds}s restantes`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}

// ==================== NOUVEAU: METTRE À JOUR LES TIMERS ====================
function updateTimers() {
  const timerElements = document.querySelectorAll('.proposal-timer')
  const now = Math.floor(Date.now() / 1000)
  
  timerElements.forEach(el => {
    const deadline = parseInt(el.dataset.deadline)
    const remaining = deadline - now
    el.textContent = formatTimeRemaining(remaining)
    
    // Changer la couleur selon le temps restant
    if (remaining <= 0) {
      el.style.color = 'var(--danger)'
    } else if (remaining <= 30) {
      el.style.color = 'var(--warning)'
    } else {
      el.style.color = 'var(--primary)'
    }
  })
}

// ==================== CHARGER PROPOSITIONS ====================
async function loadProposals(containerId, activeCountId) {
  const container = document.getElementById(containerId)
  if (!container) return

  try {
    const count = await contract.methods.proposalCount().call()
    let html = ""
    let activeCount = 0

    if (count == 0) {
      container.innerHTML = '<div class="empty-state">Aucune proposition</div>'
      if (activeCountId) document.getElementById(activeCountId).textContent = "0"
      return
    }

    const now = Math.floor(Date.now() / 1000)

    for (let i = 0; i < count; i++) {
      const proposal = await contract.methods.getProposal(i).call()
      const hasVoted = await contract.methods.hasVoted(i, userAccount).call()
      const isApproved = await contract.methods.isProposalApproved(i).call()

      const totalVotes = Number(proposal.votesFor) + Number(proposal.votesAgainst)
      const percentage = totalVotes > 0 ? ((Number(proposal.votesFor) / totalVotes) * 100).toFixed(0) : 0
      const isExpired = now > Number(proposal.deadline)
      const timeRemaining = Number(proposal.deadline) - now

      if (!proposal.executed && !isExpired) activeCount++

      // MODIFIÉ: Ajout du timer et meilleur affichage
      const statusBadge = proposal.executed
        ? '<span class="proposal-status status-executed">Exécutée</span>'
        : isExpired ? '<span class="proposal-status status-expired">Vote Terminé</span>'
        : `<span class="proposal-status status-active">En Vote</span>`

      // NOUVEAU: Timer visible
      const timerHtml = !proposal.executed && !isExpired 
        ? `<div class="proposal-timer" data-deadline="${proposal.deadline}">${formatTimeRemaining(timeRemaining)}</div>`
        : ''

      const canVote = !isExpired && !hasVoted && !proposal.executed && isMember
      const canExecute = isExpired && !proposal.executed && isApproved && isMember

      html += `<div class="proposal-item">
        <div class="proposal-header">
          <div>
            <div class="proposal-title">${escapeHtml(proposal.description)}</div>
            ${statusBadge}
            ${timerHtml}
          </div>
          <div class="proposal-amount">${(proposal.amount / 1e18).toFixed(4)} ETH</div>
        </div>
        <div style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">
          Destinataire: ${proposal.recipient.substring(0, 6)}...${proposal.recipient.substring(38)}
        </div>
        <div class="vote-bar">
          <div class="vote-progress" style="width: ${percentage}%"></div>
        </div>
        <div class="vote-info">
          <span>Pour: ${proposal.votesFor}</span>
          <span>Contre: ${proposal.votesAgainst}</span>
          <span>Approbation: ${percentage}%</span>
        </div>
        <div class="btn-group">
          <button class="btn btn-success btn-sm" onclick="voteProposal(${i}, true)" ${!canVote ? "disabled" : ""}>
            ${hasVoted ? "Vous avez voté" : "Voter Pour"}
          </button>
          <button class="btn btn-danger btn-sm" onclick="voteProposal(${i}, false)" ${!canVote ? "disabled" : ""}>
            ${hasVoted ? "Vous avez voté" : "Voter Contre"}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="executeProposal(${i})" ${!canExecute ? "disabled" : ""}>
            ${canExecute ? "✓ Exécuter Maintenant" : "Exécuter"}
          </button>
        </div>
      </div>`
    }

    if (activeCountId) document.getElementById(activeCountId).textContent = activeCount
    container.innerHTML = html
  } catch (err) {
    console.error("Erreur propositions:", err)
    container.innerHTML = '<div class="empty-state">Erreur</div>'
  }
}

// ==================== CHARGER MEMBRES ====================
async function loadMembers() {
  const container = document.getElementById("adminMembersList")
  if (!container) return

  try {
    const members = await contract.methods.getAllMembers().call()
    let html = ""

    if (members.length === 0) {
      container.innerHTML = '<div class="empty-state">Aucun membre</div>'
      return
    }

    const owner = await contract.methods.owner().call()

    for (const addr of members) {
      const initials = addr.substring(2, 4).toUpperCase()
      const isCurrentUser = addr.toLowerCase() === userAccount.toLowerCase()
      const isOwner = addr.toLowerCase() === owner.toLowerCase()
      
      let memberInfo = { name: "", role: "" }
      try {
        const info = await contract.methods.getMemberInfo(addr).call()
        memberInfo = { 
          name: info.name && info.name.length > 0 ? info.name : "", 
          role: info.role && info.role.length > 0 ? info.role : ""
        }
      } catch (e) {
        console.warn("Infos membre indisponibles pour:", addr)
      }

      const name = escapeHtml(memberInfo.name)
      const role = escapeHtml(memberInfo.role)
      
      let displayName, displayRole
      if (isOwner) {
        displayName = name || "Administrateur"
        displayRole = role || "Administrateur"
      } else {
        displayName = name || "Membre"
        displayRole = role || "Non spécifié"
      }

      html += `<div class="member-item">
        <div class="member-info">
          <div class="member-avatar">${initials}</div>
          <div class="member-details">
            <div class="member-name"><strong>${displayName}</strong></div>
            <div class="member-role">${displayRole}</div>
            <div class="member-address">${addr.substring(0, 6)}...${addr.substring(38)}</div>
            <div class="member-label">
              ${isCurrentUser ? "Vous" : ""}
              ${isOwner ? " • Admin" : ""}
            </div>
          </div>
        </div>
        <div class="member-actions">
          ${!isOwner ? `
            <button class="btn btn-secondary btn-sm" onclick="editMember('${addr}', '${name}', '${role}')">
              Modifier
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteMember('${addr}', '${displayName}')">
              Supprimer
            </button>
          ` : `<span class="member-badge">ADMIN</span>`}
        </div>
      </div>`
    }

    container.innerHTML = html
  } catch (err) {
    console.error("Erreur membres:", err)
    container.innerHTML = '<div class="empty-state">Erreur</div>'
  }
}

// ==================== CRÉER PROPOSITION ====================
async function createProposal(e) {
  e.preventDefault()
  if (!isMember && !isAdmin) {
    showNotification("Seuls les membres peuvent créer des propositions", "error")
    return
  }

  const btn = e.target.querySelector('button[type="submit"]')
  const errorDiv = document.getElementById("propError")
  errorDiv.textContent = ""

  try {
    btn.disabled = true
    btn.innerHTML = 'Création...'

    const desc = document.getElementById("propDesc").value.trim()
    const recipient = document.getElementById("propRecipient").value.trim()
    const amount = document.getElementById("propAmount").value
    const duration = document.getElementById("propDuration").value // MAINTENANT EN MINUTES

    if (!desc || !web3.utils.isAddress(recipient) || amount <= 0 || duration <= 0) {
      throw new Error("Données invalides")
    }

    // MODIFIÉ: Validation pour durée minimale d'1 minute
    if (duration < 1) {
      throw new Error("Durée minimale: 1 minute")
    }

    const amountWei = web3.utils.toWei(amount, "ether")
    // MODIFIÉ: Envoie maintenant en minutes au lieu de jours
    await contract.methods.createProposal(desc, recipient, amountWei, duration).send({ from: userAccount })

    showNotification("Proposition créée", "success")
    closeModal("proposalModal")
    e.target.reset()
    await refreshData()
  } catch (err) {
    errorDiv.textContent = err.message || "Erreur"
  } finally {
    btn.disabled = false
    btn.textContent = "Créer Proposition"
  }
}

// ==================== AJOUTER MEMBRE ====================
async function addMember(e) {
  e.preventDefault()
  if (!isAdmin) {
    showNotification("Admin uniquement", "error")
    return
  }

  const btn = e.target.querySelector('button[type="submit"]')
  const errorDiv = document.getElementById("memberError")
  errorDiv.textContent = ""

  try {
    btn.disabled = true
    btn.innerHTML = 'Ajout...'

    const addr = document.getElementById("memberAddr").value.trim()
    const name = document.getElementById("memberName").value.trim()
    const role = document.getElementById("memberRole").value.trim()

    console.log("[SafeClub] Ajout membre avec:", { addr, name, role })

    if (!web3.utils.isAddress(addr)) {
      throw new Error("Adresse Ethereum invalide")
    }

    if (!name || name.length < 2) {
      throw new Error("Nom doit avoir au moins 2 caractères")
    }

    if (!role || role.length < 2) {
      throw new Error("Rôle invalide")
    }

    const isMemberAlready = await contract.methods.isMember(addr).call()
    if (isMemberAlready) throw new Error("Déjà membre")

    console.log("[SafeClub] Envoi transaction addMember...")
    await contract.methods.addMember(addr, name, role).send({ from: userAccount })

    showNotification(`${name} ajouté avec succès`, "success")
    closeModal("memberModal")
    e.target.reset()
    await refreshData()
  } catch (err) {
    console.error("[SafeClub] Erreur ajout:", err)
    errorDiv.textContent = err.message || "Erreur"
  } finally {
    btn.disabled = false
    btn.textContent = "Ajouter Membre"
  }
}

// ==================== ÉDITER MEMBRE ====================
function editMember(address, name, role) {
  memberToEdit = address
  document.getElementById("editMemberAddr").value = address
  document.getElementById("editMemberName").value = name
  document.getElementById("editMemberRole").value = role
  openModal("editMemberModal")
}

// ==================== SAUVEGARDER MODIFICATION ====================
async function saveMemberEdit(e) {
  e.preventDefault()
  if (!isAdmin) {
    showNotification("Admin uniquement", "error")
    return
  }

  const btn = e.target.querySelector('button[type="submit"]')
  const errorDiv = document.getElementById("editMemberError")
  errorDiv.textContent = ""

  try {
    btn.disabled = true
    btn.innerHTML = 'Modification...'

    const name = document.getElementById("editMemberName").value.trim()
    const role = document.getElementById("editMemberRole").value.trim()

    if (!name || name.length < 2 || !role) {
      throw new Error("Données invalides")
    }

    await contract.methods.updateMember(memberToEdit, name, role).send({ from: userAccount })

    showNotification("Membre modifié", "success")
    closeModal("editMemberModal")
    await refreshData()
  } catch (err) {
    errorDiv.textContent = err.message || "Erreur"
  } finally {
    btn.disabled = false
    btn.textContent = "Sauvegarder"
  }
}

// ==================== SUPPRIMER MEMBRE ====================
async function deleteMember(address, name) {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer ${name}?`)) return

  try {
    await contract.methods.removeMember(address).send({ from: userAccount })
    showNotification(`${name} supprimé`, "success")
    await refreshData()
  } catch (err) {
    showNotification(err.message || "Erreur suppression", "error")
  }
}

// ==================== VOTER ====================
async function voteProposal(proposalId, support) {
  if (!isMember) {
    showNotification("Membres uniquement", "error")
    return
  }

  try {
    showNotification("Vote en cours...", "warning")
    await contract.methods.vote(proposalId, support).send({ from: userAccount })
    showNotification(support ? "Vote POUR enregistré" : "Vote CONTRE enregistré", "success")
    await refreshData()
  } catch (err) {
    showNotification(err.message || "Erreur vote", "error")
  }
}

// ==================== EXÉCUTER PROPOSITION ====================
async function executeProposal(proposalId) {
  if (!isMember) {
    showNotification("Membres uniquement", "error")
    return
  }

  try {
    showNotification("Exécution...", "warning")
    await contract.methods.executeProposal(proposalId).send({ from: userAccount })
    showNotification("Exécutée avec succès!", "success")
    await refreshData()
  } catch (err) {
    showNotification(err.message || "Erreur exécution", "error")
  }
}

// ==================== DÉPOSER FONDS ====================
async function depositFunds() {
  if (!isAdmin) {
    showNotification("Admin uniquement", "error")
    return
  }

  const amount = document.getElementById("adminDepositAmount").value
  if (!amount || amount <= 0) {
    showNotification("Montant invalide", "error")
    return
  }

  try {
    showNotification("Dépôt...", "warning")
    const amountWei = web3.utils.toWei(amount, "ether")
    await web3.eth.sendTransaction({ from: userAccount, to: CONTRACT_ADDRESS, value: amountWei })
    showNotification(`${amount} ETH déposés`, "success")
    document.getElementById("adminDepositAmount").value = ""
    await refreshData()
  } catch (err) {
    showNotification(err.message || "Erreur dépôt", "error")
  }
}

// ==================== MODALS ====================
function openModal(id) {
  const modal = document.getElementById(id)
  if (id === "proposalModal" && !isMember && !isAdmin) {
    showNotification("Membres uniquement", "error")
    return
  }
  if (id === "memberModal" && !isAdmin) {
    showNotification("Admin uniquement", "error")
    return
  }
  if (modal) {
    modal.classList.add("active")
    document.body.style.overflow = "hidden"
  }
}

function closeModal(id) {
  const modal = document.getElementById(id)
  if (modal) {
    modal.classList.remove("active")
    document.body.style.overflow = "auto"
  }
}

// ==================== UTILITAIRES ====================
function showNotification(message, type = "success") {
  const div = document.createElement("div")
  div.className = `notification ${type}`
  div.textContent = message
  document.body.appendChild(div)
  setTimeout(() => div.remove(), 4000)
}

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

// ==================== INITIALISATION ====================
console.log("[SafeClub] Script chargé")

document.addEventListener("DOMContentLoaded", () => {
  console.log("[SafeClub] DOM chargé")
  if (typeof window.ethereum === "undefined") {
    showNotification("Installez MetaMask", "warning")
  }
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal.id)
    })
  })
})