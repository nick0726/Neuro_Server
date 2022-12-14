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
const {
  default: enforceHttps,
  xForwardedProtoResolver: resolver,
} = require("koa-sslify");

// PORT = 3000
const PORT = process.env.PORT || 3000;

// React Build
const buildPath = path.resolve(__dirname, "../../client/build");

const app = new Koa({
  // Local DB = devlopment
  env: "development",
  // env: "production",
  proxy: true,
});

const originURL =
  app.env == "production"
    ? "https://neuroears.co.kr"
    : "https://localhost:3000";

const corsOptions = {
  origin: originURL,
  credentials: true,
};
const router = new Router();
// Set version for release

app.use(cors(corsOptions));
app.use(bodyParser());
app.use(serve(buildPath));

// Error Handler
app.use(errors.errorHandler);

// Route 사용 설정
app.use(router.routes()).use(router.allowedMethods());

// 기본 접속 주소 React Build file 로 연결
// router.get("/", async (ctx) => {
//   await send(ctx, "index.html", { root: buildPath });
// });

// user router 설정
router.use("/user", userRouter.routes());
router.use("/api", apiRouter.routes());
router.use("/hospital", hospitalRouter.routes());
router.use("/pay", payRouter.routes());

// app.listen(PORT, () => {
//   console.log(`server is listening on ${PORT}`);
// });

app.use(
  enforceHttps({
    port: PORT,
  })
);

var options = {
  key: fs.readFileSync("./localhost-key.pem"),
  cert: fs.readFileSync("./localhost.pem"),
};

https.createServer(options, app.callback()).listen(PORT);

process.on("SIGINT", function () {
  process.exit();
});
