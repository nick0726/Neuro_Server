require("dotenv").config();
const mysql = require('mysql2');
const db = mysql.createPool({
    host: process.env.MYSQL_SERVER_HOST,
    port: process.env.MYSQL_SERVER_PORT,
    user: process.env.MYSQL_USER_ID,
    password: process.env.MYSQL_USER_PASSWD,
    database: process.env.MYSQL_DB_NAME,
    connectionLimit: process.env.CONNECTION_LIMIT,
    ssl:{
        rejectUnauthorized: false
        // key:fs.readFileSync(process.env.SSL_KEY_PATH),
        // cert:fs.readFileSync(process.env.SSL_CERT_PATH)
    },
    timezone:"+00:00"
});

module.exports = {
    db,
};