import json, subprocess, numpy as np
TEMPO=0.9
# (id, orig_start, orig_end, target_start)
SEG=[("A",0.10,2.45,1.6),("B",2.45,6.10,4.7),("C",6.10,8.98,9.3),("D",8.98,11.75,12.7),
("E",11.75,13.27,16.0),("F",13.27,14.74,17.75),
("G",14.74,17.34,19.75),("H",17.34,19.22,23.3),("I",19.22,20.58,26.9),
("J",20.58,22.50,30.0),("K",22.50,24.68,32.8),("L",24.68,26.28,36.1),("M",26.28,28.26,38.9),("N",28.26,30.0,43.4)]
d=json.load(open('stt3.json'))
words=[w for w in d['words'] if w['type']=='word']
out=[]
for sid,a,b,ts in SEG:
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(a),'-to',str(b),'-i','voice_eleven_v3.mp3','-af',f'atempo={TEMPO},afade=t=in:d=0.03,afade=t=out:st={(b-a)/TEMPO-0.06}:d=0.06','-ar','44100','-ac','2',f'seg_{sid}.wav'],check=True)
    ws=[{"w":w['text'],"t0":round(ts+(w['start']-a)/TEMPO,3),"t1":round(ts+(w['end']-a)/TEMPO,3)} for w in words if w['start']>=a-0.01 and w['start']<b]
    out.append({"id":sid,"t0":ts,"t1":round(ts+(b-a)/TEMPO,3),"words":ws})
# assemble
inputs=[];flt=[]
for i,(sid,a,b,ts) in enumerate(SEG):
    inputs+=['-i',f'seg_{sid}.wav']; ms=int(ts*1000); flt.append(f'[{i}]adelay={ms}|{ms}[s{i}]')
flt.append(''.join(f'[s{i}]' for i in range(len(SEG)))+f'amix=inputs={len(SEG)}:normalize=0,apad=whole_dur=60[v]')
subprocess.run(['ffmpeg','-v','error','-y',*inputs,'-filter_complex',';'.join(flt),'-map','[v]','-t','60','voice_track.wav'],check=True)
json.dump(out,open('timeline.json','w'),ensure_ascii=False,indent=0)
for s in out: print(s['id'],s['t0'],s['t1'],' '.join(w['w'] for w in s['words']))
