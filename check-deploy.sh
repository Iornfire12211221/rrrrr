#!/bin/bash

echo "🚀 Проверка статуса развертывания..."
echo ""

# Проверяем статус GitHub Actions
echo "📋 GitHub Actions:"
echo "Перейдите на: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions"
echo ""

# Проверяем Vercel
echo "🌐 Vercel:"
echo "Ваше приложение должно быть доступно на:"
echo "https://rork-one.vercel.app"
echo ""

# Проверяем API
echo "🔧 API проверка:"
curl -s https://rork-one.vercel.app/api/trpc/example.hi | head -20
echo ""

echo "✅ Если видите JSON ответ выше - API работает!"
echo "❌ Если ошибка 404 - нужно исправить конфигурацию"
echo ""

echo "📱 Для Telegram Mini App:"
echo "1. Используйте URL: https://rork-one.vercel.app"
echo "2. Создайте Mini App через @BotFather"
echo "3. Команда: /newapp"
echo ""

echo "🎯 Готово!"