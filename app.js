// 导入需要的库
const express = require('express'); // Web框架
const bodyParser = require('body-parser'); // 解析表单数据
const path = require('path'); // 处理文件路径
const sqlite3 = require('sqlite3').verbose(); // 操作SQLite数据库

// 创建Express应用
const app = express();
const port = 3000; // 服务器端口

// 配置模板引擎为EJS（用于渲染HTML页面）
app.set('view engine', 'ejs');
// 设置模板文件存放目录（即我们接下来要创建的views文件夹）
app.set('views', path.join(__dirname, 'views'));

// 配置body-parser，用于解析POST请求中的表单数据
app.use(bodyParser.urlencoded({ extended: false }));

// 连接数据库（和初始化时的路径一致）
const db = new sqlite3.Database(path.join(__dirname, 'db', 'vote.db'), (err) => {
  if (err) {
    console.error('服务器启动时连接数据库失败：', err.message);
  } else {
    console.log('服务器已连接数据库');
  }
});

// 1. 首页路由：显示教师列表和投票界面
app.get('/', (req, res) => {
  // 查询所有教师的id、姓名、得票数
  const sql = "SELECT id, name, votes FROM teachers ORDER BY id";
  db.all(sql, [], (err, teachers) => {
    if (err) {
      res.send('查询教师数据失败：' + err.message); // 出错时显示错误
    } else {
      // 渲染views/index.ejs页面，并把教师数据传给页面
      res.render('index', { teachers: teachers });
    }
  });
});

// 2. 投票路由：处理投票请求（用户点击“投票”按钮后触发）
app.post('/vote', (req, res) => {
  // 从表单中获取教师id（对应前端页面中隐藏的teacherId）
  const teacherId = req.body.teacherId;
  if (!teacherId) {
    return res.send('请选择要投票的教师'); // 没传id时提示
  }

  // 更新得票数：当前票数+1
  const sql = "UPDATE teachers SET votes = votes + 1 WHERE id = ?";
  db.run(sql, [teacherId], function(err) {
    if (err) {
      res.send('投票失败：' + err.message);
    } else if (this.changes === 0) {
      res.send('未找到该教师（id不存在）');
    } else {
      // 投票成功后，跳回首页（刷新列表显示最新票数）
      res.redirect('/');
    }
  });
});

// 启动服务器，监听指定端口
app.listen(port, () => {
  console.log(`服务器已启动，可访问：http://localhost:${port}`);
});