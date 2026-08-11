# مشخصات پروژه: اپلیکیشن مدیریت نیروی کار (شبیه Connecteam)

## معرفی کلی
یک اپلیکیشن موبایل چندسکویی (Android + iOS) برای مدیریت نیروی کار، الهام‌گرفته از Connecteam (connecteam.com). این اپ به‌صورت B2B/Multi-tenant است — یعنی چند کسب‌وکار مختلف، هر کدام با کارمندان مستقل خودشان، از یک نمونه‌ی اپ استفاده می‌کنند و داده‌هایشان کاملاً از هم ایزوله است.

هدف: کپی کامل قابلیت‌های Connecteam، برای استفاده‌ی عمومی و چندصنعتی (نه یک صنعت خاص).

توسعه‌دهنده به‌تنهایی (بدون تیم) در حال ساخت این پروژه است.

---

## نقش‌های کاربری (Roles)
- **Owner/Admin**: دسترسی کامل به تنظیمات، گزارش‌ها، مدیریت کاربران
- **Manager**: مدیریت تیم خودش، تایید درخواست‌ها
- **Employee**: استفاده روزمره (کلاک این/اوت، دیدن شیفت، چت، فرم‌ها)

---

## کارایی‌های اصلی (Feature List)

### ۱. ماژول عملیات (Operations)
- **ساعت‌زن دیجیتال (Time Clock)**: کلاک این/اوت با یک لمس، تایید موقعیت GPS، کلاک‌اوت خودکار
- **زمان‌بندی شیفت (Scheduling)**: ساخت شیفت هفتگی/ماهانه، تخصیص به کارمند، تغییر لحظه‌ای، اطلاع‌رسانی خودکار
- **چک‌لیست و فرم دیجیتال**: فرم‌ساز سفارشی با فیلدهای متنوع (متن، عکس، امضا)
- **مدیریت تسک**: تخصیص وظیفه، دیدلاین، پیگیری وضعیت
- **گزارش‌گیری**: خروجی ساعات کاری آماده برای حقوق و دستمزد

### ۲. ماژول ارتباطات (Communication)
- **چت**: خصوصی و گروهی، ارسال فایل/عکس
- **اعلانات/آپدیت**: ارسال به کل سازمان یا گروه خاص، نمایش وضعیت "خوانده شد"
- **دایرکتوری کارمندان**: پروفایل، اطلاعات تماس، جستجو
- **پایگاه دانش**: مخزن اسناد و راهنما
- **Help Desk**: سیستم تیکتینگ داخلی

### ۳. ماژول منابع انسانی (HR)
- **استخدام و آنبوردینگ**: فرم درخواست، جمع‌آوری مدارک
- **آموزش**: ماژول‌های آموزشی، ردیابی پیشرفت
- **اسناد و امضا**: آپلود قرارداد/مدارک، امضای دیجیتال
- **مرخصی (Time Off)**: درخواست، تایید مدیر، موجودی مرخصی
- **تقدیر و پاداش**: ارسال تشکر/امتیاز بین کارمندان
- **چارت سازمانی**: نمایش سلسله‌مراتب تیم

---

## استک فنی (Tech Stack)

### فرانت‌اند (ریپوی جدا)
- React Native با **Expo** (نه bare CLI)
- TypeScript
- React Navigation
- State management: Zustand یا Redux Toolkit (هنوز نهایی نشده)

### بک‌اند (ریپوی جدا)
- **NestJS** (نه Express) + TypeScript
- **MongoDB** + Mongoose (نه PostgreSQL)
- Auth: JWT + Refresh Token
- Real-time chat: Socket.io / WebSocket
- Push notification: Firebase Cloud Messaging
- File upload (عکس/امضا/مدرک): سرویس ابری (مثلاً AWS S3 — نهایی نشده)

### تصمیم معماری
- فرانت‌اند و بک‌اند در **دو ریپوی گیت‌هاب جداگانه** (نه Monorepo)
- معماری بک‌اند ماژولار بر اساس تقسیم‌بندی سه‌گانه‌ی بالا (Operations / Communication / HR) به‌علاوه‌ی ماژول‌های Auth، Users، Organizations

---

