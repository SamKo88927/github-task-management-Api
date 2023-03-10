import express from "express"
import {getAllIssue, getGithubToken, getUserInfo, logout, verifyToken} from "../Controller/auth.js";

const router = express.Router()

router.get("/github",getGithubToken)
router.get("/github/userinfo",getUserInfo)
router.get("/github/token",verifyToken)
router.get("/github/issue",getAllIssue)
router.get("/github/logout",logout)
export default router

