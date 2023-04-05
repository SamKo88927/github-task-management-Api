import express from "express"
import {closeIssue, createIssue, getAllIssue, getGithubToken, getIssue, getUserInfo, logout, searchIssue, updatedIssue, verifyToken} from "../Controller/auth.js";

const router = express.Router()

router.get("/github",getGithubToken)
router.get("/github/userinfo",getUserInfo)
router.get("/github/token",verifyToken)
//新增query可以讓他scroll新增筆數
router.get("/github/issue",getAllIssue)
router.get("/github/find/issue",getIssue)
//新增query可以讓他scroll新增筆數
router.get("/github/search/issue",searchIssue)

router.post("/github/issue",createIssue)
router.get("/github/logout",logout)

router.post("/github/issue/updated",updatedIssue)
router.get("/github/issue/deleted",closeIssue)
export default router

