const Koa = require("koa");
const Server = require("http").Server;
const mongoose = require("mongoose");
const cors = require("koa2-cors");
const bodyParser = require("koa-bodyparser");
const Router = require("koa-router");
const apiRouter = require("./routes");
const listenSocket = require("./app/sockets");
const mongoInit = require("./mongo-init");

const port = process.env.PORT || 1335;
const {
  dbUrl,
} = require("./config/mongodb");

const router = new Router();
const app = new Koa();

app.use(cors());
app.use(bodyParser());
router.use("/api", apiRouter.routes(), apiRouter.allowedMethods());
app.use(router.routes(), router.allowedMethods());

const http = Server(app.callback());
const io = require("socket.io")(http);

mongoose.Promise = global.Promise;
const db = mongoose.connection.openUri(dbUrl);
db.once("open", mongoInit);

listenSocket(io);

http.listen(port);
console.info(`server is running on port ${port}`);
