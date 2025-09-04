const mysqlx = require('@mysql/xdevapi');
require('dotenv').config()

mysqlx.getSession(`mysqlx://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`)
    .then(session => {
        console.log(session.inspect()); // { user: 'root', host: 'localhost', port: 33060 }
    });
