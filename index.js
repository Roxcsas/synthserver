import { Client } from "@gradio/client";
import express from "express";
import cors from "cors";
import runRhubarb from "./rhubarb.js"



process.title = "synth-server";

// Get port or default to 8080
const port = process.env.PORT || 8080;

const app = express();

//Set CORS options
const corsOptions = {
  origin: "*", // Whitelist the domains you want to allow
  methods: ["GET", "POST"],
  credentials: false,
};


//Init CORS on express
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Initialize Gradio client
const client = await Client.connect("FondSaper/kokoro-timestamp");

// Default POST route
app.post("/", async (req, res) => {
	try {
		const result = await client.predict("/synthesize", { 		
			text_input: req.body.text_input || "Hello!!"
		});
		res.json(result.data);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

app.post("/phonetic", async (req, res) => {
  try {
    const userText = req.body.text_input;
    const userVoice = req.body.voice;
    const result = await client.predict("/generate_first", {
      text: userText,
      voice: userVoice,
      speed: 1,
      use_gpu: false,
    });
    audioURL = result.data[0].url;
    console.log(audioURL);
    const lipsyncData = await runRhubarb(audioURL);
    res.json(lipsyncData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
