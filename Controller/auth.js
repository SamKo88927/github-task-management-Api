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
                domain: process.env.COOKIE_URL,
                secure: true,
                sameSite: "none",
            });
            // return res.status(401).send(error).redirect(process.env.BASE_URL);
        } else {
            // accessToken api所需要的token
            const cookieToken = await signToken(accessToken)
            //把accessToken加密後放到cookie內
            console.log(cookieToken)
            res.cookie("access_token", cookieToken, {
                httpOnly: true,
                domain: process.env.COOKIE_URL,
                secure: true,
                sameSite: "none",
            })
            // res.redirect(process.env.BASE_URL)
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


// export const getAllIssue = async (req, res) => {
//     if (req.cookies.access_token == "") {
//         console.log("Access_token is empty")
//     }
//     else {
//         try {
//             const accessToken = await verifyToken(req)
//             //解碼
//             const response = await axios.get("https://api.github.com/repos/SamKo88927/github-task-management-UI/issues", {
//                 headers: {
//                     Accept: "application/json",
//                     Authorization: `Bearer ${accessToken}`
//                 }
//             })

//             return res.status(200).json(response.data);
//         } catch (error) {
//             return res.status(500).send(error);
//         }
//     }
// };
export const getAllIssue = async (req, res) => {
    if (req.cookies.access_token == "") {
        console.log("Access_token is empty")
    }
    else {
        const accessToken = await verifyToken(req)
        try {
            //解碼
            //要設定page=1 為預設30筆 並每次更新要更新10筆 但因為github中沒有offset與limit的query所以用page與per_page來同樣達到此效果
            //所以因為預設是30 每增加一次是10筆 所以per_page可以為10 而預設的page可以為30以後往下加1
            const offset = Number(req.query.offset)
            if (offset == 0) {
                const response = await axios.get(`https://api.github.com/issues?per_page=5&direction=asc&filter=created`, {
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${accessToken}`
                    }
                })
                return res.status(200).json(response.data);
            } else { //後來req.query.offset == 1,2,3 代表要新增每次的搜尋 +4為 原本的30個 往後每10個就新增
                const response = await axios.get(`https://api.github.com/issues?direction=asc&page=${offset + 5}&per_page=1`, {
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${accessToken}`
                    }
                })

                return res.status(200).json(response.data);
            }
        } catch (error) {
            return res.status(500).send(error);
        }
    }
};

export const getIssue = async (req, res) => {
    const getRepoIssuesUrl = req.query.url
    if (req.cookies.access_token == "") {
        console.log("Access_token is empty")
    }
    else {
        try {
            const accessToken = await verifyToken(req)
            const response = await axios.get(`https://api.github.com/repos/${getRepoIssuesUrl}`, {
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
// https://api.github.com/search/issues?q=${req.body.search}+in:title,body 尋找全部的api 
//限縮範圍到只有指定在自己的範圍
export const searchIssue = async (req, res) => {
    if (req.cookies.access_token == "") {
        console.log("Access_token is empty")
    }
    else {
        try {
            const searchBody = req.query.search
            const searchUser = req.query.user ? "+user:" + req.query.user : ""
            const searchRepo = req.query.repo ? "+repo:" + req.query.repo : ""
            const offset = Number(req.query.offset)
            const accessToken = await verifyToken(req)
            console.log(req.query)
            console.log(`https://api.github.com/search/issues?q=${searchBody}+in:body,title${searchUser}${searchRepo}&per_page=30&direction=asc&filter=created`)
            //解碼
            if (offset == 0) {
                const response = await axios.get(`https://api.github.com/search/issues?q=${searchBody}+in:body,title${searchUser}${searchRepo}&per_page=30&direction=asc&filter=created`, {
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${accessToken}`
                    }
                })
                console.log(response.data)
                return res.status(200).json(response.data.items);
            } else { //後來req.query.offset == 1,2,3 代表要新增每次的搜尋 +4為 原本的30個 往後每10個就新增
                const response = await axios.get(`https://api.github.com/search/issues?q=${searchBody}+in:title,body${searchUser}${searchRepo}&page=${offset + 4}&per_page=10`, {
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${accessToken}`
                    }
                })
                return res.status(200).json(response.data.items);
            }
        } catch (error) {
            return res.status(500).send(error);
        }
    }
};

export const createIssue = async (req, res, next) => {
    if (req.cookies.access_token == "") {
        console.log("Access_token is empty")
    }
    else {
        //特別新增一區為輸入修改body一樣至少要大於30個字的要求
        if (req.body.body && req.body.body.length < 30) return (next(errorMessage(400, "Please input at least greater than 30 characters")))
        try {
            const accessToken = await verifyToken(req)
            //解碼
            try {
                const response = await axios.post(`https://api.github.com/repos/${req.body.own}/${req.body.repo}/issues`, req.body,
                    {
                        headers: {
                            Accept: "application/json",
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                )

                return res.status(200).json(response.data);
            } catch (error) {
                console.log(error)
                return res.status(500).send(error);
            }
        } catch (error) {
            console.log(error)
            return res.status(500).send(error);
        }
    }
}


export const updatedIssue = async (req, res, next) => {
    const getRepoIssuesUrl = req.query.url
    if (req.cookies.access_token == "") {
        console.log("Access_token is empty")
    }
    else {
        //特別新增一區為輸入修改body一樣至少要大於30個字的要求
        if (req.body.body && req.body.body.length < 30) return (next(errorMessage(400, "Please input at least greater than 30 characters")))
        try {
            const accessToken = await verifyToken(req)
            //解碼
            try {
                const response = await axios.patch(`https://api.github.com/repos/${getRepoIssuesUrl}`,
                    req.body,
                    {
                        headers: {
                            Accept: "application/json",
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                )
                return res.status(200).json(response.data);
            } catch (error) {
                console.log(error)
                return res.status(500).send(error);
            }
        } catch (error) {
            console.log(error)
            return res.status(500).send(error);
        }
    }
}

export const closeIssue = async (req, res) => {
    if (req.cookies.access_token == "") {
        console.log("Access_token is empty")
    }
    else {
        try {
            const accessToken = await verifyToken(req)
            //解碼
            try {
                const response = await axios.patch(`https://api.github.com/repos/${req.body.own}/${req.body.repo}/issues/${req.body.number}`,
                    {
                        state: "closed"
                    },
                    {
                        headers: {
                            Accept: "application/json",
                            Authorization: `Bearer ${accessToken}`
                        }
                    }
                )
                return res.status(200).json(response.data);
            } catch (error) {
                console.log(error)
                return res.status(500).send(error);
            }
        } catch (error) {
            console.log(error)
            return res.status(500).send(error);
        }
    }
}