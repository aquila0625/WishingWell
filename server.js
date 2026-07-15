const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for File Uploads (Screenshots and Audios)
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// --- HELPER MIDDLEWARE ---
// Simple User Extraction from Authorization Header: 'Bearer <userId>'
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "未登录，请先注册或登录同工账号！" });
  }
  const token = authHeader.replace('Bearer ', '');
  const user = db.findById('users', token);
  if (!user) {
    return res.status(401).json({ error: "同工会话无效，请重新登录！" });
  }
  req.user = user;
  next();
}

function adminAuthenticate(req, res, next) {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    if (!req.user.is_admin) {
      return res.status(403).json({ error: "权限拒绝：仅发起人或平台管理员可进行此操作！" });
    }
    next();
  });
}

// Helper to push notification to database
function addNotification(userId, type, message) {
  db.insert('notifications', {
    user_id: parseInt(userId),
    type,
    message,
    read: false
  });
}

// --- 1. AUTH & GEOLOCATION ROUTES ---

// Dynamic Church Search Autocomplete (Prioritizing User detected City/State)
app.get('/api/churches/autocomplete', (req, res) => {
  const { query, city, state } = req.query;
  const churches = db.read('churches');

  let results = [...churches];

  // Perform fuzzy search if query exists
  if (query) {
    const cleanQuery = query.toLowerCase().trim();
    results = results.filter(c =>
      c.name.toLowerCase().includes(cleanQuery) ||
      c.address.toLowerCase().includes(cleanQuery)
    );
  }

  // Sorting: Prioritize churches in the user's detected City or State
  results.sort((a, b) => {
    const aCityMatch = city && a.city.toLowerCase().includes(city.toLowerCase());
    const bCityMatch = city && b.city.toLowerCase().includes(city.toLowerCase());
    const aStateMatch = state && a.state.toLowerCase().includes(state.toLowerCase());
    const bStateMatch = state && b.state.toLowerCase().includes(state.toLowerCase());

    if (aCityMatch && !bCityMatch) return -1;
    if (!aCityMatch && bCityMatch) return 1;
    if (aStateMatch && !bStateMatch) return -1;
    if (!aStateMatch && bStateMatch) return 1;
    return 0;
  });

  res.json(results.slice(0, 10)); // Limit to top 10 matches
});

// Register
app.post('/api/auth/register', upload.single('avatar'), (req, res) => {
  const { email, password, nickname, church_name, country, state, city, role_category, role_detail } = req.body;

  if (!email || !password || !nickname || !church_name || !country || !state || !city || !role_category) {
    return res.status(400).json({ error: "请完整填写所有必填字段！" });
  }

  const users = db.read('users');
  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "该邮箱已被注册！" });
  }

  // Generate glowing initials gradient avatar color
  const gradients = [
    "linear-gradient(135deg, #a200ff, #00f0ff)",
    "linear-gradient(135deg, #ff007b, #9900ff)",
    "linear-gradient(135deg, #00f0ff, #00ff7b)",
    "linear-gradient(135deg, #ff7b00, #ff0055)",
    "linear-gradient(135deg, #7b00ff, #00ffcc)"
  ];
  const avatar_color = gradients[Math.floor(Math.random() * gradients.length)];

  // User uploaded avatar path (if exists)
  const avatar_path = req.file ? `/uploads/${req.file.filename}` : null;

  const newUser = db.insert('users', {
    email,
    password, // Demo uses simple text password comparison
    nickname,
    church_name,
    country,
    state,
    city,
    role_category,
    role_detail: role_detail || "",
    avatar_color,
    avatar_path,
    is_admin: email.toLowerCase().includes('admin')
  });

  res.json({ message: "注册成功，欢迎加入 ChurchOS 需求共创！", user: { id: newUser.id, nickname: newUser.nickname, email: newUser.email, is_admin: newUser.is_admin } });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "请输入邮箱和密码！" });
  }
  const users = db.read('users');
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(400).json({ error: "邮箱或密码错误，请重新输入！" });
  }
  res.json({ message: "登录成功，欢迎重返共创！", user: { id: user.id, nickname: user.nickname, email: user.email, is_admin: user.is_admin } });
});

// Get Current User Profile
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json(req.user);
});


// --- 2. CO-CREATION EXPECTATION (WISH) ROUTES ---

