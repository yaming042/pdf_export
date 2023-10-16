let EventEmitter = require('events').EventEmitter;
let customEvent = new EventEmitter();

// 此方法用来返回与URL绑定的 eventName
const getEventName = (eventName) => {
    const {pathname, search} = window.location;

    return eventName + '_' + pathname + search;
};

export {customEvent, getEventName};

export const EDITOR_START_DRAG = 'EDITOR_START_DRAG';
export const EDITOR_DECISION_DRAWER_OPEN = 'EDITOR_DECISION_DRAWER_OPEN'; // 决策单元详情弹框
export const EDITOR_RULESET_DRAWER_OPEN = 'EDITOR_RULESET_DRAWER_OPEN'; // 决策单元下规则列表详情弹框
export const EDITOR_RULE_DRAWER_OPEN = 'EDITOR_RULE_DRAWER_OPEN'; // 决策单元下规则列表规则详情弹框
export const EDITOR_SKIP_RULESET_MODAL_OPEN = 'EDITOR_SKIP_RULESET_MODAL_OPEN'; // 决策单元下选择跳转规则集弹框
export const EDITOR_INIT_RULESET_MODAL_OPEN = 'EDITOR_INIT_RULESET_MODAL_OPEN'; // 决策单元下新建、编辑规则集弹框

export const EDITOR_FEATURE_DRAWER_OPEN = 'EDITOR_FEATURE_DRAWER_OPEN'; // 决策单元下特征列表特征详情弹框

export const EDITOR_REPAINT = 'EDITOR_REPAINT'; // 规则集改变后重绘画布
export const EDITOR_REFRESH = 'EDITOR_REFRESH'; // 规则集改变后重绘画布

export const VALIDATE_RULE_BASE_INFO = 'VALIDATE_RULE_BASE_INFO'; // 校验规则基础信息
export const VALIDATE_RULE_LOGIC_INFO = 'VALIDATE_RULE_LOGIC_INFO'; // 校验规则logic信息
export const VALIDATE_RULE_RESULT_INFO_1 = 'VALIDATE_RULE_RESULT_INFO_1'; // 校验规则result信息
export const VALIDATE_RULE_RESULT_INFO_2 = 'VALIDATE_RULE_RESULT_INFO_2'; // 校验规则result信息

export const EDITOR_PAINT = 'EDITOR_PAINT'; // 画布
export const ADD_NODE = 'ADD_NODE'; // 添加节点
export const EDITOR_SELECTED_NODE = 'EDITOR_SELECTED_NODE'; // 当前选中节点
export const REMOVE_RULE_SET = 'REMOVE_RULE_SET'; // 删除节点