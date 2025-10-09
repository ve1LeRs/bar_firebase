@echo off
chcp 65001 >nul
echo.
echo ════════════════════════════════════════════════════════════════
echo    🧹 ДЕПЛОЙ ОЧИЩЕННОГО ДИЗАЙНА
echo ════════════════════════════════════════════════════════════════
echo.

echo [1/4] 📦 Добавление очищенных файлов в Git...
git add index.html
git add style.css
git add deploy-clean-design.bat
echo    ✅ Файлы добавлены
echo.

echo [2/4] 💾 Создание коммита...
git commit -m "fix: Удалены добавленные баннеры и надписи - возврат к чистому дизайну

🧹 Изменения:
- Удалена секция возрастной проверки 16+
- Удалена главная секция с логотипом NO AL
- Удалена секция 'Напитки дня'
- Удалена секция топ-напитка
- Удалена секция для автолюбителей
- Возвращен оригинальный подзаголовок
- Удалены все CSS стили для новых секций
- Сохранен glassmorphism дизайн без лишних элементов"
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
echo    ✅ ДЕПЛОЙ ОЧИЩЕННОГО ДИЗАЙНА ЗАВЕРШЕН!
echo ════════════════════════════════════════════════════════════════
echo.
echo    🧹 Что было удалено:
echo    ❌ Секция возрастной проверки 16+
echo    ❌ Главная секция с логотипом NO AL
echo    ❌ Секция 'Напитки дня'
echo    ❌ Секция топ-напитка
echo    ❌ Секция для автолюбителей
echo    ❌ Все связанные CSS стили
echo.
echo    ✅ Что осталось:
echo    ✨ Glassmorphism дизайн
echo    🎨 Полупрозрачные элементы
echo    💎 Стеклянные карточки коктейлей
echo    🌈 Красивые градиенты и эффекты
echo    📱 Адаптивность
echo.
echo    🌐 Ваш очищенный сайт обновится через 1-2 минуты:
echo    https://ve1LeRs.github.io/bar_firebase/
echo.
echo    💡 Рекомендации:
echo    1. Очистите кэш браузера (Ctrl+F5)
echo    2. Проверьте, что все баннеры удалены
echo    3. Убедитесь, что glassmorphism дизайн сохранен
echo.
echo    🚀 Дизайн очищен и готов к использованию!
echo.
pause
