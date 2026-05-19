$tests = @(
    @{d="01 Act vazio sem exp"; a=$null; e=$null; act="act"}
    @{d="02 Act OK exp vazio"; a="2025-06-15"; e=$null; act="act"}
    @{d="03 Ambos 365d gap"; a="2025-01-01"; e="2026-01-01"; act="act"}
    @{d="04 Gap 6 meses"; a="2025-03-01"; e="2025-09-01"; act="act"}
    @{d="05 Gap 2 anos"; a="2025-01-01"; e="2027-01-01"; act="act"}
    @{d="06 Act futuro"; a="2026-12-01"; e="2027-12-01"; act="act"}
    @{d="07 Exp recua act"; a="2025-01-01"; e="2026-01-01"; act="exp"}
    @{d="08 Exp avanca act"; a="2025-01-01"; e="2026-01-01"; act="exp"}
    @{d="09 Gap 90d muda exp"; a="2025-06-01"; e="2025-08-30"; act="exp"}
    @{d="10 Gap 365d muda exp"; a="2025-01-01"; e="2026-01-01"; act="exp"}
)

$passed=0; $failed=0
Write-Host "=== TESTE SINCRONIA DATAS SGW PRO (10x) ===" -ForegroundColor Cyan
foreach ($t in $tests) {
    $actOld = $t.a; $expOld = $t.e; $actNew = $actOld; $expNew = $expOld
    if ($t.act -eq "act") {
        $nv = "2025-06-15"; $ov = $actOld; $actNew = $nv
        if ((-not $expOld) -or (-not $ov)) {
            $d = [DateTime]::ParseExact($nv, "yyyy-MM-dd", $null)
            $expNew = $d.AddYears(1).ToString("yyyy-MM-dd")
        } else {
            $eg = [DateTime]::ParseExact($expOld,"yyyy-MM-dd",$null)
            $ag = [DateTime]::ParseExact($ov,"yyyy-MM-dd",$null)
            $gap = $eg - $ag
            $na = [DateTime]::ParseExact($nv,"yyyy-MM-dd",$null)
            $expNew = $na.AddDays($gap.TotalDays).ToString("yyyy-MM-dd")
        }
    } else {
        $nv = "2026-06-15"; $ov = $expOld; $expNew = $nv
        if ($actOld -and $ov) {
            $ee = [DateTime]::ParseExact($ov,"yyyy-MM-dd",$null)
            $aa = [DateTime]::ParseExact($actOld,"yyyy-MM-dd",$null)
            $gap = $ee - $aa
            $ne = [DateTime]::ParseExact($nv,"yyyy-MM-dd",$null)
            $actNew = $ne.AddDays(-$gap.TotalDays).ToString("yyyy-MM-dd")
        }
    }
    $oldGap = if ($actOld -and $expOld) { [int]([DateTime]::ParseExact($expOld,"yyyy-MM-dd",$null) - [DateTime]::ParseExact($actOld,"yyyy-MM-dd",$null)).TotalDays } else { -1 }
    $newGap = if ($actNew -and $expNew) { [int]([DateTime]::ParseExact($expNew,"yyyy-MM-dd",$null) - [DateTime]::ParseExact($actNew,"yyyy-MM-dd",$null)).TotalDays } else { -1 }
    $gapOk = ($oldGap -eq -1) -or ($newGap -eq -1) -or ([Math]::Abs($oldGap - $newGap) -lt 1)
    $s = if ($gapOk) { "PASSOU" } else { "FALHOU" }
    if ($gapOk) { $passed++ } else { $failed++ }
    Write-Host "$($t.d) | act '$($actOld)'->'$($actNew)' | exp '$($expOld)'->'$($expNew)' | gap $($oldGap)->$($newGap)d | $s"
}
Write-Host "`nRESULTADO: $passed / $($passed+$failed)" -ForegroundColor $(if($failed -eq 0){"Green"}else{"Red"})
