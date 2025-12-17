// ==================== CONFIGURATION ====================
/* global Web3 */

const SEPOLIA_CHAIN_ID = "0xaa36a7"
const CONTRACT_ADDRESS = "0xA02375bb242eB5B16A5A9b6aF91A288Acb3AdC05"

const CONTRACT_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    inputs: [{ internalType: "address", name: "_member", type: "address" }],
    name: "addMember",
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
      { internalType: "uint256", name: "_durationInDays", type: "uint256" },
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

  // Vérifier MetaMask
  if (!window.ethereum) {
    showNotification("❌ MetaMask non installé! Veuillez installer MetaMask.", "error")
    console.error("[SafeClub] window.ethereum non trouvé")
    return
  }

  try {
    // Demander l'autorisation et obtenir les comptes
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    })

    console.log("[SafeClub] Comptes disponibles:", accounts)

    if (!accounts || accounts.length === 0) {
      throw new Error("Aucun compte MetaMask disponible")
    }

    userAccount = accounts[0]
    console.log("[SafeClub] Compte connecté:", userAccount)
    showNotification(`✅ Compte connecté: ${userAccount.substring(0, 6)}...`, "success")

    // Vérifier et basculer vers Sepolia
    await switchToSepolia()

    // Initialiser Web3
    web3 = new Web3(window.ethereum)
    console.log("[SafeClub] Web3 initialisé")

    // Initialiser le contrat
    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS)
    console.log("[SafeClub] Contrat initialisé:", CONTRACT_ADDRESS)

    // Vérifier que le contrat existe
    const code = await web3.eth.getCode(CONTRACT_ADDRESS)
    if (code === "0x" || code === "0x0") {
      throw new Error(`❌ Contrat non trouvé à ${CONTRACT_ADDRESS} sur Sepolia`)
    }
    console.log("[SafeClub] Contrat vérifié et actif")

    // Vérifier le rôle
    await checkUserRole()
    updateUI()
    await refreshData()

    // Auto-refresh toutes les 10 secondes
    if (refreshInterval) clearInterval(refreshInterval)
    refreshInterval = setInterval(refreshData, 10000)

    // Ajouter les listeners
    window.ethereum.removeAllListeners("accountsChanged")
    window.ethereum.removeAllListeners("chainChanged")
    window.ethereum.on("accountsChanged", handleAccountsChanged)
    window.ethereum.on("chainChanged", () => {
      console.log("[SafeClub] Réseau changé, rechargement...")
      location.reload()
    })

    showNotification("🎉 Connecté avec succès!", "success")

    // Naviguer vers le dashboard approprié
    if (isAdmin) {
      navigateToPage("adminDashboard")
    } else if (isMember) {
      navigateToPage("memberDashboard")
    } else {
      navigateToPage("nonMemberView")
    }
  } catch (err) {
    console.error("[SafeClub] ERREUR de connexion:", err.message)
    showNotification(`❌ Erreur: ${err.message}`, "error")
    userAccount = null
    isAdmin = false
    isMember = false
    updateUI()
  }
}

// ==================== BASCULER VERS SEPOLIA ====================
async function switchToSepolia() {
  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" })
    console.log("[SafeClub] Chain ID actuel:", chainId)

    if (chainId !== SEPOLIA_CHAIN_ID) {
      console.log("[SafeClub] Basculement vers Sepolia...")
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        })
        showNotification("✅ Réseau Sepolia activé", "success")
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          // Réseau non ajouté, l'ajouter
          console.log("[SafeClub] Ajout du réseau Sepolia...")
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: SEPOLIA_CHAIN_ID,
              chainName: "Sepolia",
              rpcUrls: ["https://rpc.sepolia.org"],
              nativeCurrency: {
                name: "Ethereum",
                symbol: "ETH",
                decimals: 18,
              },
            }],
          })
          showNotification("✅ Sepolia ajouté et activé", "success")
        } else {
          throw switchErr
        }
      }
    }
  } catch (err) {
    console.error("[SafeClub] Erreur changement de réseau:", err)
    throw new Error("Veuillez utiliser MetaMask sur le réseau Sepolia")
  }
}