// Get Wish list
app.get('/api/wishes', (req, res) => {
  const wishes = db.read('wishes');
  const users = db.read('users');

  // Map submittors and nested comments/replies count
  const wishesWithAuthors = wishes.map(wish => {
    const author = users.find(u => u.id === wish.user_id);
    return {
      ...wish,
      author: author ? {
        nickname: author.nickname,
        church_name: author.church_name,
        role_category: author.role_category,
        avatar_color: author.avatar_color,
        avatar_path: author.avatar_path
      } : null
    };
  });

  res.json(wishesWithAuthors);
});

// Fuzzy Similarity Check prior to Submission (防抖查重)
app.post('/api/wishes/check-similar', (req, res) => {
  const { title } = req.body;
  if (!title || title.trim().length < 3) return res.json([]);

  const cleanTitle = title.toLowerCase().trim();
  const wishes = db.read('wishes').filter(w => w.status !== 'merged'); // Only check active/non-merged wishes
  const users = db.read('users');

  // Basic word overlap matching logic
  const tokens = cleanTitle.split(/[\s,./\\-]+/);
  const matches = wishes.map(wish => {
    let score = 0;
    const wishTitle = wish.title.toLowerCase();

    // Check full string match
    if (wishTitle.includes(cleanTitle) || cleanTitle.includes(wishTitle)) {
      score += 10;
    }

    // Check token overlaps
    tokens.forEach(token => {
      if (token.length > 1 && wishTitle.includes(token)) {
        score += 2;
      }
    });

    return { wish, score };
  })
  .filter(m => m.score > 2)
  .sort((a, b) => b.score - a.score)
  .slice(0, 3)
  .map(m => {
    const author = users.find(u => u.id === m.wish.user_id);
    return {
      ...m.wish,
      author_nickname: author ? author.nickname : "同工"
    };
  });

  res.json(matches);
});

// AI Voice/Audio Transcription Mock (置信度判定)
app.post('/api/wishes/audio-transcribe', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "未接收到录音数据！" });
  }

  // Simulate AI Speech Recognition and Confidence score
  // If the audio filename indicates a test case, mock low confidence
  const filename = req.file.originalname.toLowerCase();
  const isUnclear = filename.includes('noisy') || filename.includes('unclear') || Math.random() < 0.2;

  const transcribedText = isUnclear
    ? "（录音杂音较大... 模糊不清... 好像在说排班还是财务...）"
    : "希望能有一个一键导入手机系统日历的功能，方便同工在自己的iPhone日历上看到主日排班安排。";

  const confidence = isUnclear ? 55 : 94; // Threshold is 70%

  res.json({
    text: transcribedText,
    confidence,
    audioUrl: `/uploads/${req.file.filename}`
  });
});

// Submit a new Wish / Expectation
app.post('/api/wishes', authenticate, upload.array('images', 3), (req, res) => {
  const { title, content, category, audio_path } = req.body;

  if (!title || !content || !category) {
    return res.status(400).json({ error: "标题、内容与分类均不能为空！" });
  }
  if (title.length > 30) {
    return res.status(400).json({ error: "标题不能超过30字！" });
  }
  if (title.length < 5 || content.length < 10) {
    return res.status(400).json({ error: "标题最少5字，详情描述最少10字！" });
  }

  // Anti-flooding limit: max 3 wishes per day per account
  const wishes = db.read('wishes');
  const today = new Date().setHours(0,0,0,0);
  const userWishesToday = wishes.filter(w => w.user_id === req.user.id && w.created_at >= today);
  if (userWishesToday.length >= 3) {
    return res.status(429).json({ error: "提交过多：每位同工每日最多提交 3 条痛点建言！" });
  }

  // Handle uploaded images
  const images = [];
  if (req.files) {
    req.files.forEach(file => {
      images.push(`/uploads/${file.filename}`);
    });
  }

  const newWish = db.insert('wishes', {
    user_id: req.user.id,
    title,
    content,
    category,
    images,
    audio_path: audio_path || null,
    is_anonymous: 0,
    status: "voting", // default is 'voting'
    votes: 1,
    voted_users: [req.user.id],
    admin_reply: null,
    parent_wish_id: null,
    merge_reason: null,
    dispute_reason: null,
    dispute_status: "none"
  });

  res.json({ message: "建言许愿成功！已激起同工池水波涟漪 🪙", wish: newWish });
});

