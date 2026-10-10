"""計算影片指紋（音量波形＋安靜段），寫進 media/fingerprints.json
用法（在網站倉庫根目錄）：python3 tools/fingerprint.py <id> [<id> ...]   # 讀 media/<id>.mp4
需要 ffmpeg、numpy。章節（chapters）不在這裡算，寫在 index.html 的 WORKS 裡。"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / 'media' / 'fingerprints.json'
data = json.loads(DB.read_text()) if DB.exists() else {}
for k in sys.argv[1:]:
    f = ROOT / 'media' / f'{k}.mp4'
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)]))
    a = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(f), '-ac', '1', '-ar', '8000', '-f', 'f32le', '-']), np.float32)
    rms = np.array([np.sqrt((s ** 2).mean() + 1e-12) for s in np.array_split(a, 320)])
    level = np.clip((20 * np.log10(rms) + 50) / 40, 0, 1)
    log = subprocess.run(['ffmpeg', '-i', str(f), '-af', 'silencedetect=n=-38dB:d=0.4', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]; en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]
    data[k] = dict(dur=round(dur, 2), level=[round(float(v), 3) for v in level], cuts=[], silences=[[round(s, 2), round(e, 2)] for s, e in zip(st, en)])
    print(k, round(dur, 2), 's, silences', data[k]['silences'])
DB.write_text(json.dumps(data))
