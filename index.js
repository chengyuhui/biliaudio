const Datastore = require("nedb-promises");
const axios = require("./axios");
const convert = require("./convert");

const datastore = Datastore.create("data/db.db");

const LIST_ID = "1237625640";
const LIST_URL =
  "https://api.bilibili.com/x/v3/fav/resource/list?media_id=" +
  LIST_ID +
  "&pn=1&ps=20&keyword=&order=mtime&type=0&tid=0&platform=web&jsonp=jsonp";

async function main() {
  const response = await axios.get(LIST_URL);
  for (const media of response.data.data.medias) {
    if ((await datastore.findOne({ bvid: media.bvid })) != null) {
      continue;
    }
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
