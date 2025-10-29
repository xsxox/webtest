const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 3000;

// 配置EJS模板
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 解析POST表单数据
app.use(bodyParser.urlencoded({ extended: false }));

// 服务器内存存储：记录已投票的用户标识+教师ID
const votedRecords = new Map();
// 获取服务器启动时间以刷新投票资格
const serverStartTime = new Date().getTime(); // 毫秒级时间戳

// 数据库路径
const dbPath = path.join(__dirname, 'db', 'vote.db');

// 连接数据库并初始化
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败：', err.message);
  } else {
    console.log('数据库连接成功');
    initTeachersTable();
  }
});

// 初始化教师表
function initTeachersTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      votes INTEGER DEFAULT 0
    )
  `, (err) => {
    if (err) {
      console.error('创建teachers表失败：', err.message);
      return;
    }
    console.log('teachers表已就绪');

    // 插入初始教师数据（如果表为空）
    db.get("SELECT COUNT(*) AS count FROM teachers", (err, row) => {
      if (err) {
        console.error('查询教师数据失败：', err.message);
        return;
      }
      if (row.count === 0) {
        const insertSql = "INSERT INTO teachers (name, votes) VALUES (?, ?)";
        const teachers = ['郭克华', '李亚', '刘璇'];
        teachers.forEach(name => {
          db.run(insertSql, [name, 0], (err) => {
            if (err) console.error(`插入教师${name}失败：`, err.message);
            else console.log(`已插入初始教师：${name}`);
          });
        });
      }
    });
  });
}

// 新增：获取服务器启动时间（用于前端检测重启）
app.get('/api/server-info', (req, res) => {
  res.json({ serverStartTime: serverStartTime });
});

// 首页路由
app.get('/', (req, res) => {
  res.render('index');
});

// 数据接口
app.get('/api/data', (req, res) => {
  db.all("SELECT id, name, votes FROM teachers ORDER BY id", [], (err, teachers) => {
    if (err) {
      return res.json({ success: false, message: '查询数据失败' });
    }
    const totalVotes = teachers.reduce((sum, t) => sum + t.votes, 0);
    res.json({ success: true, teachers, totalVotes });
  });
});

// 投票接口
app.post('/vote', (req, res) => {
  const { teacherId, userToken } = req.body;

  if (!teacherId || !userToken) {
    return res.json({ success: false, message: '参数不完整' });
  }

  const recordKey = `${userToken}_${teacherId}`;

  if (votedRecords.has(recordKey)) {
    return res.json({ success: false, message: '您已对该教师投过票，不能重复投票哦~' });
  }

  db.run(
    "UPDATE teachers SET votes = votes + 1 WHERE id = ?",
    [teacherId],
    function(err) {
      if (err) {
        return res.json({ success: false, message: '投票失败：' + err.message });
      }
      if (this.changes === 0) {
        return res.json({ success: false, message: '未找到该教师' });
      }

      votedRecords.set(recordKey, true);

      db.all("SELECT id, name, votes FROM teachers ORDER BY id", [], (err, teachers) => {
        if (err) {
          return res.json({ success: false, message: '查询更新后的数据失败' });
        }
        const totalVotes = teachers.reduce((sum, t) => sum + t.votes, 0);
        res.json({ success: true, teachers, totalVotes });
      });
    }
  );
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行中：http://localhost:${port}`);
  console.log(`服务器启动时间：${new Date(serverStartTime).toLocaleString()}`);
});