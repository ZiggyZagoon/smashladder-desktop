import {endpoints, SmashLadderAuthentication} from "../utils/SmashLadderAuthentication";
import electronSettings from "electron-settings";
import getAuthenticationFromState from "../utils/getAuthenticationFromState";

export const SET_LOGIN_KEY = 'SET_LOGIN_KEY'
export const INVALID_LOGIN_KEY = 'INVALID_LOGIN_KEY';

export const LOGIN_BEGIN = 'LOGIN_BEGIN';
export const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
export const LOGIN_FAIL = 'LOGIN_FAIL';

export const LOGOUT_BEGIN = 'LOGOUT_BEGIN';
export const LOGOUT_SUCCESS = 'LOGOUT_SUCCESS';
export const LOGOUT_FAIL = 'LOGOUT_FAIL';

export const ENABLE_CONNECTION = 'ENABLE_CONNECTION';
export const DISABLE_CONNECTION = 'DISABLE_CONNECTION';


export const setLoginKey = (loginCode) =>{
	return (dispatch) =>{
		const authentication = SmashLadderAuthentication.create({loginCode});
		const state = {
			loginCode: loginCode,
		};
		if(!authentication._getAccessCode())
		{
			dispatch({
				type: INVALID_LOGIN_KEY,
				payload: {
					...state,
					loginErrors: ['Invalid Key']
				}
			});
			return;
		}
		dispatch({
			type: LOGIN_BEGIN,
			payload: {
				...state,
				player: null,
				isLoggingIn: true,
				loginErrors: []
			}
		});
		authentication
			.isAuthenticated()
			.then((authentication) => {
				console.log(authentication);
				const saveDatas = {};
				saveDatas.loginCode = loginCode;
				saveDatas.sessionId = authentication.session_id;
				saveDatas.player  = authentication.player;
				electronSettings.set('login', saveDatas);
				dispatch({
					type: LOGIN_SUCCESS,
					payload: {
						...state,
						player: authentication.player,
						isLoggingIn: false,
						sessionId: authentication.session_id
					},
				});
			})
			.catch(response => {
				let error = null;
				let showLoginButton = false;
				if(response.statusCode === 401)
				{
					error = 'Invalid Code, Maybe it expired?';
				}
				else
				{
					try{
						error = JSON.parse(response.error);
						if(error.error)
						{
							error = error.error;
						}
					}
					catch(parseError){
						error = `Something is probably wrong with SmashLadder's server's right now, please try again later!`;
						showLoginButton = true;
					}
				}
				if(typeof error === 'string')
				{
					error = [error];
				}
				dispatch({
					type: LOGIN_FAIL,
					payload: {
						...state,
						player: null,
						loginErrors: error,
						isLoggingIn: false,
						showLoginButton: true,
					}
				});
			});
	}
};

export const disableConnection = () => (dispatch) => {
	dispatch({
		type: DISABLE_CONNECTION
	});
};
export const enableConnection = () => (dispatch) => {
	dispatch({
		type: ENABLE_CONNECTION
	});
};

export const logout = () => (dispatch, getState) => {
	const authentication = getAuthenticationFromState(getState);
	dispatch({
		type: LOGOUT_BEGIN
	});
	electronSettings.set('login', null)
	authentication.apiPost(endpoints.LOGOUT, {logout: true}).then(()=>{
		dispatch({
			type: LOGOUT_SUCCESS
		})
	}).catch(()=>{
		dispatch({
			type: LOGOUT_FAIL
		})
	});
};