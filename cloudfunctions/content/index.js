// 云函数入口文件
const cloud = require('wx-server-sdk');
const fs = require('fs');
const path = require('path');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 云函数：content
 * 内容管理（列表查询、详情获取、搜索）
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  switch (event.action) {
    case 'getList':
      return await getList(event, OPENID);
    case 'getDetail':
      return await getDetail(event);
    case 'search':
      return await search(event);
    case 'getSwipers':
      return await getSwipers();
    case 'updateSwipers':
      return await updateSwipers(event);
    case 'getHotTags':
      return await getHotTags();
    case 'publish':
      return await publish(event, OPENID);
    case 'saveDraft':
      return await saveDraft(event, OPENID);
    case 'getMyList':
      return await getMyList(event, OPENID);
    case 'uploadFile':
      return await uploadFile(event);
    case 'delete':
      return await deleteContent(event, OPENID);
    // ---- 关注相关（关注作品）----
    case 'follow':
      return await followOpus(event, OPENID);
    case 'unfollow':
      return await unfollowOpus(event, OPENID);
    case 'checkFollow':
      return await checkFollowOpus(event, OPENID);
    case 'getFollowList':
      return await getFollowOpusList(event, OPENID);
    default:
      return { code: 400, success: false, message: '未知操作' };
  }
};

/**
 * 获取内容列表（分页）
 * @param {string} event.tab - recommend:推荐 | follow:关注
 * @param {number} event.page - 页码
 * @param {number} event.pageSize - 每页数量
 */
