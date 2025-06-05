// App.js (extended to extract audio and save to IndexedDB)
import React, { useEffect, useRef, useState } from 'react';
import { saveToIndexedDB, getAllRecordings, deleteRecording as deleteFromDB } from './db';

function App() {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [recordings, setRecordings] = useState([]);

  useEffect(() => {
    (async () => {
      const saved = await getAllRecordings();
      setRecordings(saved);
    })();
  }, []);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        mediaRecorderRef.current = new MediaRecorder(stream);

        mediaRecorderRef.current.ondataavailable = (e) => {
          chunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);

          const audioBlob = await extractAudio(blob);

          const newName = prompt("Enter a name for this recording:") || `Untitled ${Date.now()}`;

          await saveToIndexedDB(newName, audioBlob, transcript);

          const updated = await getAllRecordings();
          setRecordings(updated);

          // Cleanup memory
          chunksRef.current = [];
        };
      })
      .catch((err) => alert('Camera error: ' + err.message));
  }, []);

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Speech Recognition not supported');

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onerror = (e) => console.error('Speech error:', e);
    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const handleStart = () => {
    setTranscript('');
    setRecordedVideoUrl(null);
    setRecording(true);
    chunksRef.current = [];
    mediaRecorderRef.current.start();
    startRecognition();

    setTimeout(() => {
      if (recording) handleStop();
    }, 10 * 60 * 1000); // 10 minutes
  };

  const handleStop = () => {
    setRecording(false);
    mediaRecorderRef.current.stop();
    stopRecognition();
  };

  const handleDelete = async (id) => {
    await deleteFromDB(id);
    const updated = await getAllRecordings();
    setRecordings(updated);
  };

  async function extractAudio(videoBlob) {
    const arrayBuffer = await videoBlob.arrayBuffer();
    const context = new AudioContext();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    const dest = context.createMediaStreamDestination();
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(dest);
    source.start();

    const mediaRecorder = new MediaRecorder(dest.stream);
    const audioChunks = [];
    return new Promise((resolve) => {
      mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
      mediaRecorder.onstop = () => resolve(new Blob(audioChunks, { type: 'audio/webm' }));
      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), audioBuffer.duration * 1000);
    });
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🎥 Record + Transcript (10 min max)</h1>
      <video ref={videoRef} autoPlay muted style={{ width: '100%', maxWidth: '600px', borderRadius: '8px' }} />

      <div style={{ marginTop: '10px' }}>
        <button onClick={handleStart} disabled={recording}>Start</button>
        <button onClick={handleStop} disabled={!recording} style={{ marginLeft: '10px' }}>Stop</button>
      </div>

      <h3 style={{ marginTop: '20px' }}>📝 Transcript:</h3>
      <div style={{ background: '#f9f9f9', padding: '10px', minHeight: '80px' }}>{transcript || '...waiting for speech...'}</div>

      {recordedVideoUrl && (
        <>
          <h3>🎬 Playback:</h3>
          <video controls src={recordedVideoUrl} style={{ width: '100%', maxWidth: '600px' }} />
        </>
      )}

      <h3 style={{ marginTop: '30px' }}>📂 Past Recordings (from IndexedDB):</h3>
      {recordings.length === 0 && <p>No saved recordings yet.</p>}
      {recordings.map((rec) => (
        <div key={rec.id} style={{ marginBottom: '20px', padding: '10px', background: '#eee', borderRadius: '8px' }}>
          <strong>📛 {rec.name}</strong>
          <br />
          <audio controls src={URL.createObjectURL(rec.blob)} style={{ marginTop: '8px' }} />
          <p><strong>📝 Transcript:</strong> {rec.transcript}</p>
          <button onClick={() => handleDelete(rec.id)} style={{ background: 'red', color: 'white' }}>Delete</button>
        </div>
      ))}
    </div>
  );
}

export default App;