// ==================== GESTION CHANGEMENT DE COMPTE ====================
function handleAccountsChanged(accounts) {
  console.log("[SafeClub] Changement de compte détecté")

  if (!accounts || accounts.length === 0) {
    disconnectWallet()
    return
  }

  const newAccount = accounts[0]
  if (userAccount && userAccount.toLowerCase() === newAccount.toLowerCase()) {
    return
  }

  console.log("[SafeClub] Nouveau compte:", newAccount)
  userAccount = newAccount
  setTimeout(connectWallet, 500)
}

// ==================== DÉCONNEXION ====================
function disconnectWallet() {
  console.log("[SafeClub] Déconnexion...")

  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }

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
  showNotification("👋 Déconnecté avec succès", "success")
}

// ==================== CHANGER DE COMPTE ====================
async function switchAccount() {
  if (!window.ethereum) return

  try {
    showNotification("📋 Sélectionnez un compte dans MetaMask", "warning")
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    })
  } catch (err) {
    if (err.code !== 4001) {
      console.error("[SafeClub] Erreur changement de compte:", err)
    }
  }
}

// ==================== VÉRIFIER LE RÔLE ====================
async function checkUserRole() {
  if (!contract || !userAccount) {
    console.warn("[SafeClub] Contrat ou compte non disponible")
    return
  }

  try {
    console.log("[SafeClub] Vérification du rôle...")

    const owner = await contract.methods.owner().call()
    isAdmin = userAccount.toLowerCase() === owner.toLowerCase()
    console.log("[SafeClub] Est admin:", isAdmin)

    isMember = await contract.methods.isMember(userAccount).call()
    console.log("[SafeClub] Est membre:", isMember)
  } catch (err) {
    console.error("[SafeClub] Erreur vérification rôle:", err)
    throw new Error("Impossible de vérifier votre rôle")
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
    // Afficher l'adresse
    const shortAddress = userAccount.substring(0, 6) + "..." + userAccount.substring(38)
    walletAddress.textContent = shortAddress
    walletInfo.classList.add("active")

    // Mettre à jour les boutons
    connectBtn.textContent = "🔌 Déconnecter"
    connectBtn.onclick = disconnectWallet
    switchBtn.style.display = "block"

    // Afficher le rôle
    if (isAdmin) {
      roleBadge.textContent = "👑 ADMIN"
      roleBadge.className = "role-badge admin"
    } else if (isMember) {
      roleBadge.textContent = "✅ MEMBRE"
      roleBadge.className = "role-badge member"
    } else {
      roleBadge.textContent = "❌ NON-MEMBRE"
      roleBadge.className = "role-badge non-member"
      const nonMemberAddress = document.getElementById("nonMemberAddress")
      if (nonMemberAddress) {
        nonMemberAddress.textContent = userAccount
      }
    }
  } else {
    walletInfo.classList.remove("active")
    connectBtn.textContent = "🔌 Connecter Wallet"
    connectBtn.onclick = connectWallet
    switchBtn.style.display = "none"
  }
}

// ==================== RAFRAÎCHIR LES DONNÉES ====================
async function refreshData() {
  if (!contract || !userAccount) {
    console.warn("[SafeClub] Contrat ou compte manquant pour refresh")
    return
  }

  try {
    console.log("[SafeClub] Rafraîchissement des données...")

    const balance = await contract.methods.getBalance().call()
    const memberCount = await contract.methods.getMemberCount().call()
    const proposalCount = await contract.methods.proposalCount().call()

    const balanceETH = (balance / 1e18).toFixed(4) + " ETH"

    // Mettre à jour stats selon le rôle
    if (isAdmin) {
      document.getElementById("adminBalance").textContent = balanceETH
      document.getElementById("adminMemberCount").textContent = memberCount
      document.getElementById("adminTotalProposals").textContent = proposalCount
      await loadProposals("adminProposalsList", "adminActiveProposals")
      await loadMembers()
    } else if (isMember) {
      document.getElementById("memberBalance").textContent = balanceETH
      document.getElementById("memberMemberCount").textContent = memberCount
      document.getElementById("memberTotalProposals").textContent = proposalCount
      await loadProposals("memberProposalsList", "memberActiveProposals")
    }

    console.log("[SafeClub] Données rafraîchies ✅")
  } catch (err) {
    console.error("[SafeClub] Erreur refresh:", err)
  }
}

