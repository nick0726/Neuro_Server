require("dotenv").config();
const Koa = require("koa");
const Router = require("koa-router");
const send = require("koa-send");
const serve = require("koa-static");
const bodyParser = require("koa-bodyparser");
const path = require("path");
const errors = require("./middlewares/errors");
//const {jwtMiddleware} = require("./lib/token");
const userRouter = require("./routes/user.routes");
const apiRouter = require("./routes/api.routes");
const hospitalRouter = require("./routes/hospital.routes");
const payRouter = require("./routes/pay.routes");
const cors = require("@koa/cors");
const https = require("https");
const fs = require("fs");
const { default: enforceHttps } = require("koa-sslify");

// PORT = 3000
const PORT = process.env.PORT || 3000;

// React Build
const buildPath = path.resolve(__dirname, "../../client/build");

const app = new Koa({
  // Local DB = devlopment
  env: "development",
  // env:"production",
  proxy: true,
});

const originURL =
  app.env == "production"
    ? "https://neuroears.co.kr"
    : "https://localhost:3000";

//console.log(originURL);

const corsOptions = {
  origin: originURL,
  credentials: true,
};
const router = new Router();
// Set version for release
//app.env = "production";

app.use(cors(corsOptions));
app.use(bodyParser());
app.use(serve(buildPath));

//app.use(jwtMiddleware);

// Error Handler
app.use(errors.errorHandler);

// Force HTTPS using default resolver
app.use(
  enforceHttps({
    port: 3000,
  })
);

// SSL options
var options = {
  key: fs.readFileSync("./localhost-key.pem"),
  cert: fs.readFileSync("./localhost.pem"),
};

// start the server
https.createServer(options, app.callback()).listen(8000);

// Route 사용 설정
app.use(router.routes()).use(router.allowedMethods());

// index page
// ctx.body = "hello world from " + ctx.request.url;
// 기본 접속 주소 React Build file 로 연결
router.get("/", async (ctx) => {
  await send(ctx, "index.html", { root: buildPath });
});
// app.use(() => {
// });

// user router 설정
router.use("/user", userRouter.routes());
router.use("/api", apiRouter.routes());
router.use("/hospital", hospitalRouter.routes());
router.use("/pay", payRouter.routes());

app.listen(PORT, () => {
  console.log(`server is listening on ${PORT}`);
});

process.on("SIGINT", function () {
  process.exit();
});

// https 뼈대 붙이기 전
// const Koa = require("koa");
// const https = require("https");
// const fs = require("fs");
// const { default: enforceHttps } = require("koa-sslify");

// const PORT = process.env.PORT || 3000;

// const app = new Koa({
//   // Local DB env:devlopment
//   env: "development",
//   // env:"production",
//   proxy: true,
// });

// app.use(
//   enforceHttps({
//     port: PORT,
//   })
// );

// // index page
// app.use((ctx) => {
//   // ctx.body = "hello world from " + ctx.request.url;
//   ctx.body = "hello world from " + "https";
// });

// var options = {
//   key: fs.readFileSync("./localhost-key.pem"),
//   cert: fs.readFileSync("./localhost.pem"),
// };

// // start the server
// https.createServer(options, app.callback()).listen(PORT);
