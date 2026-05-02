$base = 'c:\Users\ROG STRIX\Documents\alliance travel\site'
$trips = @('cairo-sharm','azerbaidjan','istanbul','kuala-lumpur','sharm-constantine')

foreach ($t in $trips) {
  $f = Join-Path $base (Join-Path $t 'index.html')
  if (-not (Test-Path $f)) { Write-Host "SKIP $f"; continue }
  $c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

  # 1. Swap font: Fraunces+Inter -> DM Sans
  $c = $c -replace 'Fraunces[^"]+display=swap', 'DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400&display=swap'

  # 2. Add skip link after <body> (only if not already present)
  if ($c -notmatch 'class="skip-link"') {
    $c = $c -replace '<body>', ('<body>' + [System.Environment]::NewLine + '<a href="#main" class="skip-link">Aller au contenu principal</a>')
  }

  # 3. Add id="main" to the hero section (only if not already present)
  if ($c -notmatch 'id="main"') {
    $c = $c -replace 'class="hero" aria-label', 'class="hero" id="main" aria-label'
  }

  # 4. Update old Egyptian-gold accent to Teal Deer brand green
  $c = $c -replace '--accent:\s*#C9872E', '--accent: #B2E89C'
  $c = $c -replace 'rgba\(201,135,46', 'rgba(178,232,156'
  $c = $c -replace 'rgba\(201, 135, 46', 'rgba(178,232,156'

  # Also update any other destination accents to brand green on top-level :root
  # (keep per-destination tinted accents but update any remaining old bronzes)
  $c = $c -replace '--accent:\s*#C8854A', '--accent: #B2E89C'
  $c = $c -replace 'rgba\(200,133,74', 'rgba(178,232,156'
  $c = $c -replace 'rgba\(200, 133, 74', 'rgba(178,232,156'

  [System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
  Write-Host "OK: $f"
}

Write-Host "All trip pages updated."