// ==================== CHARGER PROPOSITIONS ====================
async function loadProposals(containerId, activeCountId) {
  const container = document.getElementById(containerId)
  if (!container) return

  try {
    const count = await contract.methods.proposalCount().call()
    console.log("[SafeClub] Chargement de", count, "proposition(s)")

    let html = ""
    let activeCount = 0

    if (count == 0) {
      container.innerHTML = '<div class="empty-state">Aucune proposition pour le moment</div>'
      if (activeCountId) {
        document.getElementById(activeCountId).textContent = "0"
      }
      return
    }

    for (let i = 0; i < count; i++) {
      const proposal = await contract.methods.getProposal(i).call()
      const hasVoted = await contract.methods.hasVoted(i, userAccount).call()
      const isApproved = await contract.methods.isProposalApproved(i).call()

      const totalVotes = Number(proposal.votesFor) + Number(proposal.votesAgainst)
      const percentage = totalVotes > 0 ? ((Number(proposal.votesFor) / totalVotes) * 100).toFixed(0) : 0

      const now = Math.floor(Date.now() / 1000)
      const isExpired = now > Number(proposal.deadline)

      if (!proposal.executed && !isExpired) activeCount++

      const statusBadge = proposal.executed
        ? '<span class="proposal-status status-executed">✅ Exécutée</span>'
        : isExpired
          ? '<span class="proposal-status status-expired">⏳ Terminée</span>'
          : '<span class="proposal-status status-active">🗳️ En Vote</span>'

      const canExecute = isExpired && !proposal.executed && isApproved && isMember
      const canVote = !isExpired && !hasVoted && !proposal.executed && isMember

      html += `
        <div class="proposal-item">
          <div class="proposal-header">
            <div>
              <div class="proposal-title">${escapeHtml(proposal.description)}</div>
              ${statusBadge}
            </div>
            <div class="proposal-amount">${(proposal.amount / 1e18).toFixed(4)} ETH</div>
          </div>
          <div style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">
            🏦 Destinataire: ${proposal.recipient.substring(0, 6)}...${proposal.recipient.substring(38)}
          </div>
          <div class="vote-bar">
            <div class="vote-progress" style="width: ${percentage}%"></div>
          </div>
          <div class="vote-info">
            <span>✅ Pour: ${proposal.votesFor}</span>
            <span>❌ Contre: ${proposal.votesAgainst}</span>
            <span>📊 Approbation: ${percentage}%</span>
          </div>
          <div class="btn-group">
            <button class="btn btn-success btn-sm" onclick="voteProposal(${i}, true)" 
              ${!canVote ? "disabled" : ""}>
              ${hasVoted ? "✔️ Vous avez voté" : isMember ? "👍 Voter Pour" : "👤 Membres uniquement"}
            </button>
            <button class="btn btn-danger btn-sm" onclick="voteProposal(${i}, false)" 
              ${!canVote ? "disabled" : ""}>
              ${hasVoted ? "✔️ Vous avez voté" : isMember ? "👎 Voter Contre" : "👤 Membres uniquement"}
            </button>
            <button class="btn btn-secondary btn-sm" onclick="executeProposal(${i})" 
              ${!canExecute ? "disabled" : ""}>
              ⚡ Exécuter
            </button>
          </div>
        </div>
      `
    }

    if (activeCountId) {
      document.getElementById(activeCountId).textContent = activeCount
    }
    container.innerHTML = html
    console.log("[SafeClub] Propositions chargées ✅")
  } catch (err) {
    console.error("[SafeClub] Erreur chargement propositions:", err)
    container.innerHTML = '<div class="empty-state">❌ Erreur de chargement</div>'
  }
}

