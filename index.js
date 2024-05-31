#!/usr/bin/env node

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT;

app.use(
  cors({
    credentials: true,
    origin: [
      "*",
      "http://localhost:3000",
      "http://localhost:5050",
      "http://client.api.localhost:3000",
      "http://localhost:5173",
      "https://4nxxvf8x-5173.euw.devtunnels.ms",
      "https://4nxxvf8x-3000.euw.devtunnels.ms",
      "https://dev.onemarket.in.ua",
      "https://admin.onemarket.in.ua",
      "https://dev-test.onemarket.in.ua",
      "https://admin-test.onemarket.in.ua",
      "https://bbrdq16w-3000.euw.devtunnels.ms",
      "https://w6cztjdb-3000.euw.devtunnels.ms",
      "https://d0q47hgp-5050.euw.devtunnels.ms/",
    ],
  })
);

const API_KEYS = [process.env.API_KEY];

const apiKeyMiddleware = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (API_KEYS.includes(apiKey)) {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Доступ заборонено: неправильний API ключ" });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix =
      "test-image-" + Date.now() + path.extname(file.originalname);
    cb(null, uniqueSuffix);
  },
});

const upload = multer({ storage: storage });

app.post(
  "/uploads",
  apiKeyMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      const inputFilePath = file.path;
      const outputFileName = `${path.parse(file.filename).name}.webp`;
      const outputFilePath = path.join(__dirname, "uploads", outputFileName);
      if (file && file.path) {
        if (file.mimetype.startsWith("image/")) {
          if (
            file.mimetype !== "image/svg+xml" &&
            file.mimetype !== "image/webp"
          ) {
            const imagemin = (await import("imagemin")).default;
            const imageminWebp = (await import("imagemin-webp")).default;

            const data = await imagemin([inputFilePath], {
              destination: path.join(__dirname, "uploads"),
              plugins: [imageminWebp({ quality: 50 })],
            });

            res.status(200).json({
              success: true,
              message: "Файл успішно завантажено",
              image_name: outputFileName,
            });
            // Видаляємо оригінальний файл
            fs.unlink(inputFilePath, (err) => {
              if (err) {
                console.error("Помилка видалення файлу:", err);
              }
            });
          } else {
            res.status(200).json({
              success: true,
              message: "Файл успішно завантажено",
              image_name: file.filename,
            });
          }
        } else {
          // Видаляємо оригінальний файл
          fs.unlink(inputFilePath, (err) => {
            if (err) {
              console.error("Помилка видалення файлу:", err);
            }
          });
        }
      } else {
        res
          .status(400)
          .json({ success: false, message: "Необхідно додати файл" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Сталася помилка при завантаженні файлу",
      });
    }
  }
);

app.get("/uploads/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, "uploads", filename);
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        res
          .status(404)
          .json({ success: false, message: `File ${filename} not found` });
      } else {
        res.status(200).sendFile(filePath);
      }
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Сталась помилка отримання файлу" });
  }
});

app.delete("/uploads/:filename", apiKeyMiddleware, (req, res) => {
  try {
    const filename = req.params.filename;
    if (filename) {
      const filePath = path.join(__dirname, "uploads", filename);

      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          res
            .status(200)
            .json({ success: false, message: `Файл ${filename} не знайдено` });
        } else {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(err);
              res.status(500).send({
                success: false,
                message: "Сталася помилка при видаленні файлу",
              });
            } else {
              res
                .status(200)
                .json({ success: true, message: "Файл успішно видалено" });
            }
          });
        }
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Необхідно передати назву файла" });
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Сталась помилка видалення файлу" });
  }
});

app.get("/", (req, res) => {
  res.status(200).json("Hello world");
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущено на порту: ${port}`);
});
