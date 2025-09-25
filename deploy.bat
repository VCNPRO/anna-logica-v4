@echo off
echo ===========================================
echo  ANNA LOGICA ENTERPRISE AWS DEPLOYMENT
echo ===========================================

echo.
echo [1/4] Building FFmpeg Layer...
cd layers\ffmpeg
call build-layer.bat
if %errorlevel% neq 0 (
    echo ERROR: Failed to build FFmpeg layer
    pause
    exit /b 1
)
cd ..\..

echo.
echo [2/4] Installing Lambda dependencies...
cd lambda\transcribe
call npm install
cd ..\upload
call npm install
cd ..\..

echo.
echo [3/4] Bootstrapping AWS CDK (if needed)...
cdk bootstrap
if %errorlevel% neq 0 (
    echo WARNING: CDK bootstrap failed, continuing anyway...
)

echo.
echo [4/4] Deploying AWS Stack...
cdk deploy --require-approval never

if %errorlevel% eq 0 (
    echo.
    echo ========================================
    echo  DEPLOYMENT SUCCESSFUL!
    echo ========================================
    echo.
    echo Your enterprise-grade Anna Logica API is now running on AWS!
    echo Check the CloudFormation outputs for your API Gateway URL.
    echo.
) else (
    echo.
    echo ERROR: Deployment failed!
    echo Check the error messages above.
)

pause