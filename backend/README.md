# Setting up MySQL

First, follow these instructions for your OS:

https://dev.mysql.com/doc/mysql-getting-started/en/

Then, run these commands in the backend directory:

```npm install @mysql/xdevapi
mysql -h localhost -u root -p
```

Login with the password created during MySQL installation. Then run:

```CREATE DATABASE libertyeats;
```

Once that's done, create a file called ".env" in the backend directory, and give it the following contents (remember to supply the password field!):

```DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=libertiesguide
```

#Documentation on xdevapi MySQL connector:

https://dev.mysql.com/doc/dev/connector-nodejs/latest/tutorial-Connecting_to_a_Server.html
