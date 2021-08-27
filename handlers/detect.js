const { spawnSync } = require("child_process");
const { writeFileSync, unlinkSync, createWriteStream, mkdir, mkdirSync, existsSync } = require("fs");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const request = require('request');
const uuidv4 = require("uuid/v4");

async function download(url, dest) {

  /* Create an empty file where we can save data */
  const file = createWriteStream(dest);

  /* Using Promises so that we can use the ASYNC AWAIT syntax */
  await new Promise((resolve, reject) => {
    request({
      /* Here you should specify the exact link to the file you are trying to download */
      uri: url,
    })
      .pipe(file)
      .on('finish', async () => {
        console.log(`The file is finished downloading.`);
        resolve();
      })
      .on('error', (error) => {
        reject(error);
      });
  })
    .catch((error) => {
      console.log(`Something happened: ${error}`);
    });
}

module.exports.handler = async (event, context) => {
  console.log("++++++++++++++++++ event", event);

  try {
    await download("https://myqueuecounter.s3.amazonaws.com/darknet/yolov3.weights", "/tmp/yolov3.weights");
  } catch (error) {
    console.log(error);
    return;
  }

  console.log("++++++++++++++++++ 2");

  for (let i = 0; i < event.Records.length; i++) {
    const bucket = event.Records[i].s3.bucket.name;
    const key = decodeURIComponent(event.Records[i].s3.object.key.replace(/\+/g, ' '));
    const prefix = key.split("/")[0];
    const filename = key.split("/")[1];
    console.log("++++++++++++++++++ ", key);

    // get the file
    const s3Object = await s3
      .getObject({
        Bucket: bucket,
        Key: key
      })
      .promise();

    if (!existsSync(`/tmp/${prefix}`))
      mkdirSync(`/tmp/${prefix}`, { recursive: true });
    // write file to disk
    writeFileSync(`/tmp/${key}`, s3Object.Body);

    console.log("++++++++++++++++++ start");

    const output = spawnSync(
      "./darknet",
      [
        "detect",
        "cfg/yolov3.cfg",
        "/tmp/yolov3.weights",
        `/tmp/${key}`
      ],
      { stdio: "inherit" }
    );

    console.log("++++++++++++++++++ output", output);

    // delete the temp files
    unlinkSync(`/tmp/${key}`);
  }

  unlinkSync(`/tmp/yolov3.weights`);
  unlinkSync(`/tmp/${prefix}`);

}