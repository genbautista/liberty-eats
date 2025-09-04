const mysqlx = require('@mysql/xdevapi');
require('dotenv').config()

mysqlx.getSession(`mysqlx://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`)
    .then(session => {
        //console.log(session.inspect());
        session.sql("CREATE TABLE IF NOT EXISTS TestTable ( item_id INT, item_name VARCHAR(20) );").execute();
        session.sql("SELECT Count(item_id) FROM TestTable").execute()
            .then(data => {
                if (data.fetchAll()[0] == 0) {
                    session.sql("INSERT INTO TestTable(item_id, item_name) VALUES (1, 'Test'), (2, 'Jeremy');").execute();
                }
            });
    });
