# Employee System

A browser-based employee management project built with HTML, CSS, JavaScript, and PHP/MySQL components. The repository contains a front-end employee interface together with server-side/database-related code.

![HTML](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=111)
![PHP](https://img.shields.io/badge/PHP-8.x-777BB4?logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql&logoColor=white)

## Overview

Employee System is a small employee-registry application demonstrating CRUD-oriented web development concepts and integration between a browser interface and PHP/MySQL code.

The repository currently contains the main web assets (`index.html`, `script.js`, and `style.css`), a PHP database-related script, an `api/` directory, and two archived ZIP packages.

## Repository contents

```text
.
├── api/                         # API/server-side resources
├── index.html                   # Main web interface
├── script.js                    # Client-side application logic
├── style.css                    # Application styling
├── table.php                    # PHP/MySQL database connection and setup code
├── Employee_System_VER_1.zip    # Archived project package
└── employee-registry-pro-updated.zip
```

## Technology

- HTML5
- CSS3
- JavaScript
- PHP
- MySQL / MySQLi

## Local setup

### Front end

The static front end can be opened directly in a browser or served from a local web server.

### PHP / MySQL

The PHP portion requires a PHP-capable web server and a MySQL-compatible database server.

1. Install a local environment such as XAMPP, WAMP, or an equivalent PHP/MySQL stack.
2. Place the project in the server's web root.
3. Create/configure the required MySQL database.
4. Update the database connection values in PHP configuration code for your local environment.
5. Open the application through the local web server rather than the `file://` protocol when PHP functionality is required.

> **Security note:** The current `table.php` contains local database connection settings using the MySQL `root` account and an empty password. This is suitable only for a controlled local development environment. Do not reuse these credentials in production.

## Development notes

- Keep database credentials outside version control when moving beyond local development.
- Prefer environment variables or a non-committed configuration file for deployment credentials.
- The repository contains ZIP archives alongside source files; these should be treated as historical packages unless they are intentionally part of the release process.
- The PHP database setup script should be reviewed before production use because it contains direct database-creation logic and development-oriented output.

## Current status

This repository is being organized as a portfolio-ready project. The source structure and database setup should be validated locally before describing the application as production-ready.

## License

No license has been specified for this repository yet. Add a `LICENSE` file before distributing the project under an open-source license.
