# PowerShell script to fix temp directory issues in all API routes

$apiRoutes = @(
    "src/app/api/summarize/route.ts",
    "src/app/api/identify-speakers/route.ts",
    "src/app/api/translate/route.ts",
    "src/app/api/upload/route.ts"
)

foreach ($route in $apiRoutes) {
    if (Test-Path $route) {
        $content = Get-Content $route -Raw

        # Replace imports
        $content = $content -replace "import path from 'path';\r?\nimport fs from 'fs/promises';", "import fs from 'fs/promises';\rimport { createTempFilePath, ensureTempDir, cleanupTempFile } from '@/lib/temp-utils';"

        # Replace temp directory creation
        $content = $content -replace "const uploadDir = path\.join\(process\.cwd\(\), 'tmp', '[^']+'\);\r?\n\s*await fs\.mkdir\(uploadDir, \{ recursive: true \}\);", "await ensureTempDir('$1');"

        # Replace temp file path creation
        $content = $content -replace "tempFilePath = path\.join\(uploadDir, `\$\{Date\.now\(\)\}_\$\{file\.name\}`\);", "tempFilePath = createTempFilePath(file.name, '$1');"

        # Replace cleanup
        $content = $content -replace "await fs\.unlink\(tempFilePath\);", "await cleanupTempFile(tempFilePath);"

        Set-Content $route $content -Encoding UTF8
        Write-Host "Fixed: $route"
    }
}

Write-Host "All API routes updated!"