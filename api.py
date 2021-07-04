from utils import *

def get_playlist(list_id):
    url = f"https://api.bilibili.com/x/v3/fav/resource/list?media_id={list_id}&pn=1&ps=20&keyword=&order=mtime&type=0&tid=0&platform=web&jsonp=jsonp"
    return session.get(url).json()['data']

def get_video_info(bvid):
    url = f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}"
    return session.get(url).json()['data']

def get_play_url(bvid, cid):
    url = f"https://api.bilibili.com/x/player/playurl?cid={cid}&bvid={bvid}&qn=0&type=&otype=json&fourk=1&fnver=0&fnval=80"
    return session.get(url).json()['data']