## معماری پیشنهادی پوشه‌های بک‌اند (NestJS)

```
src/
├── auth/              → احراز هویت، JWT، نقش‌ها
├── users/             → کاربران، پروفایل
├── organizations/     → مدیریت شرکت/سازمان (multi-tenant)
├── operations/
│   ├── time-clock/
│   ├── scheduling/
│   ├── forms-checklists/
│   └── tasks/
├── communication/
│   ├── chat/
│   ├── announcements/
│   ├── directory/
│   └── help-desk/
├── hr/
│   ├── onboarding/
│   ├── documents/
│   ├── time-off/
│   └── recognition/
└── common/            → گاردها، دکوریتورها، utility مشترک
```

---

## مدل‌های اصلی دیتابیس (MongoDB Schemas)

> نکته‌ی کلیدی: تقریباً همه‌ی مدل‌ها (به‌جز چیزهای global) فیلد `organizationId` دارند تا ایزولاسیون داده بین سازمان‌ها (multi-tenancy) تضمین شود. هر Query باید با فیلتر `organizationId` انجام شود.

### Organization
```
{
  _id,
  name,              // نام کسب‌وکار
  industry,          // نوع صنعت (اختیاری)
  ownerId,           // ref به User که Owner هست
  createdAt
}
```

### User
```
{
  _id,
  organizationId,
  fullName,
  email,
  passwordHash,
  role,              // 'owner' | 'manager' | 'employee'
  phone,
  avatarUrl,
  status,            // 'active' | 'invited' | 'suspended'
  createdAt
}
```

### Shift
```
{
  _id, organizationId,
  employeeId,
  startTime, endTime,
  jobSite,
  status,            // 'scheduled' | 'completed' | 'missed'
  createdBy
}
```

### TimeClockEntry
```
{
  _id, organizationId, employeeId,
  clockInTime, clockOutTime,
  clockInLocation: { lat, lng },
  clockOutLocation: { lat, lng },
  shiftId
}
```

### Task
```
{
  _id, organizationId,
  title, description,
  assignedTo,        // ref به User (یا آرایه‌ای از Userها)
  dueDate,
  status,            // 'pending' | 'in_progress' | 'done'
  createdBy
}
```

### FormTemplate / FormSubmission
```
FormTemplate: {
  _id, organizationId,
  title,
  fields: [ { label, type, required } ]   // type: text/checkbox/photo/signature
}

FormSubmission: {
  _id, organizationId, formTemplateId,
  submittedBy,
  answers: [ { fieldLabel, value } ],
  submittedAt
}
```

### ChatConversation / ChatMessage
```
ChatConversation: {
  _id, organizationId,
  type,              // 'direct' | 'group'
  participants: [User refs]
}

ChatMessage: {
  _id, conversationId,
  senderId,
  text, attachmentUrl,
  readBy: [User refs],
  sentAt
}
```

### Announcement
```
{
  _id, organizationId,
  title, body,
  targetAudience,    // 'all' | 'specific group'
  createdBy,
  readBy: [User refs]
}
```

### TimeOffRequest
```
{
  _id, organizationId, employeeId,
  startDate, endDate,
  reason,
  status,            // 'pending' | 'approved' | 'rejected'
  reviewedBy
}
```

### Document (برای آنبوردینگ/اسناد)
```
{
  _id, organizationId, userId,
  title, fileUrl,
  requiresSignature, signedAt
}
```

### Recognition
```
{
  _id, organizationId,
  fromUserId, toUserId,
  message, badgeType,
  createdAt
}
```

---

## وضعیت فعلی پروژه / قدم بعدی
- کارایی‌ها، استک فنی، و مدل‌های دیتابیس تایید شده‌اند.
- قدم بعدی: راه‌اندازی اولیه‌ی پروژه‌ی بک‌اند با NestJS (Nest CLI، اتصال به MongoDB، ساخت اولین ماژول‌ها). ✅ انجام شد — ماژول‌های auth، users، organizations در این ریپو ساخته شدند.
- توسعه‌دهنده ترجیح می‌دهد مفاهیم به‌صورت گام‌به‌گام و با توضیح عمیق آموزش داده شوند، نه فقط دریافت کد آماده.
