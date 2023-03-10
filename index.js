import express from "express";
import dotenv from "dotenv"
import authApiRoute from "./Routes/auth.js"
import cookieParser from "cookie-parser"
import cors from "cors"
const app = express()
app.use(cors())
dotenv.config()
const port = 5000;
app.listen(port, () => {
    console.log(`connected to ${port} backend`)
})

app.use(cookieParser())
app.use(express.json())//讓上傳的req.body可以視為json
///middlewares
app.use("/api/v1/auth", authApiRoute)

app.get("/api/v1/auth",(req,res)=>{return res.send("connected")})
//如果上述ApiRoute傳接有問題可以來這邊回傳錯誤訊息
app.use((error, req, res, next) => {
    const errorStatus = error.status || 500;
    const errorMessage = error.message || "中間ApiRoute出錯";
    const errorDetail = error.detail
    return res.status(errorStatus).json({ //return回去讓他可以被next(error) catch
        status: errorStatus,
        message: errorMessage,
        detail: errorDetail
    })
})


