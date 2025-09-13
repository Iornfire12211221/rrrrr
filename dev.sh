#!/bin/bash

echo "🚀 Запуск в режиме разработки..."

# Проверяем, установлен ли bun
if ! command -v bun &> /dev/null; then
    echo "❌ Bun не установлен. Используем npm..."
    npm install
    npx expo start
else
    echo "📦 Установка зависимостей..."
    bun install
    
    echo "🔧 Запуск Expo..."
    npx expo start
fi