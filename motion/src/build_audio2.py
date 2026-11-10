import json, subprocess
M='voice_eleven_v3.mp3'; O='voice_outro.mp3'
SEG=[("A",M,0.10,2.45,1.0),("B",M,2.45,6.10,3.8),("C",M,6.10,8.98,7.9),("D",M,8.98,11.75,11.0),
("E",M,11.75,13.27,14.4),("F",M,13.27,14.74,16.9),
("G",M,14.74,17.34,19.7),("H",M,17.34,19.22,22.6),("I",M,19.22,20.58,25.2),
("J",M,20.58,22.50,27.4),("K",M,22.50,24.68,29.6),("L",M,24.68,26.28,32.3),("M",M,26.28,28.26,34.6),("N",M,28.26,30.0,37.0),
("O1",O,0.02,1.50,39.7),("O2",O,1.50,4.20,41.4),("O3",O,4.20,7.38,44.3),("O4",O,7.38,9.98,47.7),("O5",O,9.98,12.08,50.4),("O6",O,12.08,15.3,52.8)]
stt={M:json.load(open('stt3.json')),O:json.load(open('stt_outro.json'))}
out=[]
for sid,src,a,b,ts in SEG:
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(a),'-to',str(b),'-i',src,'-af',f'afade=t=in:d=0.02,afade=t=out:st={b-a-0.06}:d=0.06','-ar','44100','-ac','2',f'seg_{sid}.wav'],check=True)
    ws=[{"w":w['text'],"t0":round(ts+(w['start']-a),3),"t1":round(ts+(w['end']-a),3)} for w in stt[src]['words'] if w['type']=='word' and w['start']>=a-0.01 and w['start']<b]
    out.append({"id":sid,"t0":ts,"t1":round(ts+(b-a),3),"words":ws})
inputs=[];flt=[]
for i,s in enumerate(SEG):
    inputs+=['-i',f'seg_{s[0]}.wav']; ms=int(s[4]*1000); flt.append(f'[{i}]adelay={ms}|{ms}[s{i}]')
flt.append(''.join(f'[s{i}]' for i in range(len(SEG)))+f'amix=inputs={len(SEG)}:normalize=0,apad=whole_dur=60[v]')
subprocess.run(['ffmpeg','-v','error','-y',*inputs,'-filter_complex',';'.join(flt),'-map','[v]','-t','60','voice_track.wav'],check=True)
json.dump(out,open('timeline.json','w'),ensure_ascii=False)
for s in out: print(s['id'],s['t0'],s['t1'],' '.join(f"{w['w']}" for w in s['words']))
