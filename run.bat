@echo off
echo 패키지 업데이트를 시작합니다...
call npm.cmd update

if %ERRORLEVEL% equ 0 (
    echo.
    echo 업데이트 완료! Vite 개발 서버를 실행합니다...
    call npm.cmd run dev
) else (
    echo.
    echo 업데이트 중 오류가 발생하여 실행을 중단합니다.
)

pause