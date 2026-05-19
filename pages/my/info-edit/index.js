import { getUserInfo, updateProfile } from '~/utils/auth';
import { areaList } from './areaData.js';

Page({
  data: {
    personInfo: {
      name: '',
      gender: 0,
      birth: '',
      address: [],
      introduction: '',
      photos: [],
    },
    genderOptions: [
      { label: '男', value: 1 },
      { label: '女', value: 2 },
      { label: '保密', value: 0 },
    ],
    birthVisible: false,
    birthStart: '1970-01-01',
    birthEnd: '2026-12-31',
    birthFilter: (type, options) => (type === 'year' ? options.sort((a, b) => b.value - a.value) : options),
    addressText: '',
    addressVisible: false,
    provinces: [],
    cities: [],
    isSaving: false,
    gridConfig: {
      column: 3,
      width: 160,
      height: 160,
    },
  },

  onLoad() {
    this.initAreaData();
    this.loadPersonalInfo();
  },

  /** 从云数据库加载用户信息 */
  async loadPersonalInfo() {
    const userInfo = await getUserInfo();
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }

    const personInfo = {
      name: userInfo.nickName || '',
      gender: userInfo.gender || 0,
      birth: userInfo.birth || '',
      address: userInfo.address || [],
      introduction: userInfo.brief || '',
      photos: (userInfo.photos || []).map((url, index) => ({
        url,
        name: `photo_${index}`,
        type: 'image',
      })),
    };

    this.setData({ personInfo }, () => {
      if (personInfo.address.length >= 2) {
        const { provinces: pList, cities: cList } = areaList;
        const provinceName = pList[personInfo.address[0]] || '';
        const cityName = cList[personInfo.address[1]] || '';
        this.setData({ addressText: `${provinceName} ${cityName}` });
      }
    });
  },

  getAreaOptions(data, filter) {
    const res = Object.keys(data).map((key) => ({ value: key, label: data[key] }));
    return typeof filter === 'function' ? res.filter(filter) : res;
  },

  getCities(provinceValue) {
    return this.getAreaOptions(
      areaList.cities,
      (city) => `${city.value}`.slice(0, 2) === `${provinceValue}`.slice(0, 2),
    );
  },

  initAreaData() {
    const provinces = this.getAreaOptions(areaList.provinces);
    const cities = this.getCities(provinces[0].value);
    this.setData({ provinces, cities });
  },

  onAreaPick(e) {
    const { column, index } = e.detail;
    const { provinces } = this.data;
    if (column === 0) {
      const cities = this.getCities(provinces[index].value);
      this.setData({ cities });
    }
  },

  showPicker(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({ [`${mode}Visible`]: true });
    if (mode === 'address') {
      const cities = this.getCities(this.data.personInfo.address[0]);
      this.setData({ cities });
    }
  },

  hidePicker(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({ [`${mode}Visible`]: false });
  },

  onPickerChange(e) {
    const { value, label } = e.detail;
    const { mode } = e.currentTarget.dataset;
    this.setData({ [`personInfo.${mode}`]: value });
    if (mode === 'address') {
      this.setData({ addressText: label.join(' ') });
    }
  },

  personInfoFieldChange(field, e) {
    const { value } = e.detail;
    this.setData({ [`personInfo.${field}`]: value });
  },

  onNameChange(e) {
    this.personInfoFieldChange('name', e);
  },

  onGenderChange(e) {
    this.personInfoFieldChange('gender', e);
  },

  onIntroductionChange(e) {
    this.personInfoFieldChange('introduction', e);
  },

  onPhotosRemove(e) {
    const { index } = e.detail;
    const { photos } = this.data.personInfo;
    photos.splice(index, 1);
    this.setData({ 'personInfo.photos': photos });
  },

  onPhotosSuccess(e) {
    const { files } = e.detail;
    this.setData({ 'personInfo.photos': files });
  },

  onPhotosDrop(e) {
    const { files } = e.detail;
    this.setData({ 'personInfo.photos': files });
  },

  /** 保存用户信息到云数据库 */
  async onSaveInfo() {
    if (this.data.isSaving) return;
    this.setData({ isSaving: true });

    try {
      const { personInfo } = this.data;
      const profile = {
        nickName: personInfo.name,
        gender: personInfo.gender,
        birth: personInfo.birth,
        address: personInfo.address,
        brief: personInfo.introduction,
        photos: personInfo.photos.map((f) => f.url || f),
      };

      const res = await updateProfile(profile);
      if (res.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1000);
      } else {
        wx.showToast({ title: res.message || '保存失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '保存异常', icon: 'none' });
    } finally {
      this.setData({ isSaving: false });
    }
  },
});
