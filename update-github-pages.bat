@echo off
chcp 65001 >nul
echo.
echo ════════════════════════════════════════════════════════════════
echo    🌐 ОБНОВЛЕНИЕ GITHUB PAGES
echo ════════════════════════════════════════════════════════════════
echo.

echo [1/4] 📦 Переключение на ветку gh-pages...
git checkout gh-pages
if %errorlevel% neq 0 (
    echo    ❌ Ошибка переключения на ветку gh-pages
    pause
    exit /b 1
)
echo    ✅ Переключились на gh-pages
echo.

echo [2/4] 🔄 Слияние изменений из main...
git merge main --no-edit
if %errorlevel% neq 0 (
    echo    ❌ Ошибка слияния
    echo    Возможно, есть конфликты. Разрешите их вручную.
    pause
    exit /b 1
)
echo    ✅ Изменения объединены
echo.

echo [3/4] 📤 Отправка на GitHub...
git push origin gh-pages
if %errorlevel% neq 0 (
    echo    ❌ Ошибка отправки
    pause
    exit /b 1
)
echo    ✅ Изменения отправлены
echo.

echo [4/4] 🔙 Возврат на ветку main...
git checkout main
echo    ✅ Вернулись на main
echo.

echo ════════════════════════════════════════════════════════════════
echo    ✅ ОБНОВЛЕНИЕ ЗАВЕРШЕНО!
echo ════════════════════════════════════════════════════════════════
echo.
echo    🌐 Ваш сайт обновится через 1-2 минуты:
echo    https://ve1LeRs.github.io/bar_firebase/
echo.
echo    💡 Если колесо не работает, не забудьте:
echo    1. Обновить Firebase Rules (см. FIREBASE_RULES_UPDATED.txt)
echo    2. Очистить кэш браузера (Ctrl+F5)
echo.
pause

