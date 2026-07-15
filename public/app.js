/* ==========================================
   ChurchOS Co-creation Platform JavaScript
   Interactive Simulation of UI Transitions & Triggers
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- Global States ---
  let isLoggedIn = false;
  let registeredUser = null;
  let countdownTimerInterval = null;
  let deadlineTime = new Date('2026-08-31T23:59:59').getTime();
  let countdownEnabled = true;
  let lastScrollY = window.scrollY;
  let autoCollapseBlocked = false;

  // --- Seed Data (Mock wishes for Square view Level 2) ---
  const mockWishes = [
    {
      id: 1,
      category: '排班事工',
      title: '主日义工排班严重打架/多事工冲突',
      desc: '我们堂会目前排班用的是Excel表，音控和投影同工常常同一个人在第一场和第二场被双重排班。主日早上临时找人顶替非常混乱。期望系统能在排班发生时间、职务冲突时给出醒目的红色警告提示！',
      author: 'Tim Zhang',
      church: '温哥华宣道会',
      role: '财务 / 出纳',
      geo: '📍 加拿大 Ontario Toronto',
      votes: 120,
      voted: false,
      comments: [
        { author: '李同工', role: '同工', text: '非常赞同！我们教会也遇到过，特别是诗班和音控经常撞车。' },
        { author: '王牧师', role: '牧师', text: '（已采纳补充细节）我们在多伦多主日崇拜中也是这种情况，音控和接待常常分身乏术。' }
      ]
    },
    {
      id: 2,
      category: '奉献财务',
      title: '年底一键开具加/美合规免税退税收据',
      desc: '年底财务同工核对几百个家庭的奉献账目，手工套用加拿大CRA规定的退税收据格式极其耗费精力。期望ChurchOS能够批量计算并一键打包发送带有PDF附件的官方免税退税收据，且格式完全合规！',
      author: '陈晨',
      church: '多伦多主恩堂',
      role: '财务 / 出纳',
      geo: '📍 加拿大 Ontario Toronto',
      votes: 85,
      voted: false,
      comments: [
        { author: 'Sarah Zhang', role: '义工', text: '支持！手动开收据每年要花一两个星期，如果能一键打包发邮箱太棒了！' }
      ]
    }
  ];

  // --- DOM Elements ---
  const headerLogo = document.getElementById('header-logo-home');
  const backToHomeBtn = document.getElementById('back-to-home-btn');
  const visitorStickyBar = document.getElementById('visitor-sticky-bar');
  const userProfile = document.getElementById('user-profile');
  const userNameSpan = document.getElementById('user-name-span');
  const userAvatarBtn = document.getElementById('user-avatar-btn');
  const logoutBtn = document.getElementById('logout-btn');

  // Views
  const homepageView = document.getElementById('homepage-view');
  const wishwallView = document.getElementById('wishwall-view');
  const floatingDrawer = document.getElementById('floating-drawer');
  const drawerHandle = document.getElementById('drawer-handle');
  const drawerHandleText = document.getElementById('drawer-handle-text');

  // Modals
  const authModal = document.getElementById('auth-modal');
  const wishFormModal = document.getElementById('wish-form-modal');
  const wishDetailModal = document.getElementById('wish-detail-modal');

  // Buttons
  const joinCoBtn = document.getElementById('join-co-btn');
  const goSquareBtn = document.getElementById('go-square-btn');
  const fastSubmitBtn = document.getElementById('fast-submit-btn');
  const sharePlatformBtn = document.getElementById('share-platform-btn');

  const stickyJoinBtn = document.getElementById('sticky-join-btn');
  const stickyLoginBtn = document.getElementById('sticky-login-btn');
  const closeAuthBtn = document.getElementById('close-auth-btn');

  // Tab switchers inside auth modal
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabRegisterBtn = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // Countdown elements
  const countdownBanner = document.getElementById('countdown-banner');
  const timerTicker = document.getElementById('timer-ticker');

  // --- Helper Functions ---

  // Toast notifications
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // Initial IP Geolocation Simulator
  function simulateIPGeolocation() {
    setTimeout(() => {
      document.getElementById('register-country').value = '加拿大 (Canada)';
      document.getElementById('register-state').value = 'Ontario';
      document.getElementById('register-city').value = 'Toronto';
      const statusText = document.getElementById('loc-status-text');
      if (statusText) {
        statusText.innerHTML = '📡 定位就绪：已基于您的网络IP进行静默地理匹配';
        statusText.style.color = '#00f0ff';
      }
    }, 1000);
  }

  // Countdown Ticker function
  function startCountdownTicker() {
    if (countdownTimerInterval) clearInterval(countdownTimerInterval);

    if (!countdownEnabled) {
      countdownBanner.style.display = 'none';
      return;
    }

    countdownBanner.style.display = 'block';

    countdownTimerInterval = setInterval(() => {
      const now = new Date().getTime();
      const distance = deadlineTime - now;

      if (distance < 0) {
        clearInterval(countdownTimerInterval);
        timerTicker.innerHTML = '🔒 本阶段需求提报通道已截止';
        countdownBanner.style.background = 'rgba(239, 68, 68, 0.08)';
        countdownBanner.style.borderColor = '#ef4444';
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      timerTicker.innerHTML = `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
    }, 1000);
  }

  // Switch between Login and Register tabs
  function showLoginTab() {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  }

  function showRegisterTab() {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    simulateIPGeolocation();
  }

  // --- Auth UI Flow Actions ---

  // Open Auth Modal (Default to Login tab)
  function openAuthPopup() {
    authModal.style.display = 'flex';
    showLoginTab();
  }

  function closeAuthPopup() {
    authModal.style.display = 'none';
  }

  // Submit Register Form
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const nickname = document.getElementById('register-nickname').value;
    const church = document.getElementById('register-church').value;
    const role = document.getElementById('register-role').value;
    const country = document.getElementById('register-country').value;
    const city = document.getElementById('register-city').value;

    // Save mock registration details
    registeredUser = {
      email,
      nickname,
      church,
      role,
      avatar: nickname.charAt(0).toUpperCase(),
      geo: `📍 ${country} ${city}`
    };

    showToast(`🎉 注册成功！请使用账号登录`);

    // Switch view back to Login
    setTimeout(() => {
      showLoginTab();
      // Prefill register email
      document.getElementById('login-email').value = email;
      document.getElementById('login-password').focus();
    }, 800);
  });

  // Submit Login Form
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;

    isLoggedIn = true;
    closeAuthPopup();
    showToast(`🔓 欢迎回来！登录成功`);

    // If user registered in this session, use their real info, else fallback
    const userNickname = registeredUser ? registeredUser.nickname : 'Tim Zhang';
    const userAvatar = registeredUser ? registeredUser.avatar : 'T';

    // Update Header UI to Logged-in state
    userProfile.style.display = 'flex';
    userNameSpan.textContent = userNickname;
    userAvatarBtn.textContent = userAvatar;

    // Hide Visitor sticky bar
    visitorStickyBar.style.display = 'none';

    // HIDE landing page login button
    joinCoBtn.style.display = 'none';
  });

  // Logout Flow
  logoutBtn.addEventListener('click', () => {
    isLoggedIn = false;
    userProfile.style.display = 'none';
    visitorStickyBar.style.display = 'flex';
    showToast(`🔒 已安全退出账户`);

    // SHOW landing page login button again
    joinCoBtn.style.display = 'inline-flex';
  });

  // Go to sub-level Wish Wall Square
  function showSquareView() {
    homepageView.style.display = 'none';
    wishwallView.style.display = 'block';
    backToHomeBtn.style.display = 'block';
    // Hide landing floating drawer in square view
    floatingDrawer.style.display = 'none';
    renderWishes();
  }

  // Go back to landing Homepage
  function showHomeView() {
    wishwallView.style.display = 'none';
    homepageView.style.display = 'block';
    backToHomeBtn.style.display = 'none';
    // Restore landing floating drawer in homepage view
    floatingDrawer.style.display = 'block';
    // Auto expand drawer back by default
    floatingDrawer.classList.remove('collapsed');
    drawerHandleText.textContent = '收起菜单 ▼';
  }

  // Bind Drawer manual toggle
  drawerHandle.addEventListener('click', () => {
    const isCollapsed = floatingDrawer.classList.toggle('collapsed');
    drawerHandleText.textContent = isCollapsed ? '展开菜单 ▲' : '收起菜单 ▼';
  });

  // Bind Auto-collapse on scroll (collapses immediately on scroll, stays collapsed)
  window.addEventListener('scroll', () => {
    // Only apply collapse rules when homepage is visible
    if (homepageView.style.display !== 'none') {
      if (!floatingDrawer.classList.contains('collapsed')) {
        floatingDrawer.classList.add('collapsed');
        drawerHandleText.textContent = '展开菜单 ▲';
      }
    }
  });

  // --- Rendering Wishes in Level 2 Square ---
  function renderWishes() {
    const grid = document.getElementById('wish-grid');
    grid.innerHTML = '';

    mockWishes.forEach(wish => {
      const card = document.createElement('div');
      card.className = 'wish-card';
      card.innerHTML = `
        <div class="wish-card-left">
          <div class="wish-card-meta">
            <span class="wish-card-author">👤 ${wish.author} · ${wish.church} · ${wish.role}</span>
          </div>
          <h4 class="wish-card-title">${wish.title}</h4>
          <p class="wish-card-desc">${wish.desc}</p>
        </div>
        <div class="wish-card-right" data-id="${wish.id}">
          <span class="vote-arrows">▲</span>
          <span class="vote-num">${wish.votes}</span>
          <span class="vote-lbl">我有同感</span>
          <span class="comments-count">💬 ${wish.comments.length}评论</span>
        </div>
      `;

      // Click card body to open details modal
      card.querySelector('.wish-card-left').addEventListener('click', () => {
        openWishDetails(wish);
      });

      // Click right area (vote) to support
      card.querySelector('.wish-card-right').addEventListener('click', (e) => {
        e.stopPropagation();
        handleVote(wish);
      });

      grid.appendChild(card);
    });
  }

  // Handle support/vote clicks with login check
  function handleVote(wish) {
    if (!isLoggedIn) {
      showToast('⚠️ 您必须先登录同工账号才能投票！');
      openAuthPopup();
      return;
    }

    if (wish.voted) {
      wish.votes--;
      wish.voted = false;
      showToast('已取消同感助力');
    } else {
      wish.votes++;
      wish.voted = true;
      showToast('🪙 投币许愿！助力同感成功！');
    }
    renderWishes();
  }

  // --- Details Modal Dialog Flow ---
  function openWishDetails(wish) {
    wishDetailModal.style.display = 'flex';
    document.getElementById('detail-category').textContent = wish.category;
    document.getElementById('detail-title').textContent = wish.title;
    document.getElementById('detail-content').textContent = wish.desc;
    document.getElementById('detail-author-name').textContent = wish.author;
    document.getElementById('detail-author-meta').textContent = `${wish.church} · ${wish.role}`;
    document.getElementById('detail-author-geo').textContent = wish.geo;
    document.getElementById('detail-author-avatar').textContent = wish.author.charAt(0).toUpperCase();
    document.getElementById('detail-vote-count').textContent = wish.votes;

    // Render voters
    const votersContainer = document.getElementById('detail-voters-list');
    votersContainer.innerHTML = '';

    // Add default initial avatars
    const initials = ['T', 'S', 'W', 'C'];
    initials.forEach(init => {
      const av = document.createElement('div');
      av.className = 'user-avatar';
      av.style.marginRight = '-8px';
      av.textContent = init;
      votersContainer.appendChild(av);
    });
    const extraLabel = document.createElement('span');
    extraLabel.style.marginLeft = '15px';
    extraLabel.style.fontSize = '0.78rem';
    extraLabel.style.color = '#94a3b8';
    extraLabel.textContent = `等 ${wish.votes} 位同工已同感助力`;
    votersContainer.appendChild(extraLabel);

    // Render Comments list
    const commentsList = document.getElementById('detail-comments-list');
    commentsList.innerHTML = '';

    wish.comments.forEach(c => {
      const item = document.createElement('div');
      item.className = 'comment-item';
      item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      item.style.padding = '10px 0';
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:#94a3b8; margin-bottom:5px;">
          <strong>${c.author} (${c.role})</strong>
          <button class="btn btn-text btn-sm translate-comment-btn">🌐 翻译</button>
        </div>
        <p style="margin:0; font-size:0.8rem; color:#cbd5e1;" class="comment-text">${c.text}</p>
        <div class="translated-text" style="display:none; margin-top:5px; padding:6px; background:rgba(255,255,255,0.03); border-radius:4px; font-size:0.78rem; color:#00f0ff;"></div>
      `;

      // Option B: Toggle comment translation
      item.querySelector('.translate-comment-btn').addEventListener('click', (e) => {
        const textNode = item.querySelector('.comment-text').textContent;
        const transBox = item.querySelector('.translated-text');

        if (transBox.style.display === 'none') {
          // Simulate AI translation
          transBox.textContent = `[AI Translation]: Thank you so much! Our church also faces the same scheduling conflicts.`;
          transBox.style.display = 'block';
          e.target.textContent = '收起翻译';
        } else {
          transBox.style.display = 'none';
          e.target.textContent = '🌐 翻译';
        }
      });

      commentsList.appendChild(item);
    });

    // Close Details Modal
    document.getElementById('close-wish-detail-btn').onclick = () => {
      wishDetailModal.style.display = 'none';
    };
  }

  // --- Sub-page comment submit simulator ---
  document.getElementById('comment-submit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      showToast('⚠️ 评论前请先登录同工账号！');
      openAuthPopup();
      return;
    }
    const input = document.getElementById('comment-input');
    const commentText = input.value;
    input.value = '';

    // Add comment to UI for simulation
    const commentsList = document.getElementById('detail-comments-list');
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    item.style.padding = '10px 0';

    const authorName = registeredUser ? registeredUser.nickname : 'Tim Zhang';
    const authorRole = registeredUser ? registeredUser.role : '同工';

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:#94a3b8; margin-bottom:5px;">
        <strong>${authorName} (${authorRole})</strong>
        <span style="font-size:0.65rem;">刚刚</span>
      </div>
      <p style="margin:0; font-size:0.8rem; color:#cbd5e1;">${commentText}</p>
    `;
    commentsList.appendChild(item);
    showToast('💬 评论发表成功！');
  });

  // --- Option C Sharing Overlay Popup ---
  function openShareOverlay() {
    // Copy link
    const shareUrl = window.location.href;
    const tempInput = document.createElement('input');
    tempInput.value = shareUrl;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);

    // Open Glassmorphic Modal
    const shareOverlay = document.createElement('div');
    shareOverlay.className = 'modal-overlay';
    shareOverlay.id = 'share-overlay';
    shareOverlay.innerHTML = `
      <div class="modal-card" style="text-align: center;">
        <button class="close-btn" id="close-share-overlay-btn">×</button>

        <div class="share-modal-container">
          <div class="share-toast-bar">
            🟢 推广链接已成功复制，可直接粘贴分享！
          </div>

          <h3 style="margin: 10px 0 5px 0;">我要分享</h3>
          <p class="desc" style="margin-bottom: 15px;">长按下方专属海报卡片保存，或直接粘贴短链接给同工：</p>

          <div class="poster-preview-wrapper">
            <img class="poster-preview-img" src="images/4_share.jpg" alt="Share Poster">
          </div>

          <p class="desc" style="color: #00f0ff; font-weight: 500;">
            💡 提示：在微信/手机中，长按上图即可直接“发送给朋友”或“保存图片”。
          </p>

          <button class="btn btn-secondary btn-block" id="close-share-btn-secondary" style="margin-top: 10px;">关闭</button>
        </div>
      </div>
    `;

    document.body.appendChild(shareOverlay);

    // Close actions
    const closeOverlay = () => shareOverlay.remove();
    shareOverlay.querySelector('#close-share-overlay-btn').onclick = closeOverlay;
    shareOverlay.querySelector('#close-share-btn-secondary').onclick = closeOverlay;
  }

  // --- Bind Event Listeners ---

  // Logo returns home
  headerLogo.addEventListener('click', showHomeView);
  backToHomeBtn.addEventListener('click', showHomeView);

  // Four CTA buttons on Landing Card
  joinCoBtn.addEventListener('click', openAuthPopup);
  goSquareBtn.addEventListener('click', showSquareView);

  fastSubmitBtn.addEventListener('click', () => {
    if (!isLoggedIn) {
      showToast('⚠️ 提需求前请先登录同工账号！');
      openAuthPopup();
      return;
    }
    wishFormModal.style.display = 'flex';
  });

  sharePlatformBtn.addEventListener('click', openShareOverlay);

  // Sticky bottom visitor bar buttons
  stickyJoinBtn.addEventListener('click', () => {
    authModal.style.display = 'flex';
    showRegisterTab();
  });

  stickyLoginBtn.addEventListener('click', openAuthPopup);

  // Close modals
  closeAuthBtn.addEventListener('click', closeAuthPopup);

  document.getElementById('close-wish-form-btn').onclick = () => {
    wishFormModal.style.display = 'none';
  };
  document.getElementById('cancel-wish-btn').onclick = () => {
    wishFormModal.style.display = 'none';
  };

  // Submit New Wish form (Cast coin animation)
  document.getElementById('wish-submit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('wish-title').value;
    const desc = document.getElementById('wish-content').value;
    const category = document.getElementById('wish-category').value;

    const authorName = registeredUser ? registeredUser.nickname : 'Tim Zhang';
    const authorChurch = registeredUser ? registeredUser.church : '温哥华宣道会';
    const authorRole = registeredUser ? registeredUser.role : '财务 / 出纳';
    const authorGeo = registeredUser ? registeredUser.geo : '📍 加拿大 Ontario Toronto';

    // Add new wish to square list
    mockWishes.unshift({
      id: mockWishes.length + 1,
      category,
      title,
      desc,
      author: authorName,
      church: authorChurch,
      role: authorRole,
      geo: authorGeo,
      votes: 1,
      voted: true,
      comments: []
    });

    wishFormModal.style.display = 'none';
    showToast('🪙 投币成功！您提报的服侍痛点已汇入共创水池！');
    showSquareView(); // Redirect to square to see their wish card
  });

  // Global lang switcher dropdown triggers
  const langDropdownBtn = document.getElementById('lang-dropdown-btn');
  const langDropdownMenu = document.getElementById('lang-dropdown-menu');

  langDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = langDropdownMenu.style.display === 'none';
    langDropdownMenu.style.display = isHidden ? 'block' : 'none';
  });

  document.querySelectorAll('.lang-option-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = btn.dataset.lang;
      const text = btn.textContent.split(' ')[0];

      document.getElementById('current-lang-text').textContent = text;

      document.querySelectorAll('.lang-option-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      langDropdownMenu.style.display = 'none';
      showToast(`🌐 页面已使用 AI 翻译切换为：${text}`);
    });
  });

  // Toggle dropdowns inside Auth Tab Header
  tabLoginBtn.addEventListener('click', showLoginTab);
  tabRegisterBtn.addEventListener('click', showRegisterTab);

  // Link inside Login form switching to Register
  document.getElementById('nickname-hint').innerHTML = `
    💡 建议使用真实姓名，未来可能会进入致谢墙。<br/>
    <a href="#" id="toggle-to-login-link" style="color:#00f0ff; text-decoration:underline;">已有账号？立即前往同工登录</a>
  `;

  // Close dropdown on click outside
  document.addEventListener('click', () => {
    langDropdownMenu.style.display = 'none';
  });

  // --- Initializers ---
  visitorStickyBar.style.display = 'flex'; // Visitor bar visible on launch
  startCountdownTicker();
  simulateIPGeolocation();

  // Easter egg: double click Logo to show Admin Console button
  let logoClicks = 0;
  headerLogo.addEventListener('dblclick', () => {
    logoClicks++;
    if (logoClicks >= 1) {
      const adminBtn = document.getElementById('admin-panel-btn');
      adminBtn.style.display = 'block';
      showToast('⚙️ 已开启后台管理入口（隐藏测试通道）');
    }
  });

  // Admin Dashboard Trigger
  const adminPanelBtn = document.getElementById('admin-panel-btn');
  const adminPanelOverlay = document.getElementById('admin-panel');
  const closeAdminBtn = document.getElementById('close-admin-btn');

  adminPanelBtn.addEventListener('click', () => {
    adminPanelOverlay.style.display = 'flex';
  });

  closeAdminBtn.addEventListener('click', () => {
    adminPanelOverlay.style.display = 'none';
  });

  // Bind Admin Nav switchers
  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.dataset.target;
      document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.style.display = tab.id === target ? 'block' : 'none';
      });
    });
  });

  // Save Settings inside Admin Panel
  document.getElementById('save-settings-btn').addEventListener('click', () => {
    countdownEnabled = document.getElementById('settings-countdown-enabled').checked;
    const deadlineVal = document.getElementById('settings-countdown-deadline').value;
    deadlineTime = new Date(deadlineVal).getTime();

    startCountdownTicker();
    showToast('⚙️ 后台共创截止设置保存成功！');
  });

});
