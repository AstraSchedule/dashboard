import axios from 'axios'
import {getAPISRV} from '@/global.js'

const TOKEN_KEY = 'sys_token'
const USER_KEY = 'sys_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function isLoggedIn() {
  return !!getToken()
}

export function getUserInfo() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || '{}')
  } catch {
    return {}
  }
}

export function setUserInfo(info) {
  localStorage.setItem(USER_KEY, JSON.stringify(info))
}

export function removeUserInfo() {
  localStorage.removeItem(USER_KEY)
}

export async function login(username, password) {
  const resp = await axios.post(`${getAPISRV()}/web/auth/login`, {username, password})
  return resp.data
}

export async function getMe() {
  const resp = await axios.get(`${getAPISRV()}/web/auth/me`, {
    headers: {Authorization: `Bearer ${getToken()}`}
  })
  return resp.data
}

export async function changePassword(oldPassword, newPassword, newUsername) {
  const resp = await axios.post(`${getAPISRV()}/web/auth/change-password`, {
    old_password: oldPassword,
    new_password: newPassword,
    new_username: newUsername
  }, {
    headers: {Authorization: `Bearer ${getToken()}`}
  })
  return resp.data
}
