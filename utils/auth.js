/**
 * 认证工具模块
 * 封装云函数调用和本地登录状态管理
 */

const USER_INFO_KEY = 'user_info';

/**
 * 微信一键登录（静默登录）
 * 调用云函数 login，自动注册新用户
 */
export async function wxLogin() {
  try {
    const res = await wx.cloud.callFunction({
      name: 'login',
      data: { action: 'wxLogin' },
    });
    const result = res.result;
    if (result.success) {
      // 保存用户信息到本地
      wx.setStorageSync(USER_INFO_KEY, result.data.userInfo);
      return result;
    }
    return result;
  } catch (err) {
    console.error('wxLogin error:', err);
    return { success: false, message: '登录失败' };
  }
}

/**
 * 获取用户信息（优先从本地缓存，可强制刷新）
 */
export async function getUserInfo(forceRefresh = false) {
  if (!forceRefresh) {
    const localInfo = wx.getStorageSync(USER_INFO_KEY);
    if (localInfo && localInfo._id) return localInfo;
  }

  try {
    const res = await wx.cloud.callFunction({
      name: 'login',
      data: { action: 'getUserInfo' },
    });
    const result = res.result;
    if (result.success) {
      wx.setStorageSync(USER_INFO_KEY, result.data.userInfo);
      return result.data.userInfo;
    }
  } catch (err) {
    console.error('getUserInfo error:', err);
  }
  return null;
}

/**
 * 更新用户资料
 */
export async function updateProfile(profile) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'login',
      data: { action: 'updateProfile', profile },
    });
    const result = res.result;
    if (result.success) {
      // 更新本地缓存
      const localInfo = wx.getStorageSync(USER_INFO_KEY) || {};
      const updatedInfo = { ...localInfo, ...profile };
      wx.setStorageSync(USER_INFO_KEY, updatedInfo);
    }
    return result;
  } catch (err) {
    console.error('updateProfile error:', err);
    return { success: false, message: '更新失败' };
  }
}

/**
 * 检查是否已登录
 */
export function isLoggedIn() {
  const info = wx.getStorageSync(USER_INFO_KEY);
  return !!(info && info._id);
}

/**
 * 退出登录（清除本地数据）
 */
export function logout() {
  wx.removeStorageSync(USER_INFO_KEY);
  wx.removeStorageSync('access_token');
}
