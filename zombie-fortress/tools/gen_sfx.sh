#!/bin/bash
# usage: gen_sfx.sh name dur prompt
name="$1"; dur="$2"; prompt="$3"
[ -s "sfx/$name.mp3" ] && exit 0
body=$(node -e 'console.log(JSON.stringify({text:process.argv[1],duration_seconds:parseFloat(process.argv[2]),prompt_influence:0.45}))' "$prompt" "$dur")
code=$(curl -sS -m 180 -X POST "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128" -H "Content-Type: application/json" -d "$body" -o "sfx/$name.tmp" -w "%{http_code}")
if [ "$code" = "200" ]; then mv "sfx/$name.tmp" "sfx/$name.mp3"; echo "ok $name"; else echo "FAIL $name $code $(head -c 300 sfx/$name.tmp)"; rm -f "sfx/$name.tmp"; fi