// Edit/Delete Wish (Self-service modification prior to handling)
app.patch('/api/wishes/:id', authenticate, (req, res) => {
  const wish = db.findById('wishes', req.params.id);
  if (!wish) return res.status(404).json({ error: "未找到该期望建言！" });
  if (wish.user_id !== req.user.id) return res.status(403).json({ error: "权限拒绝：您不是此建言的作者！" });

  if (wish.status === 'accepted' || wish.status === 'completed') {
    return res.status(400).json({ error: "该建言已被采纳或开发中，无法修改或撤回！" });
  }

  const { content, delete_image_index } = req.body;
  const updates = {};
  if (content) {
    if (content.length < 10) return res.status(400).json({ error: "内容描述最少为10字！" });
    updates.content = content;
  }

  // Option to delete uploaded privacy images
  if (delete_image_index !== undefined) {
    const updatedImages = [...wish.images];
    updatedImages.splice(parseInt(delete_image_index), 1);
    updates.images = updatedImages;
  }

  const updatedWish = db.update('wishes', wish.id, updates);
  res.json({ message: "建言更新成功！", wish: updatedWish });
});

// Delete Wish (Withdrawal)
app.delete('/api/wishes/:id', authenticate, (req, res) => {
  const wish = db.findById('wishes', req.params.id);
  if (!wish) return res.status(404).json({ error: "未找到该期望建言！" });
  if (wish.user_id !== req.user.id) return res.status(403).json({ error: "权限拒绝：您不是此建言的作者！" });

  if (wish.status === 'accepted' || wish.status === 'completed') {
    return res.status(400).json({ error: "该建言已被采纳或开发中，无法撤回！" });
  }

  db.remove('wishes', wish.id);
  res.json({ message: "建言已成功撤回！" });
});

// Vote (我有同感 / Amen support)
app.post('/api/wishes/:id/vote', authenticate, (req, res) => {
  const wish = db.findById('wishes', req.params.id);
  if (!wish) return res.status(404).json({ error: "未找到该期望建言！" });

  let votedUsers = wish.voted_users || [];
  let votes = wish.votes || 0;
  const index = votedUsers.indexOf(req.user.id);

  let message = "";
  if (index === -1) {
    // Add vote
    votedUsers.push(req.user.id);
    votes += 1;
    message = "已表达您的同感阿们！";
    // Notify author
    if (wish.user_id !== req.user.id) {
      addNotification(wish.user_id, "vote", `<b>${req.user.nickname}</b> 对您的痛点建言《${wish.title}》表达了同感！`);
    }
  } else {
    // Cancel vote
    votedUsers.splice(index, 1);
    votes -= 1;
    message = "已撤回您的同感支持。";
  }

  const updatedWish = db.update('wishes', wish.id, { voted_users: votedUsers, votes: votes });
  res.json({ message, wish: updatedWish });
});

// Voter wall list (Voter List details lookup)
app.get('/api/wishes/:id/voters', (req, res) => {
  const wish = db.findById('wishes', req.params.id);
  if (!wish) return res.status(404).json({ error: "未找到该期望建言！" });

  const users = db.read('users');
  const details = (wish.voted_users || []).map(uid => {
    const user = users.find(u => u.id === uid);
    return user ? {
      nickname: user.nickname,
      church_name: user.church_name,
      role_category: user.role_category,
      avatar_color: user.avatar_color,
      avatar_path: user.avatar_path
    } : null;
  }).filter(Boolean);

  res.json(details);
});

// Post Comment (Comments & 2-level replies)
app.post('/api/wishes/:id/comment', authenticate, (req, res) => {
  const { content, parent_comment_id, reply_to_nickname } = req.body;
  if (!content || content.trim().length < 2) {
    return res.status(400).json({ error: "评论内容不能少于2个字！" });
  }

  const wish = db.findById('wishes', req.params.id);
  if (!wish) return res.status(404).json({ error: "未找到该期望建言！" });

  const newComment = db.insert('comments', {
    wish_id: wish.id,
    user_id: req.user.id,
    nickname: req.user.nickname,
    avatar_color: req.user.avatar_color,
    avatar_path: req.user.avatar_path,
    content,
    parent_comment_id: parent_comment_id ? parseInt(parent_comment_id) : null,
    reply_to_nickname: reply_to_nickname || null
  });

  // Notify target user
  if (parent_comment_id) {
    const parentComment = db.findById('comments', parent_comment_id);
    if (parentComment && parentComment.user_id !== req.user.id) {
      addNotification(parentComment.user_id, "reply", `<b>${req.user.nickname}</b> 在建言评论区回复了您：\"${content.slice(0, 15)}...\"`);
    }
  } else {
    // Notify wish author
    if (wish.user_id !== req.user.id) {
      addNotification(wish.user_id, "comment", `<b>${req.user.nickname}</b> 评论了您的痛点建言《${wish.title}》`);
    }
  }

  res.json({ message: "评论成功发表！", comment: newComment });
});