// ==================== CHARGER MEMBRES ====================
async function loadMembers() {
  const container = document.getElementById("adminMembersList")
  if (!container) return

  try {
    const members = await contract.methods.getAllMembers().call()
    console.log("[SafeClub] Chargement de", members.length, "membre(s)")

    let html = ""

    if (members.length === 0) {
      container.innerHTML = '<div class="empty-state">Aucun membre pour le moment</div>'
      return
    }

    const owner = await contract.methods.owner().call()

    for (const addr of members) {
      const initials = addr.substring(2, 4).toUpperCase()
      const isCurrentUser = addr.toLowerCase() === userAccount.toLowerCase()
      const isOwner = addr.toLowerCase() === owner.toLowerCase()

      html += `
        <div class="member-item">
          <div class="member-info">
            <div class="member-avatar">${initials}</div>
            <div class="member-details">
              <div class="member-address">${addr.substring(0, 6)}...${addr.substring(38)}</div>
              <div class="member-label">
                ${isCurrentUser ? "👤 Vous" : ""}
                ${isOwner ? "👑 Propriétaire" : ""}
              </div>
            </div>
          </div>
          ${isOwner ? '<span class="member-badge">👑 ADMIN</span>' : '<span style="color: var(--success); font-weight: 600;">✅ Actif</span>'}
        </div>
      `
    }

    container.innerHTML = html
    console.log("[SafeClub] Membres chargés ✅")
  } catch (err) {
    console.error("[SafeClub] Erreur chargement membres:", err)
    container.innerHTML = '<div class="empty-state">❌ Erreur de chargement</div>'
  }
}

// ==================== CRÉER PROPOSITION ====================
async function createProposal(e) {
  e.preventDefault()

  if (!isMember) {
    showNotification("❌ Seuls les membres peuvent créer des propositions", "error")
    return
  }

  const btn = e.target.querySelector('button[type="submit"]')
  const errorDiv = document.getElementById("propError")
  errorDiv.textContent = ""

  try {
    btn.disabled = true
    btn.innerHTML = '⏳ Création en cours...'

    const desc = document.getElementById("propDesc").value.trim()
    const recipient = document.getElementById("propRecipient").value.trim()
    const amount = document.getElementById("propAmount").value
    const duration = document.getElementById("propDuration").value

    if (!desc) throw new Error("Description requise")
    if (!web3.utils.isAddress(recipient)) throw new Error("Adresse invalide")
    if (amount <= 0) throw new Error("Montant doit être > 0")
    if (duration <= 0) throw new Error("Durée doit être > 0")

    const amountWei = web3.utils.toWei(amount, "ether")

    console.log("[SafeClub] Création proposition:", { desc, recipient, amount, duration })

    await contract.methods.createProposal(desc, recipient, amountWei, duration).send({ 
      from: userAccount,
      gasLimit: 500000 
    })

    showNotification("✅ Proposition créée avec succès!", "success")
    closeModal("proposalModal")
    e.target.reset()
    await refreshData()
  } catch (err) {
    console.error("[SafeClub] Erreur création:", err)
    errorDiv.textContent = err.message || "Erreur lors de la création"
  } finally {
    btn.disabled = false
    btn.textContent = "✅ Créer Proposition"
  }
}

// ==================== AJOUTER MEMBRE ====================
async function addMember(e) {
  e.preventDefault()

  if (!isAdmin) {
    showNotification("❌ Seul l'administrateur peut ajouter des membres", "error")
    return
  }

  const btn = e.target.querySelector('button[type="submit"]')
  const errorDiv = document.getElementById("memberError")
  errorDiv.textContent = ""

  try {
    btn.disabled = true
    btn.innerHTML = '⏳ Ajout en cours...'

    const addr = document.getElementById("memberAddr").value.trim()
    const name = document.getElementById("memberName").value.trim()
    const role = document.getElementById("memberRole").value.trim()

    if (!web3.utils.isAddress(addr)) {
      throw new Error("Adresse Ethereum invalide")
    }

    if (!name || name.length < 2) {
      throw new Error("Le nom doit contenir au moins 2 caractères")
    }

    if (!role) {
      throw new Error("Veuillez sélectionner un rôle")
    }

    const isMemberAlready = await contract.methods.isMember(addr).call()
    if (isMemberAlready) {
      throw new Error("Cette adresse est déjà membre")
    }

    console.log("[SafeClub] Ajout membre:", { addr, name, role })

    await contract.methods.addMember(addr).send({ 
      from: userAccount,
      gasLimit: 500000
    })

    showNotification(`✅ ${name} (${role}) a été ajouté avec succès!`, "success")
    closeModal("memberModal")
    e.target.reset()
    await refreshData()
  } catch (err) {
    console.error("[SafeClub] Erreur ajout membre:", err)
    errorDiv.textContent = err.message || "Erreur lors de l'ajout"
  } finally {
    btn.disabled = false
    btn.textContent = "✅ Ajouter Membre"
  }
}

