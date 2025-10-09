@echo off
chcp 65001 >nul
echo.
echo ════════════════════════════════════════════════════════════════
echo    🎨 ДЕПЛОЙ GLASSMORPHISM ДИЗАЙНА
echo ════════════════════════════════════════════════════════════════
echo.

echo [1/4] 📦 Добавление обновленных файлов в Git...
git add style.css
git add index.html
git add script.js
git add *.js
git add *.html
git add *.css
git add *.json
git add *.md
git add *.txt
git add *.bat
git add *.ico
git add *.png
echo    ✅ Файлы добавлены
echo.

echo [2/4] 💾 Создание коммита...
git commit -m "feat: Glassmorphism дизайн - современный UI с полупрозрачными элементами

✨ Основные изменения:
- Обновлен фон с многослойными градиентами
- Добавлены glassmorphism эффекты (размытие, полупрозрачность)
- Переработаны карточки коктейлей с стеклянным эффектом
- Обновлены кнопки и модальные окна
- Добавлены анимированные фоновые эффекты
- Улучшена цветовая схема в соответствии с концептом"
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

echo [4/4] 🌐 Обновление GitHub Pages...
git checkout gh-pages
if %errorlevel% neq 0 (
    echo    ❌ Ошибка переключения на ветку gh-pages
    pause
    exit /b 1
)

git merge main --no-edit
if %errorlevel% neq 0 (
    echo    ❌ Ошибка слияния
    echo    Возможно, есть конфликты. Разрешите их вручную.
    pause
    exit /b 1
)

git push origin gh-pages
if %errorlevel% neq 0 (
    echo    ❌ Ошибка отправки на GitHub Pages
    pause
    exit /b 1
)

git checkout main
echo    ✅ GitHub Pages обновлен
echo.

echo ════════════════════════════════════════════════════════════════
echo    ✅ ДЕПЛОЙ GLASSMORPHISM ДИЗАЙНА ЗАВЕРШЕН!
echo ════════════════════════════════════════════════════════════════
echo.
echo    🎨 Новый дизайн включает:
echo    ✨ Полупрозрачные элементы с размытием фона
echo    🌈 Многослойные градиентные фоны
echo    💎 Стеклянные карточки коктейлей
echo    🔮 Анимированные световые эффекты
echo    🎯 Современные кнопки и интерфейс
echo.
echo    🌐 Ваш сайт обновится через 1-2 минуты:
echo    https://ve1LeRs.github.io/bar_firebase/
echo.
echo    💡 Рекомендации:
echo    1. Очистите кэш браузера (Ctrl+F5)
echo    2. Проверьте работу на разных устройствах
echo    3. Убедитесь, что все функции работают корректно
echo.
echo    🚀 Glassmorphism дизайн готов к использованию!
echo.
pause
