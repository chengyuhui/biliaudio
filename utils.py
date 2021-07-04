import requests
import os
import shutil
from pathlib import Path

session = requests.Session()
session.headers['User-Agent'] = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36"
session.headers['Referer'] = "https://www.bilibili.com/"


def download_file(url, dest, check_exists=True):
    if check_exists and Path(dest).exists():
        return
        
    temp_name = dest + '.dl'
    with session.get(url, stream=True) as req:
        req.raise_for_status()
        with open(temp_name, 'wb') as f:
            for chunk in req.iter_content(chunk_size=8192):
                f.write(chunk)
    shutil.move(temp_name, dest)

