/**
 * 内容数据访问模块
 * 封装内容相关的云函数调用
 */

/**
 * 获取内容列表
 * @param {string} tab - recommend:推荐 | follow:关注
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 */
export async function getContentList(tab = 'recommend', page = 1, pageSize = 10) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'getList', tab, page, pageSize },
    });
    return res.result;
  } catch (err) {
    console.error('getContentList error:', err);
    return { success: false, message: '获取内容列表失败' };
  }
}

/**
 * 获取内容详情
 * @param {string} id - 内容ID
 */
export async function getContentDetail(id) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'getDetail', id },
    });
    return res.result;
  } catch (err) {
    console.error('getContentDetail error:', err);
    return { success: false, message: '获取内容详情失败' };
  }
}

/**
 * 搜索内容
 * @param {string} keyword - 搜索关键词
 * @param {number} page
 * @param {number} pageSize
 */
export async function searchContent(keyword, page = 1, pageSize = 10) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'search', keyword, page, pageSize },
    });
    return res.result;
  } catch (err) {
    console.error('searchContent error:', err);
    return { success: false, message: '搜索失败' };
  }
}

/**
 * 获取轮播图
 */
export async function getSwipers() {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'getSwipers' },
    });
    return res.result;
  } catch (err) {
    console.error('getSwipers error:', err);
    return { success: false, data: [] };
  }
}

/**
 * 获取热门标签
 */
export async function getHotTags() {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'getHotTags' },
    });
    return res.result;
  } catch (err) {
    console.error('getHotTags error:', err);
    return { success: false, data: [] };
  }
}

/**
 * 发布内容
 * @param {object} data - 内容数据
 */
export async function publishContent(data) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'publish', ...data },
    });
    return res.result;
  } catch (err) {
    console.error('publishContent error:', err);
    return { success: false, message: '发布失败' };
  }
}

/**
 * 保存草稿
 * @param {object} data - 内容数据
 */
export async function saveDraft(data) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'saveDraft', ...data },
    });
    return res.result;
  } catch (err) {
    console.error('saveDraft error:', err);
    return { success: false, message: '保存草稿失败' };
  }
}

/**
 * 删除内容（仅作者可操作）
 * @param {string} id - 内容ID
 */
export async function deleteContent(id) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'delete', id },
    });
    return res.result;
  } catch (err) {
    console.error('deleteContent error:', err);
    return { success: false, message: '删除失败' };
  }
}

/**
 * 获取我的发布列表
 * @param {string} status - all/published/draft/reviewing
 * @param {number} page
 * @param {number} pageSize
 */
export async function getMyContentList(status = 'all', page = 1, pageSize = 10) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'content',
      data: { action: 'getMyList', status, page, pageSize },
    });
    return res.result;
  } catch (err) {
    console.error('getMyContentList error:', err);
    return { success: false, message: '获取列表失败' };
  }
}

/**
 * 压缩图片（文件过大时自动压缩）
 * 云函数 callFunction 入参约 1MB，base64 膨胀 33%，原图需控制在 750KB 以内
 * @param {string} filePath - 本地临时文件路径
 * @param {number} maxSize - 允许的最大文件大小（字节），默认 700KB
 * @returns {string} 压缩后的文件路径
 */
function compressImage(filePath, maxSize = 700 * 1024) {
  return new Promise((resolve) => {
    const fs = wx.getFileSystemManager();
    try {
      const stats = fs.statSync(filePath);
      // 文件未超限，直接返回原路径
      if (stats.size <= maxSize) {
        resolve(filePath);
        return;
      }
    } catch (e) {
      // 无法获取大小，尝试压缩
    }

    wx.compressImage({
      src: filePath,
      quality: 80,
      success(res) {
        // 压缩后再次检查大小
        try {
          const stats2 = fs.statSync(res.tempFilePath);
          if (stats2.size > maxSize) {
            // 仍超限，降低质量再压一次
            wx.compressImage({
              src: filePath,
              quality: 50,
              success(res2) {
                resolve(res2.tempFilePath);
              },
              fail() {
                resolve(res.tempFilePath);
              },
            });
          } else {
            resolve(res.tempFilePath);
          }
        } catch (e) {
          resolve(res.tempFilePath);
        }
      },
      fail() {
        // 压缩失败，使用原路径
        resolve(filePath);
      },
    });
  });
}

/**
 * 上传图片到云存储（通过云函数中转，绕过前端直传权限限制）
 * 自动压缩过大的图片以适配云函数入参大小限制
 * @param {string} filePath - 本地临时文件路径
 * @param {string} cloudPath - 云存储路径（可选）
 * @returns {string} fileID
 */
export async function uploadImage(filePath, cloudPath) {
  try {
    if (!filePath) return null;

    const ext = filePath.split('.').pop() || 'png';
    const finalCloudPath = cloudPath || `content/images/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;

    const res = await wx.cloud.uploadFile({
      cloudPath: finalCloudPath,
      filePath: filePath,
    });

    return res.fileID || null;
  } catch (err) {
    console.error('[uploadImage] error:', err);
    return null;
  }
}
