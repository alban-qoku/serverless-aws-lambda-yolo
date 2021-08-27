const { writeFileSync, unlinkSync, mkdirSync, existsSync } = require("fs");
const { spawnSync } = require("child_process");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const uuidv4 = require("uuid/v4");
const { download } = require("../utils");

module.exports.handler = async (event, context) => {
  try {
    await download("https://myqueuecounter.s3.amazonaws.com/darknet/yolov3.weights", "/tmp/yolov3.weights");
  } catch (error) {
    console.log(error);
    return;
  }

  let prefix;
  for (let i = 0; i < event.Records.length; i++) {
    const bucket = event.Records[i].s3.bucket.name;
    const key = decodeURIComponent(event.Records[i].s3.object.key.replace(/\+/g, ' '));
    prefix = key.split("/")[0];

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

    const output = spawnSync(
      "./darknet",
      [
        "detect",
        "./cfg/yolov3.cfg",
        "/tmp/yolov3.weights",
        `/tmp/${key}`
      ],
      { stdio: 'pipe', encoding: 'utf-8' }
    );

    let result = output.stdout.split("\n");
    result.splice(0, 1);

    console.log("[result] ", result);

    // delete the temp files
    unlinkSync(`/tmp/${key}`);
  }

  unlinkSync(`/tmp/yolov3.weights`);
  unlinkSync(`/tmp/${prefix}`);

}