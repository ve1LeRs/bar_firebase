@echo off
chcp 65001 >nul
echo.
echo ════════════════════════════════════════════════════════════════
echo    🚀 ДЕПЛОЙ КОЛЕСА УДАЧИ
echo ════════════════════════════════════════════════════════════════
echo.

echo [1/4] 📦 Добавление файлов в Git...
git add wheel-of-fortune.js
git add index.html
git add style.css
git add FIREBASE_RULES_UPDATED.txt
git add WHEEL_OF_FORTUNE_GUIDE.md
git add WHEEL_SUMMARY.md
git add CHANGELOG_WHEEL.md
git add DEPLOY_WHEEL.md
git add "КОЛЕСО_УДАЧИ_БЫСТРЫЙ_СТАРТ.md"
git add "ДЕПЛОЙ_СЕЙЧАС.txt"
echo    ✅ Файлы добавлены
echo.

echo [2/4] 💾 Создание коммита...
git commit -m "feat: Добавлено колесо удачи - игровая механика с призами"
echo    ✅ Коммит создан
echo.

echo [3/4] 📤 Отправка на сервер...
git push origin main
if %errorlevel% neq 0 (
    echo    ❌ Ошибка при отправке на сервер
    echo.
    echo    Возможные причины:
    echo    - Нет подключения к интернету
    echo    - Нет прав доступа к репозиторию
    echo    - Нужно настроить Git credentials
    echo.
    pause
    exit /b 1
)
echo    ✅ Изменения отправлены на сервер
echo.

echo [4/4] ⚠️  ВАЖНО: ОБНОВИТЕ FIREBASE RULES!
echo.
echo    БЕЗ ЭТОГО КОЛЕСО НЕ БУДЕТ РАБОТАТЬ!
echo.
echo    1. Откройте: https://console.firebase.google.com
echo    2. Выберите проект: bar-menu-6145c
echo    3. Перейдите: Firestore Database → Rules
echo    4. Откройте файл: FIREBASE_RULES_UPDATED.txt
echo    5. Скопируйте ВСЁ и вставьте в Firebase
echo    6. Нажмите: Publish
echo.
echo ════════════════════════════════════════════════════════════════
echo    ✅ ДЕПЛОЙ ЗАВЕРШЕН!
echo ════════════════════════════════════════════════════════════════
echo.
echo    📋 Что делать дальше:
echo    1. Обновите Firebase Rules (см. выше)
echo    2. Очистите кэш браузера (Ctrl+F5)
echo    3. Проверьте работу колеса
echo.
echo    📚 Документация:
echo    - ДЕПЛОЙ_СЕЙЧАС.txt (быстрый гайд)
echo    - DEPLOY_WHEEL.md (полная инструкция)
echo.
pause

