Component({
  properties: {
    url: String,
    desc: String,
    tags: Array,
  },
  data: {},
  methods: {},
});

// components/card/card.js
// Component({
//   properties: {
//     // 定义接收的属性，类型为Object，对应单个项目的数据
//     projectData: {
//       type: Object,
//       value: {}
//     }
//   },

//   methods: {
//     // 卡片被点击时触发的方法
//     onCardTap(e) {
//       // 获取通过 data-id 传递过来的项目ID
//       const projectId = e.currentTarget.dataset.id;
      
//       // 触发一个自定义事件，将项目ID传递给父页面
//       this.triggerEvent('goToOpus', {
//         id: projectId
//       });
//     }
//   }
// });