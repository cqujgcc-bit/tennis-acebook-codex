// 上传小程序体验版（miniprogram-ci）
const ci = require('miniprogram-ci');

const APPID = 'wx517c76b146302fe5';
const PRIVATE_KEY_PATH = '/home/ubuntu/private.wx517c76b146302fe5.key';
const PROJECT_PATH = '/home/ubuntu/miniapp';

(async () => {
  const project = new ci.Project({
    appid: APPID,
    type: 'miniProgram',
    projectPath: PROJECT_PATH,
    privateKeyPath: PRIVATE_KEY_PATH,
    ignores: ['node_modules/**/*', 'package.json', 'package-lock.json', 'preview_qr.js', 'preview_qr.png', '*.md', 'upload_miniapp.js'],
  });

  const version = '1.5.25';
  const desc = '修复圈子页滚动时标题栏与邀请码输入框重叠遮挡的布局问题。';

  console.log('开始上传体验版... version=' + version);
  const result = await ci.upload({
    project,
    version,
    desc,
    setting: { es6: true, es7: true, minify: true, autoPrefixWXSS: true },
    onProgressUpdate: (info) => { if (typeof info === 'string') console.log(info); },
  });
  console.log('上传成功！');
  console.log(JSON.stringify({ size: result.subPackageInfo, pluginInfo: result.pluginInfo }, null, 2));
})().catch((e) => {
  console.error('上传失败:', e && e.message ? e.message : e);
  if (e && e.errCode) console.error('errCode:', e.errCode);
  process.exit(1);
});
