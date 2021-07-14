import os
import sys
from utils import *
from api import *
from db import *
import ffmpeg
import re
import json
from mutagen.easyid3 import EasyID3
from mutagen.id3 import ID3, APIC
from sanitize_filename import sanitize

LOUDNORM_REGEX = re.compile(r'({.+?})\s*$', re.M | re.S)


def process_media(media):
    bvid = media['bvid']
    video_info = get_video_info(bvid)

    authors = []
    if 'staff' in video_info:
        authors = list(map(lambda s: s['name'], video_info['staff']))
    else:
        authors = [video_info['owner']['name']]

    cover_url = video_info['pic']

    audio_urls = get_play_url(bvid, video_info['pages'][0]['cid'])[
        'dash']['audio']
    audio_url_best = sorted(audio_urls, key=lambda x: x['bandwidth'], reverse=True)[
        0]['baseUrl']

    src_file = f"data/{bvid}.m4s"
    download_file(audio_url_best, src_file)
    cover_file = f"data/{bvid}.jpg"
    cover_out_file = f"data/{bvid}_crop.jpg"
    download_file(cover_url, cover_file)
    sanitized_title = sanitize(sanitize(media['title']))
    out_file = f"data/{sanitized_title}.mp3"
    print(out_file)

    loudnorm_args = {
        'i': -16, 'lra': 9, 'tp': -1
    }

    pass1_output = ffmpeg.input(src_file)\
        .filter('loudnorm', print_format='json', **loudnorm_args)\
        .output("", f="null")\
        .run(capture_stderr=True)[1].decode('utf-8')
    matches = LOUDNORM_REGEX.search(pass1_output)
    if (matches is None):
        raise RuntimeError("No output found in stderr")
    pass1_result = json.loads(matches.group(1))

    ffmpeg.input(src_file).audio\
        .filter(
            'loudnorm',
            measured_i=pass1_result['input_i'],
            measured_lra=pass1_result['input_lra'],
            measured_tp=pass1_result['input_tp'],
            measured_thresh=pass1_result['input_thresh'],
            **loudnorm_args,
    )\
        .output(out_file, ab='320k', ar=48000)\
        .run(overwrite_output=True)

    ffmpeg.input(cover_file).video\
        .filter('scale', 'if(gt(iw,ih),-1,300)', 'if(gt(iw,ih),300,-1)')\
        .filter('crop', 300, 300, exact=1)\
        .output(cover_out_file)\
        .run(overwrite_output=True, quiet=True)

    tags = EasyID3(out_file)
    tags["title"] = media['title']
    tags["album"] = media['title']
    tags["artist"] = authors
    tags.save()

    tags = ID3(out_file)
    tags.delall("APIC")
    with open(cover_out_file, 'rb') as art:
        tags.add(APIC(
            encoding=3,
            mime='image/jpeg',
            type=3, desc=u'Cover',
            data=art.read()
        ))
    tags.save()

    os.unlink(src_file)
    os.unlink(cover_file)
    os.unlink(cover_out_file)


if __name__ == '__main__':
    LIST_ID = os.environ.get('BILI_LIST_ID')

    if LIST_ID is None:
        print("请用 BILI_LIST_ID 环境变量提供收藏夹ID", file=sys.stderr)
        sys.exit(1)

    for media in get_playlist(LIST_ID)['medias']:
        if query_record(media['bvid']):
            continue
        process_media(media)
        add_record(media['bvid'])
