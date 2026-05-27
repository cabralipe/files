@echo off
title Portal BNCC Computacao - Atalaia/AL
color 0A
echo.
echo  ============================================
echo   Portal BNCC Computacao - Atalaia/AL
echo  ============================================
echo.

:: Verifica se Node.js esta instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERRO] Node.js nao encontrado!
    echo.
    echo  Instale o Node.js em: https://nodejs.org
    echo  Escolha a versao "LTS" e instale normalmente.
    echo  Depois feche esta janela e clique novamente.
    echo.
    pause
    start https://nodejs.org
    exit /b 1
)

echo  Node.js encontrado: 
node --version
echo.

:: Instala dependencias se necessario
if not exist "node_modules" (
    echo  Instalando dependencias pela primeira vez...
    echo  Aguarde, pode demorar 1-2 minutos...
    echo.
    call npm install
    echo.
)

echo  Iniciando servidor...
echo  O navegador abrira automaticamente em instantes!
echo.
echo  Para encerrar o servidor: feche esta janela ou pressione Ctrl+C
echo.

node server.js
pause
