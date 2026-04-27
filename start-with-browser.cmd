@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在启动静态服务器...
start "" cmd /c "node tools\static-server.js"

echo 等待服务器启动...
timeout /t 2 /nobreak >nul

echo 正在打开浏览器...
start chrome http://127.0.0.1:5500

echo.
echo 服务器已启动！
echo 访问地址：http://127.0.0.1:5500
echo.
echo 按任意键关闭此窗口（服务器将继续运行）
pause >nul
