//import
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express(); //启动EJS框架
const port = 3000; //服务器端口

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: false }));  //解析表单数据


const votedUsers = new Set();//记录已投过票的用户标识（userToken），全局唯一  防止刷票
const serverStartTime = new Date().getTime(); // 服务器启动时间

const dbPath = path.join(__dirname, 'db', 'vote.db');  // 链接数据库
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('数据库连接失败：', err.message);
  else {
    console.log('数据库连接成功');
    initTeachersTable();
  }
});

function initTeachersTable() {
  //若无表，创建表
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

    db.get("SELECT COUNT(*) AS count FROM teachers", (err, row) => {
      if (err) {
        console.error('查询教师数据失败：', err.message);
        return;
      }
      //循环插入教师
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

// 获取服务器信息接口用来检测重启
app.get('/api/server-info', (req, res) => {
  res.json({ serverStartTime: serverStartTime });
});

app.get('/', (req, res) => {
  res.render('index');
});

// 数据接口
app.get('/api/data', (req, res) => {
  db.all("SELECT id, name, votes FROM teachers ORDER BY id", [], (err, teachers) => {
    if (err) return res.json({ success: false, message: '查询数据失败' });
    const totalVotes = teachers.reduce((sum, t) => sum + t.votes, 0);
    res.json({ success: true, teachers, totalVotes });
  });
});

// 投票接口：每个用户只能投一次
app.post('/vote', (req, res) => {
  const { teacherId, userToken } = req.body;

  if (!teacherId || !userToken) {
    return res.json({ success: false, message: '参数不完整' });
  }

  // 检查用户是否已投过票（全局唯一）
  if (votedUsers.has(userToken)) {
    return res.json({ success: false, message: '您已投过票，只能投一次哦~' });
  }

  // 更新教师票数
  db.run(
    "UPDATE teachers SET votes = votes + 1 WHERE id = ?",
    [teacherId],
    function(err) {
      if (err) return res.json({ success: false, message: '投票失败：' + err.message });
      if (this.changes === 0) return res.json({ success: false, message: '未找到该教师' });

      // 记录用户已投票
      votedUsers.add(userToken);

      db.all("SELECT id, name, votes FROM teachers ORDER BY id", [], (err, teachers) => {
        if (err) return res.json({ success: false, message: '查询更新后的数据失败' });
        const totalVotes = teachers.reduce((sum, t) => sum + t.votes, 0);
        res.json({ success: true, teachers, totalVotes });
      });
    }
  );
});

app.listen(port, () => {
  console.log(`服务器运行中：http://localhost:${port}`);
});