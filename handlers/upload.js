const Multipart = require("lambda-multipart");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const uuidv4 = require("uuid/v4");
const { responseData } = require("../utils");

module.exports.handler = async (event, context) => {
  const { fields, files } = await parseMultipartFormData(event);

  if (files == null || files.length == 0) {
    // no file found in http request
    return responseData(400, {
      message: "File not exist",
    });
  }

  try {
    const data = await uploadFileIntoS3(files[0]);
    return responseData(201, data);
  } catch (error) {
    return responseData(400, error);
  }
};

const parseMultipartFormData = async event => {
  return new Promise((resolve, reject) => {
    const parser = new Multipart(event);

    parser.on("finish", result => {
      resolve({ fields: result.fields, files: result.files });
    });

    parser.on("error", error => {
      return reject(error);
    });
  });
};

const uploadFileIntoS3 = async file => {

  const headers = file["headers"];
  if (headers == null) {
    return new Promise((resolve, reject) => {
      return reject({
        "message": `Missing "headers" from request`
      });
    });
  }

  const contentType = headers["content-type"];

  if (contentType !== "video/mp4") {
    return new Promise((resolve, reject) => {
      return reject({
        "message": `Unsupported content type "${contentType}".`
      });
    });
  }

  const ext = "mp4";

  const options = {
    Bucket: process.env.file_s3_bucket_name,
    Key: `${uuidv4()}.${ext}`,
    Body: file
  };

  try {
    await s3.upload(options).promise();
    console.log(
      `File uploaded into S3 bucket: "${process.env.file_s3_bucket_name
      }", with key: "${options.Key}"`
    );
    return new Promise((resolve, reject) => {
      return resolve({
        data: options
      });
    });
  } catch (err) {
    return new Promise((resolve, reject) => {
      return reject({
        "message": err
      });
    });
  }
};
