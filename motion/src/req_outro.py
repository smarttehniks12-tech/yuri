import json,sys,urllib.request,base64
text=("[commanding, powerful] Так поднимись! "
"[intense] Ты падал... но ты не сломлен. "
"Боль уйдёт... а сила — останется. "
"Каждое падение делает тебя крепче. "
"[determined] Сегодня — твой новый старт. "
"[shouting, epic] Встань! Иди! И выбери силу!")
body=json.dumps({"text":text,"model_id":"eleven_v3","voice_settings":{"stability":0.5,"similarity_boost":0.8}}).encode()
r=urllib.request.Request("https://api.elevenlabs.io/v1/text-to-speech/pM78bgjPVk0JXtaEnFoj/with-timestamps?output_format=mp3_44100_128",data=body,headers={"Content-Type":"application/json","xi-api-key":"dummy"})
d=json.load(urllib.request.urlopen(r,timeout=300))
open("voice_outro.mp3","wb").write(base64.b64decode(d["audio_base64"]))
print("ok")