// Get Comments for a Wish
app.get('/api/wishes/:id/comments', (req, res) => {
  const comments = db.read('comments').filter(c => c.wish_id === parseInt(req.params.id));

  // Arrange into Level 1 and Level 2 hierarchy (Flat Moments style)
  const l1Comments = comments.filter(c => !c.parent_comment_id);
  const l2Comments = comments.filter(c => c.parent_comment_id);

  const arranged = l1Comments.map(l1 => {
    const replies = l2Comments.filter(l2 => l2.parent_comment_id === l1.id);
    return {
      ...l1,
      replies
    };
  });

  res.json(arranged);
});

// AI card/comment translation
app.post('/api/wishes/:id/translate', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "翻译文本不能为空！" });

  // Mock AI translation based on text patterns
  let translation = "This is a mock AI Translation into English: ";
  if (text.includes("排班") || text.includes("calendar")) {
    translation = "I hope we can have an volunteer scheduling system to avoid calendar conflicts.";
  } else if (text.includes("奉献") || text.includes("财务")) {
    translation = "We need a one-click tax-receipt generator to send PDFs to members at year-end, complying with tax regulations.";
  } else {
    translation = `Translated: "${text.slice(0, 30)}..." [Transformed by ChurchOS AI]`;
  }

  res.json({ translation });
});

// Dispute merge (申请拆分)
app.post('/api/wishes/:id/dispute', authenticate, (req, res) => {
  const { reason } = req.body;
  if (!reason || reason.trim().length < 10) {
    return res.status(400).json({ error: "申诉理由最少为10字！" });
  }

  const wish = db.findById('wishes', req.params.id);
  if (!wish) return res.status(404).json({ error: "未找到该期望建言！" });
  if (wish.user_id !== req.user.id) return res.status(403).json({ error: "仅有建言原作者才能发起拆分申诉！" });
  if (wish.status !== 'merged') {
    return res.status(400).json({ error: "该建言并未被合并，无需发起拆分申诉！" });
  }

  const updatedWish = db.update('wishes', wish.id, {
    dispute_reason: reason,
    dispute_status: "pending"
  });

  // Notify admin
  addNotification(1, "dispute", `同工 <b>${req.user.nickname}</b> 申诉拆分其已合并的痛点《${wish.title}》`);

  res.json({ message: "已提报申诉，平台筹备同工会尽快处理！", wish: updatedWish });
});


// --- 3. ADMIN MANAGEMENT & AI SYNTHESIS ROUTES ---

// Execute Force Merge (管理员强制合并)
app.post('/api/admin/wishes/merge', adminAuthenticate, (req, res) => {
  const { source_wish_id, target_wish_id, reason } = req.body;

  if (!source_wish_id || !target_wish_id || !reason) {
    return res.status(400).json({ error: "合并源ID、目标ID与合并原因均不能为空！" });
  }

  const source = db.findById('wishes', source_wish_id);
  const target = db.findById('wishes', target_wish_id);

  if (!source || !target) {
    return res.status(404).json({ error: "未找到合并源或目标卡片！" });
  }

  // Update source wish to 'merged' status and reference parent
  db.update('wishes', source.id, {
    status: "merged",
    parent_wish_id: target.id,
    merge_reason: reason
  });

  // Transfer votes and voters to target wish (deduplicated)
  const targetVoters = [...(target.voted_users || [])];
  (source.voted_users || []).forEach(uid => {
    if (!targetVoters.includes(uid)) {
      targetVoters.push(uid);
    }
  });

  db.update('wishes', target.id, {
    votes: targetVoters.length,
    voted_users: targetVoters
  });

  // Notify source author
  addNotification(source.user_id, "merge", `您的痛点建言《${source.title}》已被合并至《${target.title}》。原因：${reason}`);

  res.json({ message: "建言合并执行成功！合并票数已累加。" });
});

