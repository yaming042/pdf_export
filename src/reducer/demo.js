import {
    TEST
} from './../utils/constant';

const initState = {
    test: ''
};

function demo(state = initState, action) {
    switch (action.type) {
            case TEST:
                return Object.assign({}, state, {
                    test: action.value
                });
            default:
                return state;
    }
}

export default demo;