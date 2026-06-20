module.exports = {
  pages: [
    'pages/index/index',
    'pages/temperature/index',
    'pages/receipt/index',
    'pages/mine/index',
    'pages/container-detail/index',
    'pages/receipt-detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#0e7c86',
    navigationBarTitleText: '冷链智查',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f0fafb'
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#0e7c86',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '查箱'
      },
      {
        pagePath: 'pages/temperature/index',
        text: '温度曲线'
      },
      {
        pagePath: 'pages/receipt/index',
        text: '到货签收'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
};
