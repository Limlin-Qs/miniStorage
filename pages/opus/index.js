// 项目详细内容页面
Page({
  /**
   * 页面的初始数据（核心修改：文件信息改为fileID）
   */
  data: {
    item: {
      legend: "/images/icon_project.png",
      name: "青岛地铁自动化中心草根AI创作者大会智能体项目",
      type: "AI智能体类项目",
      department: "自动化中心",
      leader: "张工",
      createTime: "2026-03-24",
      status: "active",
      statusText: "已完成",
      phone: "13800138000",
      email: "zhanggong@qddt.com",
      // 核心修改：文件信息从云数据库读取，存储的是云存储的fileID
      files: [
        {
          name: "项目需求说明书.pdf",
          // 格式：cloud://环境ID.环境ID/文件路径
          fileID: "cloud://your-env-id.your-env-id/automation_center/ai_project/requirement.pdf"
        },
        {
          name: "智能体模型训练数据集.zip",
          fileID: "cloud://your-env-id.your-env-id/automation_center/ai_project/dataset.zip"
        }
      ],
      description: "本项目为自动化中心草根AI创作者大会配套智能体开发项目，\n聚焦地铁运营场景AI工具落地，涵盖智能故障诊断、运营数据分析等功能模块，助力提升地铁自动化运维效率。"
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 实际项目中，通过options接收项目ID，从云数据库查询数据
    this.testDatabaseConnection();

  },
  // 项目数据调取
  testDatabaseConnection() {
    // 1. 获取数据库引用
    const db = wx.cloud.database();
    
    // 2. 指定要操作的集合
    const testCollection = db.collection('projectSet');
    const projectId = 'xxxxxxxxx'
    // 3. 尝试获取一条数据
    //    '你的测试数据_id' 请替换为你在云开发控制台看到的那条数据的 _id
    testCollection.doc(projectId).get({
      success: res => {
        // 查询成功，说明数据库连接和读取都正常
        console.log('✅ 数据库连接成功，数据为：', res.data);
        wx.showToast({
          title: '连接成功！',
          icon: 'success'
        });
      },
      fail: err => {
        // 查询失败，可能是环境ID、权限或网络问题
        console.error('❌ 数据库连接失败：', err);
        wx.showToast({
          title: '连接失败，请查看控制台',
          icon: 'none'
        });
      }
    });
  },
  // 拨打电话
  callLeader() {
    const phone = this.data.item.phone;
    wx.makePhoneCall({ phoneNumber: phone });
  },

  // 复制邮箱
  copyEmail() {
    const email = this.data.item.email;
    wx.setClipboardData({ data: email, success: () => wx.showToast({ title: "邮箱已复制" }) });
  },

  // 核心修改：云开发下载逻辑
  downloadFile(e) {
    const { fileid, filename } = e.currentTarget.dataset;
    wx.showLoading({ title: "生成下载链接..." });

    // 第一步：从云存储获取临时下载链接（默认有效期1小时）
    wx.cloud.getTempFileURL({
      fileList: [{ fileID: fileid }],
      success: (res) => {
        const tempURL = res.fileList[0].tempFileURL;
        wx.showLoading({ title: "下载中..." });

        // 第二步：使用临时链接下载文件
        wx.downloadFile({
          url: tempURL,
          success: (downloadRes) => {
            if (downloadRes.statusCode === 200) {
              // 第三步：保存文件到本地
              wx.saveFile({
                tempFilePath: downloadRes.tempFilePath,
                filePath: wx.env.USER_DATA_PATH + '/' + filename,
                success: () => {
                  wx.hideLoading();
                  wx.showToast({ title: "下载成功", icon: "success" });
                }
              });
            }
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: "下载失败", icon: "none" });
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "生成链接失败", icon: "none" });
      }
    });
  }
})