param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$project  = "calculator-hub"
$teamSlug = "marlonengfronts-projects"
$targets  = @("production", "preview", "development")

$envVars = @(
    @{ key = "VOISTON_API_URL";                         value = "https://api.voiston.ai/";                                                                                  type = "plain" }
    @{ key = "JJ_GENERIC_USER_EMAIL";                   value = "jjvisionpro@voiston.com";                                                                                  type = "plain" }
    @{ key = "JJ_GENERIC_PATIENT_ID";                   value = "999";                                                                                                      type = "plain" }
    @{ key = "NEXT_PUBLIC_JJ_OWNER_EMAIL";              value = "jjvisionpro@voiston.com";                                                                                  type = "plain" }
    @{ key = "NEXT_PUBLIC_JJ_OWNER_ID";                 value = "1";                                                                                                        type = "plain" }
    @{ key = "NEXT_PUBLIC_JJ_DATA_PARTNER_ID";          value = "1786356";                                                                                                  type = "plain" }
    @{ key = "NEXT_PUBLIC_JJ_SECRET";                   value = "2M8ZMVbXGPtDIEsV8wlzDmVNwy9AlIpwAlULQCdB0JVvAnT8b4mpYqUGS8niN1ju";                                       type = "sensitive" }
    @{ key = "NEXT_PUBLIC_GA4_MEASUREMENT_ID";          value = "G-Y9V1M2W607";                                                                                            type = "plain" }
    @{ key = "NEXT_PUBLIC_EXTERNAL_CALC_GATEWAY_URL";   value = "https://jjvision-calculation-gateway-staging-372709372581.southamerica-east1.run.app";                     type = "plain" }
    @{ key = "NEXT_PUBLIC_ENABLE_EXTERNAL_TECNIS_CALC"; value = "true";                                                                                                     type = "plain" }
)

$headers = @{
    Authorization  = "Bearer $Token"
    "Content-Type" = "application/json"
}

foreach ($env in $envVars) {
    $body = @{
        key    = $env.key
        value  = $env.value
        type   = $env.type
        target = $targets
    } | ConvertTo-Json

    $url = "https://api.vercel.com/v10/projects/$project/env?teamId=$teamSlug"
    try {
        $res = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $body
        Write-Host "OK  $($env.key)" -ForegroundColor Green
    } catch {
        $msg = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($msg.error.code -eq "ENV_ALREADY_EXISTS") {
            Write-Host "SKP $($env.key) (already exists)" -ForegroundColor Yellow
        } else {
            Write-Host "ERR $($env.key): $_" -ForegroundColor Red
        }
    }
}

Write-Host "`nDone. Now trigger deploy:" -ForegroundColor Cyan
Write-Host "  cd C:\Users\MarlonAndrade\voiston-calculator-hub" -ForegroundColor Gray
Write-Host "  git commit --allow-empty -m 'chore: trigger vercel deploy' && git push origin main" -ForegroundColor Gray
