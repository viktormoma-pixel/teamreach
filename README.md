# TeamReach Challenge

Веб-приложение для совместных челленджей в команде или семье. Создавайте общие цели, отмечайте прогресс, соревнуйтесь в рейтинге. Работает как в обычном браузере, так и встроенным во внешние WebView (включая Telegram).

Авторизация: **email / пароль** через Supabase Auth, с подтверждением email и сбросом пароля. (Telegram WebApp `initData`-флоу был удалён — приложение теперь email-only.)

## Tech stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Postgres + Edge Functions на Deno)
- **Auth:** Supabase email/password

## Быстрый старт

```bash
git clone https://github.com/viktormoma-pixel/teamreach
cd teamreach
npm install
cp .env.example .env   # заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev            # http://localhost:8080
```

## Конфигурация окружения

Скопируйте `.env.example` в `.env` и заполните переменные:

| Переменная | Где взять |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Project Settings → API (anon key) |

Edge-функции получают секреты через `supabase secrets set`:

```bash
# ОБЯЗАТЕЛЬНО: список разрешённых origin'ов для CORS. Без этого
# delete-account вернёт 500.
supabase secrets set ALLOWED_ORIGINS=https://your-domain.com
```

## Supabase Auth настройки (важно перед запуском)

В Supabase Dashboard → Authentication:

1. **URL Configuration** — добавьте прод-домен в `Site URL` и `Redirect URLs`, иначе ссылки сброса пароля и подтверждения email будут битыми.
2. **Email Auth** — включите `Enable email confirmations`.
3. **CAPTCHA** — рекомендуется включить hCaptcha / Turnstile, чтобы предотвратить массовую регистрацию ботами.
4. **Rate limits** — оставить дефолтные или ужесточить под нагрузку.

## База данных

Миграции лежат в `supabase/migrations/`. Применяются через Supabase CLI:

```bash
supabase db push
```

или вручную в Supabase Dashboard → SQL Editor.

Что важно в миграциях:
- RLS включён на всех таблицах
- `profiles.email` скрыт column-level grants — другие пользователи его не видят
- `progress_entries` имеет триггеры дневных лимитов (50 записей и 10 000 единиц на пользователя на челлендж в сутки) — анти-абуз лидерборда
- `challenges.archived_at` — soft-delete: «удалённые» челленджи остаются в БД и могут быть восстановлены

## Edge Functions

```bash
supabase functions deploy delete-account
```

`delete-account` — POST-эндпоинт, валидирует JWT пользователя и через service-role удаляет аккаунт из `auth.users` (всё каскадно подчищается). Требует обязательно установленного `ALLOWED_ORIGINS`.

## Роли

| Роль | Возможности |
|---|---|
| `user` (участник) | Просматривать и вступать в челленджи, добавлять прогресс |
| `admin` | Всё из `user` + создавать и архивировать челленджи |

### Назначение admin-роли

Выполните в Supabase SQL Editor:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<UUID из auth.users>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

## Production сборка

```bash
npm run build   # TypeScript check + Vite build → dist/
```

## Deploy на Vercel

[vercel.json](vercel.json) уже содержит SPA-rewrite и security-заголовки (CSP, HSTS, Referrer-Policy, Permissions-Policy). CSP пропускает соединения только на `*.supabase.co` и разрешает встраивание в `web.telegram.org` / `t.me`. Если меняется backend — обновите `connect-src`.
