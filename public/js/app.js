/**
 * Links - Minimalist & Clean Link Manager
 * Frontend State, Public Home Feed, User Workspace & Admin Controls
 */

(function () {
  'use strict';

  const STORAGE_KEY_VIEW = 'linkkeeper_view_mode';

  // State
  let currentUser = null;
  let activePage = 'home'; // 'home' | 'my'
  let authMode = 'login'; // 'login' | 'signup' | 'admin'
  let visibilityFilter = 'all'; // 'all' | 'public' | 'private' (Admin in My Links)
  let links = [];
  let categories = [];
  let activeCategory = 'All';
  let searchQuery = '';
  let onlyFavorites = false;
  let sortBy = 'newest';
  let viewMode = 'grid'; // 'grid' | 'list'
  let deleteTargetId = null;
  let dbConnected = true;
  let dbErrorMessage = '';

  // Navigation & Auth DOM Elements
  const brandHomeLink = document.getElementById('brandHomeLink');
  const navHomeBtn = document.getElementById('navHomeBtn');
  const navMyLinksBtn = document.getElementById('navMyLinksBtn');
  const guestActions = document.getElementById('guestActions');
  const authActions = document.getElementById('authActions');
  const openLoginBtn = document.getElementById('openLoginBtn');
  const openAdminLoginBtn = document.getElementById('openAdminLoginBtn');

  // Auth Modal DOM Elements
  const authModal = document.getElementById('authModal');
  const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
  const authSubtitle = document.getElementById('authSubtitle');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabSignupBtn = document.getElementById('tabSignupBtn');
  const tabAdminBtn = document.getElementById('tabAdminBtn');
  const authForm = document.getElementById('authForm');
  const authFormError = document.getElementById('authFormError');
  const authNameGroup = document.getElementById('authNameGroup');
  const authName = document.getElementById('authName');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const authNameError = document.getElementById('authNameError');
  const authEmailError = document.getElementById('authEmailError');
  const authPasswordError = document.getElementById('authPasswordError');
  const authSubmitBtn = document.getElementById('authSubmitBtn');

  // User Chip & Admin DOM Elements
  const userAvatar = document.getElementById('userAvatar');
  const headerUserName = document.getElementById('headerUserName');
  const adminRoleBadge = document.getElementById('adminRoleBadge');
  const dropdownUserName = document.getElementById('dropdownUserName');
  const dropdownUserEmail = document.getElementById('dropdownUserEmail');
  const adminMenuDivider = document.getElementById('adminMenuDivider');
  const menuShareAllBtn = document.getElementById('menuShareAllBtn');
  const menuMakeAllPrivateBtn = document.getElementById('menuMakeAllPrivateBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  // Page Context & Admin Toolbar Elements
  const pageContextTitle = document.getElementById('pageContextTitle');
  const pageContextSubtitle = document.getElementById('pageContextSubtitle');
  const adminToolbarActions = document.getElementById('adminToolbarActions');
  const visibilityFilterSwitch = document.getElementById('visibilityFilterSwitch');
  const visFilterBtns = document.querySelectorAll('.vis-filter-btn');
  const shareAllBtn = document.getElementById('shareAllBtn');

  // App DOM Elements
  const linksContainer = document.getElementById('linksContainer');
  const emptyState = document.getElementById('emptyState');
  const emptyTitle = document.getElementById('emptyTitle');
  const emptyDescription = document.getElementById('emptyDescription');
  const emptyAddBtn = document.getElementById('emptyAddBtn');
  const categoryTabs = document.getElementById('categoryTabs');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortBySelect = document.getElementById('sortBySelect');
  const favoritesFilterBtn = document.getElementById('favoritesFilterBtn');
  const gridViewBtn = document.getElementById('gridViewBtn');
  const listViewBtn = document.getElementById('listViewBtn');
  const activeFilterBanner = document.getElementById('activeFilterBanner');
  const activeFilterText = document.getElementById('activeFilterText');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  // Header Dropdown
  const moreOptionsBtn = document.getElementById('moreOptionsBtn');
  const moreOptionsMenu = document.getElementById('moreOptionsMenu');

  // Link Modal
  const linkModal = document.getElementById('linkModal');
  const modalTitle = document.getElementById('modalTitle');
  const linkForm = document.getElementById('linkForm');
  const editLinkId = document.getElementById('editLinkId');
  const linkUrl = document.getElementById('linkUrl');
  const linkTitle = document.getElementById('linkTitle');
  const linkCategory = document.getElementById('linkCategory');
  const linkDescription = document.getElementById('linkDescription');
  const linkTags = document.getElementById('linkTags');
  const linkVisibilityGroup = document.getElementById('linkVisibilityGroup');
  const linkVisibility = document.getElementById('linkVisibility');
  const linkFavorite = document.getElementById('linkFavorite');
  const saveLinkBtn = document.getElementById('saveLinkBtn');
  const openAddModalBtn = document.getElementById('openAddModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');

  // Category Modal
  const categoryModal = document.getElementById('categoryModal');
  const categoryForm = document.getElementById('categoryForm');
  const newCategoryName = document.getElementById('newCategoryName');
  const inlineNewCategoryBtn = document.getElementById('inlineNewCategoryBtn');
  const closeCategoryModalBtn = document.getElementById('closeCategoryModalBtn');
  const cancelCategoryModalBtn = document.getElementById('cancelCategoryModalBtn');

  // Delete Modal
  const deleteConfirmModal = document.getElementById('deleteConfirmModal');
  const deleteTargetTitle = document.getElementById('deleteTargetTitle');
  const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  // Backup / Data Elements
  const exportDataBtn = document.getElementById('exportDataBtn');
  const importDataBtn = document.getElementById('importDataBtn');
  const importFileInput = document.getElementById('importFileInput');
  const resetSampleDataBtn = document.getElementById('resetSampleDataBtn');
  const clearAllLinksBtn = document.getElementById('clearAllLinksBtn');
  const toastContainer = document.getElementById('toastContainer');

  // ================= Role & Permission Helpers =================
  function isAdmin() {
    return Boolean(currentUser && currentUser.role === 'admin');
  }

  function canManageCurrentView() {
    if (activePage === 'home') return isAdmin();
    return Boolean(currentUser);
  }

  // ================= API Client =================
  async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    let data = {};
    try {
      data = await response.json();
    } catch (_) {
      data = {};
    }

    if (response.status === 401 && !options.skipAuthRedirect) {
      handleUnauthorized();
    }

    if (!response.ok) {
      const error = new Error(data.error || `Request failed (${response.status})`);
      error.status = response.status;
      error.details = data.details;
      throw error;
    }

    return data;
  }

  // ================= Auth Modal & Session =================
  function clearAuthErrors() {
    authFormError.style.display = 'none';
    authFormError.textContent = '';
    authNameError.textContent = '';
    authEmailError.textContent = '';
    authPasswordError.textContent = '';
  }

  function setAuthMode(mode) {
    authMode = mode;
    clearAuthErrors();
    const isSignup = mode === 'signup';
    const isAdminTab = mode === 'admin';

    tabLoginBtn.classList.toggle('active', mode === 'login');
    tabSignupBtn.classList.toggle('active', isSignup);
    tabAdminBtn.classList.toggle('active', isAdminTab);
    tabLoginBtn.setAttribute('aria-selected', String(mode === 'login'));
    tabSignupBtn.setAttribute('aria-selected', String(isSignup));
    tabAdminBtn.setAttribute('aria-selected', String(isAdminTab));

    authNameGroup.style.display = isSignup ? 'flex' : 'none';
    if (isSignup) {
      authSubtitle.textContent = 'Create a personal account to manage your own links';
      authSubmitBtn.textContent = 'Create Account';
      authPassword.setAttribute('autocomplete', 'new-password');
    } else if (isAdminTab) {
      authSubtitle.textContent = 'Admin sign in to manage Home links and visibility';
      authSubmitBtn.textContent = 'Sign In as Admin';
      authPassword.setAttribute('autocomplete', 'current-password');
    } else {
      authSubtitle.textContent = 'Sign in to access your personal links';
      authSubmitBtn.textContent = 'Sign In';
      authPassword.setAttribute('autocomplete', 'current-password');
    }

    setTimeout(() => {
      if (isSignup) authName.focus();
      else authEmail.focus();
    }, 30);
  }

  function openAuthModal(mode = 'login') {
    authForm.reset();
    setAuthMode(mode);
    authModal.classList.add('show');
  }

  function closeAuthModal() {
    authModal.classList.remove('show');
    clearAuthErrors();
  }

  function updateHeaderAndChrome() {
    const signedIn = Boolean(currentUser);
    const admin = isAdmin();

    guestActions.style.display = signedIn ? 'none' : 'flex';
    authActions.style.display = signedIn ? 'flex' : 'none';
    navMyLinksBtn.style.display = signedIn ? 'inline-block' : 'none';

    navHomeBtn.classList.toggle('active', activePage === 'home');
    navMyLinksBtn.classList.toggle('active', activePage === 'my');

    if (signedIn) {
      const name = currentUser.name || 'User';
      userAvatar.textContent = name.charAt(0).toUpperCase();
      headerUserName.textContent = name;
      dropdownUserName.textContent = admin ? `${name} (Admin)` : name;
      dropdownUserEmail.textContent = currentUser.email || '';
      adminRoleBadge.style.display = admin ? 'inline-block' : 'none';
    } else {
      adminRoleBadge.style.display = 'none';
    }

    // Admin menu items
    adminMenuDivider.style.display = admin ? 'block' : 'none';
    menuShareAllBtn.style.display = admin ? 'flex' : 'none';
    menuMakeAllPrivateBtn.style.display = admin ? 'flex' : 'none';

    // Page context bar
    if (activePage === 'home') {
      pageContextTitle.textContent = 'Home';
      pageContextSubtitle.textContent = admin
        ? 'Managing all public links visible on the Home page'
        : 'All public links shared on the Home page';
    } else {
      pageContextTitle.textContent = admin ? 'Admin Workspace' : 'My Links';
      pageContextSubtitle.textContent = admin
        ? 'Manage your public and private links, or share all to Home'
        : 'Private links saved to your personal account';
    }

    // Toolbar visibility per permission
    const canManage = canManageCurrentView();
    openAddModalBtn.style.display = canManage ? 'inline-flex' : 'none';
    favoritesFilterBtn.style.display = canManage ? 'inline-flex' : 'none';
    if (!canManage && onlyFavorites) {
      onlyFavorites = false;
      favoritesFilterBtn.classList.remove('active');
    }

    adminToolbarActions.style.display = admin ? 'flex' : 'none';
    visibilityFilterSwitch.style.display = admin && activePage === 'my' ? 'inline-flex' : 'none';
    if (activePage !== 'my') {
      visibilityFilter = 'all';
      visFilterBtns.forEach((b) => b.classList.toggle('active', b.dataset.vis === 'all'));
    }
  }

  function handleUnauthorized() {
    const wasSignedIn = Boolean(currentUser);
    currentUser = null;
    activePage = 'home';
    updateHeaderAndChrome();
    if (wasSignedIn) {
      showToast('Session expired. Switched to Home.');
      switchPage('home');
    }
  }

  async function checkSession() {
    try {
      const data = await apiRequest('/api/auth/me', { skipAuthRedirect: true });
      return data && data.user ? data.user : null;
    } catch (_) {
      return null;
    }
  }

  // ================= Load Data =================
  async function loadData() {
    try {
      const storedView = localStorage.getItem(STORAGE_KEY_VIEW);
      if (storedView === 'list' || storedView === 'grid') {
        viewMode = storedView;
      }

      const linksEndpoint = activePage === 'home' ? '/api/public/links' : '/api/links';
      const catsEndpoint = activePage === 'home' ? '/api/public/categories' : '/api/categories';

      const [linksRes, categoriesRes] = await Promise.all([
        apiRequest(linksEndpoint, { skipAuthRedirect: activePage === 'home' }),
        apiRequest(catsEndpoint, { skipAuthRedirect: activePage === 'home' }),
      ]);

      links = Array.isArray(linksRes.links) ? linksRes.links : [];
      categories = Array.isArray(categoriesRes.categories) ? categoriesRes.categories : [];
      dbConnected = true;
      dbErrorMessage = '';
    } catch (err) {
      console.error('Error loading data from backend:', err);
      dbConnected = false;
      dbErrorMessage = err.message || 'Unable to connect to backend server.';
      links = [];
      categories = [];
      showToast(dbErrorMessage);
    }
  }

  async function switchPage(page) {
    if (page === 'my' && !currentUser) {
      openAuthModal('login');
      return;
    }
    activePage = page;
    activeCategory = 'All';
    onlyFavorites = false;
    favoritesFilterBtn.classList.remove('active');
    visibilityFilter = 'all';
    visFilterBtns.forEach((b) => b.classList.toggle('active', b.dataset.vis === 'all'));

    updateHeaderAndChrome();
    await loadData();
    renderCategories();
    renderLinks();
  }

  // ================= Utility Functions =================
  function cleanUrl(rawUrl) {
    let url = (rawUrl || '').trim();
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    return url;
  }

  function extractDomain(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch (e) {
      return url;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getCategoryBadgeClass(category) {
    const cat = (category || '').toLowerCase().trim();
    if (cat === 'important') return 'badge-important';
    if (cat === 'tech') return 'badge-tech';
    if (cat === 'business' || cat === 'buisness') return 'badge-business';
    return 'badge-custom';
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, 2400);
  }

  // ================= Category Navigation =================
  function renderCategories() {
    links.forEach((l) => {
      if (l.category && !categories.includes(l.category)) {
        categories.push(l.category);
      }
    });

    categoryTabs.innerHTML = '';

    // "All" Pill
    const allPill = document.createElement('button');
    allPill.className = `cat-pill ${activeCategory === 'All' ? 'active' : ''}`;
    allPill.innerHTML = `<span>All</span><span class="count">${links.length}</span>`;
    allPill.addEventListener('click', () => {
      activeCategory = 'All';
      renderCategories();
      renderLinks();
    });
    categoryTabs.appendChild(allPill);

    // Dynamic Category Pills
    categories.forEach((cat) => {
      const count = links.filter((l) => l.category === cat).length;
      const pill = document.createElement('button');
      pill.className = `cat-pill ${activeCategory === cat ? 'active' : ''}`;
      pill.innerHTML = `<span>${escapeHtml(cat)}</span><span class="count">${count}</span>`;
      pill.addEventListener('click', () => {
        activeCategory = cat;
        renderCategories();
        renderLinks();
      });
      categoryTabs.appendChild(pill);
    });

    // "+" button to create new category (only when user can manage current view)
    if (canManageCurrentView()) {
      const addCatBtn = document.createElement('button');
      addCatBtn.className = 'add-cat-btn';
      addCatBtn.title = 'Add new category';
      addCatBtn.setAttribute('aria-label', 'Add category');
      addCatBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      `;
      addCatBtn.addEventListener('click', openCategoryModal);
      categoryTabs.appendChild(addCatBtn);
    }

    // Populate Category Dropdown inside Link Modal
    const currentVal = linkCategory.value;
    linkCategory.innerHTML = '<option value="" disabled selected>Choose category...</option>';
    categories.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      linkCategory.appendChild(opt);
    });
    if (currentVal && categories.includes(currentVal)) {
      linkCategory.value = currentVal;
    }
  }

  // ================= Filtering & Sorting =================
  function getFilteredLinks() {
    let result = [...links];

    if (activeCategory !== 'All') {
      result = result.filter((l) => l.category === activeCategory);
    }

    if (onlyFavorites && canManageCurrentView()) {
      result = result.filter((l) => l.favorite);
    }

    if (isAdmin() && activePage === 'my' && visibilityFilter !== 'all') {
      result = result.filter((l) => (l.visibility || 'private') === visibilityFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((l) => {
        const titleMatch = (l.title || '').toLowerCase().includes(q);
        const descMatch = (l.description || '').toLowerCase().includes(q);
        const urlMatch = (l.url || '').toLowerCase().includes(q);
        const catMatch = (l.category || '').toLowerCase().includes(q);
        const tagsMatch = Array.isArray(l.tags) && l.tags.some((t) => t.toLowerCase().includes(q));
        return titleMatch || descMatch || urlMatch || catMatch || tagsMatch;
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
      if (sortBy === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
      if (sortBy === 'az') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'visits') return (b.visits || 0) - (a.visits || 0);
      return 0;
    });

    return result;
  }

  function updateFilterStatus(count) {
    const hasSearch = searchQuery.trim().length > 0;
    const hasCategory = activeCategory !== 'All';
    const hasFav = onlyFavorites && canManageCurrentView();
    const hasVis = isAdmin() && activePage === 'my' && visibilityFilter !== 'all';

    if (hasSearch || hasCategory || hasFav || hasVis) {
      activeFilterBanner.style.display = 'flex';
      const parts = [];
      if (hasCategory) parts.push(`"${activeCategory}"`);
      if (hasVis) parts.push(visibilityFilter);
      if (hasFav) parts.push('starred');
      if (hasSearch) parts.push(`matching "${searchQuery.trim()}"`);
      activeFilterText.textContent = `Showing ${count} link${count === 1 ? '' : 's'} (${parts.join(', ')})`;
    } else {
      activeFilterBanner.style.display = 'none';
    }
  }

  // ================= Render Links =================
  function renderLinks() {
    if (viewMode === 'list') {
      linksContainer.className = 'links-container list-view';
      gridViewBtn.classList.remove('active');
      listViewBtn.classList.add('active');
    } else {
      linksContainer.className = 'links-container grid-view';
      gridViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
    }

    const filtered = getFilteredLinks();
    updateFilterStatus(filtered.length);
    linksContainer.innerHTML = '';

    if (!dbConnected && links.length === 0) {
      emptyState.style.display = 'block';
      emptyTitle.textContent = 'Database not connected';
      emptyDescription.textContent = dbErrorMessage || 'Configure MONGODB_URI in .env to connect to MongoDB Atlas.';
      emptyAddBtn.style.display = 'none';
      return;
    }

    const canManage = canManageCurrentView();
    emptyAddBtn.style.display = canManage ? '' : 'none';

    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      if (searchQuery.trim()) {
        emptyTitle.textContent = 'No matching links';
        emptyDescription.textContent = `No links matched "${searchQuery.trim()}".`;
      } else if (activeCategory !== 'All') {
        emptyTitle.textContent = `No links in "${activeCategory}"`;
        emptyDescription.textContent = `No links found in this category yet.`;
      } else if (onlyFavorites) {
        emptyTitle.textContent = 'No starred links';
        emptyDescription.textContent = 'Click the star icon on any link to pin it here.';
      } else if (activePage === 'home') {
        emptyTitle.textContent = 'No public links on Home yet';
        emptyDescription.textContent = isAdmin()
          ? 'Add a public link or click "Share All to Home" to publish links here.'
          : 'The admin has not shared any public links to Home yet.';
      } else {
        emptyTitle.textContent = 'No links saved yet';
        emptyDescription.textContent = 'Add your first link to get started.';
      }
      return;
    }

    emptyState.style.display = 'none';
    const showAdminVis = isAdmin();

    filtered.forEach((link) => {
      const domain = extractDomain(link.url);
      const badgeClass = getCategoryBadgeClass(link.category);
      const initial = (link.title || 'L').charAt(0).toUpperCase();
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
      const isPublic = link.visibility === 'public';

      const visBadgeHtml = showAdminVis
        ? `<button type="button" class="vis-badge ${isPublic ? 'is-public' : 'is-private'}" title="${
            isPublic ? 'Public on Home (click to make private)' : 'Private (click to share to Home)'
          }">${isPublic ? 'Public' : 'Private'}</button>`
        : '';

      const starBtnHtml = canManage
        ? `<button class="star-btn ${link.favorite ? 'starred' : ''}" title="${link.favorite ? 'Unstar' : 'Star'}" aria-label="Star">
             <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
             </svg>
           </button>`
        : '';

      const manageBtnsHtml = canManage
        ? `<button class="action-icon act-edit" title="Edit" aria-label="Edit">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
               <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
             </svg>
           </button>
           <button class="action-icon act-del" title="Delete" aria-label="Delete">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <polyline points="3 6 5 6 21 6"></polyline>
               <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
             </svg>
           </button>`
        : '';

      const card = document.createElement('article');
      card.className = 'link-card';
      card.dataset.id = link.id;

      if (viewMode === 'list') {
        card.innerHTML = `
          <div class="card-top">
            <div class="domain-group">
              <img class="favicon-img" src="${faviconUrl}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" loading="lazy">
              <span class="fallback-icon" style="display: none;">${initial}</span>
            </div>
          </div>
          <div class="card-center">
            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="card-title-link">
              ${escapeHtml(link.title)}
            </a>
            ${link.description ? `<p class="card-description">${escapeHtml(link.description)}</p>` : ''}
          </div>
          <div class="card-bottom">
            <div class="card-badges-row">
              <span class="badge ${badgeClass}">${escapeHtml(link.category || 'General')}</span>
              ${visBadgeHtml}
            </div>
            <div class="card-actions">
              ${starBtnHtml}
              <button class="action-icon act-copy" title="Copy URL" aria-label="Copy URL">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              ${manageBtnsHtml}
              <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="action-icon act-open" title="Open" aria-label="Open">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
        `;
      } else {
        card.innerHTML = `
          <div class="card-top">
            <div class="domain-group">
              <img class="favicon-img" src="${faviconUrl}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" loading="lazy">
              <span class="fallback-icon" style="display: none;">${initial}</span>
              <span class="domain-text">${escapeHtml(domain)}</span>
            </div>
            ${starBtnHtml}
          </div>

          <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="card-title-link">
            ${escapeHtml(link.title)}
          </a>

          <p class="card-description">${link.description ? escapeHtml(link.description) : 'No description added.'}</p>

          <div class="card-bottom">
            <div class="card-badges-row">
              <span class="badge ${badgeClass}">${escapeHtml(link.category || 'General')}</span>
              ${visBadgeHtml}
            </div>
            <div class="card-actions">
              <button class="action-icon act-copy" title="Copy URL" aria-label="Copy URL">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              ${manageBtnsHtml}
              <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="action-icon act-open" title="Open" aria-label="Open">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
        `;
      }

      const visBtn = card.querySelector('.vis-badge');
      if (visBtn) {
        visBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleLinkVisibility(link.id);
        });
      }

      const starBtn = card.querySelector('.star-btn');
      if (starBtn) {
        starBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleFavorite(link.id);
        });
      }

      const copyBtn = card.querySelector('.act-copy');
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(link.url);
      });

      const editBtn = card.querySelector('.act-edit');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditModal(link.id);
        });
      }

      const delBtn = card.querySelector('.act-del');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openDeleteModal(link.id);
        });
      }

      const openLink = card.querySelector('.act-open');
      const titleLink = card.querySelector('.card-title-link');
      const recordVisit = () => {
        link.visits = (link.visits || 0) + 1;
        const visitUrl =
          activePage === 'home'
            ? `/api/public/links/${encodeURIComponent(link.id)}/visit`
            : `/api/links/${encodeURIComponent(link.id)}/visit`;
        fetch(visitUrl, {
          method: 'PATCH',
          credentials: 'same-origin',
          keepalive: true,
        }).catch((err) => console.error('Failed to record visit:', err));
      };
      if (openLink) openLink.addEventListener('click', recordVisit);
      if (titleLink) titleLink.addEventListener('click', recordVisit);

      linksContainer.appendChild(card);
    });
  }

  // ================= Admin Visibility Controls =================
  async function toggleLinkVisibility(id) {
    if (!isAdmin()) return;
    const link = links.find((l) => l.id === id);
    if (!link) return;

    const nextVisibility = link.visibility === 'public' ? 'private' : 'public';
    try {
      const { link: updated } = await apiRequest(`/api/links/${encodeURIComponent(id)}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ visibility: nextVisibility }),
      });

      if (activePage === 'home' && updated.visibility !== 'public') {
        links = links.filter((l) => l.id !== id);
      } else {
        const idx = links.findIndex((l) => l.id === id);
        if (idx !== -1) links[idx] = updated;
      }

      renderCategories();
      renderLinks();
      showToast(updated.visibility === 'public' ? 'Shared to Home page' : 'Set to Private');
    } catch (err) {
      showToast(err.message || 'Failed to update visibility');
    }
  }

  async function setAllVisibility(targetVisibility) {
    if (!isAdmin()) return;
    try {
      await apiRequest('/api/links/share-all', {
        method: 'PATCH',
        body: JSON.stringify({ visibility: targetVisibility }),
      });
      await loadData();
      renderCategories();
      renderLinks();
      showToast(
        targetVisibility === 'public'
          ? 'All links shared to Home page'
          : 'All links set to Private'
      );
    } catch (err) {
      showToast(err.message || 'Failed to update all links');
    }
  }

  // ================= Favorites & Clipboard =================
  async function toggleFavorite(id) {
    const link = links.find((l) => l.id === id);
    if (!link) return;

    const nextFavorite = !link.favorite;
    try {
      const { link: updated } = await apiRequest(`/api/links/${encodeURIComponent(id)}/favorite`, {
        method: 'PATCH',
        body: JSON.stringify({ favorite: nextFavorite }),
      });
      const idx = links.findIndex((l) => l.id === id);
      if (idx !== -1) links[idx] = updated;
      renderCategories();
      renderLinks();
      showToast(updated.favorite ? 'Starred' : 'Unstarred');
    } catch (err) {
      showToast(err.message || 'Failed to update star');
    }
  }

  function copyToClipboard(url) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url)
        .then(() => showToast('Copied to clipboard'))
        .catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  }

  function fallbackCopy(text) {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    try {
      document.execCommand('copy');
      showToast('Copied to clipboard');
    } catch (e) {
      showToast('Failed to copy');
    }
    document.body.removeChild(el);
  }

  // ================= Add & Edit Modal =================
  function openAddModal() {
    modalTitle.textContent = 'New Link';
    editLinkId.value = '';
    linkForm.reset();
    document.getElementById('urlError').textContent = '';
    document.getElementById('titleError').textContent = '';
    document.getElementById('categoryError').textContent = '';

    if (activeCategory !== 'All' && categories.includes(activeCategory)) {
      linkCategory.value = activeCategory;
    }

    if (isAdmin()) {
      linkVisibilityGroup.style.display = 'flex';
      linkVisibility.value = activePage === 'home' ? 'public' : 'private';
    } else {
      linkVisibilityGroup.style.display = 'none';
    }

    linkModal.classList.add('show');
    setTimeout(() => linkUrl.focus(), 80);
  }

  function openEditModal(id) {
    const link = links.find((l) => l.id === id);
    if (!link) return;

    modalTitle.textContent = 'Edit Link';
    editLinkId.value = link.id;
    linkUrl.value = link.url;
    linkTitle.value = link.title;
    linkCategory.value = link.category || '';
    linkDescription.value = link.description || '';
    linkTags.value = Array.isArray(link.tags) ? link.tags.join(', ') : '';
    linkFavorite.checked = !!link.favorite;

    if (isAdmin()) {
      linkVisibilityGroup.style.display = 'flex';
      linkVisibility.value = link.visibility === 'public' ? 'public' : 'private';
    } else {
      linkVisibilityGroup.style.display = 'none';
    }

    document.getElementById('urlError').textContent = '';
    document.getElementById('titleError').textContent = '';
    document.getElementById('categoryError').textContent = '';

    linkModal.classList.add('show');
    setTimeout(() => linkTitle.focus(), 80);
  }

  function closeLinkModal() {
    linkModal.classList.remove('show');
  }

  linkForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawUrl = linkUrl.value.trim();
    const rawTitle = linkTitle.value.trim();
    const rawCategory = linkCategory.value;

    const urlError = document.getElementById('urlError');
    const titleError = document.getElementById('titleError');
    const categoryError = document.getElementById('categoryError');

    urlError.textContent = '';
    titleError.textContent = '';
    categoryError.textContent = '';

    let valid = true;
    if (!rawUrl) {
      urlError.textContent = 'URL is required.';
      valid = false;
    } else {
      try {
        new URL(cleanUrl(rawUrl));
      } catch (err) {
        urlError.textContent = 'Enter a valid URL.';
        valid = false;
      }
    }

    if (!rawTitle) {
      titleError.textContent = 'Title is required.';
      valid = false;
    }

    if (!rawCategory) {
      categoryError.textContent = 'Please select a category.';
      valid = false;
    }

    if (!valid) return;

    const payload = {
      url: cleanUrl(rawUrl),
      title: rawTitle,
      category: rawCategory,
      description: linkDescription.value.trim(),
      tags: linkTags.value
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0),
      favorite: linkFavorite.checked,
    };

    if (isAdmin()) {
      payload.visibility = linkVisibility.value === 'public' ? 'public' : 'private';
    }

    const originalText = saveLinkBtn.textContent;
    saveLinkBtn.disabled = true;
    saveLinkBtn.textContent = 'Saving...';

    try {
      if (editLinkId.value) {
        const { link: updated } = await apiRequest(`/api/links/${encodeURIComponent(editLinkId.value)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (activePage === 'home' && updated.visibility !== 'public') {
          links = links.filter((l) => l.id !== editLinkId.value);
        } else {
          const idx = links.findIndex((l) => l.id === editLinkId.value);
          if (idx !== -1) links[idx] = updated;
        }
        showToast('Link updated');
      } else {
        const { link: created } = await apiRequest('/api/links', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (activePage !== 'home' || created.visibility === 'public') {
          links.unshift(created);
        }
        showToast(
          created.visibility === 'public' ? 'Link saved and shared to Home' : 'Link saved'
        );
      }

      closeLinkModal();
      renderCategories();
      renderLinks();
    } catch (err) {
      showToast(err.message || 'Failed to save link');
    } finally {
      saveLinkBtn.disabled = false;
      saveLinkBtn.textContent = originalText;
    }
  });

  linkUrl.addEventListener('blur', () => {
    const val = linkUrl.value.trim();
    if (val && !linkTitle.value.trim()) {
      const domain = extractDomain(cleanUrl(val));
      if (domain) {
        const name = domain.split('.')[0];
        linkTitle.value = name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
  });

  // ================= Delete Modal =================
  function openDeleteModal(id) {
    const link = links.find((l) => l.id === id);
    if (!link) return;
    deleteTargetId = id;
    deleteTargetTitle.textContent = link.title;
    deleteConfirmModal.classList.add('show');
  }

  function closeDeleteModal() {
    deleteTargetId = null;
    deleteConfirmModal.classList.remove('show');
  }

  confirmDeleteBtn.addEventListener('click', async () => {
    if (!deleteTargetId) return;
    const targetId = deleteTargetId;
    confirmDeleteBtn.disabled = true;
    try {
      await apiRequest(`/api/links/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      links = links.filter((l) => l.id !== targetId);
      closeDeleteModal();
      renderCategories();
      renderLinks();
      showToast('Link deleted');
    } catch (err) {
      showToast(err.message || 'Failed to delete link');
    } finally {
      confirmDeleteBtn.disabled = false;
    }
  });

  // ================= Category Modal =================
  function openCategoryModal() {
    newCategoryName.value = '';
    document.getElementById('categoryNameError').textContent = '';
    categoryModal.classList.add('show');
    setTimeout(() => newCategoryName.focus(), 80);
  }

  function closeCategoryModal() {
    categoryModal.classList.remove('show');
  }

  categoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newCategoryName.value.trim();
    const errorEl = document.getElementById('categoryNameError');
    errorEl.textContent = '';

    if (!name) {
      errorEl.textContent = 'Name is required.';
      return;
    }

    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      errorEl.textContent = 'Category already exists.';
      return;
    }

    try {
      const { category } = await apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      categories.push(category);
      closeCategoryModal();
      renderCategories();
      showToast(`Created category "${category}"`);

      if (linkModal.classList.contains('show')) {
        linkCategory.value = category;
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Failed to create category.';
    }
  });

  // ================= Backup & Restore =================
  async function exportData() {
    moreOptionsMenu.classList.remove('show');
    try {
      const data = await apiRequest('/api/backup/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `links-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup downloaded');
    } catch (err) {
      showToast(err.message || 'Failed to export backup');
    }
  }

  function triggerImport() {
    importFileInput.value = '';
    importFileInput.click();
    moreOptionsMenu.classList.remove('show');
  }

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (event) {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed || !Array.isArray(parsed.links)) {
          showToast('Invalid backup file');
          return;
        }

        const result = await apiRequest('/api/backup/import', {
          method: 'POST',
          body: JSON.stringify({
            categories: parsed.categories || [],
            links: parsed.links,
          }),
        });

        await loadData();
        renderCategories();
        renderLinks();
        showToast(`Imported ${result.added} links`);
      } catch (err) {
        showToast(err.message || 'Error importing file');
      }
    };
    reader.readAsText(file);
  });

  resetSampleDataBtn.addEventListener('click', async () => {
    moreOptionsMenu.classList.remove('show');
    if (confirm('Reset your account links to the demo sample links?')) {
      try {
        await apiRequest('/api/backup/reset-sample', { method: 'POST' });
        activeCategory = 'All';
        await loadData();
        renderCategories();
        renderLinks();
        showToast('Sample links restored');
      } catch (err) {
        showToast(err.message || 'Failed to reset sample links');
      }
    }
  });

  clearAllLinksBtn.addEventListener('click', async () => {
    moreOptionsMenu.classList.remove('show');
    if (confirm('Are you sure you want to delete all saved links in your account?')) {
      try {
        await apiRequest('/api/links', { method: 'DELETE' });
        await loadData();
        renderCategories();
        renderLinks();
        showToast('All links deleted');
      } catch (err) {
        showToast(err.message || 'Failed to clear links');
      }
    }
  });

  // ================= Navigation, Search & Controls =================
  brandHomeLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchPage('home');
  });

  navHomeBtn.addEventListener('click', () => switchPage('home'));
  navMyLinksBtn.addEventListener('click', () => switchPage('my'));

  openLoginBtn.addEventListener('click', () => openAuthModal('login'));
  openAdminLoginBtn.addEventListener('click', () => openAuthModal('admin'));
  closeAuthModalBtn.addEventListener('click', closeAuthModal);

  visFilterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      visibilityFilter = btn.dataset.vis || 'all';
      visFilterBtns.forEach((b) => b.classList.toggle('active', b === btn));
      renderLinks();
    });
  });

  shareAllBtn.addEventListener('click', () => setAllVisibility('public'));
  menuShareAllBtn.addEventListener('click', () => {
    moreOptionsMenu.classList.remove('show');
    setAllVisibility('public');
  });
  menuMakeAllPrivateBtn.addEventListener('click', () => {
    moreOptionsMenu.classList.remove('show');
    setAllVisibility('private');
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.style.display = searchQuery.length > 0 ? 'flex' : 'none';
    renderLinks();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    renderLinks();
  });

  sortBySelect.addEventListener('change', (e) => {
    sortBy = e.target.value;
    renderLinks();
  });

  favoritesFilterBtn.addEventListener('click', () => {
    onlyFavorites = !onlyFavorites;
    favoritesFilterBtn.classList.toggle('active', onlyFavorites);
    renderLinks();
  });

  resetFiltersBtn.addEventListener('click', () => {
    searchQuery = '';
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    activeCategory = 'All';
    onlyFavorites = false;
    favoritesFilterBtn.classList.remove('active');
    visibilityFilter = 'all';
    visFilterBtns.forEach((b) => b.classList.toggle('active', b.dataset.vis === 'all'));
    renderCategories();
    renderLinks();
  });

  gridViewBtn.addEventListener('click', () => {
    viewMode = 'grid';
    localStorage.setItem(STORAGE_KEY_VIEW, 'grid');
    renderLinks();
  });

  listViewBtn.addEventListener('click', () => {
    viewMode = 'list';
    localStorage.setItem(STORAGE_KEY_VIEW, 'list');
    renderLinks();
  });

  moreOptionsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    moreOptionsMenu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    moreOptionsMenu.classList.remove('show');
  });

  // Modal open/close bindings
  openAddModalBtn.addEventListener('click', openAddModal);
  emptyAddBtn.addEventListener('click', openAddModal);
  closeModalBtn.addEventListener('click', closeLinkModal);
  cancelModalBtn.addEventListener('click', closeLinkModal);

  inlineNewCategoryBtn.addEventListener('click', openCategoryModal);
  closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
  cancelCategoryModalBtn.addEventListener('click', closeCategoryModal);

  closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  exportDataBtn.addEventListener('click', exportData);
  importDataBtn.addEventListener('click', triggerImport);

  window.addEventListener('click', (e) => {
    if (e.target === linkModal) closeLinkModal();
    if (e.target === categoryModal) closeCategoryModal();
    if (e.target === deleteConfirmModal) closeDeleteModal();
    if (e.target === authModal) closeAuthModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLinkModal();
      closeCategoryModal();
      closeDeleteModal();
      closeAuthModal();
      moreOptionsMenu.classList.remove('show');
    }
  });

  // Auth form bindings
  tabLoginBtn.addEventListener('click', () => setAuthMode('login'));
  tabSignupBtn.addEventListener('click', () => setAuthMode('signup'));
  tabAdminBtn.addEventListener('click', () => setAuthMode('admin'));

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthErrors();

    const nameVal = authName.value.trim();
    const emailVal = authEmail.value.trim();
    const passwordVal = authPassword.value;
    let valid = true;

    if (authMode === 'signup' && nameVal.length < 2) {
      authNameError.textContent = 'Name must be at least 2 characters.';
      valid = false;
    }

    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      authEmailError.textContent = 'Enter a valid email address.';
      valid = false;
    }

    if (!passwordVal || passwordVal.length < 6) {
      authPasswordError.textContent = 'Password must be at least 6 characters.';
      valid = false;
    }

    if (!valid) return;

    const originalLabel = authSubmitBtn.textContent;
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent =
      authMode === 'signup' ? 'Creating account...' : 'Signing in...';

    try {
      let endpoint = '/api/auth/login';
      if (authMode === 'signup') endpoint = '/api/auth/signup';
      else if (authMode === 'admin') endpoint = '/api/auth/admin-login';

      const body =
        authMode === 'signup'
          ? { name: nameVal, email: emailVal, password: passwordVal }
          : { email: emailVal, password: passwordVal };

      const { user } = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
        skipAuthRedirect: true,
      });

      currentUser = user;
      authForm.reset();
      closeAuthModal();

      // Admins land on Home to manage Home links; regular users go to My Links
      const targetPage = user.role === 'admin' ? 'home' : 'my';
      await switchPage(targetPage);

      showToast(
        authMode === 'signup'
          ? `Welcome, ${user.name}!`
          : user.role === 'admin'
          ? `Signed in as Admin (${user.name})`
          : `Welcome back, ${user.name}!`
      );
    } catch (err) {
      authFormError.textContent = err.message || 'Authentication failed.';
      authFormError.style.display = 'block';
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = originalLabel;
    }
  });

  logoutBtn.addEventListener('click', async () => {
    moreOptionsMenu.classList.remove('show');
    try {
      await apiRequest('/api/auth/logout', { method: 'POST', skipAuthRedirect: true });
    } catch (_) {
      // Ignore logout network error
    }
    currentUser = null;
    await switchPage('home');
    showToast('Signed out');
  });

  // Init: start on public Home page and check if user has an active session
  async function init() {
    currentUser = await checkSession();
    activePage = 'home';
    updateHeaderAndChrome();
    await loadData();
    renderCategories();
    renderLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
