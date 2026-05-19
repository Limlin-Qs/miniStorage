import { searchContent, getHotTags } from '~/utils/content';

const HISTORY_KEY = 'search_history';

Page({
  data: {
    historyWords: [],
    popularWords: [],
    searchValue: '',
    searchResults: [],
    showResults: false,
    loading: false,
    dialog: {
      title: '确认删除当前历史记录',
      showCancelButton: true,
      message: '',
    },
    dialogShow: false,
  },

  deleteType: 0,
  deleteIndex: '',

  onShow() {
    this.loadHistory();
    this.loadHotTags();
  },

  /** 加载搜索历史（本地存储） */
  loadHistory() {
    const historyWords = wx.getStorageSync(HISTORY_KEY) || [];
    this.setData({ historyWords });
  },

  /** 加载热门搜索标签 */
  async loadHotTags() {
    const res = await getHotTags();
    if (res.success) {
      this.setData({ popularWords: res.data });
    }
  },

  /** 保存搜索历史 */
  setHistoryWords(searchValue) {
    if (!searchValue) return;

    const { historyWords } = this.data;
    const index = historyWords.indexOf(searchValue);
    if (index !== -1) historyWords.splice(index, 1);
    historyWords.unshift(searchValue);

    // 最多保存20条
    if (historyWords.length > 20) historyWords.pop();

    wx.setStorageSync(HISTORY_KEY, historyWords);
    this.setData({ searchValue, historyWords });
  },

  /** 执行搜索 */
  async doSearch(keyword) {
    if (!keyword) return;

    this.setHistoryWords(keyword);
    this.setData({ showResults: true, loading: true, searchResults: [] });

    try {
      const res = await searchContent(keyword);
      if (res.success) {
        this.setData({ searchResults: res.data.list });
      } else {
        wx.showToast({ title: res.message || '搜索失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '搜索异常', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  /** 点击历史记录搜索 */
  handleHistoryTap(e) {
    const { index } = e.currentTarget.dataset;
    const searchValue = this.data.historyWords[index];
    if (searchValue) {
      this.setData({ searchValue });
      this.doSearch(searchValue);
    }
  },

  /** 点击热门标签搜索 */
  handlePopularTap(e) {
    const { index } = e.currentTarget.dataset;
    const searchValue = this.data.popularWords[index];
    if (searchValue) {
      this.setData({ searchValue });
      this.doSearch(searchValue);
    }
  },

  /** 提交搜索 */
  handleSubmit(e) {
    const { value } = e.detail;
    if (value && value.length > 0) {
      this.doSearch(value);
    }
  },

  /** 返回首页 */
  actionHandle() {
    this.setData({ searchValue: '', showResults: false, searchResults: [] });
    wx.switchTab({ url: '/pages/home/index' });
  },

  /** 跳转详情 */
  handleGoToOpus(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/opus/index?id=${id}` });
    }
  },

  /** 清空历史记录确认 */
  handleClearHistory() {
    const { dialog } = this.data;
    this.deleteType = 1;
    this.setData({
      dialog: { ...dialog, message: '确认删除所有历史记录' },
      dialogShow: true,
    });
  },

  /** 删除单条历史 */
  deleteCurr(e) {
    const { index } = e.currentTarget.dataset;
    const { dialog } = this.data;
    this.deleteIndex = index;
    this.deleteType = 0;
    this.setData({
      dialog: { ...dialog, message: '确认删除当前历史记录' },
      dialogShow: true,
    });
  },

  /** 确认删除 */
  confirm() {
    const { historyWords } = this.data;
    if (this.deleteType === 0) {
      historyWords.splice(this.deleteIndex, 1);
    } else {
      historyWords.length = 0;
    }
    wx.setStorageSync(HISTORY_KEY, historyWords);
    this.setData({ historyWords, dialogShow: false });
  },

  /** 取消删除 */
  close() {
    this.setData({ dialogShow: false });
  },
});
