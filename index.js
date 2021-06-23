const Datastore = require("nedb-promises");
const axios = require("./axios");
const convert = require("./convert");

const datastore = Datastore.create("data/db.db");

if (!process.env.BILI_LIST_ID) {
  console.error("请用 BILI_LIST_ID 环境变量提供收藏夹ID");
  process.exit(1);
}

const LIST_URL =
  "https://api.bilibili.com/x/v3/fav/resource/list?media_id=" +
  process.env.BILI_LIST_ID +
  "&pn=1&ps=20&keyword=&order=mtime&type=0&tid=0&platform=web&jsonp=jsonp";

async function main() {
  const response = await axios.get(LIST_URL);
  for (const media of response.data.data.medias) {
    if ((await datastore.findOne({ bvid: media.bvid })) != null) {
      continue;
    }

    console.log(media.bvid);

    convert(media.bvid).then(
      (path) => {
        datastore.insert({ bvid: media.bvid, path });
      },
      (error) => {
        console.log(error);
      }
    );
  }
}

main();
