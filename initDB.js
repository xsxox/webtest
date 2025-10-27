const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径：项目根目录下的 db 文件夹里的 vote.db
const dbPath = path.join(__dirname, 'db', 'vote.db');

// 连接数据库（如果文件不存在，会自动创建）
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败：', err.message); // 连接失败时提示错误
  } else {
    console.log('数据库连接成功！');

    // 创建 teachers 表（如果不存在）
    db.run(`
      CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 教师编号（自增主键）
        name TEXT NOT NULL,                    -- 教师姓名
        votes INTEGER DEFAULT 0                -- 得票数，默认0
      )
    `, (err) => {
      if (err) {
        console.error('创建表失败：', err.message);
      } else {
        console.log('teachers 表创建成功（或已存在）');

        // 检查表中是否已有数据，避免重复插入
        db.get("SELECT COUNT(*) AS count FROM teachers", (err, row) => {
          if (err) {
            console.error('查询数据失败：', err.message);
          } else if (row.count === 0) { // 如果表为空，插入初始教师数据
            const insertSql = "INSERT INTO teachers (name, votes) VALUES (?, ?)";
            // 插入3位教师，初始得票数都是0
            db.run(insertSql, ['郭克华', 0], (err) => {
              if (err) console.error('插入数据失败：', err.message);
              else console.log('插入教师：郭克华');
            });
            db.run(insertSql, ['李亚', 0], (err) => {
              if (err) console.error('插入数据失败：', err.message);
              else console.log('插入教师：李亚');
            });
            db.run(insertSql, ['刘璇', 0], (err) => {
              if (err) console.error('插入数据失败：', err.message);
              else console.log('插入教师：刘璇');
            });
            console.log('初始教师数据插入完成');
          } else {
            console.log('表中已有数据，无需重复插入');
          }
        });
      }
    });
  }
});

// 关闭数据库连接（操作完成后关闭）
db.close((err) => {
  if (err) {
    console.error('关闭数据库失败：', err.message);
  } else {
    console.log('数据库连接已关闭');
  }
});