async function getList(event, openid) {
  const { tab = 'recommend', page = 1, pageSize = 10 } = event;
  const contentsCol = db.collection('contents');

  try {
    let query = {};
    if (tab === 'recommend') {
      // 推荐tab：显示已审核通过的内容
      query = { status: 'published' };
    } else if (tab === 'follow') {
      // 关注tab：获取当前用户关注的作品ID列表，直接查询对应作品
      const { data: follows } = await db.collection('follows')
        .where({ follower: openid })
        .field({ opusId: true })
        .get();
      const opusIds = follows.map((f) => f.opusId);
      if (opusIds.length === 0) {
        return { code: 200, success: true, data: { list: [], total: 0, page, pageSize, hasMore: false } };
      }
      query = { status: 'published', _id: _.in(opusIds) };
    }

    const totalRes = await contentsCol.where(query).count();
    const total = totalRes.total;

    const { data: list } = await contentsCol
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    return {
      code: 200,
      success: true,
      data: {
        list,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
    };
  } catch (err) {
    return { code: 500, success: false, message: '获取列表失败：' + err.message };
  }
}

/**
 * 获取内容详情
 * @param {string} event.id - 内容ID
 */
async function getDetail(event) {
  try {
    const { data: item } = await db.collection('contents').doc(event.id).get();
    return {
      code: 200,
      success: true,
      data: item,
    };
  } catch (err) {
    return { code: 404, success: false, message: '内容不存在' };
  }
}

/**
 * 搜索内容
 * @param {string} event.keyword - 搜索关键词
 * @param {number} event.page
 * @param {number} event.pageSize
 */
async function search(event) {
  const { keyword, page = 1, pageSize = 10 } = event;
  if (!keyword) {
    return { code: 400, success: false, message: '请输入搜索关键词' };
  }

  try {
    const contentsCol = db.collection('contents');
    const query = {
      status: 'published',
      name: db.RegExp({
        regexp: keyword,
        options: 'i',
      }),
    };

    const totalRes = await contentsCol.where(query).count();
    const { data: list } = await contentsCol
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    return {
      code: 200,
      success: true,
      data: {
        list,
        total: totalRes.total,
        page,
        pageSize,
        keyword,
      },
    };
  } catch (err) {
    return { code: 500, success: false, message: '搜索失败：' + err.message };
  }
}

/**
 * 获取轮播图（从配置集合读取）
 */
async function getSwipers() {
  try {
    const { data } = await db.collection('config').where({ type: 'swiper' }).get();
    return {
      code: 200,
      success: true,
      data: data.length > 0 ? data[0].list : [],
    };
  } catch (err) {
    return { code: 500, success: false, message: '获取轮播图失败' };
  }
}

/**
 * 更新轮播图（写入配置集合）
 * @param {array} event.list - 轮播图列表 [{image, link}]
 */
async function updateSwipers(event) {
  try {
    const { list } = event;
    if (!list || !Array.isArray(list) || list.length === 0) {
      return { code: 400, success: false, message: '轮播图列表不能为空' };
    }

    const configCol = db.collection('config');
    const { data } = await configCol.where({ type: 'swiper' }).get();

    if (data.length > 0) {
      // 更新已有记录
      await configCol.doc(data[0]._id).update({
        data: { list, updateTime: db.serverDate() },
      });
    } else {
      // 新增记录
      await configCol.add({
        data: { type: 'swiper', list, createTime: db.serverDate(), updateTime: db.serverDate() },
      });
    }

    return { code: 200, success: true, message: '轮播图已更新' };
  } catch (err) {
    return { code: 500, success: false, message: '更新轮播图失败：' + err.message };
  }
}

/**
 * 获取热门标签
 */
async function getHotTags() {
  try {
    const { data } = await db.collection('config').where({ type: 'hotTags' }).get();
    return {
      code: 200,
      success: true,
      data: data.length > 0 ? data[0].tags : [],
    };
  } catch (err) {
    return { code: 500, success: false, message: '获取热门标签失败' };
  }
}

/**
 * 发布内容（状态: published）
 * @param {string} event.name - 内容名称
 * @param {string} event.description - 描述
 * @param {array}  event.coverUrls - 封面图云存储 fileID 列表
 * @param {string} event.type - 类型
 * @param {array}  event.tags - 标签数组
 * @param {string} event.department - 部门
 * @param {string} event.projectName - 项目名称
 * @param {string} event.leader - 负责人
 * @param {string} event.teamMembers - 团队成员
 * @param {string} event.contact - 联系方式
 * @param {string} event.phone - 联系电话
 * @param {string} event.email - 联系邮箱
 * @param {array}  event.files - 附件列表 [{fileID, name}]
 */
async function publish(event, openid) {
  const { name, description, coverUrls, type, tags, department, projectName, leader, teamMembers, contact, phone, email, files } = event;

  if (!name || !name.trim()) {
    return { code: 400, success: false, message: '请填写内容名称' };
  }

  try {
    const contentData = {
      _openid: openid,
      name: name.trim(),
      description: description || '',
      coverUrl: coverUrls && coverUrls.length > 0 ? coverUrls[0] : '',
      coverUrls: coverUrls || [],
      type: type || '',
      tags: tags || [],
      department: department || '',
      projectName: projectName || '',
      leader: leader || '',
      teamMembers: teamMembers || '',
      contact: contact || '',
      phone: phone || '',
      email: email || '',
      files: files || [],
      status: 'published',
      statusText: '已发布',
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
    };

    const { _id } = await db.collection('contents').add({ data: contentData });
    contentData._id = _id;

    return {
      code: 200,
      success: true,
      message: '发布成功',
      data: { id: _id },
    };
  } catch (err) {
    return { code: 500, success: false, message: '发布失败：' + err.message };
  }
}

/**
 * 保存草稿（状态: draft）
 */
async function saveDraft(event, openid) {
  const { name, description, coverUrls, type, tags, department, projectName, leader, teamMembers, contact, phone, email, files } = event;

  try {
    const contentData = {
      _openid: openid,
      name: (name || '').trim() || '未命名草稿',
      description: description || '',
      coverUrl: coverUrls && coverUrls.length > 0 ? coverUrls[0] : '',
      coverUrls: coverUrls || [],
      type: type || '',
      tags: tags || [],
      department: department || '',
      projectName: projectName || '',
      leader: leader || '',
      teamMembers: teamMembers || '',
      contact: contact || '',
      phone: phone || '',
      email: email || '',
      files: files || [],
      status: 'draft',
      statusText: '草稿',
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
    };

    const { _id } = await db.collection('contents').add({ data: contentData });

    return {
      code: 200,
      success: true,
      message: '草稿已保存',
      data: { id: _id },
    };
  } catch (err) {
    return { code: 500, success: false, message: '保存草稿失败：' + err.message };
  }
}

/**
 * 获取我的发布列表
 * @param {string} event.status - 筛选状态: all/published/draft/reviewing
 * @param {number} event.page
 * @param {number} event.pageSize
 */
async function getMyList(event, openid) {
  const { status = 'all', page = 1, pageSize = 10 } = event;

  try {
    let query = { _openid: openid };
    if (status !== 'all') {
      query.status = status;
    }

    const contentsCol = db.collection('contents');
    const totalRes = await contentsCol.where(query).count();
    const total = totalRes.total;

    const { data: list } = await contentsCol
      .where(query)
      .orderBy('updateTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    return {
      code: 200,
      success: true,
      data: {
        list,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
    };
  } catch (err) {
    return { code: 500, success: false, message: '获取我的发布失败：' + err.message };
  }
}

/**
 * 删除内容（仅作者可操作）
 * 同时删除关联的云存储文件
 * @param {string} event.id - 内容ID
 */
async function deleteContent(event, openid) {
  const { id } = event;
  if (!id) {
    return { code: 400, success: false, message: '缺少内容ID' };
  }

  try {
    // 先查询内容，验证身份
    const { data: item } = await db.collection('contents').doc(id).get();
    if (!item) {
      return { code: 404, success: false, message: '内容不存在' };
    }
    if (item._openid !== openid) {
      return { code: 403, success: false, message: '无权删除他人的作品' };
    }

    // 收集所有需要删除的云存储文件
    const fileIDs = [];
    if (item.coverUrls && item.coverUrls.length > 0) {
      item.coverUrls.forEach((f) => { if (f) fileIDs.push(f); });
    } else if (item.coverUrl) {
      fileIDs.push(item.coverUrl);
    }
    if (item.files && item.files.length > 0) {
      item.files.forEach((f) => { if (f && f.fileID) fileIDs.push(f.fileID); });
    }

    // 删除云存储文件（忽略失败，不阻塞主流程）
    if (fileIDs.length > 0) {
      try {
        await cloud.deleteFile({ fileList: fileIDs });
      } catch (e) {
        console.error('删除云存储文件失败:', e);
      }
    }

    // 删除数据库记录
    await db.collection('contents').doc(id).remove();

    return { code: 200, success: true, message: '删除成功' };
  } catch (err) {
    return { code: 500, success: false, message: '删除失败：' + err.message };
  }
}

/**
 * 通过云函数上传图片到云存储
 * 前端将图片转为 base64 传入，云函数解码后上传
 * @param {string} event.base64 - 图片的 base64 编码
 * @param {string} event.ext - 文件扩展名 (png/jpg等)
 * @param {string} event.cloudPath - 云存储路径（可选，自动生成）
 */
async function uploadFile(event) {
  const { base64, ext = 'png', cloudPath } = event;

  if (!base64) {
    return { code: 400, success: false, message: '缺少图片数据' };
  }

  try {
    // 将 base64 解码写入临时文件
    const buffer = Buffer.from(base64, 'base64');
    const tmpPath = path.join('/tmp', `upload_${Date.now()}.${ext}`);
    fs.writeFileSync(tmpPath, buffer);

    // 生成云存储路径
    const finalCloudPath = cloudPath || `content/images/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;

    // 上传到云存储
    const result = await cloud.uploadFile({
      cloudPath: finalCloudPath,
      fileContent: buffer,
    });

    // 清理临时文件
    try { fs.unlinkSync(tmpPath); } catch (e) {}

    return {
      code: 200,
      success: true,
      data: { fileID: result.fileID },
    };
  } catch (err) {
    return { code: 500, success: false, message: '上传失败：' + err.message };
  }
}

// ==================== 关注功能（关注作品）====================

/**
 * 关注作品
 * @param {string} event.opusId - 作品ID
 */
async function followOpus(event, openid) {
  const { opusId } = event;
  if (!opusId) {
    return { code: 400, success: false, message: '缺少作品ID' };
  }

  try {
    // 检查是否已关注该作品
    const { data: existing } = await db.collection('follows')
      .where({ follower: openid, opusId })
      .get();

    if (existing.length > 0) {
      return { code: 200, success: true, message: '已关注' };
    }

    await db.collection('follows').add({
      data: {
        follower: openid,     // 关注者（当前用户）
        opusId,               // 作品ID
        createTime: db.serverDate(),
      },
    });

    return { code: 200, success: true, message: '关注成功' };
  } catch (err) {
    return { code: 500, success: false, message: '关注失败：' + err.message };
  }
}

/**
 * 取消关注作品
 * @param {string} event.opusId - 作品ID
 */
async function unfollowOpus(event, openid) {
  const { opusId } = event;
  if (!opusId) {
    return { code: 400, success: false, message: '缺少作品ID' };
  }

  try {
    const { data: existing } = await db.collection('follows')
      .where({ follower: openid, opusId })
      .get();

    if (existing.length === 0) {
      return { code: 200, success: true, message: '未关注' };
    }

    // 逐条删除（云数据库 where 删除需要逐条）
    const deletePromises = existing.map((doc) => db.collection('follows').doc(doc._id).remove());
    await Promise.all(deletePromises);

    return { code: 200, success: true, message: '取消关注成功' };
  } catch (err) {
    return { code: 500, success: false, message: '取消关注失败：' + err.message };
  }
}

/**
 * 检查是否已关注某作品
 * @param {string} event.opusId - 作品ID
 */
async function checkFollowOpus(event, openid) {
  const { opusId } = event;
  if (!opusId) {
    return { code: 400, success: false, message: '缺少作品ID' };
  }

  try {
    const { data: existing } = await db.collection('follows')
      .where({ follower: openid, opusId })
      .get();

    return {
      code: 200,
      success: true,
      data: { isFollowed: existing.length > 0 },
    };
  } catch (err) {
    return { code: 500, success: false, message: '查询失败：' + err.message };
  }
}

/**
 * 获取关注作品列表
 * @param {number} event.page
 * @param {number} event.pageSize
 */
async function getFollowOpusList(event, openid) {
  const { page = 1, pageSize = 20 } = event;

  try {
    const { data: list } = await db.collection('follows')
      .where({ follower: openid })
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    const totalRes = await db.collection('follows').where({ follower: openid }).count();

    return {
      code: 200,
      success: true,
      data: {
        list,
        total: totalRes.total,
        page,
        pageSize,
        hasMore: page * pageSize < totalRes.total,
      },
    };
  } catch (err) {
    return { code: 500, success: false, message: '获取关注列表失败：' + err.message };
  }
}
