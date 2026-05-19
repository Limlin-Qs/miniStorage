Component({
  properties: {
    // 兼容旧 Mock 数据格式
    url: String,
    desc: String,
    tags: Array,
    // 云数据库数据格式
    contentData: {
      type: Object,
      value: {},
    },
  },
  data: {
    displayUrl: '',
    displayDesc: '',
    displayTags: [],
    displayId: '',
    displayAuthor: '',
    displayAvatar: '',
  },
  observers: {
    'contentData, url, desc, tags': function (contentData, url, desc, tags) {
      if (contentData && contentData._id) {
        // 云数据库格式：tags 可能是字符串数组，统一转为 {text, theme} 对象
        const rawTags = contentData.tags || [];
        const displayTags = rawTags.map((t) => {
          if (typeof t === 'string') {
            return { text: t, theme: 'primary' };
          }
          return t; // 已经是对象格式
        });

        const rawUrl = contentData.coverUrl || contentData.legend || '';

        // cloud:// 协议图片转临时链接显示
        if (rawUrl && rawUrl.startsWith('cloud://')) {
          wx.cloud.getTempFileURL({
            fileList: [rawUrl],
            success: (res) => {
              if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
                this.setData({ displayUrl: res.fileList[0].tempFileURL });
              }
            },
            fail: () => {
              this.setData({ displayUrl: rawUrl });
            },
          });
        } else {
          this.setData({ displayUrl: rawUrl });
        }

        this.setData({
          displayDesc: contentData.name || contentData.desc || '',
          displayTags,
          displayId: contentData._id,
          displayAuthor: contentData.leader || '',
          displayAvatar: contentData.authorAvatar || '',
        });
      } else {
        // Mock 格式兼容
        const rawTags = tags || [];
        const displayTags = rawTags.map((t) => {
          if (typeof t === 'string') {
            return { text: t, theme: 'primary' };
          }
          return t;
        });

        this.setData({
          displayUrl: url || '',
          displayDesc: desc || '',
          displayTags,
          displayId: '',
        });
      }
    },
  },
  methods: {
    onCardTap() {
      if (this.data.displayId) {
        this.triggerEvent('goToOpus', { id: this.data.displayId });
      }
    },
  },
});