// ==================== VOTER ====================
async function voteProposal(proposalId, support) {
  if (!isMember) {
    showNotification("❌ Seuls les membres peuvent voter", "error")
    return
  }

  try {
    console.log("[SafeClub] Vote:", proposalId, "| Support:", support)
    showNotification("⏳ Vote en cours...", "warning")

    await contract.methods.vote(proposalId, support).send({ 
      from: userAccount,
      gasLimit: 500000
    })

    const voteText = support ? "POUR ✅" : "CONTRE ❌"
    showNotification(`✅ Vote ${voteText} enregistré!`, "success")
    await refreshData()
  } catch (err) {
    console.error("[SafeClub] Erreur vote:", err)
    showNotification(err.message || "Erreur lors du vote", "error")
  }
}

// ==================== EXÉCUTER PROPOSITION ====================
async function executeProposal(proposalId) {
  if (!isMember) {
    showNotification("❌ Seuls les membres peuvent exécuter", "error")
    return
  }

  try {
    console.log("[SafeClub] Exécution proposition:", proposalId)
    showNotification("⏳ Exécution en cours...", "warning")

    await contract.methods.executeProposal(proposalId).send({ 
      from: userAccount,
      gasLimit: 500000
    })

    showNotification("✅ Proposition exécutée!", "success")
    await refreshData()
  } catch (err) {
    console.error("[SafeClub] Erreur exécution:", err)
    showNotification(err.message || "Erreur lors de l'exécution", "error")
  }
}

// ==================== DÉPOSER FONDS ====================
async function depositFunds() {
  if (!isAdmin) {
    showNotification("❌ Seul l'administrateur peut déposer", "error")
    return
  }

  const amount = document.getElementById("adminDepositAmount").value

  if (!amount || amount <= 0) {
    showNotification("❌ Montant invalide", "error")
    return
  }

  try {
    showNotification("⏳ Dépôt en cours...", "warning")
    const amountWei = web3.utils.toWei(amount, "ether")

    console.log("[SafeClub] Dépôt:", amount, "ETH")

    await web3.eth.sendTransaction({
      from: userAccount,
      to: CONTRACT_ADDRESS,
      value: amountWei,
      gasLimit: 500000
    })

    showNotification(`✅ ${amount} ETH déposés!`, "success")
    document.getElementById("adminDepositAmount").value = ""
    await refreshData()
  } catch (err) {
    console.error("[SafeClub] Erreur dépôt:", err)
    showNotification(err.message || "Erreur lors du dépôt", "error")
  }
}

// ==================== MODALS ====================
function openModal(id) {
  const modal = document.getElementById(id)

  if (id === "proposalModal" && !isMember) {
    showNotification("❌ Seuls les membres peuvent créer des propositions", "error")
    return
  }

  if (id === "memberModal" && !isAdmin) {
    showNotification("❌ Seul l'administrateur peut ajouter des membres", "error")
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
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

// ==================== INITIALISATION ====================
console.log("[SafeClub] ✅ Script chargé")
console.log("[SafeClub] Contrat:", CONTRACT_ADDRESS)
console.log("[SafeClub] Réseau: Sepolia Testnet")

document.addEventListener("DOMContentLoaded", () => {
  console.log("[SafeClub] ✅ DOM chargé")

  if (typeof window.ethereum !== "undefined") {
    console.log("[SafeClub] ✅ MetaMask détecté")
  } else {
    console.warn("[SafeClub] ⚠️ MetaMask non détecté")
    showNotification("⚠️ Installez MetaMask pour continuer", "warning")
  }

  // Fermer modals en cliquant sur le fond
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal(modal.id)
      }
    })
  })
})