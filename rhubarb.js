import { spawn } from "child_process";
import fs from "fs";
import https from "https";
import http from "http";
import os from "os";
import path from "path";

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith("https") ? https : http;
    protocol.get(url, (response) => {
      response.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

function runRhubarb(audioURL) {
  return new Promise(async (resolve, reject) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tmpWav = path.join(os.tmpdir(), `rhubarb_${id}.wav`);
    const tmpJson = path.join(os.tmpdir(), `rhubarb_${id}.json`);

    try {
      await downloadFile(audioURL, tmpWav);
      const stats = fs.statSync(tmpWav);
      console.log("Downloaded to:", tmpWav, "| Size:", stats.size, "bytes");
    } catch (err) {
      return reject(new Error("Failed to download audio: " + err.message));
    }

    const rhubarb = spawn("./rhubarb/rhubarb", [
      "--recognizer", "phonetic",
      "-f", "json",
      "-o", tmpJson,
      tmpWav
    ]);

    let errorData = "";

    rhubarb.stderr.on("data", (data) => {
      errorData += data.toString();
    });

    rhubarb.on("close", (code) => {
      fs.unlink(tmpWav, () => {});
      console.log("Rhubarb closed with code:", code);
      console.log("Output file path:", tmpJson);
      console.log("Output file exists:", fs.existsSync(tmpJson));

      if (code !== 0) {
        fs.unlink(tmpJson, () => {});
        return reject(new Error(`Rhubarb exited with code ${code}. Stderr: ${errorData}`));
      }

      fs.readFile(tmpJson, "utf8", (err, data) => {
        fs.unlink(tmpJson, () => {});
        if (err) {
          return reject(new Error("Failed to read Rhubarb output file: " + err.message));
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Error parsing Rhubarb output: " + data));
        }
      });
    });
  });
}

export default runRhubarb;