// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

/**
 * 云函数：login
 * 微信登录，自动注册
 * 
 * 调用方式：
 *   wx.cloud.callFunction({ name: 'login', data: { action: 'wxLogin' } })
 *   wx.cloud.callFunction({ name: 'login', data: { action: 'updateProfile', profile: {...} } })
 *   wx.cloud.callFunction({ name: 'login', data: { action: 'getUserInfo' } })
 */
exports.main = async (event, context) => {
  const { OPENID, APPID } = cloud.getWXContext();
  const usersCol = db.collection('users');

  switch (event.action) {
    case 'wxLogin':
      return await wxLogin(usersCol, OPENID);
    case 'updateProfile':
      return await updateProfile(usersCol, OPENID, event.profile);
    case 'getUserInfo':
      return await getUserInfo(usersCol, OPENID);
    default:
      return { code: 400, success: false, message: '未知操作' };
  }
};

/**
 * 微信登录：查询用户，不存在则自动注册
 */
async function wxLogin(usersCol, openid) {
  try {
    const { data: userList } = await usersCol.where({ _openid: openid }).get();

    if (userList.length > 0) {
      // 已注册，更新最后登录时间
      const user = userList[0];
      await usersCol.doc(user._id).update({
        data: {
          lastLoginTime: db.serverDate(),
        },
      });
      return {
        code: 200,
        success: true,
        message: '登录成功',
        data: {
          userInfo: user,
          isNewUser: false,
        },
      };
    }

    // 新用户，自动注册
    const newUser = {
      _openid: openid,
      nickName: '微信用户',
      avatarUrl: '',
      gender: 0,       // 0:未知 1:男 2:女
      phone: '',
      star: '',         // 星座
      city: '',
      address: '',
      brief: '',        // 个人简介
      birth: '',
      photos: [],
      createTime: db.serverDate(),
      lastLoginTime: db.serverDate(),
    };

    const { _id } = await usersCol.add({ data: newUser });
    newUser._id = _id;

    return {
      code: 200,
      success: true,
      message: '注册成功',
      data: {
        userInfo: newUser,
        isNewUser: true,
      },
    };
  } catch (err) {
    return {
      code: 500,
      success: false,
      message: '登录失败：' + err.message,
    };
  }
}

/**
 * 更新用户资料
 */
async function updateProfile(usersCol, openid, profile) {
  try {
    const { data: userList } = await usersCol.where({ _openid: openid }).get();
    if (userList.length === 0) {
      return { code: 404, success: false, message: '用户不存在' };
    }

    // 只允许更新的字段
    const allowedFields = ['nickName', 'avatarUrl', 'gender', 'phone', 'star', 'city', 'address', 'brief', 'birth', 'photos'];
    const updateData = {};
    for (const key of allowedFields) {
      if (profile[key] !== undefined) {
        updateData[key] = profile[key];
      }
    }
    updateData.updateTime = db.serverDate();

    await usersCol.doc(userList[0]._id).update({ data: updateData });

    return {
      code: 200,
      success: true,
      message: '更新成功',
    };
  } catch (err) {
    return {
      code: 500,
      success: false,
      message: '更新失败：' + err.message,
    };
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo(usersCol, openid) {
  try {
    const { data: userList } = await usersCol.where({ _openid: openid }).get();
    if (userList.length === 0) {
      return { code: 404, success: false, message: '用户不存在' };
    }
    return {
      code: 200,
      success: true,
      data: { userInfo: userList[0] },
    };
  } catch (err) {
    return {
      code: 500,
      success: false,
      message: '获取失败：' + err.message,
    };
  }
}
