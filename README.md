# HỆ THỐNG QUẢN LÝ CÔNG VIỆC THÔNG MINH

## Giới thiệu

Đây là hệ thống quản lý công việc được xây dựng nhằm hỗ trợ:

* Quản lý dự án
* Quản lý task
* Theo dõi tiến độ công việc
* Chat realtime
* Thông báo realtime bằng WebSocket
* Xử lý bất đồng bộ với Celery
* Giám sát và cảnh báo tấn công brute force, JWT Abuse
* Quản lý nhóm và dự án nhóm

Hệ thống được xây dựng theo mô hình fullstack hiện đại với khả năng realtime và background processing.

---

# Công nghệ sử dụng

## Frontend

* ReactJS
* Vite
* CSS Modules
* Framer Motion

## Backend

* Django
* Django REST Framework
* Django Channels
* JWT Authentication

## Database & Queue

* MySQL
* Redis
* Celery
* Celery Beat

## Realtime

* WebSocket
* Channels Layer

## Containerization

* Docker
* Docker Compose

---

# Yêu cầu trước khi chạy project

Máy tính cần cài đặt:

## 1. Git

Tải tại:

https://git-scm.com/downloads

---

## 2. Docker Desktop

Tải tại:

https://www.docker.com/products/docker-desktop/

Sau khi cài đặt cần mở Docker Desktop trước khi chạy project.

---

# Clone project

Mở terminal và chạy:

```bash
git clone <LINK_GITHUB>
```

Sau đó di chuyển vào thư mục project:

```bash
cd 2_WEBSITE_QUANLYCONGVIEC
```

---

# Cấu hình môi trường

## Bước 1: Tạo file `.env`

Copy file:

```txt
.env.example
```

thành:

```txt
.env
```

---

## Windows PowerShell

```powershell
copy .env.example .env
```

---

## Linux / MacOS

```bash
cp .env.example .env
```

---

# Nội dung file `.env`

```env
DB_NAME=taskdb
DB_USER=root
DB_PASSWORD=root
DB_HOST=mysql
DB_PORT=3306

REDIS_HOST=redis

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

---

# Chạy project bằng Docker

## Build project

```bash
docker compose build
```

---

## Chạy project

```bash
docker compose up
```

Hoặc gộp build + run:

```bash
docker compose up --build
```

---

# Các địa chỉ truy cập

## Frontend

http://localhost:5173

---

## Backend API

http://localhost:8000

---

## Django Admin

http://localhost:8000/admin

---

# Tạo tài khoản admin

Mở terminal khác và chạy:

```bash
docker compose exec backend python manage.py createsuperuser
```

Sau đó nhập:

* username
* email
* password

---

# Các service Docker được sử dụng

Khi chạy project, Docker sẽ tự động khởi động:

* Frontend ReactJS
* Backend Django
* MySQL
* Redis
* Celery Worker
* Celery Beat
* WebSocket Server
* Hydra Container

---

# Chức năng chính

## Authentication

* Đăng ký
* Đăng nhập JWT
* Refresh Token
* Logout

## Project Management

* Tạo project
* Quản lý thành viên
* Theo dõi tiến độ

## Task Management

* CRUD task
* Deadline
* Priority
* Status tracking

## Realtime

* Chat realtime
* Notification realtime
* WebSocket

## Security

* JWT Authentication
* Middleware kiểm tra request
* Giám sát brute force
* Redis cooldown system

## Background Processing

* Celery worker
* Celery beat scheduler
* Task kiểm tra quá hạn

---

# Một số lệnh Docker hữu ích

## Xem container đang chạy

```bash
docker ps
```

---

## Dừng project

```bash
docker compose down
```

---

## Xem log realtime

```bash
docker compose logs -f
```

---

## Rebuild toàn bộ project

```bash
docker compose build --no-cache
```

---

# Cấu trúc project

```txt
2_WEBSITE_QUANLYCONGVIEC
│
├── backend
│   ├── apps
│   ├── config
│   ├── Dockerfile
│   ├── requirements.txt
│   └── entrypoint.sh
│
├── frontend
│   ├── src
│   ├── public
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

# Lưu ý

* Cần bật Docker Desktop trước khi chạy project.
* Không push file `.env` lên GitHub.
* Nếu port bị trùng cần chỉnh trong `docker-compose.yml`.
* Redis và MySQL đã được container hóa nên không cần cài riêng trên máy.

---

# Tác giả

Sinh viên thực hiện: <HOÀNG VĂN ĐỨC>

Project phục vụ mục đích nghiên cứu và học tập.
