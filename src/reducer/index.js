import {combineReducers} from 'redux';
import demo from './demo';
import main from './main';

const rootReducer = combineReducers({
    demo,
    main
});

export default rootReducer;