module.exports = require("axios").default.create({
    headers: {
        "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36",
        Referer: "https://www.bilibili.com/",
    },
});