// Get disputes list
app.get('/api/admin/disputes', adminAuthenticate, (req, res) => {
  const wishes = db.read('wishes').filter(w => w.dispute_status === 'pending');
  const users = db.read('users');

  const detailedDisputes = wishes.map(wish => {
    const author = users.find(u => u.id === wish.user_id);
    const parentWish = db.findById('wishes', wish.parent_wish_id);
    return {
      ...wish,
      author_nickname: author ? author.nickname : "未知同工",
      parent_title: parentWish ? parentWish.title : "主期望"
    };
  });

  res.json(detailedDisputes);
});

// Resolve Dispute (同意拆分 / 驳回)
app.post('/api/admin/wishes/:id/resolve-dispute', adminAuthenticate, (req, res) => {
  const { action } = req.body; // 'approve' = 同意拆分, 'reject' = 驳回
  const wish = db.findById('wishes', req.params.id);
  if (!wish) return res.status(404).json({ error: "未找到该申诉建言！" });

  if (action === 'approve') {
    // Separate the wish: remove parent link, restore status to voting
    db.update('wishes', wish.id, {
      status: "voting",
      parent_wish_id: null,
      merge_reason: null,
      dispute_status: "approved"
    });

    // Notify author
    addNotification(wish.user_id, "dispute_resolved", `您的拆分申诉已被批准！痛点建言《${wish.title}》已恢复独立展现。`);
    res.json({ message: "已同意拆分！该建言已恢复独立状态。" });
  } else {
    db.update('wishes', wish.id, {
      dispute_status: "rejected"
    });
    // Notify author
    addNotification(wish.user_id, "dispute_resolved", `您的拆分申诉被驳回：维持合并决策。`);
    res.json({ message: "已驳回拆分申诉。" });
  }
});

// AI Pre-Analysis (智能分析归纳面板接口)
app.get('/api/admin/projects/ai-pre-export', adminAuthenticate, (req, res) => {
  const wishes = db.read('wishes');
  const users = db.read('users');

  // 1. Calculate demographics
  const totalUsers = users.filter(u => !u.is_admin).length;
  const rolesBreakdown = {};
  users.filter(u => !u.is_admin).forEach(u => {
    rolesBreakdown[u.role_category] = (rolesBreakdown[u.role_category] || 0) + 1;
  });

  // Calculate percentages
  const demographicsText = `本次共创共有 ${totalUsers} 位主内同工与信徒参与建言和助力，其中` +
    Object.keys(rolesBreakdown).map(role => ` ${role} 占 ${Math.round((rolesBreakdown[role]/totalUsers)*100)}%`).join('、') +
    `。共代表了来自 ${new Set(users.map(u => u.church_name)).size - 1} 家不同宗派堂会的同工群体。`;

  // 2. Mock Pain Point Clustering (聚类分析)
  const activeWishes = wishes.filter(w => w.status !== 'merged');
  const clusters = [
    {
      id: "cluster_1",
      topic: "智能服侍排班与日历冲突检测",
      description: "同工反映排班冲突严重、多系统排班零散。核心期望在于主日服侍排程可视化、冲突红线提醒，以及导出系统日历等功能。",
      total_votes: wishes.filter(w => w.id === 1 || w.parent_wish_id === 1).reduce((sum, w) => sum + w.votes, 0),
      original_wishes: [1, 3]
    },
    {
      id: "cluster_2",
      topic: "年底奉献退税凭证一键批量开具 (CRA/IRS合规)",
      description: "财务干事强烈呼吁解决年底手动核算免税凭证、开具PDF的繁琐负担。期望系统能够一键批量发送加密PDF到会友邮箱，并严格适配加美两地税法格式。",
      total_votes: wishes.filter(w => w.id === 2).reduce((sum, w) => sum + w.votes, 0),
      original_wishes: [2]
    }
  ];

  // 3. ROI Prioritization recommendations
  const recommendations = [
    { priority: "P0 (核心开发)", topic: "智能服侍排班与日历冲突检测", value: "高频刚需，直接打通同工日常服侍协作的效率瓶颈。" },
    { priority: "P0 (核心开发)", topic: "年底奉献退税凭证一键批量开具", value: "法律刚性合规痛点，直接减轻财务同工大半年的文案手工负担。" },
    { priority: "P1 (中高优先)", topic: "小组团契签到与新来宾关怀随访", value: "关系到教会人数留存，但对核心行政架构依赖性较轻。" }
  ];

  res.json({
    demographics: demographicsText,
    clusters,
    recommendations
  });
});

