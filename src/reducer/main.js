import {
    COLLAPSED,
    SET_USER_INFO,
    SET_SEARCH_KEY,
    SHOW_SEARCH_KEY,
    SET_FOLDER_LIST,
    SET_ACTIVE_MENU,
} from './../utils/constant';

const initState = {
    collapsed: false,
    userInfo: {},
    searchKey: '',
    showSearch: true,
    folderList: [],

    menuKey: '',
};

function main(state = initState, action) {
    switch (action.type) {
            case COLLAPSED:
                return Object.assign({}, state, {
                    collapsed: action.value
                });
            case SET_USER_INFO:
                return Object.assign({}, state, {
                    userInfo: action.value
                });
            case SET_SEARCH_KEY:
                return Object.assign({}, state, {
                    searchKey: action.value
                });
            case SHOW_SEARCH_KEY:
                return Object.assign({}, state, {
                    showSearch: action.value
                });
            case SET_FOLDER_LIST:
                return Object.assign({}, state, {
                    folderList: action.value
                });
            case SET_ACTIVE_MENU:
                return Object.assign({}, state, {
                    menuKey: action.value
                });
            default:
                return state;
    }
}

export default main;