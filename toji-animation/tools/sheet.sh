#!/bin/bash
# Контактный лист стоп-кадров: tools/sheet.sh out.png t1 t2 ... (до 12 кадров, вертикальные)
out=$1; shift
dir=$(mktemp -d)
node "$(dirname "$0")/stills.cjs" "$dir" "$@" | grep -v "ms$"
files=$(ls "$dir"/f_*.png | sort -t_ -k2 -g)
n=$(echo "$files" | wc -l)
inputs=""; fc=""; st=""; lay=""
i=0
for f in $files; do inputs="$inputs -i $f"; fc="$fc[$i]scale=270:480[s$i];"; st="$st[s$i]"; x=$(( (i % 6) * 270 )); y=$(( (i / 6) * 480 )); lay="$lay${lay:+|}${x}_${y}"; i=$((i+1)); done
ffmpeg -y -loglevel error $inputs -filter_complex "${fc}${st}xstack=inputs=$n:layout=$lay:fill=black" "$out"
echo "$dir"