// One-Click Document Export (Markdown / Excel)
app.post('/api/admin/projects/export-document', adminAuthenticate, (req, res) => {
  const { format, reportData } = req.body;

  if (format === 'markdown') {
    // Generate Markdown document stream
    const mdContent = `# 《ChurchOS 教会通 - 产品共创需求定义与分析报告》

## 1. 项目共创参与度与同工画像 (Demographics)
${reportData.demographics || "暂无画像统计"}

## 2. 核心痛点聚类归纳报告 (Pain Points Clustered)
${(reportData.clusters || []).map((c, i) => `### 痛点 ${i+1}：${c.topic}
- **归纳陈述**：${c.description}
- **聚合热度（总点赞助力）**：${c.total_votes} 票
- **关联用户建言ID**：[#${c.original_wishes.join(', #')}]
`).join('\n')}

## 3. 功能开发优先级与 ROI 推荐 (Roadmap Priority Matrix)
${(reportData.recommendations || []).map((r, i) => `- **${r.priority}**：${r.topic} — *价值分析：${r.value}*`).join('\n')}

---
*本报告由 ChurchOS 共创许愿池 AI 分析引擎自动提炼生成。导出日期：${new Date().toLocaleDateString()}*
`;
    res.setHeader('Content-disposition', 'attachment; filename=ChurchOS_CoCreation_Report.md');
    res.setHeader('Content-type', 'text/markdown; charset=utf-8');
    return res.send(mdContent);
  } else {
    // Excel Format: Generate standard structured CSV (which opens perfectly in Excel with UTF-8)
    const wishes = db.read('wishes');
    const users = db.read('users');

    let csvContent = "\ufeff"; // UTF-8 BOM
    csvContent += "建言ID,分类板块,痛点标题,详细场景描述,总助力票数,提交者姓名,邮箱,教会名称,国家/城市,职务,合并状态,官方答复\n";

    wishes.forEach(w => {
      const author = users.find(u => u.id === w.user_id) || {};
      const statusText = w.status === 'merged' ? `已合并至#${w.parent_wish_id}` : w.status;
      const cleanContent = w.content.replace(/[\n\r,]+/g, '；');
      const cleanReply = (w.admin_reply || "").replace(/[\n\r,]+/g, '；');

      csvContent += `${w.id},${w.category},${w.title},${cleanContent},${w.votes},${author.nickname || ""},${author.email || ""},${author.church_name || ""},"${author.country || ""}-${author.city || ""}",${author.role_category || ""},${statusText},${cleanReply}\n`;
    });

    res.setHeader('Content-disposition', 'attachment; filename=ChurchOS_Requirements_Backlog.csv');
    res.setHeader('Content-type', 'text/csv; charset=utf-8');
    return res.send(csvContent);
  }
});

// SSE (Server-Sent Events) live progress log for Bulk Emailing Results
app.get('/api/admin/projects/send-emails', adminAuthenticate, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const users = db.read('users').filter(u => !u.is_admin);
  let index = 0;

  res.write(`data: ${JSON.stringify({ log: `🔔 开始准备群发 ChurchOS 结案共创蓝图... 共 ${users.length} 位同工需投递` })}\n\n`);

  const interval = setInterval(() => {
    if (index >= users.length) {
      res.write(`data: ${JSON.stringify({ log: `✅ 投递圆满结束！共成功发信 ${users.length} 封，投递状态：100% 成功` })}\n\n`);
      clearInterval(interval);
      res.end();
      return;
    }

    const u = users[index];
    res.write(`data: ${JSON.stringify({ log: `📨 正在向同工 [${u.nickname}] (${u.email}) 发送 HTML 反馈报告...` })}\n\n`);
    index++;
  }, 1000);
});


// --- 4. NOTIFICATION CENTER ROUTES ---

// Get User Notifications
app.get('/api/notifications', authenticate, (req, res) => {
  const notifications = db.read('notifications').filter(n => n.user_id === req.user.id);
  res.json(notifications);
});

// Mark all as read
app.post('/api/notifications/read-all', authenticate, (req, res) => {
  const notifications = db.read('notifications');
  notifications.forEach(n => {
    if (n.user_id === req.user.id) {
      n.read = true;
    }
  });
  db.write('notifications', notifications);
  res.json({ message: "通知已全部标为已读。" });
});


// Start server listener
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`⛪ ChurchOS Co-creation Backend is running on port ${PORT}`);
  console.log(`🔗 Access it locally at: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
