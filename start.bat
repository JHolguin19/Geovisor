@echo off
echo ============================================
echo   GeoVisor Municipal - Iniciando sistema
echo   Alcaldia de Santander de Quilichao
echo ============================================
echo.

REM Iniciar backend en una nueva ventana
echo [1/2] Iniciando Backend API...
start "Backend GeoVisor" cmd /k "cd backend && npm run dev"

REM Esperar 2 segundos
timeout /t 2 /nobreak >nul

REM Iniciar frontend en una nueva ventana
echo [2/2] Iniciando Frontend React...
start "Frontend GeoVisor" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================
echo   Sistema iniciado exitosamente!
echo.
echo   Backend: http://localhost:3001
echo   Frontend: http://localhost:5173
echo.
echo   Usuarios para testing:
echo   - admin / admin123
echo   - juanpablo / geovisor123
echo   - planeacion / planeacion123
echo ============================================
echo.
echo Presione Ctrl+C para detener los servidores...
pause
