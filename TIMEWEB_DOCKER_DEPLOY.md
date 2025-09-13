# Деплой на Timeweb через Docker

## Подготовка

1. Убедитесь что у вас есть аккаунт на Timeweb
2. Установлен Docker на локальной машине

## Шаги деплоя

### 1. Подготовка проекта

```bash
# Соберите Docker образ локально для тестирования
docker build -t telegram-map-app .

# Запустите локально для проверки
docker run -p 8081:8081 telegram-map-app
```

### 2. Деплой на Timeweb

#### Вариант A: Через Docker Compose (рекомендуется)

1. Загрузите файлы на сервер Timeweb:
   - `docker-compose.yml`
   - `Dockerfile` 
   - Весь код проекта

2. На сервере выполните:
```bash
docker-compose up -d --build
```

#### Вариант B: Через Docker Registry

1. Создайте образ и загрузите в Docker Hub:
```bash
docker build -t your-username/telegram-map-app .
docker push your-username/telegram-map-app
```

2. На сервере Timeweb:
```bash
docker pull your-username/telegram-map-app
docker run -d -p 8081:8081 --name telegram-map-app your-username/telegram-map-app
```

### 3. Настройка Telegram Bot

1. Получите URL вашего приложения на Timeweb
2. В BotFather установите Web App URL:
```
/setmenubutton
@your_bot_name
Карта - https://your-domain.timeweb.ru
```

### 4. Проверка

- Откройте ваш бот в Telegram
- Нажмите на кнопку меню
- Должно открыться ваше приложение с картой

## Полезные команды

```bash
# Просмотр логов
docker logs telegram-map-app

# Перезапуск
docker-compose restart

# Остановка
docker-compose down

# Обновление
docker-compose down
docker-compose up -d --build
```

## Переменные окружения

Если нужны переменные окружения, добавьте их в `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - TELEGRAM_BOT_TOKEN=your_token
  - DATABASE_URL=your_db_url
```