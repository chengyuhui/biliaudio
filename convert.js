const fs = require("fs");
const fsPromises = fs.promises;
const util = require("util");
const ffmpeg = require("fluent-ffmpeg");
const sanitize = require("sanitize-filename");
const axios = require("./axios");

const PLAYINFO_REGEX = /<script>window\.__playinfo__=(.+?)<\/script>/;
const STATE_REGEX = /<script>window\.__INITIAL_STATE__=(.+?);\(.+?<\/script>/;
const LOUDNORM_REGEX = /({.+?})\s*$/s;

async function downloadFile(fileUrl, outputPath) {
  const writer = fs.createWriteStream(outputPath + ".dl");

  const response = await axios.request({
    method: "get",
    url: fileUrl,
    responseType: "stream",
  });

  const complete = new Promise((resolve, reject) => {
    response.data.pipe(writer);

    let error = null;

    writer.on("error", (err) => {
      error = err;
      writer.close();
      fs.unlinkSync(outputPath + ".dl");
      reject(err);
    });

    writer.on("close", () => {
      if (!error) {
        fs.renameSync(outputPath + ".dl", outputPath);
        resolve(true);
      }
      //no need to call the reject here, as it will have been called in the
      //'error' stream;
    });
  });

  await complete;
}

async function getUrl(bvid) {
  let ret = await axios.get("https://www.bilibili.com/video/" + bvid);
  let page_str = ret.data;

  let playInfo = JSON.parse(PLAYINFO_REGEX.exec(page_str)[1]);
  let initialState = JSON.parse(STATE_REGEX.exec(page_str)[1]);

  let staffs;
  if (initialState.staffData.length > 0) {
    staffs = initialState.staffData;
  } else {
    staffs = [initialState.upData];
  }

  return {
    staffs,
    title: initialState.videoData.title,
    coverUrl: initialState.videoData.pic,
    audioUrl: playInfo.data.dash.audio[0].baseUrl,
  };
}

async function downloadIfNotExists(url, path) {
  try {
    await fsPromises.access(path, fs.constants.R_OK | fs.constants.W_OK);
    return;
  } catch (error) {}

  await downloadFile(url, path);

  return path;
}

function loudnormPass1(file) {
  return new Promise((resolve, reject) => {
    ffmpeg(file)
      .withAudioFilter("loudnorm=i=-16:lra=9:tp=-1:print_format=json")
      .outputFormat("null")
      .on("end", function (stdout, stderr) {
        const matches = LOUDNORM_REGEX.exec(stderr);
        if (matches === null) {
          return reject(new Error("No output found in stderr"));
        }

        let lnOut;
        try {
          lnOut = JSON.parse(matches[1]);
        } catch (err) {
          return reject(err);
        }

        resolve(lnOut);
      })
      .on("error", function (err) {
        reject(err);
      })
      .save("-");
  });
}

function loudnormPass2({ input, output, measure, cover, info }) {
  const loudnorm =
    "loudnorm=i=-16:lra=9:tp=-1:measured_i=" +
    measure.input_i +
    ":measured_lra=" +
    measure.input_lra +
    ":measured_tp=" +
    measure.input_tp +
    ":measured_thresh=" +
    measure.input_thresh;

  const title = info.title;
  const artists = info.staffs.map((s) => s.name.replace("/", "")).join(" / ");

  return new Promise((resolve, reject) => {
    const ff = ffmpeg()
      .input(input)
      .input(cover)
      .withAudioFilter(loudnorm)
      .withVideoFilter(
        `scale='if(gt(iw,ih),-1,300):if(gt(iw,ih),300,-1)', crop=300:300:exact=1 `
      )
      .audioFrequency(48000)
      .audioBitrate("320k")
      .videoCodec("mjpeg")
      .addOutputOption([
        "-map",
        "0:0",
        "-map",
        "1:0",
        "-id3v2_version",
        "3",
        "-metadata:s:v",
        "title=Album cover ",
        "-metadata:s:v",
        "comment=Cover (front) ",
        "-metadata",
        `title=${title}${title.split(" ").length == 2 ? " " : ""}`,
        "-metadata",
        `artist=${artists}${artists.split(" ").length == 2 ? " " : ""}`,
      ]);

    ff.on("end", function () {
      resolve();
    })
      .on("error", function (err) {
        reject(err);
      })
      .save(output);
  });
}

module.exports = async function convert(bvid) {
  const videoInfo = await getUrl(bvid);

  const srcFile = "data/" + bvid + ".m4s";
  await downloadIfNotExists(videoInfo.audioUrl, srcFile);
  const coverFile = "data/" + bvid + ".jpg";
  await downloadIfNotExists(videoInfo.coverUrl, coverFile);

  const measure = await loudnormPass1(srcFile);
  const outFile = "data/" + sanitize(videoInfo.title) + ".mp3";
  await loudnormPass2({
    input: srcFile,
    output: outFile,
    measure,
    cover: coverFile,
    info: videoInfo,
  });

  await fsPromises.unlink(srcFile);
  await fsPromises.unlink(coverFile);
  await fsPromises.access(outFile);

  return outFile;
};
