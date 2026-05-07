# TeamReach Challenge

Telegram Mini App для совместных челленджей в команде или семье. Создавайте общие цели, отмечайте прогресс, соревнуйтесь в рейтинге.

Поддерживается два сценария входа:
- **Telegram WebApp** — автоматическая авторизация через `initData` (HMAC-SHA256)
- **Email / пароль** — для использования в обычном браузере

## Tech stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Postgres + Edge Functions на Deno)
- **Auth:** Telegram WebApp `initData` → Supabase session, или Supabase email/password

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
| `VITE_TELEGRAM_BOT_USERNAME` | Username бота без `@`, для кнопки "Открыть в Telegram" |

Edge-функции получают секреты через `supabase secrets set`:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=<token>
supabase secrets set ADMIN_TELEGRAM_IDS=123456789,987654321
supabase secrets set ALLOWED_ORIGINS=https://your-domain.com
```

## База данных

Миграции лежат в `supabase/migrations/`. Применяются через Supabase CLI:

```bash
supabase db push
```

или вручную в Supabase Dashboard → SQL Editor.

## Edge Functions

```bash
supabase functions deploy telegram-auth
supabase functions deploy delete-account
```

## Telegram setup

1. Откройте [@BotFather](https://t.me/BotFather) → `/newbot` → получите `TELEGRAM_BOT_TOKEN`.
2. Создайте Mini App: `/newapp` → укажите публичный HTTPS URL приложения.
3. Ссылка для входа: `t.me/<bot_username>/<app_short_name>`.
4. Для тестирования локально используйте [ngrok](https://ngrok.com/): `ngrok http 8080`.

## Роли

| Роль | Возможности |
|---|---|
| `user` (участник) | Просматривать и вступать в челленджи, добавлять прогресс |
| `admin` | Всё из `user` + создавать и удалять челленджи |

### Назначение прав

**Telegram-пользователи:** добавьте Telegram ID в секрет `ADMIN_TELEGRAM_IDS` — роль назначится автоматически при следующем входе. ID можно узнать у [@userinfobot](https://t.me/userinfobot).

**Email-пользователи:** выполните в Supabase SQL Editor:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<UUID из auth.users>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

## Production сборка

```bash
npm run build   # TypeScript check + Vite build → dist/
```
