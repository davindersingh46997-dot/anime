# Anime Companion

A browser-based 3D companion built with React, Three.js, and VRM avatars.

## Run locally

```sh
npm install
npm run dev
```

The avatar is loaded from `public/models/AvatarSample_Y.vrm`.

## Talk and movement

- Type a message or use **Talk** to dictate a command. The browser's Web Speech API is used for speech recognition.
- Companion replies are spoken using browser speech synthesis by default; **Voice on/off** controls spoken replies. The automatic voice prefers a feminine English voice when the browser exposes one; choose a specific installed voice from **Reply voice**.
- The scene displays a thought bubble that reveals the spoken reply as it is delivered. **Stop voice** cancels playback.
- Try commands such as **wave**, **dance**, **walk**, **run**, **sit down**, **stand up**, **turn left**, and **stop moving**. Quick buttons are provided for sitting, standing, running, and dancing. Sitting lowers the hips into a chair-supported pose.
- Voice input requires a browser with SpeechRecognition support and microphone permission. Available voices depend on the browser and operating system; if no feminine voice is installed, install/enable one in system speech settings and reload the app.
