import bcrypt from "bcryptjs"
import { errorMessage } from "../errorMessage.js";
import jwt from "jsonwebtoken"
import axios from "axios"
import querystring from "querystring"
export const getGithubToken = async (req, res) => {
    const code = req.query.code;
    if (!code) {
        console.log("沒取得code授權");
        return res.status(400).send("Code not found");
    }
    try {
        const response = await axios.post(
            `https://github.com/login/oauth/access_token?client_id=${process.env.GITHUB_CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${code}`
        );
        //用code換取 accessToken 然後狹帶client_secret
        const accessToken = querystring.parse(response.data).access_token
        if (!accessToken) {
            //code過期錯誤回報
            const error = querystring.parse(response.data).error
            res.cookie("code_error", error, {
                httpOnly: true,
                domain: "localhost",
            });
            return res.status(401).send(error).redirect(process.env.BASE_URL);
        } else {
            // accessToken api所需要的token
            const cookieToken = await signToken(accessToken)
            //把accessToken加密後放到cookie內
            res.cookie("access_token", cookieToken, {
                httpOnly: true,
                domain: "localhost",
            });
            res.redirect(process.env.BASE_URL)
        }
    } catch (error) {
        return res.status(500).send(error);
    }
};


export const getUserInfo = async (req, res) => {
    try {
        const accessToken = await verifyToken(req)
        //解碼
        const response = await axios.get("https://api.github.com/user", {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${accessToken}`
            }
        })
        return res.status(200).json(response.data);
    } catch (error) {
        return res.status(500).send(error);
    }
};
export const signToken = async (accessToken) => {
    try {
        const cookieToken = await jwt.sign(accessToken, process.env.JSON_SECRET);
        return cookieToken;
    } catch (error) {
        return error
    }
};

//每個從ui那邊請求的api動作都要先對Token 解碼才能授權後動作，
export const verifyToken = async (req) => {
    const cookie = req.cookies.access_token
    //github_token 會跟著code去改變與過期
    const authorizationHeader = req.headers.authorization;
    const cookieToken = authorizationHeader.split(' ')[1]; // 從Bearer Token中解析出access token
    try {
        const accessToken = await jwt.verify(cookie, cookieToken);
        return accessToken;
    } catch (error) {
        return error
    }
};

export const logout = async (req, res) => {
    try {
        await res.clearCookie("access_token", { httpOnly: true });
        return res.status(200).json("logout")
    } catch (error) {
        return error
    }
};


export const getAllIssue = async (req, res) => {
    if (req.cookies.access_token == "") {
        console.log("Dasdad")
    }
    else {
        try {
            const accessToken = await verifyToken(req)
            //解碼
            const response = await axios.get("https://api.github.com/repos/SamKo88927/chiioa-api/issues", {
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${accessToken}`
                }
            })
            return res.status(200).json(response.data);
        } catch (error) {
            return res.status(500).send(error);
        }
    }
};