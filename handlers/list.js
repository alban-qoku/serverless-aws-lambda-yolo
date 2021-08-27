const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const uuidv4 = require("uuid/v4");
const { responseData } = require("../utils");

module.exports.get_video_list_handler = async (event, context) => {
  var params = {
    Bucket: process.env.keyframe_s3_bucket_name,
    Delimiter: "/",
  };

  try {
    const data = await s3.listObjects(params).promise();

    let result = [];
    for (let i = 0; i < data.CommonPrefixes.length; i++) {
      result.push(data["CommonPrefixes"][i]["Prefix"].slice(0, -1));
    }
    return responseData(200, result);
  } catch (error) {
    return responseData(400, error);
  }
};

module.exports.get_keyframe_list_handler = async (event, context) => {
  const key = event.pathParameters.key;
  var params = {
    Bucket: process.env.keyframe_s3_bucket_name,
    Prefix: `${key}/`
  };

  try {
    const data = await s3.listObjects(params).promise();
    let result = [];
    for (let i = 1; i < data["Contents"].length; i++) {
      result.push(`https://${process.env.keyframe_s3_bucket_name}.s3.amazonaws.com/${data['Contents'][i]['Key']}`);
    }
    return responseData(200, result);
  } catch (error) {
    return responseData(400, error);
  }
}