# EmpRegistry Pro

A full-stack employee registration and personnel-dossier application built with vanilla HTML/CSS/JavaScript and a PHP/MySQL backend.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=111)
![PHP](https://img.shields.io/badge/PHP-8.x-777BB4?logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql&logoColor=white)

## Overview

EmpRegistry Pro provides a browser-based interface for registering, searching, editing, deleting, and exporting employee dossiers. The current version adds account-based authentication, server-side data isolation, employee photos, Google Sign-In support, and a MySQL-backed API.

## Features

- Email/password account registration and sign-in
- Optional Google Sign-In
- Session-based authentication
- Per-account employee data isolation enforced by the backend
- Employee registration and editing
- Employee deletion with uploaded-photo cleanup
- Server-side search
- Employee photo upload and protected photo delivery
- Salary confidentiality control
- Skills management
- Employee records and dossier views
- Export functionality in the browser
- Responsive interface for desktop and mobile screens

## Architecture

```text
Browser
  │
  ├── index.html      UI and application shell
  ├── script.js       Client-side state, navigation, validation and API calls
  └── style.css       Responsive visual design
        │
        ▼
PHP API (`api/`)
  ├── auth-*.php      Authentication and sessions
  ├── query.php       Employee listing/search
  ├── register-employee.php
  ├── update-employee.php
  ├── delete-employee.php
  ├── employee-validation.php
  └── photo.php       Authenticated photo delivery
        │
        ▼
     MySQL
  ├── users
  └── employees
```

## Repository structure

```text
.
├── api/
│   ├── auth-common.php
│   ├── auth-google.php
│   ├── auth-login.php
│   ├── auth-logout.php
│   ├── auth-register.php
│   ├── auth-session.php
│   ├── db-connect.php
│   ├── delete-employee.php
│   ├── employee-validation.php
│   ├── migration.sql
│   ├── photo.php
│   ├── query.php
│   ├── register-employee.php
│   ├── update-employee.php
│   └── uploads/              # Runtime photos; not intended for source control
├── index.html
├── script.js
├── style.css
├── .htaccess
└── README-LOGIN.md
```

## Requirements

- PHP with MySQLi support
- MySQL / MariaDB
- Apache or another web server capable of serving PHP
- HTTPS for production authentication/session use
- A Google OAuth client ID only if Google Sign-In is enabled

## Setup

### 1. Create the database

Use phpMyAdmin or the MySQL CLI and run `api/migration.sql` against the application's database.

> **Warning:** The migration intentionally drops the existing `employees` table before recreating it. Back up existing employee data first if it is still needed.

### 2. Configure database credentials

Create `api/db-secrets.php` on the server. The file should return an array containing the database host, username, password, and database name.

**Do not commit `api/db-secrets.php`.** A template is documented in `README-LOGIN.md` and the repository ignore rules exclude local secrets.

### 3. Configure Google Sign-In (optional)

Set the Google OAuth client ID in the authentication backend and the front-end configuration as described in `README-LOGIN.md`.

The email/password flow does not depend on Google Sign-In.

### 4. Serve the application

Deploy the repository to a PHP-enabled web root and open `index.html` through the web server. Do not use a `file://` URL for the application because the PHP API and session cookies require the web server.

The root `.htaccess` redirects HTTP traffic to HTTPS when Apache rewrite support is available.

## Security model

The application uses several defensive measures:

- Passwords are stored using PHP's password hashing API.
- SQL writes and lookups use prepared statements.
- Employee queries are scoped to the authenticated user's ID.
- Employee photos are stored under account-specific directories.
- Direct access to the uploads directory is blocked by `.htaccess`.
- Photo requests are authenticated and ownership-checked by `photo.php`.
- User-controlled text is sanitized on the server and escaped before being inserted into client-side HTML.
- Database errors are logged server-side rather than exposing raw connection details to visitors.

## Deployment notes

Keep production secrets outside Git. In particular, never commit the contents of `api/db-secrets.php`, database dumps containing private employee data, or private OAuth credentials.

The repository may contain runtime photo directories when copied from a live server. Those files should normally remain on the server rather than being committed to the source repository.

## Current status

This is an active development/portfolio project. The authentication and multi-account backend are implemented, but deployment should still be tested against the target PHP/MySQL hosting environment before being treated as production software.

## License

No open-source license has been specified yet. Add a `LICENSE` file if you intend to distribute the project under a particular license.
