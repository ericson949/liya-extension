Add-Type -AssemblyName System.Drawing
$srcPath = 'C:\Users\erics\.gemini\antigravity-ide\brain\7db96264-835a-4567-9039-9d0204a68e6f\synapse_icon_1789919028564.jpg'
$destDir = 'C:\Users\erics\.gemini\antigravity-ide\scratch\liya-extension\public\icons'

if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

$img = [System.Drawing.Image]::FromFile($srcPath)
$sizes = @(16, 32, 48, 128)

# 1. Generate vibrant active icons
foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $s, $s)
    $outPath = Join-Path $destDir "icon-$s.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated Active: $outPath"
}

# 2. Generate grayscale disabled icons using ColorMatrix
$matrix = @(
    @(0.25, 0.25, 0.25, 0.0, 0.0),
    @(0.25, 0.25, 0.25, 0.0, 0.0),
    @(0.25, 0.25, 0.25, 0.0, 0.0),
    @(0.0,  0.0,  0.0,  0.5, 0.0),
    @(0.0,  0.0,  0.0,  0.0, 1.0)
)
$cm = New-Object System.Drawing.Imaging.ColorMatrix ( ,$matrix )
$ia = New-Object System.Drawing.Imaging.ImageAttributes
$ia.SetColorMatrix($cm)

foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $rect = New-Object System.Drawing.Rectangle 0, 0, $s, $s
    $g.DrawImage($img, $rect, 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel, $ia)
    
    $outPath = Join-Path $destDir "icon-$s-disabled.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated Disabled: $outPath"
}

$ia.Dispose()
$img.Dispose()
Write-Host "All icons generated successfully."
