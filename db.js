const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'db');

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Helper to get filepath for a table
function getFilePath(table) {
  return path.join(DB_DIR, `${table}.json`);
}

// Read data from a table
function read(table) {
  const filePath = getFilePath(table);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (error) {
    console.error(`Error reading database table "${table}":`, error);
    return [];
  }
}

// Write data to a table
function write(table, data) {
  const filePath = getFilePath(table);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing database table "${table}":`, error);
    return false;
  }
}

// Find a single item by id
function findById(table, id) {
  const data = read(table);
  return data.find(item => item.id === parseInt(id));
}

// Insert a row into a table (auto-generates numeric ID)
function insert(table, row) {
  const data = read(table);
  const nextId = data.length > 0 ? Math.max(...data.map(item => item.id || 0)) + 1 : 1;
  const newRow = { id: nextId, ...row, created_at: Date.now() };
  data.push(newRow);
  write(table, data);
  return newRow;
}

// Update a row in a table by id
function update(table, id, updates) {
  const data = read(table);
  const index = data.findIndex(item => item.id === parseInt(id));
  if (index === -1) return null;
  const updatedItem = { ...data[index], ...updates };
  data[index] = updatedItem;
  write(table, data);
  return updatedItem;
}

// Delete a row in a table by id
function remove(table, id) {
  const data = read(table);
  const filtered = data.filter(item => item.id !== parseInt(id));
  write(table, filtered);
  return true;
}

// Seed Initial Database Data
function seedDatabase() {
  // 1. Seed Global Churches (Churches database with physical addresses & geolocation tags)
  const churchesFile = getFilePath('churches');
  if (!fs.existsSync(churchesFile) || JSON.parse(fs.readFileSync(churchesFile, 'utf-8')).length === 0) {
    const mockChurches = [
      { id: 1, name: "洛杉矶恩典社区教会 (Grace Community Church)", address: "13248 Roscoe Blvd, Sun Valley, CA 91352", country: "美国 (United States)", state: "加利福尼亚州 (California)", city: "洛杉矶 (Los Angeles)" },
      { id: 2, name: "温哥华圣公会三一堂 (St. John's Shaughnessy Anglican Church)", address: "1490 Nanton Ave, Vancouver, BC V6H 2E2", country: "加拿大 (Canada)", state: "不列颠哥伦比亚省 (British Columbia)", city: "温哥华 (Vancouver)" },
      { id: 3, name: "圣何塞信义会第一堂 (First Immanuel Lutheran Church)", address: "374 S 3rd St, San Jose, CA 95112", country: "美国 (United States)", state: "加利福尼亚州 (California)", city: "圣何塞 (San Jose)" },
      { id: 4, name: "多伦多华人福音教会 (Toronto Chinese Gospel Church)", address: "9 Metropolitan Rd, Scarborough, ON M1R 2T5", country: "加拿大 (Canada)", state: "安大略省 (Ontario)", city: "多伦多 (Toronto)" },
      { id: 5, name: "伦敦威斯敏斯特圣母主教座堂 (Westminster Cathedral)", address: "42 Francis St, London SW1P 1QW", country: "英国 (United Kingdom)", state: "英格兰 (England)", city: "伦敦 (London)" },
      { id: 6, name: "旧金山圣伯多禄圣保禄堂 (Saints Peter and Paul Church)", address: "666 Filbert St, San Francisco, CA 94133", country: "美国 (United States)", state: "加利福尼亚州 (California)", city: "旧金山 (San Francisco)" },
      { id: 7, name: "西雅图第一长老教会 (Seattle First Presbyterian Church)", address: "1013 8th Ave, Seattle, WA 98104", country: "美国 (United States)", state: "华盛顿州 (Washington)", city: "西雅图 (Seattle)" },
      { id: 8, name: "温哥华华人宣道会 (Vancouver Chinese Alliance Church)", address: "3330 Knight St, Vancouver, BC V5N 3K8", country: "加拿大 (Canada)", state: "不列颠哥伦比亚省 (British Columbia)", city: "温哥华 (Vancouver)" },
      { id: 9, name: "旧金山圣玛利亚主教座堂 (Cathedral of Saint Mary of the Assumption)", address: "1111 Gough St, San Francisco, CA 94109", country: "美国 (United States)", state: "加利福尼亚州 (California)", city: "旧金山 (San Francisco)" },
      { id: 10, name: "圣何塞华基教会 (San Jose Christian Alliance Church)", address: "2360 McLaughlin Ave, San Jose, CA 95122", country: "美国 (United States)", state: "加利福尼亚州 (California)", city: "圣何塞 (San Jose)" }
    ];
    write('churches', mockChurches);
    console.log("Seeded default churches list.");
  }

  // 2. Seed Default Admin & Test Users
  const usersFile = getFilePath('users');
  if (!fs.existsSync(usersFile) || JSON.parse(fs.readFileSync(usersFile, 'utf-8')).length === 0) {
    const mockUsers = [
      {
        id: 1,
        email: "admin@churchos.net",
        password: "adminpassword", // Simple text password for demo
        nickname: "筹备发起人 (陈晨)",
        church_name: "平台管理处",
        country: "中国 (China)",
        state: "广东 (Guangdong)",
        city: "深圳 (Shenzhen)",
        role_category: "干事 / 行政人员 (Secretary / Administrator)",
        is_admin: true,
        avatar_color: "linear-gradient(135deg, #a200ff, #00f0ff)"
      },
      {
        id: 2,
        email: "pastor.tim@grace.org",
        password: "password123",
        nickname: "Tim Zhang",
        church_name: "洛杉矶恩典社区教会 (Grace Community Church)",
        country: "美国 (United States)",
        state: "加利福尼亚州 (California)",
        city: "洛杉矶 (Los Angeles)",
        role_category: "主任牧师 / 神父 (Senior Pastor / Priest)",
        is_admin: false,
        avatar_color: "linear-gradient(135deg, #ff007b, #9900ff)"
      },
      {
        id: 3,
        email: "sarah.treasurer@stjohns.ca",
        password: "password123",
        nickname: "Sarah Miller",
        church_name: "温哥华圣公会三一堂 (St. John's Shaughnessy Anglican Church)",
        country: "加拿大 (Canada)",
        state: "不列颠哥伦比亚省 (British Columbia)",
        city: "温哥华 (Vancouver)",
        role_category: "财务 / 出纳 (Treasurer / Financial Secretary)",
        is_admin: false,
        avatar_color: "linear-gradient(135deg, #00f0ff, #00ff7b)"
      }
    ];
    write('users', mockUsers);
    console.log("Seeded default user accounts.");
  }

  // 3. Seed Default Wishes (Co-creation expectations submitted by test users)
  const wishesFile = getFilePath('wishes');
  if (!fs.existsSync(wishesFile) || JSON.parse(fs.readFileSync(wishesFile, 'utf-8')).length === 0) {
    const mockWishes = [
      {
        id: 1,
        user_id: 2,
        title: "智能义工轮班冲突预警 calendar",
        content: "我们教会目前排班经常出现同一个同工在同一主日早上既排了诗班，又被排了音控服侍的情况。希望能有一个可视化的排班日历冲突检测系统，排班冲突时自动亮红报错，并支持微信/邮件一键发送通知。",
        category: "排班事工",
        images: [],
        audio_path: null,
        is_anonymous: 0,
        status: "accepted", // accepted = 已采纳
        votes: 18,
        voted_users: [1, 2, 3],
        admin_reply: "非常有价值的服侍排班需求！我们已经在后台通过 AI 分析生成了专门的『智能排班日历组件原型』，您可以在下方直接预览和点击操作！",
        parent_wish_id: null,
        merge_reason: null,
        dispute_reason: null,
        dispute_status: "none"
      },
      {
        id: 2,
        user_id: 3,
        title: "年底奉献退税凭证一键批量开具",
        content: "在加拿大，年底会友需要凭教会开具的官方捐款凭证抵扣个人所得税。我们财务目前需要手动Excel核对、排版每一张PDF发给几百人，工作量极大，且极易出错。希望能支持批量核对数据、一键打包发送至会友邮箱，且PDF格式必须完美符合加拿大CRA税务局的要求！",
        category: "奉献财务",
        images: [],
        audio_path: null,
        is_anonymous: 0,
        status: "accepted",
        votes: 14,
        voted_users: [1, 3],
        admin_reply: "这关系到教会的信誉与信徒的奉献权益。我们已设计了财务报表与PDF自动寄送的原型组件，正在走查开发。",
        parent_wish_id: null,
        merge_reason: null,
        dispute_reason: null,
        dispute_status: "none"
      },
      {
        id: 3,
        user_id: 2,
        title: "同工主日智能排班自动日历导出",
        content: "希望排班确定之后，不仅系统里能看到，还支持同工一键把自己的排班表导入到手机的手机日历（Apple Calendar/Google Calendar）中，这样不容易错过服侍时间。",
        category: "排班事工",
        images: [],
        audio_path: null,
        is_anonymous: 0,
        status: "merged", // merged = 已合并到 wish 1
        votes: 5,
        voted_users: [2],
        admin_reply: null,
        parent_wish_id: 1, // Merged to wish 1
        merge_reason: "该需求与『智能义工轮班冲突预警』高度重复，已统一合并入该项中进行开发规划。",
        dispute_reason: null,
        dispute_status: "none"
      }
    ];
    write('wishes', mockWishes);
    console.log("Seeded default wishes.");
  }

  // 4. Seed Default Comments
  const commentsFile = getFilePath('comments');
  if (!fs.existsSync(commentsFile) || JSON.parse(fs.readFileSync(commentsFile, 'utf-8')).length === 0) {
    const mockComments = [
      {
        id: 1,
        wish_id: 1,
        user_id: 3,
        nickname: "Sarah Miller",
        avatar_color: "linear-gradient(135deg, #00f0ff, #00ff7b)",
        content: "太同意了！我们教会的音控同工极其紧张，经常因为排班打架漏掉服侍，特别影响崇拜体验。",
        reply_to_nickname: null,
        parent_comment_id: null
      },
      {
        id: 2,
        wish_id: 1,
        user_id: 2,
        nickname: "Tim Zhang",
        avatar_color: "linear-gradient(135deg, #ff007b, #9900ff)",
        content: "是的，尤其是有些小组长服侍很频繁，如果能有个系统统一把控，就更贴心了。",
        reply_to_nickname: "Sarah Miller",
        parent_comment_id: 1 // Level 2 reply to comment 1
      }
    ];
    write('comments', mockComments);
    console.log("Seeded default comments.");
  }

  // 5. Seed Default Notifications
  const notificationsFile = getFilePath('notifications');
  if (!fs.existsSync(notificationsFile) || JSON.parse(fs.readFileSync(notificationsFile, 'utf-8')).length === 0) {
    const mockNotifications = [
      {
        id: 1,
        user_id: 2,
        type: "comment",
        message: "<b>Sarah Miller</b> 评论了您的痛点建言《智能义工轮班冲突预警 calendar》",
        read: false
      }
    ];
    write('notifications', mockNotifications);
    console.log("Seeded default notifications.");
  }
}

// Trigger initial seeding
seedDatabase();

module.exports = {
  read,
  write,
  findById,
  insert,
  update,
  remove
};
