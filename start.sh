#!/bin/bash

echo "🚀 Запуск приложения Кингисепп ДПС локально..."

# Проверяем, установлен ли bun
if ! command -v bun &> /dev/null; then
    echo "❌ Bun не установлен. Устанавливаем..."
    curl -fsSL https://bun.sh/install | bash
    source ~/.bashrc
fi

# Проверяем, установлен ли expo
if ! command -v npx expo &> /dev/null; then
    echo "❌ Expo CLI не найден. Устанавливаем зависимости..."
    bun install
fi

echo "📦 Установка зависимостей..."
bun install

echo "🔧 Сборка веб-версии..."
npx expo export --platform web

if [ $? -eq 0 ]; then
    echo "✅ Сборка успешна!"
    echo "🌐 Запуск сервера на http://localhost:8081"
    echo ""
    echo "📱 Для тестирования:"
    echo "   • Откройте http://localhost:8081 в браузере"
    echo "   • Нажмите 'Войти в демо режиме'"
    echo "   • Или отсканируйте QR-код в Expo Go"
    echo ""
    
    # Запускаем сервер
    NODE_ENV=production bun run backend/hono.ts
else
    echo "❌ Ошибка сборки!"
    exit 1
fi