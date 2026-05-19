// pages/release/index.js
import { publishContent, saveDraft, uploadImage } from '~/utils/content';
import { isLoggedIn } from '~/utils/auth';

Page({
  data: {
    originFiles: [],
    gridConfig: {
      column: 4,
      width: 160,
      height: 160,
    },
    tags: [],
    selectedTags: [],
    newTag: '',
    formData: {
      name: '',
      description: '',
      department: '',
      projectName: '',
      projectLeader: '',
      teamMembers: '',
      contact: '',
    },
    submitting: false,
  },

  onLoad() {
    // 检查登录状态
    if (!isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  /** 图片上传成功回调 */
  handleSuccess(e) {
    const { files } = e.detail;
    this.setData({ originFiles: files });
  },

  /** 图片删除回调 */
  handleRemove(e) {
    const { index } = e.detail;
    const { originFiles } = this.data;
    originFiles.splice(index, 1);
    this.setData({ originFiles });
  },

  /** 标签选中/取消 */
  onTagChange(e) {
    const checked = e.detail.checked;
    const tagText = e.currentTarget.dataset.tag;
    if (!tagText) return;

    let { selectedTags } = this.data;
    if (checked) {
      if (!selectedTags.includes(tagText)) {
        selectedTags.push(tagText);
      }
    } else {
      selectedTags = selectedTags.filter((t) => t !== tagText);
    }
    this.setData({ selectedTags });
  },

  /** 自定义标签输入 */
  onNewTagInput(e) {
    this.setData({ newTag: e.detail.value.trim() });
  },

  /** 添加标签 */
  addCustomTag() {
    const { newTag, tags, selectedTags } = this.data;
    const tagText = newTag.trim();
    if (!tagText) {
      wx.showToast({ title: '请输入标签名', icon: 'none' });
      return;
    }
    if (tagText.length > 10) {
      wx.showToast({ title: '标签最多10个字', icon: 'none' });
      return;
    }
    if (tags.includes(tagText)) {
      wx.showToast({ title: '标签已存在', icon: 'none' });
      return;
    }
    const newTags = [...tags, tagText];
    const newSelectedTags = [...selectedTags, tagText];
    this.setData({ tags: newTags, selectedTags: newSelectedTags, newTag: '' });
  },

  /** 删除标签 */
  removeTag(e) {
    const tagText = e.currentTarget.dataset.tag;
    if (!tagText) return;
    const { tags, selectedTags } = this.data;
    this.setData({
      tags: tags.filter((t) => t !== tagText),
      selectedTags: selectedTags.filter((t) => t !== tagText),
    });
  },

  /** 表单输入绑定 */
  onNameInput(e) {
    this.setData({ 'formData.name': e.detail.value });
  },
  onDescriptionInput(e) {
    this.setData({ 'formData.description': e.detail.value });
  },
  onDepartmentChange(e) {
    this.setData({ 'formData.department': e.detail.value });
  },
  onProjectNameChange(e) {
    this.setData({ 'formData.projectName': e.detail.value });
  },
  onProjectLeaderChange(e) {
    this.setData({ 'formData.projectLeader': e.detail.value });
  },
  onTeamMembersChange(e) {
    this.setData({ 'formData.teamMembers': e.detail.value });
  },
  onContactChange(e) {
    this.setData({ 'formData.contact': e.detail.value });
  },

  /** 上传图片到云存储 */
  async uploadImages() {
    const { originFiles } = this.data;
    const coverUrls = [];

    for (let i = 0; i < originFiles.length; i++) {
      const file = originFiles[i];
      // 如果已经是云存储 fileID，直接使用
      if (file.url && file.url.startsWith('cloud://')) {
        coverUrls.push(file.url);
        continue;
      }

      const filePath = file.url || file.path;
      if (!filePath) continue;

      const fileID = await uploadImage(filePath);
      if (fileID) {
        coverUrls.push(fileID);
      }
    }

    console.log('[release] uploadImages done, coverUrls:', coverUrls);
    return coverUrls;
  },

  /** 保存草稿 */
  async saveDraft() {
    if (this.data.submitting) return;

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...' });

    try {
      // 先上传图片
      const coverUrls = await this.uploadImages();

      const res = await saveDraft({
        name: this.data.formData.name,
        description: this.data.formData.description,
        coverUrls,
        tags: this.data.selectedTags,
        department: this.data.formData.department,
        projectName: this.data.formData.projectName,
        leader: this.data.formData.projectLeader,
        teamMembers: this.data.formData.teamMembers,
        contact: this.data.formData.contact,
      });

      wx.hideLoading();

      if (res.success) {
        wx.showToast({ title: '草稿已保存', icon: 'success' });
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/home/index?oper=save' });
        }, 1000);
      } else {
        wx.showToast({ title: res.message || '保存失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存异常', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  /** 发布 */
  async release() {
    if (this.data.submitting) return;

    // 表单验证
    if (!this.data.formData.name.trim()) {
      wx.showToast({ title: '请填写内容名称', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '发布中...' });

    try {
      // 先上传图片
      const coverUrls = await this.uploadImages();

      const res = await publishContent({
        name: this.data.formData.name,
        description: this.data.formData.description,
        coverUrls,
        tags: this.data.selectedTags,
        department: this.data.formData.department,
        projectName: this.data.formData.projectName,
        leader: this.data.formData.projectLeader,
        teamMembers: this.data.formData.teamMembers,
        contact: this.data.formData.contact,
      });

      wx.hideLoading();

      if (res.success) {
        wx.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/home/index?oper=release' });
        }, 1000);
      } else {
        wx.showToast({ title: res.message || '发布失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '发布异常', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  gotoMap() {
    wx.showToast({ title: '获取当前位置...', icon: 'none', duration: 1500 });
  },
});
