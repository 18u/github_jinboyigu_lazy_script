const Template = require('../base/template');

const {sleep, writeFileJSON} = require('../../lib/common');
const moment = require('moment-timezone');

class HarmonyTemplate extends Template {
  static scriptName = 'HarmonyTemplate';
  static times = 2;
  static isWh5 = true;
  static shareCodeTaskList = [];
  static commonParamFn = () => ({appId: 'appId'});

  static apiNamesFn() {
    const self = this;
    const _ = this._;

    return {
      // 获取任务列表
      getTaskList: {
        name: 'interact_template_getHomeData',
        paramFn: self.commonParamFn,
        successFn: async (data) => {

          if (!self.isSuccess(data)) return [];

          const result = [];

          for (let {
            status,
            taskId,
            maxTimes,
            times,
            waitDuration,
            simpleRecordInfoVo,
            productInfoVos,
            followShopVo,
            shoppingActivityVos,
            assistTaskDetailVo
          } of _.property('data.result.taskVos')(data) || []) {
            if (status === 2 || [8/*开会员*/].includes(taskId)) continue;

            let list = _.concat(simpleRecordInfoVo || productInfoVos || followShopVo || shoppingActivityVos || []);

            // 邀请助力
            if (taskId === 6) {
              // 助力任务首次不执行
              const shareCodeTaskList = self.shareCodeTaskList;
              if (!_.map(shareCodeTaskList, 'taskToken').includes(assistTaskDetailVo.taskToken)) {
                shareCodeTaskList.push(assistTaskDetailVo);
                continue;
              }
              list = shareCodeTaskList.filter(o => o.taskToken !== assistTaskDetailVo.taskToken);
              maxTimes = list.length;
            }

            list = list.map(o => _.assign({
              taskId,
              actionType: 0,
            }, _.pick(o, ['itemId', 'taskToken']), self.commonParamFn()));

            result.push({list, option: {maxTimes, times, waitDuration}});
          }

          return result;
        },
      },
      doTask: {
        name: 'harmony_collectScore',
        paramFn: o => o,
      },
      doRedeem: {
        name: 'interact_template_getLotteryResult',
        paramFn: self.commonParamFn,
        successFn: data => {
          if (!self.isSuccess(data)) return false;
          const beanInfo = _.property('data.result.userAwardsCacheDto.jBeanAwardVo.prizeName')(data);
          beanInfo && self.log(`获取到: ${_.property('data.result.userAwardsCacheDto.jBeanAwardVo.quantity')(data)} ${beanInfo}`);
        },
        repeat: true,
      },
    };
  };
}

module.exports = HarmonyTemplate;
