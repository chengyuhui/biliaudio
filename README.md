# biliaudio
将指定收藏夹内的所有视频自动转换成音频，并进行以下操作：
* 响度平均化
* 写入元数据
* 写入内嵌封面

## Usage
将 `1237625640` 换为你的收藏夹 ID。
```
docker run --rm -v $(PWD)/data:/app/data -e BILI_LIST_ID=1237625640 chengyuhui/biliaudio:latest
```
