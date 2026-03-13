# دليل نشر التطبيق على Hostinger

تطبيق **meptj** يتكون من:
- **Frontend**: React (Create React App + Craco)
- **Backend**: FastAPI (Python) + MongoDB

---

## 1. متطلبات الاستضافة

- **Hostinger VPS** (مُوصى به) أو خطة تحتوي على Node.js و Python.
- الاستضافة المشتركة العادية (Shared) لا تدعم تشغيل FastAPI؛ تحتاج VPS أو Cloud.

### ما ستحتاجه على السيرفر

| المكوّن        | الاستخدام                    |
|----------------|-------------------------------|
| **Node.js 18+** | بناء الفرونتند وتشغيله (إن رغبت) |
| **Python 3.10+** | تشغيل الباكند (FastAPI)        |
| **MongoDB**    | عبر [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (مجاني) |
| **Nginx**      | Reverse proxy و SSL            |

---

## 2. إعداد MongoDB Atlas

1. أنشئ حساباً على [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. أنشئ Cluster (مثلاً Free Tier).
3. من **Database Access** أضف مستخدماً واحفظ اسم المستخدم وكلمة المرور.
4. من **Network Access** أضف `0.0.0.0/0` (أو IP السيرفر فقط للأمان).
5. انسخ **Connection String** وضع فيه اسم المستخدم وكلمة المرور.
6. في ملف `.env` الباكند:
   - `MONGO_URL=...` (الـ connection string)
   - `DB_NAME=meptj` (أو اسم قاعدة تختاره)

---

## 3. نشر الباكند (FastAPI) على VPS

### 3.1 الاتصال بالسيرفر

```bash
ssh root@YOUR_SERVER_IP
```

### 3.2 تثبيت Python و uv أو pip

```bash
apt update && apt install -y python3 python3-pip python3-venv
# أو استخدم uv لسرعة أكبر
```

### 3.3 رفع المشروع

```bash
# إنشاء مجلد
mkdir -p /var/www/meptj
cd /var/www/meptj

# رفع الملفات (مثلاً عبر Git)
git clone YOUR_REPO_URL .
# أو استخدم File Manager / SFTP لرفع مجلد backend
```

### 3.4 بيئة افتراضية واعتماديات

```bash
cd /var/www/meptj/backend
python3 -m venv venv
source venv/bin/activate  # على Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3.5 ملف .env

```bash
cp .env.example .env
nano .env   # أو استخدم محرر نصوص
```

املأ كل المتغيرات (انظر القسم «متغيرات البيئة» أدناه).

### 3.6 مجلد الرفع

```bash
mkdir -p /var/www/meptj/backend/uploads
chmod 755 /var/www/meptj/backend/uploads
```

### 3.7 تشغيل الباكند (مع Gunicorn + Uvicorn)

```bash
pip install gunicorn
# تشغيل مباشر (للتجربة):
uvicorn server:app --host 0.0.0.0 --port 8000
```

للإنتاج استخدم **systemd** أو **supervisor** أو **PM2** مع أمر مثل:

```bash
gunicorn server:app -w 1 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

---

## 4. نشر الفرونتند (React)

### 4.1 بناء المشروع محلياً (على جهازك)

```bash
cd frontend
cp .env.example .env
# عدّل .env:
# REACT_APP_BACKEND_URL=https://api.yourdomain.com
yarn install
yarn build
```

سيُنشأ مجلد `build` فيه الملفات الثابتة.

### 4.2 رفع مجلد build إلى السيرفر

- ارفع محتويات `frontend/build` إلى مجلد على السيرفر، مثلاً:
  - `/var/www/meptj/frontend/build`
- أو استخدم استضافة Static في Hostinger وارفع محتويات `build` هناك.

---

## 5. إعداد Nginx (على VPS)

مثال إعداد لاستضافة الفرونتند والباكند معاً:

```nginx
# Frontend - الموقع الرئيسي
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/meptj/frontend/build;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }
}
```

بعدها فعّل SSL بـ **Let's Encrypt** (Certbot):

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

---

## 6. متغيرات البيئة المطلوبة

### Backend (`.env` في `backend/`)

| المتغير | مطلوب | الوصف |
|--------|--------|--------|
| `MONGO_URL` | نعم | Connection string من MongoDB Atlas |
| `DB_NAME` | نعم | اسم قاعدة البيانات |
| `JWT_SECRET` | نعم | مفتاح سري قوي لـ JWT |
| `FRONTEND_URL` | نعم | عنوان الموقع (مثلاً https://yourdomain.com) |
| `CORS_ORIGINS` | نعم | نفس FRONTEND_URL أو قائمة مفصولة بفاصلة |
| `UPLOAD_DIR` | نعم | مسار مجلد uploads على السيرفر |
| `STRIPE_API_KEY` | للدفع | مفتاح Stripe السري |
| `STRIPE_PUBLISHABLE_KEY` | للدفع | مفتاح Stripe العام |
| `PAYTABS_*` | للدفع SAR | إعدادات PayTabs |
| `RESEND_API_KEY` | للبريد | إرسال البريد عبر Resend |
| `FROM_EMAIL` | للبريد | البريد المرسل |
| `TWILIO_*` | اختياري | لإرسال SMS |

### Frontend (قبل `yarn build`)

| المتغير | الوصف |
|--------|--------|
| `REACT_APP_BACKEND_URL` | عنوان الباكند (مثلاً https://api.yourdomain.com) بدون `/` في النهاية |

---

## 7. ملخص خطوات النشر على Hostinger VPS

1. إنشاء VPS في Hostinger والاتصال عبر SSH.
2. تثبيت: Python 3.10+, Node.js 18+, Nginx.
3. إعداد MongoDB Atlas ونسخ `MONGO_URL` و `DB_NAME` إلى `.env`.
4. رفع مشروعك (Git أو SFTP) إلى `/var/www/meptj`.
5. في `backend`: إنشاء venv، تثبيت الاعتماديات، إنشاء `.env` من `.env.example`، تشغيل الباكند بـ Gunicorn/Uvicorn.
6. في `frontend`: تعيين `REACT_APP_BACKEND_URL` ثم `yarn build` ورفع محتويات `build` إلى السيرفر.
7. إعداد Nginx للفرونتند والـ API وتفعيل SSL.
8. التأكد أن `FRONTEND_URL` و `CORS_ORIGINS` و `REACT_APP_BACKEND_URL` تستخدم نفس الدومين وبروتوكول HTTPS.

---

## 8. ملاحظات أمان

- لا ترفع ملف `.env` إلى Git (يجب أن يكون في `.gitignore`).
- استخدم `JWT_SECRET` عشوائي وقوي.
- في الإنتاج ضع `EMAIL_DEMO_MODE=false` و `SMS_DEMO_MODE=false` إذا كنت تستخدم البريد/SMS الحقيقي.
- راجع إعدادات CORS بحيث لا تكون `*` في الإنتاج.

بعد تطبيق هذه الخطوات يكون التطبيق جاهزاً للنشر على Hostinger (VPS) مع MongoDB Atlas.
