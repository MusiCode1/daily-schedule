param(
	# כשלא מספקים InputPath, ננסה לקרוא מה-Clipboard.
	[string]$InputPath = "",
	# אפשר לתת שם קובץ מפורש. אם לא ניתן, נבנה אחד אוטומטית לפי version + timestamp.
	[string]$OutPath = ""
)

$ErrorActionPreference = "Stop"

function Get-Timestamp {
	return (Get-Date -Format "yyyy-MM-dd_HH-mm-ss")
}

function Read-RawJson {
	param([string]$path)

	if ($path -and (Test-Path $path)) {
		return Get-Content -LiteralPath $path -Raw
	}

	# Clipboard
	if (Get-Command Get-Clipboard -ErrorAction SilentlyContinue) {
		$clip = Get-Clipboard -Raw
		if ($clip) { return $clip }
	}

	throw "No input. Provide -InputPath or copy JSON to clipboard and rerun."
}

$raw = Read-RawJson -path $InputPath
$rawTrimmed = $raw.Trim()

# ולידציה מינימלית: חייב להיות JSON
try {
	$obj = $rawTrimmed | ConvertFrom-Json -Depth 200
} catch {
	throw "Invalid JSON (failed ConvertFrom-Json)."
}

$version = $null
if ($obj.PSObject.Properties.Name -contains "version") {
	$version = $obj.version
}

if (-not $OutPath) {
	$verPart = if ($version) { "v$version" } else { "v_unknown" }
	$ts = Get-Timestamp
	$OutPath = "docs/private-docs/live-snapshots/daily-schedule-data.$verPart.$ts.json"
}

$dir = Split-Path -Parent $OutPath
if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

# שומרים את הטקסט כמו שהוא (לא עושים re-serialize כדי לא לשנות ordering/format).
Set-Content -LiteralPath $OutPath -Value $rawTrimmed -Encoding UTF8

Write-Host "Saved snapshot to: $OutPath"

